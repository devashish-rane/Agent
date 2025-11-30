export interface ApiRequestOptions {
  cacheKey?: string;
  ttlMs?: number;
  timeoutMs?: number;
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const cache = new Map<string, CacheEntry<unknown>>();

const getCached = <T>(key?: string): T | undefined => {
  if (!key) return undefined;
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
};

const setCached = <T>(key: string, value: T, ttlMs: number) => {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

/**
 * cachedFetch wraps fetch with a small in-memory cache. We intentionally avoid
 * a global library to keep the bundle lean while still protecting backend
 * Config/SSM endpoints from excess calls.
 */
export const cachedFetch = async <T>(url: string, opts: ApiRequestOptions = {}): Promise<T> => {
  const { cacheKey = url, ttlMs = 1000 * 30, timeoutMs = 3500 } = opts;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Failed request ${url}: ${res.status}`);
    const json = (await res.json()) as T;
    setCached(cacheKey, json, ttlMs);
    return json;
  } finally {
    clearTimeout(timer);
  }
};

export const resetApiCache = () => cache.clear();
