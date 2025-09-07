import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { readHash } from "../fs-store.js";
import { runCache } from "./state.js";
import { getToolConfig } from "./tool-config.js";

/**
 * portfolio_getPositions
 *
 * Returns the current positions from in-memory `runCache.positions`.
 *
 * Status: REAL (file-backed positions via storage).
 *
 * Inputs (zod schema):
 * - {} — No inputs required
 *
 * Output:
 * - JSON string of Record<string, number> — e.g., { "AAPL": 10, "MSFT": -5 }
 *
 * Notes:
 * - Reads from file-backed `pos:{mode}` where mode comes from
 *   `tools.broker_placeOrders.options.mode` (defaults to PAPER).
 * - Falls back to `runCache.positions` if no stored entries.
 */
export const portfolio_getPositions = tool(
	async () => {
		// Fetch positions from file-backed hash pos:{mode}. Fallback to runCache if empty.
		const cfg = getToolConfig<{ mode?: "LIVE" | "PAPER" }>(
			"broker_placeOrders",
		);
		const mode = cfg?.mode ?? "PAPER";
		const posKey = `pos:${String(mode).toLowerCase()}`;
		const hash = await readHash(posKey);
		const positions: Record<string, number> = {};
		for (const [sym, qty] of Object.entries(hash))
			positions[sym] = parseFloat(qty);
		const effective = Object.keys(positions).length
			? positions
			: (runCache.positions ?? {});
		return JSON.stringify(effective);
	},
	{
		name: "portfolio_getPositions",
		description: "Get current positions",
		schema: z.object({}).loose(),
	},
);
