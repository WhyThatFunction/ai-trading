import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import _ from "lodash";
import { getEnvKey } from "../config";
import { resolveTools } from "../tools/registry.js";
import type { AppConfig, LlmConfig } from "../types.js";

function buildLlm(root: AppConfig, override?: LlmConfig) {
	const eff = _.merge({}, root.llm, override) as LlmConfig;

	const apiKey = eff.apiKeyEnv ? getEnvKey(eff.apiKeyEnv) : eff.apiKey;
	if (!apiKey)
		throw new Error(
			"LLM API key must be provided via llm.apiKey or llm.apiKeyEnv",
		);

	const configuration = eff.baseUrl
		? { baseURL: eff.baseUrl, timeout: 15000 }
		: { timeout: 15000 };
	return new ChatOpenAI({
		openAIApiKey: apiKey,
		modelName: eff.model,
		configuration,
		maxRetries: 0,
	});
}

export function createAgent(params: {
	rootConfig: AppConfig;
	toolInstances?: any[];
	toolNames?: string[];
	prompt: string;
	name: string;
	displayName: string;
	llmOverride?: LlmConfig;
}) {
	const { rootConfig, toolInstances, toolNames, prompt, name, llmOverride } =
		params;
	const llm = buildLlm(rootConfig, llmOverride);
	if (!toolInstances && !toolNames)
		throw new Error(`Agent ${name} must specify toolInstances or toolNames`);

	const tools = toolInstances ?? resolveTools(toolNames!);
	return createReactAgent({
		llm,
		tools,
		prompt: `You're ${params.displayName}, a helpful and serious assistant, critical thinking about trading. You the following: ${prompt}`,
		name,
	});
}
