import { getConfig } from "../config.js";

/**
 * getToolConfig
 *
 * Resolves per-tool configuration from `config.yaml` under the `tools:`
 * section. Supports both array-of-objects and record shapes.
 *
 * Shapes supported:
 * - tools: [{ name: string, options?: any }, ...]
 * - tools: { [toolName: string]: any }
 *
 * Returns the `options` (or record value) typed as `T | undefined`.
 */
export function getToolConfig<T>(name: string): T | undefined {
	const cfg = getConfig();
	const t = cfg.tools;
	if (!t) return undefined;
	if (Array.isArray(t)) {
		const found = t.find((x) => x && x.name === name);
		if (!found) return undefined;
		return found.options as T;
	}
	if (typeof t === "object") {
		return t[name] as T;
	}
	return undefined;
}
