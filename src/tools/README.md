**Overview**
- These tools are wired for LangChain agents and expose Zod-validated inputs.
- Several are FAKE/mocked for now; they do not call real broker/market APIs.
- Shared ephemeral state lives in `src/tools/state.ts`.

**Shared Modules**
- `src/tools/state.ts`: In-memory `storage` Map and `runCache` for this run.
- `src/tools/tool-config.ts`: `getToolConfig(name)` resolves `config.yaml#tools` entries.
- `src/fs-store.ts`: File-backed JSON storage under `data/` (no Redis required).
- `src/tools/registry.ts`: Name → tool instance mapping; used to resolve tools by string.

**HTTP Helpers Rule**
- All outbound HTTP requests must go through shared helpers.
- Use `src/clients/http.ts` (`getJson`, `postJson`) for generic APIs.
- For API-specific logic, add a client module under `src/clients/` (e.g., `one-trading.ts`) and call that from tools.
- Do not import or call `fetch`/`axios` directly inside tools.

**market_fetchSnapshot**
- Status: REAL (Yahoo Finance via `yahoo-finance2`).
- File: `src/tools/market-fetch-snapshot.ts:6`
- Purpose: Produce a batched price snapshot and cache it at `runCache.snapshot`.
- Input: `{ symbols?: string[], tf?: string, lookback?: number }`.
- Config: `tools.market_fetchSnapshot.options.{symbols, tf, lookback}`.
- Output: `{"prices": Record<string, number>, "ts": number}` (JSON string).
- Side effects: Sets `runCache.snapshot` to the same object.
- Errors: Throws if `symbols` missing from input and config.

**market_fetchSnapshot_bitpanda**
- Status: REAL (One Trading public ticker; per-instrument endpoint).
- File: `src/tools/market-fetch-snapshot-bitpanda.ts:1`
- Purpose: Produce a batched crypto price snapshot from One Trading instruments (e.g., BTC_EUR).
- Input: `{ symbols?: string[], baseUrl?: string }`.
- Config: `tools.market_fetchSnapshot_bitpanda.options.{symbols, baseUrl}`. Default base URL: `https://api.onetrading.com/fast/v1`.
- Output: `{ "prices": Record<string, number>, "ts": number }` (JSON string).
- Notes: Calls `/market-ticker/{instrument_code}` for each symbol and parses `last_price`.

- Status: REAL (file-backed positions).
- File: `src/tools/portfolio-get-positions.ts:9`
- Purpose: Return current positions from file-backed `pos:{mode}`.
- Input: `{}` (none required).
- Output: `Record<string, number>` (JSON string).
- Caveats: Returns whatever was set into `runCache.positions`; no I/O.

- Status: REAL (pure calculation; reads positions from file-backed store).
- File: `src/tools/portfolio-mark-to-market.ts:9`
- Purpose: Compute valuation = sum(positions[sym] * prices[sym]).
- Input: `{ prices: Record<string, number> }`.
- Output: `{ value: number, positions: Record<string, number>, ts: number }` (JSON string).
- Caveats: Missing prices default to 0.

- Status: FAKE (deterministic mock; not predictive).
- File: `src/tools/signal-compute-signals.ts:9`
- Purpose: Compute numeric signals per symbol from snapshot prices.
- Input: `{ snapshot: { prices: Record<string, number> }, params?: Record<string, any> }`.
- Output: `{ signals: Record<string, number> }` (JSON string).
- Notes: Uses `hashStr(sym)` plus a small offset from `price % 7`, clamped to [-1, 1].

- Status: FAKE (toy thresholding).
- File: `src/tools/signal-to-trade-intents.ts:9`
- Purpose: Convert signals into simple market order intents.
- Input: `{ signals: Record<string, number>, cfg?: { threshold?: number } }`.
- Config: `tools.signal_toTradeIntents.options.threshold`.
- Output: `Array<{ symbol, side, size, type }>` (JSON string).
- Errors: Throws if threshold missing from input and config.

- Status: FAKE (minimal validation: `size <= sizeCap`).
- File: `src/tools/risk-gate.ts:9`
- Purpose: Approve/reject intents by enforcing a size cap.
- Input: `{ intents: Array<{ size: number, ... }>, ctx: { ... } }`.
- Config: `tools.risk_riskGate.options.sizeCap`.
- Output: `{ approved: any[], rejected: { intent, reason }[], notes: string[] }` (JSON string).
- Caveats: Ignores `ctx` fields; only checks `size`.

