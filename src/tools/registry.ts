import { broker_placeOrders } from "./broker-place-orders.js";
import { market_fetchSnapshot } from "./market-fetch-snapshot.js";
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

export const toolsRegistry: Record<string, any> = {
	market_fetchSnapshot,
	portfolio_getPositions,
	portfolio_markToMarket,
	signal_computeSignals,
	signal_toTradeIntents,
	risk_riskGate,
	policy_tradingWindowOpen,
	policy_validateSymbols,
	broker_placeOrders,
	storage_acquireRunLock,
	storage_writeJson,
	storage_readJson,
};

export function resolveTools(names: string[]): any[] {
	return names.map((n) => {
		const t = toolsRegistry[n];
		if (!t) throw new Error(`Unknown tool: ${n}`);
		return t;
	});
}
