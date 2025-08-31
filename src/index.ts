import { config as loadEnv } from "dotenv";
import { initConfig } from "./config.js";
import { msgConverter } from "./converter";
import { serializeError } from "./error.js";
import { buildGraph } from "./graph/build-graph.js";

loadEnv();

async function main() {
	const cfg = initConfig();
	const { logger } = await import("./log.js");
	process.on("unhandledRejection", (reason) => {
		logger.error("UnhandledRejection", { error: serializeError(reason) });
	});
	process.on("uncaughtException", (err) => {
		logger.error("UncaughtException", { error: serializeError(err) });
	});

	const supervisor = buildGraph();
	logger.info("Starting supervisor stream", {
		promptPreview: cfg.prompt.slice(0, 120),
	});

	const stream = await supervisor.stream(
		{
			messages: [{ role: "user", content: cfg.prompt }],
		},
		{
			streamMode: "values" as const,
		},
	);

	let from = 0;
	for await (const chunk of stream) {
		try {
			for (let i = from; i < chunk.messages.length; i++) {
				const recentMsg = chunk.messages[i];
				const message = msgConverter(recentMsg.content);

				for (const msg of message) {
					if (recentMsg.getType() === "tool") {
						logger.info(`=>: ${msg}`, {
							name: recentMsg.name,
						});
					} else if (recentMsg.getType() === "function") {
						logger.info(`++: ${msg}`, {
							name: recentMsg.name,
						});
					} else if (recentMsg.getType() === "ai") {
						logger.info(`[ai: ${recentMsg.name}]: ${msg}`);
					} else if (recentMsg.getType() === "human") {
						logger.info(`[human]: ${msg}`);
					} else if (recentMsg.getType() === "system") {
						logger.info(`[system]: ${msg}`);
					} else {
						logger.info(msg);
					}
				}
			}

			from = chunk.messages.length;
		} catch (e) {
			logger.error("UnhandledRejection", e);
		}
	}

	logger.info("Supervisor stream complete");
}

main().catch(async (err) => {
	const { logger } = await import("./log.js");
	logger.error("Fatal error", { error: serializeError(err) });
	process.exit(1);
});
