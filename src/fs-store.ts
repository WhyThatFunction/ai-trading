import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";

const BASE_DIR = resolve(process.cwd(), "data");

function uriToRelPath(uri: string, ext = ".json"): string {
	// Map uri like "run:snapshot" -> "run/snapshot.json"
	// Prevent path traversal; allow only [a-zA-Z0-9:_-]
	const safe = uri.replace(/[^a-zA-Z0-9:_\-./]/g, "_");
	const parts = safe.split(":").filter(Boolean);
	const rel = parts.join("/");
	return rel.endsWith(ext) ? rel : rel + ext;
}

async function ensureDir(path: string): Promise<void> {
	await fs.mkdir(path, { recursive: true });
}

export async function writeJson(uri: string, body: any): Promise<void> {
	const rel = uriToRelPath(uri);
	const full = join(BASE_DIR, rel);
	await ensureDir(dirname(full));
	await fs.writeFile(full, JSON.stringify(body, null, 2), "utf8");
}

export async function readJson<T = any>(uri: string): Promise<T | null> {
	const rel = uriToRelPath(uri);
	const full = join(BASE_DIR, rel);
	try {
		const data = await fs.readFile(full, "utf8");
		return JSON.parse(data) as T;
	} catch (err: any) {
		if (err && (err.code === "ENOENT" || err.code === "ENOTDIR")) return null;
		throw err;
	}
}

export async function updateHashFloat(
	uri: string,
	field: string,
	delta: number,
): Promise<number> {
	// Positions are modeled as a simple record at the given uri
	const current = (await readJson<Record<string, number>>(uri)) ?? {};
	const nextVal = (current[field] ?? 0) + delta;
	const rounded = Number.isFinite(nextVal) ? nextVal : 0;
	current[field] = rounded;
	await writeJson(uri, current);
	return rounded;
}

export async function readHash(uri: string): Promise<Record<string, string>> {
	const obj = (await readJson<Record<string, number>>(uri)) ?? {};
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(obj)) out[k] = String(v);
	return out;
}

// Simple file-based lock with TTL stored inside the file
export async function acquireFileLock(
	key: string,
	ttlSec: number,
): Promise<boolean> {
	const locksDir = join(BASE_DIR, "locks");
	await ensureDir(locksDir);
	const path = join(locksDir, `${key}.lock.json`);
	const now = Math.floor(Date.now() / 1000);
	try {
		const raw = await fs.readFile(path, "utf8");
		const parsed = JSON.parse(raw) as { exp: number; token: string };
		if (parsed && typeof parsed.exp === "number" && parsed.exp > now) {
			return false; // lock still valid
		}
	} catch (err: any) {
		if (!(err && err.code === "ENOENT")) {
			// other errors should bubble
		}
	}
	// Create/overwrite lock
	const exp = now + Math.max(1, Math.floor(ttlSec));
	const token = Math.random().toString(36).slice(2);
	await fs.writeFile(path, JSON.stringify({ exp, token }), "utf8");
	return true;
}
