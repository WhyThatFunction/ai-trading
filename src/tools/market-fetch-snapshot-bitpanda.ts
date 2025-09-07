import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { runCache } from "./state.js";
import { getToolConfig } from "./tool-config.js";
import { getLastPriceForInstrument, oneTradingBaseUrl } from "../clients/one-trading.js";

/**
 * market_fetchSnapshot_bitpanda
 *
 * Fetch a batched crypto market snapshot for a set of Bitpanda/One Trading
 * instruments (e.g., "BTC_EUR", "ETH_EUR"). Writes the result to
 * `runCache.snapshot` and returns it.
 *
 * Status: REAL (public REST). Calls Bitpanda Pro / One Trading public
 * ticker endpoint. Endpoint is configurable to accommodate rebrands.
 *
 * Inputs (zod schema):
 * - symbols?: string[] — Optional. If omitted, resolves from
 *   config.tools["market_fetchSnapshot_bitpanda"].options.symbols
 * - baseUrl?: string — Optional. Overrides configured baseUrl.
 *
 * Config:
 * - tools.market_fetchSnapshot_bitpanda.options.symbols: string[]
 * - tools.market_fetchSnapshot_bitpanda.options.baseUrl: string — Defaults to
 *   "https://api.onetrading.com/fast/v1"
 *
 * Output:
 * - JSON string: { prices: Record<string, number>, ts: number }
 *
 * Notes:
 * - Attempts to handle multiple JSON shapes for ticker responses to be robust
 *   across Bitpanda/One Trading API variants.
 */
export const market_fetchSnapshot_bitpanda = tool(
	async (input: { symbols?: string[]; baseUrl?: string }) => {
		const cfg = getToolConfig<{ symbols?: string[]; baseUrl?: string }>(
			"market_fetchSnapshot_bitpanda",
		);
		const symbols = input.symbols ?? cfg?.symbols;
		if (!symbols || symbols.length === 0) {
			throw new Error(
				"market_fetchSnapshot_bitpanda requires symbols from config.tools or input",
			);
		}

			const baseUrl = oneTradingBaseUrl(input.baseUrl ?? cfg?.baseUrl);

			// Fetch per-instrument as per One Trading spec: /market-ticker/{instrument_code}
			const prices: Record<string, number> = {};
			let ok = false;
			await Promise.allSettled(
				symbols.map(async (sym) => {
					const code = sym.toUpperCase();
					try {
						const price = await getLastPriceForInstrument({ instrumentCode: sym, baseUrl });
						if (price != null && Number.isFinite(price)) {
							prices[code] = price;
							ok = true;
						}
					} catch {
						// Leave missing; will fill with 0 below.
					}
				}),
			);

		// Fill any missing symbols with 0 to be explicit
		for (const s of symbols)
			if (!(s.toUpperCase() in prices)) prices[s.toUpperCase()] = 0;

		const snapshot = {
			prices,
			ts: Date.now(),
			source: ok ? "bitpanda" : "bitpanda:error",
		} as const;
		runCache.snapshot = snapshot as any;
		return JSON.stringify({ prices: snapshot.prices, ts: snapshot.ts });
	},
	{
		name: "market_fetchSnapshot_bitpanda",
		description: "Fetch batched crypto snapshot from Bitpanda/OneTrading",
		schema: z.object({
			symbols: z.array(z.string()).optional(),
			baseUrl: z.string().url().optional(),
		}),
	},
);
