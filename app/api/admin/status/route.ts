import { NextResponse } from "next/server";
import { getVoices, getTTSProvider, MODEL_TIER_MAP } from "@/lib/tts";
import { getUsageSummary } from "@/lib/usage/tracker";
import { toErrorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const provider = getTTSProvider();
    const { voices, cachedAt } = await getVoices();
    const usage = getUsageSummary();

    return NextResponse.json({
      elevenLabsConnected: provider.name === "elevenlabs",
      aiConnected: Boolean(process.env.AI_API_KEY),
      provider: provider.name,
      defaultModel: MODEL_TIER_MAP.highest_quality,
      availableModels: MODEL_TIER_MAP,
      voiceCount: voices.length,
      cachedAt,
      usage,
    });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
