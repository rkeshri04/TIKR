// Small server-side fetch helper: honest User-Agent, timeout, and an
// in-memory TTL cache with in-flight de-duplication so one page view that
// fans out to many endpoints never hits the same upstream twice.

const APP_UA = "TIKR-research-app/0.1";

type Entry = { exp: number; value: Promise<unknown> };
const g = globalThis as unknown as { __tikrCache?: Map<string, Entry> };
const cache: Map<string, Entry> = g.__tikrCache ?? (g.__tikrCache = new Map());

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.exp > now) return hit.value as Promise<T>;
  const p = fn();
  cache.set(key, { exp: now + ttlMs, value: p });
  // Never cache failures.
  p.catch(() => {
    if (cache.get(key)?.value === p) cache.delete(key);
  });
  if (cache.size > 2000) {
    for (const [k, v] of cache) if (v.exp < now) cache.delete(k);
  }
  return p;
}

export class UpstreamError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function fetchText(
  url: string,
  opts: { ua?: string; timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 12000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": opts.ua ?? APP_UA, Accept: "*/*", ...opts.headers },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new UpstreamError(res.status, `${res.status} from ${new URL(url).host}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchJson<T = unknown>(
  url: string,
  opts: { ua?: string; timeoutMs?: number; headers?: Record<string, string>; retries?: number } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= (opts.retries ?? 1); i++) {
    try {
      return JSON.parse(await fetchText(url, opts)) as T;
    } catch (e) {
      lastErr = e;
      if (e instanceof UpstreamError && e.status === 404) break;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr;
}

/** Resolve all promises, returning null for the ones that fail. */
export async function settle<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn("[tikr]", (e as Error).message);
    return null;
  }
}
