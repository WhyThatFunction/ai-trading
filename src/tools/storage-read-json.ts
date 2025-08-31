import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { storage } from "./state.js";

export const storage_readJson = tool(
	async (input: { uri: string }) => {
		return JSON.stringify(storage.get(input.uri) ?? null);
	},
	{
		name: "storage_readJson",
		description: "Read JSON from storage",
		schema: z.object({ uri: z.string() }),
	},
);
