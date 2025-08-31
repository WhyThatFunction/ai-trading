export function serializeError(err: unknown): Record<string, unknown> {
	const seen = new WeakSet();
	const safe = (obj: any): any => {
		try {
			return JSON.parse(
				JSON.stringify(obj, (_k, v) => {
					if (typeof v === "object" && v !== null) {
						if (seen.has(v)) return "[Circular]";
						seen.add(v);
					}
					if (typeof v === "function")
						return `[Function ${v.name || "anonymous"}]`;
					return v;
				}),
			);
		} catch {
			return { note: "Unserializable error object" };
		}
	};

	if (err instanceof Error) {
		const anyErr: any = err as any;
		const out: Record<string, unknown> = {
			name: err.name,
			message: err.message,
			stack: err.stack,
		};
		if (anyErr.code) out.code = anyErr.code;
		if (anyErr.status) out.status = anyErr.status;
		if (anyErr.statusText) out.statusText = anyErr.statusText;
		if (anyErr.cause) {
			const c = anyErr.cause;
			out.cause =
				c instanceof Error
					? { name: c.name, message: c.message, stack: c.stack }
					: safe(c);
		}
		if (anyErr.response) {
			const r = anyErr.response;
			out.response = safe({
				status: r.status,
				statusText: r.statusText,
				url: r.url,
				headers: r.headers,
			});
		}
		return out;
	}

	if (typeof err === "object" && err !== null) return safe(err);
	return { value: String(err) };
}
