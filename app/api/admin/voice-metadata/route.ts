import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { saveOverride } from "@/lib/voices/store";
import { invalidate } from "@/lib/cache/memory";
import { toErrorResponse, invalidInputError } from "@/lib/errors";

const OverrideSchema = z.object({
  voiceId: z.string().min(1),
  gender: z.enum(["male", "female", "neutral"]).optional(),
  age: z.enum(["child", "young_adult", "adult", "middle_aged", "senior"]).optional(),
  languages: z.array(z.string()).optional(),
  accents: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => {
      throw invalidInputError("body was not valid JSON");
    });
    const parsed = OverrideSchema.safeParse(json);
    if (!parsed.success) throw invalidInputError(parsed.error.issues[0]?.message);

    const { voiceId, ...override } = parsed.data;
    saveOverride(voiceId, override);
    invalidate("voices", "list");

    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
