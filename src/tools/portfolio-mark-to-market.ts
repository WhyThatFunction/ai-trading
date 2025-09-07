import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { readHash } from "../fs-store.js";
import { runCache } from "./state.js";
import { getToolConfig } from "./tool-config.js";

/**
 * portfolio_markToMarket
 *
 * Computes a simple portfolio valuation by multiplying quantities in
 * `runCache.positions` by the provided `prices` map and summing.
 *
 * Status: REAL (pure calculation). Reads positions from file-backed `pos:{mode}`
 * and falls back to `runCache.positions`.
 *
 * Inputs (zod schema):
 * - prices: Record<string, number> — Latest prices per symbol
 *
 * Output:
 * - JSON string: { value: number, positions: Record<string, number>, ts: number }
 *
 * Caveats:
 * - Missing prices default to 0 for valuation.
 * - Mode is taken from `tools.broker_placeOrders.options.mode` (PAPER/LIVE).
 */
export const portfolio_markToMarket = tool(
	async (input: { prices: Record<string, number> }) => {
		const { prices } = input;
		// Try stored positions first
		const cfg = getToolConfig<{ mode?: "LIVE" | "PAPER" }>(
			"broker_placeOrders",
		);
		const mode = cfg?.mode ?? "PAPER";
		const posKey = `pos:${String(mode).toLowerCase()}`;
		const hash = await readHash(posKey);
		const positions: Record<string, number> = {};
		for (const [sym, qty] of Object.entries(hash))
			positions[sym] = parseFloat(qty);
		if (!Object.keys(positions).length && runCache.positions) {
			Object.assign(positions, runCache.positions);
		}
		let value = 0;
		for (const [sym, qty] of Object.entries(positions)) {
			const px = prices[sym] ?? 0;
			value += qty * px;
		}
		const snapshot = { value, positions, ts: Date.now() };
		return JSON.stringify(snapshot);
	},
	{
		name: "portfolio_markToMarket",
		description: "Compute portfolio valuation from prices",
		schema: z.object({ prices: z.record(z.string(), z.number()) }),
	},
);
