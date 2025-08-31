import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import type { AppConfig } from "./types.js";
import { ZAppConfig } from "./types.js";

let cached: AppConfig;

export function initConfig(): AppConfig {
	if (cached) return cached;
	const path = resolve(process.cwd(), "config.yaml");
	if (!existsSync(path)) {
		throw new Error("Config file does not exist");
	}

	const file = readFileSync(path, "utf8");
	const raw = yaml.load(file);

	const res = ZAppConfig.safeParse(raw);
	if (!res.success) {
		throw res.error;
	}

	cached = res.data;
	return cached;
}

export function getConfig(): AppConfig {
	return cached!;
}

export function getEnvKey(name?: string): string | undefined {
	if (!name) return undefined;
	return process.env[name];
}
