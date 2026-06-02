import { getThinQDeviceState } from "../../../../server/thinqIntegrationService";
import { handleThinQError } from "../../../../server/thinqApiError";

export default async function handler(request: any, response: any) {
  if (request.method !== "GET") {
    response.status(405).send("Method Not Allowed");
    return;
  }

  const deviceId = request.query.deviceId;

  try {
    response.status(200).json(await getThinQDeviceState(String(deviceId)));
  } catch (error) {
    handleThinQError(error, response);
  }
}
