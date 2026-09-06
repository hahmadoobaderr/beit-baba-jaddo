import { NextRequest, NextResponse } from "next/server";
import { getVoices } from "@/lib/tts";
import { toErrorResponse, invalidInputError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const voiceId = req.nextUrl.searchParams.get("voiceId");
    if (!voiceId) throw invalidInputError("voiceId is required");

    const { voices } = await getVoices();
    const voice = voices.find((v) => v.voiceId === voiceId);
    if (!voice) throw invalidInputError("unknown voiceId");

    return NextResponse.json({ previewUrl: voice.previewUrl ?? null });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
