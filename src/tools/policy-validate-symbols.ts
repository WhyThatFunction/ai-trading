import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getToolConfig } from "./tool-config.js";

/**
 * policy_validateSymbols
 *
 * Filters the provided symbols against an allowlist.
 *
 * Status: REAL (pure filtering, no I/O).
 *
 * Inputs (zod schema):
 * - symbols: string[] — Symbols to validate
 * - allowlist?: string[] — Optional override; if omitted, resolves from config
 *
 * Config:
 * - tools.policy_validateSymbols.options.allowlist: string[] — Default allowlist.
 *   If empty or undefined, all input symbols are allowed.
 *
 * Output:
 * - JSON string of string[]: the filtered symbols
 *
 * Errors:
 * - Throws if allowlist is not provided via input or config (explicitness).
 */
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
		const allow = allowlist?.length ? new Set(allowlist) : undefined;
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
