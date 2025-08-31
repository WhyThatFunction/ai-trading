import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { hashStr, runCache } from "./state.js";
import { getToolConfig } from "./tool-config.js";

export const market_fetchSnapshot = tool(
	async (input: { symbols?: string[]; tf?: string; lookback?: number }) => {
		const cfg = getToolConfig<{ symbols: string }>("market_fetchSnapshot");
		const symbols = input.symbols ?? cfg?.symbols;
		if (!symbols || symbols.length === 0)
			throw new Error(
				"market_fetchSnapshot requires symbols from config.tools or input",
			);

		// TODO Fetch for real
		const prices: Record<string, number> = {};
		for (const s of symbols) prices[s] = 100 + (hashStr(s) % 500) / 10;

		const snapshot = { prices, ts: Date.now() };
		runCache.snapshot = snapshot;
		return JSON.stringify(snapshot);
	},
	{
		name: "market_fetchSnapshot",
		description: "Fetch batched market snapshot for symbols",
		schema: z.object({
			symbols: z.array(z.string()).optional(),
			tf: z.string().optional(),
			lookback: z.number().int().nonnegative().optional(),
		}),
	},
);
