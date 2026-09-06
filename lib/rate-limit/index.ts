// In-memory rate limiting keyed by a client identifier (IP or session id).
// Good enough for a single-instance deployment; swap for a shared store
// (Redis/Upstash) behind this same interface for multi-instance use.

interface Bucket {
  count: number;
  windowStart: number;
  lastRequestAt: number;
}

const buckets = new Map<string, Bucket>();

export const RATE_LIMIT = {
  windowMs: 60_000,
  maxRequestsPerWindow: 10,
  minCooldownMs: 2_000,
  maxCharactersPerRequest: 20_000,
};

export interface RateLimitResult {
  allowed: boolean;
  reason?: "cooldown" | "window_exceeded";
  retryAfterMs?: number;
}

export interface RateLimitOverrides {
  windowMs?: number;
  maxRequestsPerWindow?: number;
  minCooldownMs?: number;
}

export function checkRateLimit(clientId: string, overrides: RateLimitOverrides = {}): RateLimitResult {
  const windowMs = overrides.windowMs ?? RATE_LIMIT.windowMs;
  const maxRequestsPerWindow = overrides.maxRequestsPerWindow ?? RATE_LIMIT.maxRequestsPerWindow;
  const minCooldownMs = overrides.minCooldownMs ?? RATE_LIMIT.minCooldownMs;

  const now = Date.now();
  const bucket = buckets.get(clientId);

  if (!bucket) {
    buckets.set(clientId, { count: 1, windowStart: now, lastRequestAt: now });
    return { allowed: true };
  }

  if (now - bucket.lastRequestAt < minCooldownMs) {
    return {
      allowed: false,
      reason: "cooldown",
      retryAfterMs: minCooldownMs - (now - bucket.lastRequestAt),
    };
  }

  if (now - bucket.windowStart > windowMs) {
    bucket.windowStart = now;
    bucket.count = 0;
  }

  if (bucket.count >= maxRequestsPerWindow) {
    return {
      allowed: false,
      reason: "window_exceeded",
      retryAfterMs: windowMs - (now - bucket.windowStart),
    };
  }

  bucket.count += 1;
  bucket.lastRequestAt = now;
  return { allowed: true };
}

export function clientIdFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "anonymous";
}

/** Retries a flaky async call with exponential backoff. */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 500;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
      }
    }
  }
  throw lastError;
}
