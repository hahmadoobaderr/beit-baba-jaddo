// Minimal in-process cache. Good enough for a single Node server instance;
// swap for Redis/Upstash if the app is deployed across multiple instances.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

function fullKey(namespace: string, key: string): string {
  return `${namespace}::${key}`;
}

export function getCached<T>(namespace: string, key: string): T | undefined {
  const entry = store.get(fullKey(namespace, key));
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(fullKey(namespace, key));
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(namespace: string, key: string, value: T, ttlMs: number): void {
  store.set(fullKey(namespace, key), { value, expiresAt: Date.now() + ttlMs });
}

export function invalidate(namespace: string, key?: string): void {
  if (key) {
    store.delete(fullKey(namespace, key));
    return;
  }
  for (const k of store.keys()) {
    if (k.startsWith(`${namespace}::`)) store.delete(k);
  }
}

export function cacheStats(): { size: number } {
  return { size: store.size };
}
