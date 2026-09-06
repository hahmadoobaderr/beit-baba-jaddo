import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { toErrorResponse, AppError } from "@/lib/errors";

const ROOT = path.resolve(__dirname, "..");

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "legacy", "public", "__tests__"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

describe("Security — ElevenLabs API key never reaches the client", () => {
  const allFiles = walk(ROOT);
  // Anything that isn't a server-only module: components, client pages, and
  // any app/ file that isn't under app/api/.
  const clientSurfaceFiles = allFiles.filter((f) => {
    const rel = path.relative(ROOT, f);
    if (rel.startsWith("components" + path.sep)) return true;
    if (rel.startsWith("app" + path.sep) && !rel.startsWith(path.join("app", "api"))) return true;
    return false;
  });

  it("never references ELEVENLABS_API_KEY outside server-only modules", () => {
    const offenders = clientSurfaceFiles.filter((f) => fs.readFileSync(f, "utf-8").includes("ELEVENLABS_API_KEY"));
    expect(offenders).toEqual([]);
  });

  it("never references AI_API_KEY outside server-only modules", () => {
    const offenders = clientSurfaceFiles.filter((f) => fs.readFileSync(f, "utf-8").includes("AI_API_KEY"));
    expect(offenders).toEqual([]);
  });

  it("the raw ElevenLabs fetch call lives only in lib/tts/elevenlabs.ts", () => {
    const files = allFiles.filter((f) => fs.readFileSync(f, "utf-8").includes("api.elevenlabs.io"));
    expect(files).toEqual([path.join(ROOT, "lib", "tts", "elevenlabs.ts")]);
  });

  it("no client component ('use client') imports the ElevenLabs provider directly", () => {
    const offenders = clientSurfaceFiles.filter((f) => {
      const content = fs.readFileSync(f, "utf-8");
      return content.includes('"use client"') && content.includes("lib/tts/elevenlabs");
    });
    expect(offenders).toEqual([]);
  });
});

describe("Security — error responses never leak internals", () => {
  it("wraps an arbitrary internal error into a safe generic message", () => {
    const { status, body } = toErrorResponse(new Error("ECONNREFUSED 10.0.0.5:443 secret-internal-detail"));
    expect(status).toBe(500);
    expect(body.error).not.toContain("secret-internal-detail");
    expect(body.error).not.toContain("ECONNREFUSED");
  });

  it("preserves the intended status/message for a deliberate AppError", () => {
    const { status, body } = toErrorResponse(new AppError("Friendly message", 429, "rate_limited"));
    expect(status).toBe(429);
    expect(body.error).toBe("Friendly message");
    expect(body.code).toBe("rate_limited");
  });
});
