import { NextRequest, NextResponse } from "next/server";
import { AnalyzeRequestSchema } from "@/lib/ai/schemas";
import { analyzeText } from "@/lib/generation/pipeline";
import { checkRateLimit, clientIdFromRequest, RATE_LIMIT } from "@/lib/rate-limit";
import { toErrorResponse, invalidInputError, rateLimitedError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const clientId = clientIdFromRequest(req);
    // Analysis is debounced client-side as the user types, so it needs a
    // much shorter cooldown than generation — otherwise normal typing
    // pauses would trip the same limiter meant for repeated TTS calls.
    const rate = checkRateLimit(`${clientId}:analyze`, { minCooldownMs: 300, maxRequestsPerWindow: 40 });
    if (!rate.allowed) throw rateLimitedError(rate.retryAfterMs);

    const json = await req.json().catch(() => {
      throw invalidInputError("body was not valid JSON");
    });

    const parsed = AnalyzeRequestSchema.safeParse(json);
    if (!parsed.success) {
      throw invalidInputError(parsed.error.issues[0]?.message);
    }
    if (parsed.data.text.length > RATE_LIMIT.maxCharactersPerRequest) {
      throw invalidInputError("text is too long");
    }

    const outcome = await analyzeText(parsed.data);

    return NextResponse.json({
      analysis: outcome.profile,
      voice: outcome.selectedVoice.voice,
      matchScore: outcome.selectedVoice.matchScore,
      matchReasons: outcome.selectedVoice.matchReasons,
      aiProvider: outcome.provider,
    });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
