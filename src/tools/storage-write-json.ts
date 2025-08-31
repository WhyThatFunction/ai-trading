import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { storage } from "./state.js";

export const storage_writeJson = tool(
	async (input: { uri: string; body: any }) => {
		storage.set(input.uri, input.body);
		return "OK";
	},
	{
		name: "storage_writeJson",
		description: "Write JSON to storage",
		schema: z.object({ uri: z.string(), body: z.any() }),
	},
);
