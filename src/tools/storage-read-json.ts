import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { readJson } from "../fs-store.js";

/**
 * storage_readJson
 *
 * Reads a JSON-serializable value from the shared in-memory `storage` Map by
 * key (URI-like string).
 *
 * Status: REAL (file-backed). Reads `data/{uri}.json` mapped from the URI.
 *
 * Inputs (zod schema):
 * - uri: string — Key under which the value was stored (stored as `json:{uri}`)
 *
 * Output:
 * - JSON stringified value, or "null" if nothing stored at `uri`.
 */
export const storage_readJson = tool(
	async (input: { uri: string }) => {
		const val = await readJson(input.uri);
		return val === null ? "null" : JSON.stringify(val);
	},
	{
		name: "storage_readJson",
		description: "Read JSON from storage",
		schema: z.object({ uri: z.string() }),
	},
);
