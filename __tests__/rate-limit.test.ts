import { describe, it, expect, vi } from "vitest";
import { checkRateLimit, retryWithBackoff } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows the first request from a new client", () => {
    const result = checkRateLimit(`client-${Math.random()}`);
    expect(result.allowed).toBe(true);
  });

  it("blocks a second request within the cooldown window", () => {
    const clientId = `client-${Math.random()}`;
    checkRateLimit(clientId, { minCooldownMs: 5000 });
    const second = checkRateLimit(clientId, { minCooldownMs: 5000 });
    expect(second.allowed).toBe(false);
    expect(second.reason).toBe("cooldown");
    expect(second.retryAfterMs).toBeGreaterThan(0);
  });

  it("blocks once the per-window request count is exceeded", () => {
    const clientId = `client-${Math.random()}`;
    let last;
    for (let i = 0; i < 5; i++) {
      last = checkRateLimit(clientId, { minCooldownMs: 0, maxRequestsPerWindow: 3 });
    }
    expect(last!.allowed).toBe(false);
    expect(last!.reason).toBe("window_exceeded");
  });

  it("keeps separate clients independent", () => {
    const a = checkRateLimit(`a-${Math.random()}`, { minCooldownMs: 10_000 });
    const b = checkRateLimit(`b-${Math.random()}`, { minCooldownMs: 10_000 });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });
});

describe("retryWithBackoff", () => {
  it("returns the result immediately on success", async () => {
    const result = await retryWithBackoff(async () => "ok");
    expect(result).toBe("ok");
  });

  it("retries on failure and eventually succeeds", async () => {
    let attempts = 0;
    const result = await retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("simulated transient failure");
        return "recovered";
      },
      { retries: 3, baseDelayMs: 1 }
    );
    expect(result).toBe("recovered");
    expect(attempts).toBe(3);
  });

  it("throws the last error once retries are exhausted (simulated API timeout)", async () => {
    const fn = vi.fn(async () => {
      throw new Error("timeout");
    });
    await expect(retryWithBackoff(fn, { retries: 2, baseDelayMs: 1 })).rejects.toThrow("timeout");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
