import { broker_bitpanda_placeOrders } from "./broker-bitpanda-place-orders.js";
import { broker_placeOrders } from "./broker-place-orders.js";
import { market_fetchSnapshot } from "./market-fetch-snapshot.js";
import { market_fetchSnapshot_bitpanda } from "./market-fetch-snapshot-bitpanda.js";
import { notifyTool } from "./notify-tool.js";
import { policy_tradingWindowOpen } from "./policy-trading-window-open.js";
import { policy_validateSymbols } from "./policy-validate-symbols.js";
import { portfolio_getPositions } from "./portfolio-get-positions.js";
import { portfolio_markToMarket } from "./portfolio-mark-to-market.js";
import { risk_riskGate } from "./risk-gate.js";
import { signal_computeSignals } from "./signal-compute-signals.js";
import { signal_toTradeIntents } from "./signal-to-trade-intents.js";
import { storage_acquireRunLock } from "./storage-acquire-run-lock.js";
import { storage_readJson } from "./storage-read-json.js";
import { storage_writeJson } from "./storage-write-json.js";

/**
 * toolsRegistry
 *
 * Map of exported tool instances used to look up tool objects by string name.
 * See each tool module for behavior, inputs, outputs, and caveats.
 */
export const toolsRegistry: Record<string, any> = {
	market_fetchSnapshot,
	market_fetchSnapshot_bitpanda,
	portfolio_getPositions,
	portfolio_markToMarket,
	signal_computeSignals,
	signal_toTradeIntents,
	risk_riskGate,
	policy_tradingWindowOpen,
	policy_validateSymbols,
	broker_placeOrders,
	broker_bitpanda_placeOrders,
	storage_acquireRunLock,
	storage_writeJson,
	storage_readJson,
	notifyTool,
};

/**
 * resolveTools
 *
 * Resolves tool names into their corresponding tool instances. Throws if any
 * requested tool is unknown.
 */
export function resolveTools(names: string[]): any[] {
	return names.map((n) => {
		const t = toolsRegistry[n];
		if (!t) throw new Error(`Unknown tool: ${n}`);
		return t;
	});
}
