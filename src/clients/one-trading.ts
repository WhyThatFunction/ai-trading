import { getJson } from "./http.js";
import { postJson } from "./http.js";

// Default base for One Trading public API
export function oneTradingBaseUrl(baseUrl?: string): string {
  return (baseUrl ?? "https://api.onetrading.com/fast/v1").replace(/\/$/, "");
}

// Matches the OpenAPI spec fields (strings for numeric values)
export type MarketTicker = {
  base_volume: string;
  high: string;
  highest_bid: string;
  instrument_code: string;
  last_price: string;
  low: string;
  lowest_ask: string;
  price_change_percentage: string;
  price_change: string;
  quote_volume: string;
  sequence: number;
  state: string;
};

export async function getMarketTicker(params: {
  instrumentCode: string;
  baseUrl?: string;
}): Promise<MarketTicker> {
  const { instrumentCode } = params;
  const base = oneTradingBaseUrl(params.baseUrl);
  const url = `${base}/market-ticker/${encodeURIComponent(instrumentCode)}`;
  return await getJson<MarketTicker>(url);
}

export function lastPriceNumber(t: Partial<MarketTicker> | undefined): number | null {
  if (!t) return null;
  const raw = (t as any).last_price ?? (t as any).lastPrice ?? (t as any).price;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const n = Number(String(raw ?? ""));
  return Number.isFinite(n) ? n : null;
}

export async function getLastPriceForInstrument(params: {
  instrumentCode: string;
  baseUrl?: string;
}): Promise<number | null> {
  const t = await getMarketTicker(params);
  return lastPriceNumber(t);
}

// Trading: Create Order (LIMIT)
export type TimeInForce =
  | "GOOD_TILL_CANCELLED"
  | "IMMEDIATE_OR_CANCELLED"
  | "FILL_OR_KILL"
  | "POST_ONLY";

export type CreateOrderRequest = {
  instrument_code: string;
  type: "LIMIT";
  side: "BUY" | "SELL";
  amount: string; // strings per API
  price: string;
  client_id?: string; // uuid string
  time_in_force?: TimeInForce; // defaults to GOOD_TILL_CANCELLED
  reserve_price?: string; // for MOVE orders
};

export type CreateOrderResponse = {
  order_id: string;
  client_id: string;
  account_id: string;
  instrument_code: string;
  time: string; // ISO date-time
  side: "BUY" | "SELL";
  price: string;
  amount: string;
  type: "LIMIT";
  time_in_force: Exclude<TimeInForce, "POST_ONLY"> | "POST_ONLY";
  status: string;
};

export async function createOrder(params: {
  body: CreateOrderRequest;
  baseUrl?: string;
  headers?: Record<string, string>; // supply auth headers here
}): Promise<CreateOrderResponse> {
  const base = oneTradingBaseUrl(params.baseUrl);
  const url = `${base}/account/orders`;
  const res = await postJson<CreateOrderResponse>(url, params.body, {
    headers: params.headers,
  });
  return res;
}
