import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { readJson, writeJson } from "../fs-store.js";
import { runCache } from "./state.js";
import { getToolConfig } from "./tool-config.js";
import { createOrder, oneTradingBaseUrl, type CreateOrderRequest } from "../clients/one-trading.js";

/**
 * broker_bitpanda_placeOrders
 *
 * Places orders either in PAPER mode (simulated; updates file-backed positions)
 * or in LIVE mode (Bitpanda Pro / One Trading authenticated API).
 *
 * Status: PAPER = REAL (file-backed simulation, same behavior as broker_placeOrders).
 *         LIVE = REAL (POST /account/orders).
 *
 * Inputs (zod schema):
 * - intents: Array<{ symbol: string, side: "buy"|"sell", size: number, type?: "market"|"limit", limitPrice?: number }>
 * - mode?: "LIVE" | "PAPER" — Optional; defaults from config.tools
 * - baseUrl?: string — Overrides configured REST API base for LIVE mode.
 *
 * Config:
 * - tools.broker_bitpanda_placeOrders.options.mode: "LIVE" | "PAPER"
 * - tools.broker_bitpanda_placeOrders.options.baseUrl: string (LIVE)
 * - tools.broker_bitpanda_placeOrders.options.apiKeyEnv: string (LIVE)
 * - tools.broker_bitpanda_placeOrders.options.apiSecretEnv: string (LIVE)
 * - tools.broker_bitpanda_placeOrders.options.passphraseEnv?: string (LIVE)
 *
 * Output:
 * - JSON string of fills: Array<{ id, symbol, side, size, price, status, mode }>
 *
 * Notes (LIVE):
 * - Bitpanda Pro was rebranded to One Trading; REST base and headers differ
 *   slightly across versions. This tool exposes `baseUrl` and env var names
 *   to adapt without code changes.
 * - Implement HMAC signing per the current API docs and fill in the
 *   request below where indicated.
 */
export const broker_bitpanda_placeOrders = tool(
	async (input: {
		intents: Array<{
			symbol: string;
			side: "buy" | "sell";
			size: number;
			type?: "market" | "limit";
			limitPrice?: number;
		}>;
		mode?: "LIVE" | "PAPER";
		baseUrl?: string;
	}) => {
		const cfg = getToolConfig<{
			mode?: "LIVE" | "PAPER";
			baseUrl?: string;
			apiKeyEnv?: string;
			apiSecretEnv?: string;
			passphraseEnv?: string;
		}>("broker_bitpanda_placeOrders");

		const mode = input.mode ?? cfg?.mode ?? "PAPER";

		// PAPER mode: mirror broker_placeOrders behavior
		if (mode === "PAPER") {
			const prices: Record<string, number> =
				(runCache.snapshot?.prices as Record<string, number>) ?? {};
			const fills = input.intents.map((it, i) => ({
				id: `BP-F-${Date.now().toString(36)}-${i}`,
				symbol: it.symbol,
				side: it.side,
				size: it.size,
				price:
					prices[it.symbol] ?? (it.type === "limit" ? (it.limitPrice ?? 0) : 0),
				status: "filled",
				mode,
			}));
			runCache.fills = fills;

			const posUri = `pos:${mode.toLowerCase()}`;
			const current = (await readJson<Record<string, number>>(posUri)) ?? {};
			for (const f of fills) {
				const delta = f.side.toLowerCase() === "buy" ? +f.size : -f.size;
				current[f.symbol] = (current[f.symbol] ?? 0) + delta;
			}
			await writeJson(posUri, current);
			return JSON.stringify(fills);
		}

		// LIVE mode (see https://docs.onetrading.com/rest/trading/create-order.md)
		const baseUrl = oneTradingBaseUrl(input.baseUrl ?? cfg?.baseUrl);
		const apiKeyEnv = cfg?.apiKeyEnv ?? "BITPANDA_API_KEY";
		const passphraseEnv = cfg?.passphraseEnv; // optional depending on API version

		const apiKey = process.env[apiKeyEnv] || process.env["ONETRADING_API_KEY"];
		const passphrase = passphraseEnv ? process.env[passphraseEnv] : undefined;
		if (!apiKey) {
			throw new Error(
				`broker_bitpanda_placeOrders(LIVE) requires ${apiKeyEnv} in environment`,
			);
		}

		const prices: Record<string, number> =
			(runCache.snapshot?.prices as Record<string, number>) ?? {};

		const results: Array<{
			id: string;
			symbol: string;
			side: string;
			size: number;
			price: number;
			status: string;
			mode: string;
		}> = [];

		for (let i = 0; i < input.intents.length; i++) {
			const it = input.intents[i];
			const instrument = it.symbol; // e.g., BTC_EUR
			const side = it.side.toUpperCase() as "BUY" | "SELL";
			const type = it.type ?? "market";

			// Determine price: limitPrice > snapshot > remote last price.
			let px =
				type === "limit" && typeof it.limitPrice === "number"
					? it.limitPrice
					: prices[it.symbol];
			if (!Number.isFinite(px)) {
				const last = await getLastPriceForInstrument({ instrumentCode: instrument, baseUrl });
				if (last != null && Number.isFinite(last)) px = last;
			}
			if (!Number.isFinite(px)) px = 0;

			const timeInForce = type === "market" ? "IMMEDIATE_OR_CANCELLED" : "GOOD_TILL_CANCELLED";
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				"X-API-KEY": apiKey,
			};
			if (passphrase) headers["X-API-PASSPHRASE"] = passphrase;

			try {
				const out = await createOrder({
					baseUrl,
					headers,
					body: {
						instrument_code: instrument,
						type: "LIMIT",
						side,
						amount: String(it.size),
						price: String(px),
						time_in_force: timeInForce,
					} satisfies CreateOrderRequest,
				});
				results.push({
					id: out.order_id,
					symbol: it.symbol,
					side: it.side,
					size: it.size,
					price: Number(px),
					status: "submitted",
					mode,
				});
			} catch (e) {
				results.push({
					id: `ERR-${Date.now().toString(36)}-${i}`,
					symbol: it.symbol,
					side: it.side,
					size: it.size,
					price: Number(px) || 0,
					status: "error",
					mode,
				});
			}
		}

		// NOTE: LIVE mode currently does not mutate positions. Once order events
		// are confirmed, you can update file-backed positions similarly to PAPER mode.
		return JSON.stringify(results);
	},
	{
		name: "broker_bitpanda_placeOrders",
		description:
			"Place orders via Bitpanda/OneTrading (PAPER real, LIVE scaffold)",
		schema: z.object({
			intents: z.array(
				z.object({
					symbol: z.string(),
					side: z.enum(["buy", "sell"]),
					size: z.number().positive(),
					type: z.enum(["market", "limit"]).optional(),
					limitPrice: z.number().positive().optional(),
				}),
			),
			mode: z.enum(["LIVE", "PAPER"]).optional(),
			baseUrl: z.string().url().optional(),
		}),
	},
);
