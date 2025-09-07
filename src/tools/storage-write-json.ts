import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { writeJson } from "../fs-store.js";

/**
 * storage_writeJson
 *
 * Writes a JSON-serializable value into the shared in-memory `storage` Map
 * under the provided URI-like key.
 *
 * Status: REAL (file-backed). Writes under `data/{uri}.json` mapped from the URI.
 *
 * Inputs (zod schema):
 * - uri: string — Key to write to (stored as `json:{uri}`)
 * - body: any — JSON-serializable data
 *
 * Output:
 * - The string literal "OK"
 */
export const storage_writeJson = tool(
	async (input: { uri: string; body: any }) => {
		await writeJson(input.uri, input.body);
		return "OK";
	},
	{
		name: "storage_writeJson",
		description: "Write JSON to storage",
		schema: z.object({ uri: z.string(), body: z.any() }),
	},
);
