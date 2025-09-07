import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { hashStr } from "./state.js";

/**
 * signal_computeSignals
 *
 * Computes deterministic numeric signals from a snapshot of prices. For each
 * symbol, combines a symbol-derived base via `hashStr(sym)` with a small offset
 * from `price % 7`, then clamps to [-1, 1]. Intended purely as a stand-in for
 * real signal research.
 *
 * Status: FAKE (deterministic mock). Not predictive.
 *
 * Inputs (zod schema):
 * - snapshot: { prices: Record<string, number> }
 * - params?: Record<string, any> — Currently unused
 *
 * Output:
 * - JSON string: { signals: Record<string, number> }
 */
export const signal_computeSignals = tool(
	async (input: {
		snapshot: { prices: Record<string, number> };
		params?: Record<string, any>;
	}) => {
		const { prices } = input.snapshot;
		const signals: Record<string, number> = {};
		for (const [sym, px] of Object.entries(prices)) {
			const base = (hashStr(sym) % 200) / 100 - 1; // [-1,1)
			const score = Math.max(-1, Math.min(1, base + (px % 7) / 20 - 0.175));
			signals[sym] = score;
		}
		return JSON.stringify({ signals });
	},
	{
		name: "signal_computeSignals",
		description: "Compute numeric signals from snapshot",
		schema: z.object({
			snapshot: z.object({ prices: z.record(z.string(), z.number()) }),
			params: z.record(z.string(), z.any()).optional(),
		}),
	},
);
