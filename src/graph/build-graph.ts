import { createSupervisor } from "@langchain/langgraph-supervisor";
import { ChatOpenAI } from "@langchain/openai";
import _ from "lodash";
import { createAgent } from "../agents/create-agent.js";
import { getConfig, getEnvKey } from "../config.js";

export function buildGraph() {
	const cfg = getConfig();
	const apiKey = cfg.llm.apiKeyEnv
		? getEnvKey(cfg.llm.apiKeyEnv)
		: cfg.llm.apiKey;

	const llm = new ChatOpenAI({
		openAIApiKey: apiKey,
		model: cfg.llm.model,
		configuration: cfg.llm.baseUrl
			? { baseURL: cfg.llm.baseUrl, timeout: 15000 }
			: { timeout: 15000 },
		maxRetries: 0,
	});

	const agents = _.entries(cfg.agents).map(
		([name, { llm, tools, prompt, display_name }]) =>
			createAgent({
				rootConfig: cfg,
				toolNames: tools,
				prompt: `${display_name}: ${prompt}`,
				name: name,
				llmOverride: llm,
				displayName: display_name,
			}),
	);

	const supervisor = createSupervisor({
		agents,
		llm,
		prompt: `You are the Supervisor/Router, a helpful and serious assistant, critical thinking about trading. You the following: ${cfg.supervisor.prompt}`,
	});

	return supervisor.compile();
}
