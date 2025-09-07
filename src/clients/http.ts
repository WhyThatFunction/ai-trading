import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";

// Shared Axios instance with sensible defaults for JSON APIs
export const http: AxiosInstance = axios.create({
  timeout: 10_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

type GetConfig = Omit<AxiosRequestConfig, "method" | "url">;

export async function getJson<T = any>(url: string, config?: GetConfig): Promise<T> {
  try {
    const res = await http.get(url, config);
    return (res.data as any)?.data ?? (res.data as T);
  } catch (err) {
    throw wrapAxiosError(err, "GET", url);
  }
}

export async function postJson<T = any>(
  url: string,
  body?: any,
  config?: GetConfig,
): Promise<T> {
  try {
    const res = await http.post(url, body, config);
    return (res.data as any)?.data ?? (res.data as T);
  } catch (err) {
    throw wrapAxiosError(err, "POST", url);
  }
}

function wrapAxiosError(err: unknown, method: string, url: string): Error {
  const aerr = err as AxiosError;
  const status = aerr.response?.status;
  const data = aerr.response?.data;
  const baseMsg = `${method} ${url}`;
  if (status) {
    return new Error(`${baseMsg} -> ${status}: ${stringifyData(data)}`);
  }
  return new Error(`${baseMsg} -> ${aerr.message}`);
}

function stringifyData(data: unknown): string {
  if (typeof data === "string") return data.slice(0, 500);
  try {
    return JSON.stringify(data).slice(0, 500);
  } catch {
    return String(data);
  }
}

