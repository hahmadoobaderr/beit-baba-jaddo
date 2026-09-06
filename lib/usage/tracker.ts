import type { UsageEvent } from "@/types";

// In-memory usage ledger. Swap for a persisted table (see UsageRecord in
// README's suggested Prisma schema) once multi-instance deployment or
// long-term reporting is needed.

const events: UsageEvent[] = [];
const MAX_EVENTS = 5000;

/**
 * Provider pricing is NOT hard-coded into business logic — it lives here,
 * in one place, and can be updated without touching callers. Figures are
 * approximate list prices (USD) and only used for the "estimated cost"
 * shown in the admin panel; they are never used to block or gate usage.
 */
export const PRICING_USD_PER_1K_CHARS: Record<string, number> = {
  eleven_v3: 0.24,
  eleven_multilingual_v2: 0.18,
  eleven_flash_v2_5: 0.06,
};

export function estimateCost(model: string, characters: number): number | undefined {
  const rate = PRICING_USD_PER_1K_CHARS[model];
  if (rate === undefined) return undefined;
  return Number(((characters / 1000) * rate).toFixed(4));
}

export function recordUsage(event: Omit<UsageEvent, "timestamp">): UsageEvent {
  const full: UsageEvent = { ...event, timestamp: new Date().toISOString() };
  events.push(full);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  return full;
}

export function getUsageSummary(): {
  totalGenerations: number;
  totalCharactersAnalyzed: number;
  totalCharactersSynthesized: number;
  totalEstimatedCostUsd: number;
  byModel: Record<string, { generations: number; characters: number; costUsd: number }>;
} {
  const byModel: Record<string, { generations: number; characters: number; costUsd: number }> = {};
  let totalCharactersAnalyzed = 0;
  let totalCharactersSynthesized = 0;
  let totalEstimatedCostUsd = 0;

  for (const e of events) {
    totalCharactersAnalyzed += e.charactersAnalyzed;
    totalCharactersSynthesized += e.charactersSynthesized;
    totalEstimatedCostUsd += e.estimatedCostUsd ?? 0;
    const bucket = (byModel[e.model] ??= { generations: 0, characters: 0, costUsd: 0 });
    bucket.generations += 1;
    bucket.characters += e.charactersSynthesized;
    bucket.costUsd += e.estimatedCostUsd ?? 0;
  }

  return {
    totalGenerations: events.length,
    totalCharactersAnalyzed,
    totalCharactersSynthesized,
    totalEstimatedCostUsd: Number(totalEstimatedCostUsd.toFixed(4)),
    byModel,
  };
}

export function getRecentUsage(limit = 20): UsageEvent[] {
  return events.slice(-limit).reverse();
}
