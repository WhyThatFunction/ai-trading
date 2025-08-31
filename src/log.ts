import winston from "winston";
import { getConfig } from "./config.js";

const { logging } = getConfig();

const level = logging?.level ?? "info";
const useJson = logging?.json ?? false;
const withTs = logging?.timestamp ?? true;
const pretty = logging?.prettyPrint ?? !useJson;

const formats: winston.Logform.Format[] = [];
if (withTs) formats.push(winston.format.timestamp());
if (useJson) {
	formats.push(winston.format.json());
} else {
	formats.push(winston.format.colorize());
	if (pretty) {
		formats.push(
			winston.format.printf(({ level, message, timestamp, ...meta }) => {
				const metaStr = Object.keys(meta).length
					? ` ${JSON.stringify(meta)}`
					: "";
				return timestamp
					? `${timestamp} [${level}] ${message}${metaStr}`
					: `[${level}] ${message}\t${metaStr}`;
			}),
		);
	} else {
		formats.push(winston.format.simple());
	}
}

export const logger = winston.createLogger({
	level,
	transports: [new winston.transports.Console()],
	format: winston.format.combine(...formats),
});