- Status: REAL (pure time window check; UTC).
- File: `src/tools/policy-trading-window-open.ts:9`
- Purpose: Check if now (UTC) is within `[start,end]` window.
- Input: `{ now?: string, window?: string }`.
- Config: `tools.policy_tradingWindowOpen.options.window` — format `HH:MM-HH:MM [UTC]`.
- Output: `{ open: boolean }` (JSON string).
- Errors: Throws if `window` missing or misformatted.

- Status: REAL (pure filtering).
- File: `src/tools/policy-validate-symbols.ts:9`
- Purpose: Filter symbols by allowlist.
- Input: `{ symbols: string[], allowlist?: string[] }`.
- Config: `tools.policy_validateSymbols.options.allowlist`.
- Output: `string[]` (JSON string).
- Errors: Throws if allowlist missing via input and config. Empty allowlist = pass-through.

- Status: SEMI-REAL (no broker; fills and file-backed position updates).
- File: `src/tools/broker-place-orders.ts:9`
- Purpose: Simulate order placement using prices from `runCache.snapshot.prices` and update `pos:{mode}` via HINCRBYFLOAT.
- Input: `{ intents: Array<{ symbol, side, size }>, mode?: "LIVE"|"PAPER" }`.
- Config: `tools.broker_placeOrders.options.mode`.
- Output: `Array<{ id, symbol, side, size, price, status, mode }>` (JSON string).
- Side effects: Assigns fills to `runCache.fills`.
- Errors: Throws if mode missing from input and config.

**broker_bitpanda_placeOrders**
- Status: PAPER = REAL (file-backed simulation), LIVE = REAL (POST `/account/orders`).
- File: `src/tools/broker-bitpanda-place-orders.ts:1`
- Purpose: Place orders using One Trading (LIVE) or simulate (PAPER). LIVE uses `LIMIT` orders; `market` intents are sent as `LIMIT` with `IMMEDIATE_OR_CANCELLED`.
- Input: `{ intents: Array<{ symbol, side, size, type?, limitPrice? }>, mode?: "LIVE"|"PAPER", baseUrl?: string }`.
- Config: `tools.broker_bitpanda_placeOrders.options.{ mode, baseUrl, apiKeyEnv, passphraseEnv }`. Defaults to env `BITPANDA_API_KEY` (fallback `ONETRADING_API_KEY`).
- Output: `Array<{ id, symbol, side, size, price, status, mode }>` (JSON string).

- Status: REAL (direct delivery; Telegram or stdout).
- File: `src/tools/notify-tool.ts:1`
- Purpose: Send a notification event directly (configurable via config.yaml).
- Input: `{ message: string, type: "HOLD"|"BOUGHT"|"SOLD", title: string }`.
- Output: `{ id, ts, title, type, message }` (JSON string).
- Side effects: `LPUSH ai-trading:notify:events`, `PUBLISH ai-trading:notify:pub`.

- Status: REAL (file-backed lock with TTL).
- File: `src/tools/storage-acquire-run-lock.ts:9`
- Purpose: Attempt to acquire a run-scoped lock with TTL.
- Input: `{ key: string, ttlSec: number }`.
- Output: `"true" | "false"` (as a JSON string literal).
- Caveats: No expiry sweep; intended for single-process runs.

- Status: REAL (file-backed at `data/{uri}.json`).
- File: `src/tools/storage-write-json.ts:9`
- Purpose: Write a JSON-serializable value to the in-memory store.
- Input: `{ uri: string, body: any }`.
- Output: `"OK"`.

- Status: REAL (file-backed at `data/{uri}.json`).
- File: `src/tools/storage-read-json.ts:9`
- Purpose: Read a JSON-serializable value from the in-memory store.
- Input: `{ uri: string }`.
- Output: Any JSON stringified value or `null` if missing.

- Fetch + cache snapshot: `market_fetchSnapshot.invoke({ symbols: ["AAPL"] })`
- Compute signals: `signal_computeSignals.invoke({ snapshot: { prices: { AAPL: 123 }}})`
- Intents from signals: `signal_toTradeIntents.invoke({ signals: { AAPL: 0.2 } })`
- Risk gate: `risk_riskGate.invoke({ intents: [{ size: 0.3 }] })`
- Place (fake) orders: `broker_placeOrders.invoke({ intents: [{ symbol: "AAPL", side: "buy", size: 1 }] })`
- Crypto snapshot (Bitpanda): `market_fetchSnapshot_bitpanda.invoke({ symbols: ["BTC_EUR", "ETH_EUR"] })`
- Crypto PAPER orders (Bitpanda): `broker_bitpanda_placeOrders.invoke({ intents: [{ symbol: "BTC_EUR", side: "buy", size: 0.01 }] })`
