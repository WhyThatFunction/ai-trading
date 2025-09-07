import { tool } from "@langchain/core/tools";
import yahooFinance from "yahoo-finance2";
import { z } from "zod";
import { runCache } from "./state.js";
import { getToolConfig } from "./tool-config.js";

/**
 * market_fetchSnapshot
 *
 * Fetch a batched market snapshot for a set of symbols and cache it in
 * memory for this run under `runCache.snapshot`.
 *
 * Status: REAL (Yahoo Finance). Fetches quotes via `yahoo-finance2` and
 * extracts `regularMarketPrice` (falling back to pre/post market prices).
 *
 * Inputs (zod schema):
 * - symbols?: string[] — Optional. If omitted, resolves from
 *   config.tools["market_fetchSnapshot"].options.symbols
 * - tf?: string — Timeframe hint (unused)
 * - lookback?: number — Lookback hint (unused)
 *
 * Config:
 * - tools.market_fetchSnapshot.options.symbols: string[] — Default symbols
 * - tools.market_fetchSnapshot.options.tf: string — Hint, unused
 * - tools.market_fetchSnapshot.options.lookback: number — Hint, unused
 *
 * Output:
 * - JSON string of: { prices: Record<string, number>, ts: number }
 *
 * Side effects:
 * - Writes the same object to `runCache.snapshot`
 *
 * Errors:
 * - Throws if no symbols are provided via input or config
 */
export const market_fetchSnapshot = tool(
	async (input: { symbols?: string[]; tf?: string; lookback?: number }) => {
		const cfg = getToolConfig<{ symbols: string[] }>("market_fetchSnapshot");
		const symbols = input.symbols ?? cfg?.symbols;
		if (!symbols || symbols.length === 0)
			throw new Error(
				"market_fetchSnapshot requires symbols from config.tools or input",
			);

		const prices: Record<string, number> = {};
		// yahoo-finance2 quote accepts array and returns an array of Quote objects
		const quotes = await yahooFinance.quote(symbols);
		const list = Array.isArray(quotes) ? quotes : [quotes];
		for (const q of list) {
			if (!q || !q.symbol) continue;
			const sym = q.symbol.toUpperCase();
			const px =
				(q as any).regularMarketPrice ??
				(q as any).postMarketPrice ??
				(q as any).preMarketPrice;
			if (typeof px === "number") prices[sym] = px;
		}

		// Fill any missing symbols with 0 to be explicit
		for (const s of symbols) if (!(s in prices)) prices[s] = 0;

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
