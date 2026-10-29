const TECHNICAL_ERROR_PATTERNS = [
  "fetch failed",
  "failed to fetch",
  "network request failed",
  "network error",
  "internal server error",
  "trpc",
  "unauthorized",
  "forbidden",
  "bad request",
  "syntaxerror",
  "undefined",
  "null",
];

/** Convert unknown mutation/query failures into concise, user-facing guidance. */
export function getUserFacingError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : "";
  const normalized = message.toLowerCase();

  if (!message || TECHNICAL_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return fallback;
  }

  return message.length <= 160 ? message : fallback;
}
