import { z } from "zod";

export const ZLoggingConfig = z
	.object({
		level: z
			.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
			.optional(),
		json: z.boolean().optional(),
		timestamp: z.boolean().optional(),
		prettyPrint: z.boolean().optional(),
	})
	.partial();

export const ZLlmToolOptions = z.record(z.string(), z.any());

export const ZToolsArrayItem = z.object({
	name: z.string(),
	options: ZLlmToolOptions.optional(),
});

export const ZLlmConfig = z
	.object({
		baseUrl: z.string().optional(),
		apiKeyEnv: z.string().optional(),
		model: z.string().optional(),
		apiKey: z.string().optional(),
	})
	.partial();

export const ZAgentConfig = z.object({
	display_name: z.string(),
	tools: z.array(z.string()).optional(),
	llm: ZLlmConfig.optional(),
	prompt: z.string(),
});

export const ZRootLlmConfig = ZLlmConfig.superRefine((val, ctx) => {
	if (!val.model) {
		ctx.addIssue({
			code: "custom",
			message: "llm.model is required",
			path: ["model"],
		});
	}

	if (!val.apiKey && !val.apiKeyEnv) {
		ctx.addIssue({
			code: "custom",
			message: "Provide llm.apiKey or llm.apiKeyEnv",
			path: ["apiKey"],
		});
	}
});

export type LlmConfig = z.infer<typeof ZRootLlmConfig>;

export const ZAppConfig = z.object({
	prompt: z.string(),
	logging: ZLoggingConfig.optional(),
	llm: ZRootLlmConfig,
	agents: z.record(z.string(), ZAgentConfig),
	supervisor: z.object({
		prompt: z.string(),
	}),
	tools: z
		.union([z.array(ZToolsArrayItem), z.record(z.string(), ZLlmToolOptions)])
		.optional(),
});

export type AppConfig = z.infer<typeof ZAppConfig>;
