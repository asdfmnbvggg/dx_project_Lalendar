import { ThinQRequestError } from "./thinqIntegrationService.js";

type ThinQErrorLike = {
  status?: number;
  message?: string;
  responseBody?: unknown;
};

function isThinQErrorLike(error: unknown): error is ThinQErrorLike {
  return typeof error === "object" && error !== null;
}

export function handleThinQError(error: unknown, response: any) {
  if (error instanceof Error && error.message === "THINQ_PAT is not configured") {
    response.status(500).json({ message: "THINQ_PAT is not configured" });
    return;
  }

  if (error instanceof Error && error.message === "THINQ_CLIENT_ID is not configured") {
    response.status(500).json({ message: "THINQ_CLIENT_ID is not configured" });
    return;
  }

  if (error instanceof Error && error.message === "THINQ_FIXED_API_KEY is not configured") {
    response.status(500).json({ message: "THINQ_FIXED_API_KEY is not configured" });
    return;
  }

  if (error instanceof ThinQRequestError || isThinQErrorLike(error)) {
    const status = typeof error.status === "number" ? error.status : 500;
    const message = typeof error.message === "string" ? error.message : "ThinQ API request failed";

    if (status === 401) {
      response.status(401).json({
        message: "ThinQ API authentication failed",
        status: 401,
      });
      return;
    }

    if (status === 400) {
      response.status(400).json({
        message,
        status: 400,
        responseBody: sanitizeResponseBody(error.responseBody),
      });
      return;
    }

    response.status(status).json({ message, status });
    return;
  }

  response.status(500).json({
    message: "Unknown ThinQ API error",
  });
}

function sanitizeResponseBody(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(THINQ_PAT|access_token|token|authorization)(["'\s:=]+)([^"',\s}]+)/gi, "$1$2[REDACTED]")
    .slice(0, 500);
}
