import { ThinQRequestError } from "./thinqIntegrationService";

export function handleThinQError(error: unknown, response: any) {
  if (error instanceof Error && error.message === "THINQ_PAT is not configured") {
    response.status(500).send("THINQ_PAT is not configured");
    return;
  }

  if (error instanceof Error && error.message === "THINQ_CLIENT_ID is not configured") {
    response.status(500).send("THINQ_CLIENT_ID is not configured");
    return;
  }

  if (error instanceof ThinQRequestError) {
    response.status(error.status).send(error.message);
    return;
  }

  response.status(500).send(error instanceof Error ? error.message : "ThinQ API request failed");
}
