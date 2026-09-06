import { NextRequest, NextResponse } from "next/server";
import { getVoices } from "@/lib/tts";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";
    const { voices, provider, cachedAt } = await getVoices(forceRefresh);
    return NextResponse.json({ voices, provider, cachedAt });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
