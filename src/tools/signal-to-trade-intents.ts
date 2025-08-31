import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getToolConfig } from "./tool-config.js";

export const signal_toTradeIntents = tool(
	async (input: {
		signals: Record<string, number>;
		cfg?: Record<string, any>;
	}) => {
		const { signals } = input;
		const cfg = getToolConfig<{ threshold: number }>("signal_toTradeIntents");
		const intents: any[] = [];
		const threshold = input.cfg?.threshold ?? cfg?.threshold;
		if (typeof threshold !== "number")
			throw new Error(
				"signal_toTradeIntents requires threshold from config.tools or input",
			);
		for (const [sym, score] of Object.entries(signals)) {
			if (score > threshold)
				intents.push({ symbol: sym, side: "buy", size: 1, type: "market" });
			else if (score < -threshold)
				intents.push({ symbol: sym, side: "sell", size: 1, type: "market" });
		}
		return JSON.stringify(intents);
	},
	{
		name: "signal_toTradeIntents",
		description: "Convert signals into trade intents",
		schema: z.object({
			signals: z.record(z.string(), z.number()),
			cfg: z.record(z.string(), z.any()).optional(),
		}),
	},
);
