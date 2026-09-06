import { NextRequest, NextResponse } from "next/server";
import { GenerationRequestSchema } from "@/lib/ai/schemas";
import { generateVoice } from "@/lib/generation/pipeline";
import { checkRateLimit, clientIdFromRequest, retryWithBackoff, RATE_LIMIT } from "@/lib/rate-limit";
import { toErrorResponse, invalidInputError, rateLimitedError, generationFailedError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const clientId = clientIdFromRequest(req);
    const rate = checkRateLimit(`${clientId}:generate`);
    if (!rate.allowed) throw rateLimitedError(rate.retryAfterMs);

    const json = await req.json().catch(() => {
      throw invalidInputError("body was not valid JSON");
    });

    const parsed = GenerationRequestSchema.safeParse(json);
    if (!parsed.success) {
      throw invalidInputError(parsed.error.issues[0]?.message);
    }
    if (parsed.data.text.length > RATE_LIMIT.maxCharactersPerRequest) {
      throw invalidInputError("text is too long");
    }

    const result = await retryWithBackoff(() => generateVoice(parsed.data), {
      retries: 2,
      baseDelayMs: 600,
    }).catch((err) => {
      console.error("[api/generate] failed after retries:", err);
      throw generationFailedError();
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
