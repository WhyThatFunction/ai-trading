import type { MessageContent } from "@langchain/core/messages";

export function msgConverter(msg: MessageContent) {
	switch (typeof msg) {
		case "string":
			return [msg];
		case "object":
			return msg.map((msgElement) => {
				switch (msgElement.type) {
					case "text":
						return msgElement.text as string;
					case "image_url":
						return msgElement.image_url as string;
					default:
						return JSON.stringify(msgElement);
				}
			});
		default:
			return [JSON.stringify({ msg })];
	}
}
