import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getToolConfig } from "./tool-config.js";

export const policy_validateSymbols = tool(
	async (input: { symbols: string[]; allowlist?: string[] }) => {
		const cfg = getToolConfig<{ allowlist: string[] }>(
			"policy_validateSymbols",
		);
		const allowlist = input.allowlist ?? cfg?.allowlist;
		if (typeof allowlist === "undefined")
			throw new Error(
				"policy_validateSymbols requires allowlist from config.tools or input",
			);
		const allow =
			allowlist && allowlist.length ? new Set(allowlist) : undefined;
		const out = allow
			? input.symbols.filter((s) => allow.has(s))
			: input.symbols;
		return JSON.stringify(out);
	},
	{
		name: "policy_validateSymbols",
		description: "Filter symbols by allowlist",
		schema: z.object({
			symbols: z.array(z.string()),
			allowlist: z.array(z.string()).optional(),
		}),
	},
);
