import type { Request, Response } from "express";

export type ServerErrorLog = {
  event: "server_error";
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  errorName: string;
  errorMessage: string;
  trpcPath?: string;
};

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return { errorName: error.name, errorMessage: error.message };
  }

  return {
    errorName: "UnknownError",
    errorMessage: typeof error === "string" ? error : "Unknown server error",
  };
}

export function getRequestId(res: Response) {
  return String(res.locals.requestId ?? "unknown");
}

export function logServerError({
  req,
  res,
  error,
  statusCode = res.statusCode >= 500 ? res.statusCode : 500,
  trpcPath,
}: {
  req: Request;
  res: Response;
  error: unknown;
  statusCode?: number;
  trpcPath?: string;
}) {
  const normalized = normalizeError(error);
  const payload: ServerErrorLog = {
    event: "server_error",
    requestId: getRequestId(res),
    method: req.method,
    path: req.path,
    statusCode,
    durationMs: Math.max(0, Date.now() - Number(res.locals.requestStartedAt ?? Date.now())),
    ...normalized,
    ...(trpcPath ? { trpcPath } : {}),
  };

  console.error(JSON.stringify(payload));
}
