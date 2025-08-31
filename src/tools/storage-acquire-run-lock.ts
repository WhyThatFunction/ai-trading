import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { storage } from "./state.js";

export const storage_acquireRunLock = tool(
	async (input: { key: string; ttlSec: number }) => {
		const k = `lock:${input.key}`;
		if (storage.get(k)) return JSON.stringify(false);
		storage.set(k, { until: Date.now() + input.ttlSec * 1000 });
		return JSON.stringify(true);
	},
	{
		name: "storage_acquireRunLock",
		description: "Acquire run lock",
		schema: z.object({ key: z.string(), ttlSec: z.number().int().positive() }),
	},
);
