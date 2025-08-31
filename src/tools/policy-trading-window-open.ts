import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getToolConfig } from "./tool-config.js";

type ToolConfig = {
	window: string;
};

export const policy_tradingWindowOpen = tool(
	async (input: { now?: string; window?: string }) => {
		const cfg = getToolConfig<ToolConfig>("policy_tradingWindowOpen");
		const now = input.now ? new Date(input.now) : new Date();
		const window = input.window ?? cfg?.window;

		if (!window)
			throw new Error(
				"policy_tradingWindowOpen requires window from config.tools or input",
			);

		const w = String(window).trim();
		const ok = (() => {
			const m = w.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})(?:\s+UTC)?$/i);
			if (!m)
				throw new Error(
					"policy_tradingWindowOpen window format must be HH:MM-HH:MM [UTC]",
				);
			const [_, h1, m1, h2, m2] = m;
			const start = parseInt(h1) * 60 + parseInt(m1);
			const end = parseInt(h2) * 60 + parseInt(m2);
			const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
			return start <= end
				? mins >= start && mins <= end
				: mins >= start || mins <= end;
		})();
		return JSON.stringify({ open: ok });
	},
	{
		name: "policy_tradingWindowOpen",
		description: "Check if trading window is open (UTC)",
		schema: z.object({
			now: z.string().optional(),
			window: z.string().optional(),
		}),
	},
);
