import { controlThinQDevice, ThinQRequestError } from "../../../../server/thinqIntegrationService";

export default async function handler(request: any, response: any) {
  if (request.method !== "POST") {
    response.status(405).send("Method Not Allowed");
    return;
  }

  const deviceId = request.query.deviceId;

  try {
    response.status(200).json(await controlThinQDevice(String(deviceId), request.body));
  } catch (error) {
    handleThinQError(error, response);
  }
}

function handleThinQError(error: unknown, response: any) {
  if (error instanceof Error && error.message === "THINQ_PAT is not configured") {
    response.status(500).send("THINQ_PAT is not configured");
    return;
  }

  if (error instanceof ThinQRequestError) {
    response.status(error.status).send(error.message);
    return;
  }

  response.status(500).send(error instanceof Error ? error.message : "ThinQ API request failed");
}
