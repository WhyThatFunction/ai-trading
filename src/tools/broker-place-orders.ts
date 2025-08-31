import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { runCache } from "./state.js";
import { getToolConfig } from "./tool-config.js";

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
		return JSON.stringify(fills);
	},
	{
		name: "broker_placeOrders",
		description: "Place orders with broker (LIVE/PAPER)",
		schema: z.object({
			intents: z.array(z.object({
                symbol: z.string(),
                side: z.string(),
                size: z.number()
            })),
			mode: z.enum(["LIVE", "PAPER"]).optional(),
		}),
	},
);
