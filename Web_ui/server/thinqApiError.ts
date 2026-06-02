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
    response.status(500).send("THINQ_PAT is not configured");
    return;
  }

  if (error instanceof Error && error.message === "THINQ_CLIENT_ID is not configured") {
    response.status(500).send("THINQ_CLIENT_ID is not configured");
    return;
  }

  if (error instanceof ThinQRequestError || isThinQErrorLike(error)) {
    const status = typeof error.status === "number" ? error.status : 500;
    const message = typeof error.message === "string" ? error.message : "ThinQ API request failed";
    response.status(status).json({ message });
    return;
  }

  response.status(500).json({
    message: "Unknown ThinQ API error",
  });
}
