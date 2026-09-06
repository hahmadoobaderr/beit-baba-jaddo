// Centralized, user-facing error messages. Never leak stack traces or raw
// provider errors to the client — log the technical detail server-side
// and return one of these instead.

export class AppError extends Error {
  constructor(
    public userMessage: string,
    public status: number = 500,
    public code: string = "internal_error"
  ) {
    super(userMessage);
  }
}

export function notConfiguredError(): AppError {
  return new AppError(
    "ElevenLabs isn't connected yet. Add your ElevenLabs API key to continue.",
    503,
    "provider_not_configured"
  );
}

export function generationFailedError(): AppError {
  return new AppError(
    "We couldn't generate the voice this time. Your text is safe — please try again.",
    502,
    "generation_failed"
  );
}

export function rateLimitedError(retryAfterMs?: number): AppError {
  const seconds = retryAfterMs ? Math.ceil(retryAfterMs / 1000) : undefined;
  return new AppError(
    seconds
      ? `You're generating a little too fast. Please wait ${seconds}s and try again.`
      : "You're generating a little too fast. Please slow down and try again.",
    429,
    "rate_limited"
  );
}

export function invalidInputError(detail?: string): AppError {
  return new AppError(
    detail ? `We couldn't read that request: ${detail}` : "That request didn't look right — please try again.",
    400,
    "invalid_input"
  );
}

export function toErrorResponse(err: unknown): { status: number; body: { error: string; code: string } } {
  if (err instanceof AppError) {
    return { status: err.status, body: { error: err.userMessage, code: err.code } };
  }
  console.error("[unhandled]", err);
  return {
    status: 500,
    body: { error: "Something went wrong on our end. Your text is safe — please try again.", code: "internal_error" },
  };
}
