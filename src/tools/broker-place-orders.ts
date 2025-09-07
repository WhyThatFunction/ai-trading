import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { readJson, writeJson } from "../fs-store.js";
import { runCache } from "./state.js";
import { getToolConfig } from "./tool-config.js";

/**
 * broker_placeOrders
 *
 * Simulates placing orders by echoing intents into filled trades with prices
 * taken from the latest `runCache.snapshot.prices`, and records them in
 * `runCache.fills`.
 *
 * Status: SEMI-REAL (no broker integration). Orders are marked as "filled"
 * and positions are updated in a file-backed record `pos:{mode}`.
 *
 * Inputs (zod schema):
 * - intents: Array<{ symbol: string, side: string, size: number }>
 * - mode?: "LIVE" | "PAPER" — Optional override for execution mode
 *
 * Config:
 * - tools.broker_placeOrders.options.mode: "LIVE" | "PAPER"
 *
 * Output:
 * - JSON string of fills: Array<{ id, symbol, side, size, price, status, mode }>
 *
 * Errors:
 * - Throws if `mode` is missing from input and config.
 *
 * Caveats:
 * - If a price for `symbol` is not available in `runCache.snapshot.prices`,
 *   price defaults to 0.
 * - Updates file-backed positions record at `pos:{mode}`.
 */
export const broker_placeOrders = tool(
	async (input: { intents: any[]; mode?: "LIVE" | "PAPER" }) => {
		const cfg = getToolConfig<{ mode: string }>("broker_placeOrders");
		const mode = input.mode ?? cfg?.mode;
		if (!mode)
			throw new Error(
				"broker_placeOrders requires mode from config.tools or input",
			);
		const prices: Record<string, number> =
			(runCache.snapshot?.prices as Record<string, number>) ?? {};

		const fills = input.intents.map((it, i) => ({
			id: `F-${Date.now().toString(36)}-${i}`,
			symbol: it.symbol,
			side: it.side,
			size: it.size,
			price: prices[it.symbol] ?? 0,
			status: "filled",
			mode,
		}));
		runCache.fills = fills;

		// Update positions in file-backed record: pos:{MODE}
		const posUri = `pos:${mode.toLowerCase()}`;
		const current = (await readJson<Record<string, number>>(posUri)) ?? {};
		for (const f of fills) {
			const delta = f.side.toLowerCase() === "buy" ? +f.size : -f.size;
			current[f.symbol] = (current[f.symbol] ?? 0) + delta;
		}
		await writeJson(posUri, current);
		return JSON.stringify(fills);
	},
	{
		name: "broker_placeOrders",
		description: "Place orders with broker (LIVE/PAPER)",
		schema: z.object({
			intents: z.array(
				z.object({
					symbol: z.string(),
					side: z.string(),
					size: z.number(),
				}),
			),
			mode: z.enum(["LIVE", "PAPER"]).optional(),
		}),
	},
);
