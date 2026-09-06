# VoiceMood AI

**Don't just read the words. Feel them.**

VoiceMood AI is an AI-powered emotional text-to-speech studio. It is not a
"text box + Play button." Between the user's words and the generated
speech sits an **AI Voice Director**: it reads the message, decides what
it actually means, and produces a structured performance plan — emotion,
pacing, pitch, warmth, pauses, emphasis — that a voice actor would use.
That plan, not the raw text, is what gets sent to [ElevenLabs](https://elevenlabs.io).

```
Write text
   -> AI understands it (Voice Director)
   -> AI decides how it should sound (Director JSON)
   -> AI chooses the appropriate voice (VoiceMatcher)
   -> ElevenLabs performs it
   -> User listens
```

A business announcement sounds professional. A flirty text sounds
playful and teasing, never overacted. A eulogy sounds restrained. The
same engine produces all of them from the same pipeline, because the
Director analyzes context and emotion per message — and per sentence.

---

## 1. Architecture

```
app/
  page.tsx                 Landing page
  studio/                  Main creation UI
  history/                 Generation history (localStorage-backed)
  voices/                  Voice library / browser
  settings/                Admin panel (provider status, voice metadata editor)
  api/
    analyze/               Run the Director + VoiceMatcher only (no TTS call)
    generate/               Full pipeline -> audio file
    generate/stream/         Streaming variant (audio starts playing before it's finished)
    voices/                 List/cache available voices
    voices/preview/         Resolve a voice's preview URL
    admin/status/           Provider connection + usage status
    admin/voice-metadata/   Save an admin override for one voice

components/                 VoiceStudio, TextEditor, DirectorPanel, VoiceSelector,
                             VoiceCard, EmotionBadge, AudioPlayer, GenerationHistory,
                             AdvancedControls, StylePresets, Header, theme/locale providers

lib/
  ai/
    director.ts             Voice Director: calls Anthropic, or a rule-based mock
    prompts.ts               System prompt + emotion -> ElevenLabs tag map
    schemas.ts               Zod schemas — nothing from the AI is trusted unvalidated
  tts/
    provider.ts              TTSProvider interface + model-tier mapping
    elevenlabs.ts             Real ElevenLabs REST client (server-only)
    mock.ts                   Isolated mock provider (real playable WAV tones)
    markup.ts                 Builds the final tagged string sent to the TTS engine
    index.ts                  Picks the active provider + caches the voice list
  voices/
    matcher.ts               VoiceMatcher — scores/ranks real voices, never invents one
    metadata.ts               Classifies raw provider voices into our schema
    store.ts                  Admin metadata overrides (JSON file, swappable for a DB)
  audio/
    chunker.ts                Paragraph -> sentence -> clause chunking for long text
    processor.ts               Pronunciation dictionary + number/currency normalization
  generation/pipeline.ts      Orchestrates: Director -> VoiceMatcher -> TTS -> file
  usage/tracker.ts            Usage ledger + configurable cost estimation
  rate-limit/                In-memory rate limiting + retry-with-backoff
  cache/memory.ts             In-process TTL cache
  presets.ts                  Style presets + demo examples
  i18n.ts                     UI-chrome localization (EN/AR)

types/index.ts                Shared domain types
__tests__/                    Vitest suite (director, matcher, chunker, schemas, security, ...)
```

### Request flow (`POST /api/generate`)

1. Validate the request body with Zod (`lib/ai/schemas.ts`).
2. Rate-limit the caller (per-endpoint buckets, see `lib/rate-limit`).
3. Run the **Voice Director** (`lib/ai/director.ts`) — Anthropic if
   `AI_API_KEY` is set, otherwise a rule-based mock.
4. Validate the Director's JSON against `DirectorProfileSchema`. If the
   segments don't faithfully reconstruct the original text, fall back to a
   single segment carrying the whole text — nothing spoken is ever
   invented or dropped.
5. Match a voice with `lib/voices/matcher.ts` against the real voices
   returned by the provider (never a hard-coded/invented voice ID).
6. Build the TTS markup (`lib/tts/markup.ts`): inline audio tags +
   pronunciation/number preprocessing, always on the user's exact words.
7. Call ElevenLabs (or the mock provider), write the audio to
   `public/generated/<id>.mp3`, record usage, and return the result.

---

## 2. Install & configure

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Required for real speech. Get a key at https://elevenlabs.io
ELEVENLABS_API_KEY=

# Optional — powers the real AI Voice Director (Anthropic). Without it,
# the app automatically falls back to a rule-based mock director so the
# whole product stays demoable with zero credentials.
AI_API_KEY=
AI_MODEL=claude-sonnet-5

DEFAULT_TTS_MODEL=eleven_v3
```

Both keys are read **only** on the server (`lib/tts/elevenlabs.ts`,
`lib/ai/director.ts`). They are never sent to the browser, embedded in
HTML, or logged — see `__tests__/security.test.ts`, which statically
scans every client-facing file to enforce this.

## 3. Run

```bash
npm run dev       # http://localhost:3000
npm run build     # production build
npm start         # serve the production build
npm test          # vitest suite
npm run lint
```

With no keys configured at all, the app runs fully on:
- a **rule-based mock Voice Director** (keyword/heuristic analysis — genuinely
  differentiates business/flirty/romantic/motivational text, but is not the
  real model),
- a **mock TTS provider** that synthesizes a real, playable, pitch/duration-varying
  WAV tone so the audio player, waveform, history and downloads all work
  end-to-end.

Add `ELEVENLABS_API_KEY` for real speech; add `AI_API_KEY` for the real
Claude-powered Director. You can mix — e.g. real ElevenLabs audio with the
mock Director, or vice versa.

## 4. The four critical test cases

The product is only "working" if these sound distinctly different (see
`__tests__/director.test.ts`, which asserts this automatically for the
mock Director):

| Text | Expected |
|---|---|
| "Dear colleagues, I am pleased to announce that our project has successfully reached the next phase." | Professional, confident, formal |
| "ليش كل ما أشوفك أنسى وش كنت أبي أقول؟" | Natural Gulf/Saudi conversational, flirty |
| "I don't know why, but every time you smile, I forget what I was going to say." | Warm, playful, flirty — not exaggerated |
| "You can do this. You've made it this far. Don't stop now." | Energetic, inspirational |

If all four sound the same, the Director isn't doing its job — see
`lib/ai/director.ts` and `lib/ai/prompts.ts`.

## 5. How the Voice Director works

`lib/ai/director.ts` sends the user's text (plus any style preset or
"director override" instruction) to Anthropic using the system prompt in
`lib/ai/prompts.ts`. The model is instructed to:

- **never** change, add, or remove words — only decide *how* they're said,
- break the text into sentence-level segments so a performance can evolve
  (calm -> concerned -> dramatic) instead of staying flat,
- use the *minimum* emotional intensity the text actually calls for
  (friendly ≠ playful ≠ teasing ≠ flirty ≠ romantic ≠ intimate),
- attach ElevenLabs v3 audio tags (`[whispers]`, `[sighs]`, ...) sparingly,
  only from the configured `EMOTION_TAG_MAP`, and only when they'd
  genuinely improve the performance,
- return one strict JSON object (`DirectorProfileSchema` in `lib/ai/schemas.ts`).

The raw JSON is **never trusted**: it's Zod-validated, missing optional
fields are backfilled with safe defaults (`coerceDirectorJson`), and if the
segments don't reconstruct the original text closely enough, the whole
profile is rebuilt from the original text as a single segment. The
Director's prose (performance direction, explanation) is UI-facing only —
`lib/tts/markup.ts` guarantees it's never sent to the TTS engine as
spoken content.

If `AI_API_KEY` is unset, `runMockDirector` (same file) takes over: a
small set of keyword/context rules that still meaningfully differentiate
business/flirty/romantic/motivational/advertisement text and detect
English, Arabic, mixed, and Gulf/Saudi-dialect markers, purely so the
product is demoable without credentials.

## 6. How voices are matched

`lib/voices/matcher.ts` scores every voice ElevenLabs actually returned
(via `lib/tts/index.ts#getVoices`, cached for 30 minutes) against the
Director's profile: language, gender, age, accent/dialect, personality
overlap, and emotion-appropriate style tags. It **never invents a voice
ID** — if a previously-selected voice no longer exists, it falls back to
automatic matching instead of guessing. Administrators can correct a
voice's classification (gender/age/language/accent/style) from
`/settings`; overrides are stored in `data/voice-metadata-overrides.json`
and layered on top of the provider's data by `lib/voices/store.ts`.

## 7. How Arabic works

Arabic is treated as a first-class language, not an afterthought:

- The Director tags Arabic text with a **dialect** (`msa`, `gulf`,
  `saudi`, `egyptian`, `levantine`) only when confident; otherwise it
  returns `neutral` rather than hallucinating an accent.
- Mixed Arabic/English text is tagged `language: "mixed"` and is never
  translated — the same multilingual voice/model handles both halves.
- `VoiceMatcher` prefers a voice whose `accents` include the detected
  dialect, and falls back to any multilingual voice for mixed content.
- See the demo buttons on `/studio` for ready-to-test Arabic business,
  romantic, and flirty examples.

## 8. Adding things

**A new TTS provider** — implement the `TTSProvider` interface in
`lib/tts/provider.ts` (`listVoices`, `synthesize`, `synthesizeStream`,
`previewVoice`) and register it in `lib/tts/index.ts#getTTSProvider`.
Nothing else in the app talks to a provider directly.

**A new emotion** — add it to the `Emotion` union in `types/index.ts`,
`EmotionSchema` in `lib/ai/schemas.ts`, `EMOTION_EMOJI` in
`components/EmotionBadge.tsx`, and (optionally) `EMOTION_TAG_MAP` /
`EMOTION_STYLE_HINTS` in `lib/ai/prompts.ts` / `lib/voices/matcher.ts`.

**A new voice** — nothing to do in code. Any voice ElevenLabs returns from
`GET /v1/voices` is automatically classified (`lib/voices/metadata.ts`)
and available; refine its metadata from `/settings` if the heuristics
guess wrong.

**A new style preset** — add an entry to `STYLE_PRESETS` in
`lib/presets.ts` (label, icon, `directorHint`, default context/emotion).

## 9. Known MVP tradeoffs

- **Audio storage**: generated files are written to `public/generated/`
  on local disk. Fine for a single dev/production instance; swap for
  S3/R2/Blob storage before deploying serverless or multi-instance.
- **History/favorites**: stored in `localStorage` for the MVP (no auth
  yet), architected in `lib/store/history.ts` to be swapped for a real
  `User` + `Generation` + `FavoriteVoice` schema (Prisma + Postgres is a
  natural fit) without touching calling code.
- **Long-form chunking**: text beyond ~2,500 characters is split by
  paragraph/sentence/clause (`lib/audio/chunker.ts`) and each chunk is
  directed + synthesized separately, then concatenated. Sequential MP3
  concatenation is a pragmatic MVP choice — swap for a proper audio muxer
  (ffmpeg) if perfectly gapless chunk boundaries matter.
- **Multi-speaker dialogue**: `types/index.ts` and the Director prompt are
  written to be extended for multi-speaker scripts, but the shipped UI is
  single-speaker only, per the spec's priority order.
- **Rate limiting / usage tracking**: in-memory, per-process. Fine for one
  instance; move `lib/rate-limit` and `lib/usage/tracker.ts` to a shared
  store (Redis) for multi-instance deployments.

## 10. Security

- `ELEVENLABS_API_KEY` and `AI_API_KEY` are read only inside
  `lib/tts/elevenlabs.ts` and `lib/ai/director.ts`, both server-only
  modules never imported by a `"use client"` component.
- Every API route returns a friendly, generic error message
  (`lib/errors.ts`) — internal errors, stack traces, and provider
  responses are logged server-side only, never returned to the client.
- `__tests__/security.test.ts` statically scans every client-facing file
  for the key names and for direct imports of the ElevenLabs client, and
  asserts `toErrorResponse` never leaks an internal error's message.

## 11. Suggested persistence schema (Prisma)

Not required for the MVP (which runs on localStorage + an in-memory
cache), but this is the shape `lib/store/history.ts` and
`lib/voices/store.ts` are designed to be swapped for:

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  generations Generation[]
  favoriteVoices FavoriteVoice[]
}

model Generation {
  id         String   @id @default(cuid())
  userId     String
  text       String
  directorJson Json
  voiceId    String
  model      String
  durationS  Int
  audioUrl   String
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])
}

model VoiceMetadata {
  voiceId    String   @id
  gender     String?
  age        String?
  languages  String[]
  accents    String[]
  styles     String[]
}

model FavoriteVoice {
  id      String @id @default(cuid())
  userId  String
  voiceId String
  user    User   @relation(fields: [userId], references: [id])
}

model UsageRecord {
  id                    String   @id @default(cuid())
  model                 String
  charactersSynthesized Int
  estimatedCostUsd      Float?
  createdAt             DateTime @default(now())
}
```

## 12. Tech stack

Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS v4 ·
Zod · Anthropic SDK · ElevenLabs REST API (server-side only) · Vitest.
