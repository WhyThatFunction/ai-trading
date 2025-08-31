import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getToolConfig } from "./tool-config.js";

export const risk_riskGate = tool(
	async (input: {
		intents: any[];
		ctx: {
			limits?: Record<string, any>;
			positions?: Record<string, number>;
			prices?: Record<string, number>;
			pnlDay?: number;
		};
	}) => {
		const cfg = getToolConfig<{ sizeCap: number }>("risk_riskGate");
		const sizeCap = cfg?.sizeCap;
		if (typeof sizeCap !== "number") {
			throw new Error(
				"risk_riskGate requires sizeCap from config.tools or input",
			);
		}

		console.log({ i: input.intents });

		const approved: any[] = [];
		const rejected: any[] = [];
		const notes: string[] = [];
		for (const it of input.intents) {
			if (!it || typeof it.size !== "number" || it.size > sizeCap) {
				rejected.push({ intent: it, reason: "size_exceeds_cap" });
			} else {
				approved.push(it);
			}
		}
		return JSON.stringify({ approved, rejected, notes });
	},
	{
		name: "risk_riskGate",
		description: "Apply hard risk checks to intents",
		schema: z.object({
			intents: z.array(
				z.object({
					size: z.number(),
				}),
			),
			ctx: z
				.object({
					limits: z.record(z.string(), z.any()).optional(),
					positions: z.record(z.string(), z.number()).optional(),
					prices: z.record(z.string(), z.number()).optional(),
					pnlDay: z.number().optional(),
				})
				.loose(),
		}),
	},
);
