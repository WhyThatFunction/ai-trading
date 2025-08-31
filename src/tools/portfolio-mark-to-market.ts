import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { runCache } from "./state.js";

export const portfolio_markToMarket = tool(
	async (input: { prices: Record<string, number> }) => {
		const { prices } = input;
		const positions: Record<string, number> = runCache.positions ?? {};
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
