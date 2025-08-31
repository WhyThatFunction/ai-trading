# Contributing

Thanks for contributing to ai-trading! Please follow these conventions to keep the codebase consistent:

- File naming: Use kebab-case for all file names (e.g., `agent-graph.ts`, `trade-engine.ts`).
- Types: Place shared TypeScript interfaces and types in `src/types.ts` and import them where needed using `import type { ... } from './types.js'`.
- Builds: Sourcemaps are kept after builds to aid debugging; do not remove them from `dist/`.

If in doubt, ask or open a small PR for discussion.

