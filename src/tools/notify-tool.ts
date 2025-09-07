import { tool } from "@langchain/core/tools";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { getEnvKey } from "../config.js";
import { getToolConfig } from "./tool-config.js";
import { postJson } from "../clients/http.js";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

/**
 * notifyTool
 *
 * Sends a notification event directly (Telegram or stdout) without Redis.
 *
 * Status: REAL (direct delivery). Configurable via config.yaml -> tools.notifyTool.
 *
 * Inputs (zod schema):
 * - message: string — Body text
 * - type: "HOLD" | "BOUGHT" | "SOLD" — Event type
 * - title: string — Short title
 *
 * Output:
 * - JSON string of the created event: { id, ts, title, type, message }
 */
export const notifyTool = tool(
	async (input: {
		message: string;
		type: "HOLD" | "BOUGHT" | "SOLD";
		title: string;
	}) => {
		const event = {
			id: `N-${nano()}`,
			ts: Date.now(),
			title: input.title,
			type: input.type,
			message: input.message,
		};

		type NotifyCfg = {
			method?: "telegram" | "stdout";
			telegram?: {
				tokenEnv?: string;
				chatIdEnv?: string;
				parseMode?: "Markdown" | "MarkdownV2" | "HTML";
			};
		};
		const cfg = getToolConfig<NotifyCfg>("notifyTool");
		const method = cfg?.method ?? "stdout";

		if (method === "telegram") {
			const tokenEnv = cfg?.telegram?.tokenEnv ?? "TELEGRAM_BOT_TOKEN";
			const chatIdEnv = cfg?.telegram?.chatIdEnv ?? "TELEGRAM_CHAT_ID";
			const parseMode = cfg?.telegram?.parseMode; // optional
			const token = getEnvKey(tokenEnv);
			const chatId = getEnvKey(chatIdEnv);
			if (token && chatId) {
				const text =
					`[${event.type}] ${event.title}\n${event.message ?? ""}`.trim();
				const url = `https://api.telegram.org/bot${token}/sendMessage`;
				const body: any = { chat_id: chatId, text };
				if (parseMode) body.parse_mode = parseMode;
				try {
					await postJson(url, body);
				} catch (e) {
					// eslint-disable-next-line no-console
					console.error("Telegram send failed:", e);
				}
			} else {
				// eslint-disable-next-line no-console
				console.warn(
					"notifyTool telegram missing token/chat env; falling back to stdout",
				);
				// eslint-disable-next-line no-console
				console.log(`[${event.type}] ${event.title}: ${event.message ?? ""}`);
			}
		} else {
			// stdout method
			// eslint-disable-next-line no-console
			console.log(`[${event.type}] ${event.title}: ${event.message ?? ""}`);
		}

		return JSON.stringify(event);
	},
	{
		name: "notifyTool",
		description: "Send a notification event (HOLD|BOUGHT|SOLD)",
		schema: z.object({
			message: z.string().min(1).optional(),
			type: z.enum(["HOLD", "BOUGHT", "SOLD"]),
			title: z.string().min(1),
		}),
	},
);
