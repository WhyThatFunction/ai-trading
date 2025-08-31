import { getConfig } from "../config.js";

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
