import { tool } from "@langchain/core/tools";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { acquireFileLock } from "../fs-store.js";

const _nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);

/**
 * storage_acquireRunLock
 *
 * Lightweight in-memory run lock using the shared `storage` Map.
 * Stores a key with an expiry and returns whether the lock was acquired.
 *
 * Status: REAL (file-backed). Implements lock via a lock file with TTL.
 *
 * Inputs (zod schema):
 * - key: string — Unique lock key (e.g., a run id)
 * - ttlSec: number > 0 — Time-to-live in seconds
 *
 * Behavior:
 * - SET `ai-trading:lock:{key}` to a random token with NX, EX=ttlSec.
 * - Returns "true" if acquired, otherwise "false".
 *
 * Output:
 * - JSON string: "true" or "false"
 *
 * Caveats:
 * - No background expiry sweep; callers should tolerate stale locks if the
 *   process lifetime outlasts TTL. This is fine for single-process runs.
 */
export const storage_acquireRunLock = tool(
	async (input: { key: string; ttlSec: number }) => {
		const ok = await acquireFileLock(input.key, input.ttlSec);
		return JSON.stringify(Boolean(ok));
	},
	{
		name: "storage_acquireRunLock",
		description: "Acquire run lock",
		schema: z.object({ key: z.string(), ttlSec: z.number().int().positive() }),
	},
);
