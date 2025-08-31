import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { runCache } from "./state.js";

export const portfolio_getPositions = tool(
	async () => {
		// TODO Do some real api requests here. Configure account from the config.yaml in the tools bloc
		const positions = runCache.positions ?? {};
		return JSON.stringify(positions);
	},
	{
		name: "portfolio_getPositions",
		description: "Get current positions",
		schema: z.object({}).loose(),
	},
);
