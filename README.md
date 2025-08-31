# ai-trading

## Contributing

- Use kebab-case for file names (e.g., `agent-graph.ts`).
- Put shared TypeScript interfaces/types in `src/types.ts`.
- We keep sourcemaps after build to improve debugging.

See `CONTRIBUTING.md` for details.

## Architecture (WIP)

This project composes multiple agents in a LangGraph state graph. See `src/graph/build-graph.ts` and agent stubs under `src/agents/`.

### Unified agent creation

- All agents are created through a central registry: `buildAgents(cfg)` in `src/agents/registry.ts`.
- The graph accepts these instances via `buildGraph({ instances })` so nodes reuse the same agents.
- LLM parameters (baseUrl, apiKey, model) resolve from `config.yaml` (`llm` defaults, overridable per-agent).

## Scripts

- `yarn dev`: Runs in dev mode with hot reload via ts-node-dev.
- `yarn build`: Cleans `dist` and builds with SWC (includes source maps).
- `yarn start`: Runs the compiled build from `dist`.

## Configuration

- App config is loaded from `config.yaml` at the project root.
- Logging is configured via the `logging` section and uses Winston.
- Agent options can be set under `agents` (e.g., supervisor, policy, data, reporter). The default LLM settings can be set under `llm` and overridden per-agent.
