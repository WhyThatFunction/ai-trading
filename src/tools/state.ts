// Shared in-memory state for tools (fast, no I/O)
export const storage = new Map<string, any>();
export const runCache: {
	snapshot: { prices: Record<string, number>; ts: number } | null;
	positions: Record<string, number> | null;
	fills: any[];
} = {
	snapshot: null,
	positions: null,
	fills: [],
};

export function hashStr(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619;
	return Math.abs(h >>> 0);
}
