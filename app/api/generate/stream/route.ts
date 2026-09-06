import { NextRequest, NextResponse } from "next/server";
import { GenerationRequestSchema } from "@/lib/ai/schemas";
import { analyzeText } from "@/lib/generation/pipeline";
import { getTTSProvider, resolveModelId } from "@/lib/tts";
import { buildTTSMarkup } from "@/lib/tts/markup";
import { checkRateLimit, clientIdFromRequest, RATE_LIMIT } from "@/lib/rate-limit";
import { toErrorResponse, invalidInputError, rateLimitedError, generationFailedError } from "@/lib/errors";

/**
 * Streaming generation endpoint: the response body IS the audio (as soon
 * as ElevenLabs starts producing bytes), so the player can begin playback
 * before the full file exists. Because the body is pure audio, the
 * Director analysis + selected voice ride along as a base64 JSON header
 * (`x-voicemood-analysis`) instead of a JSON envelope.
 */
export async function POST(req: NextRequest) {
  try {
    const clientId = clientIdFromRequest(req);
    const rate = checkRateLimit(`${clientId}:generate`);
    if (!rate.allowed) throw rateLimitedError(rate.retryAfterMs);

    const json = await req.json().catch(() => {
      throw invalidInputError("body was not valid JSON");
    });
    const parsed = GenerationRequestSchema.safeParse(json);
    if (!parsed.success) throw invalidInputError(parsed.error.issues[0]?.message);
    if (parsed.data.text.length > RATE_LIMIT.maxCharactersPerRequest) {
      throw invalidInputError("text is too long");
    }

    const outcome = await analyzeText(parsed.data);
    const provider = getTTSProvider();
    const modelId = resolveModelId(parsed.data.qualityMode);
    const markup = buildTTSMarkup(outcome.profile);

    const stream = await provider.synthesizeStream({
      text: markup,
      voiceId: outcome.selectedVoice.voice.voiceId,
      modelId,
      languageCode: outcome.profile.language === "mixed" ? undefined : outcome.profile.language,
      advanced: parsed.data.advanced,
    }).catch((err) => {
      console.error("[api/generate/stream] provider error:", err);
      throw generationFailedError();
    });

    const headerPayload = Buffer.from(
      JSON.stringify({
        analysis: outcome.profile,
        voice: outcome.selectedVoice.voice,
        model: modelId,
        provider: provider.name,
      })
    ).toString("base64");

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": provider.name === "mock" ? "audio/wav" : "audio/mpeg",
        "x-voicemood-analysis": headerPayload,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
