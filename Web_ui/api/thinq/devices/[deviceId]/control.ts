import { controlThinQDevice } from "../../../../server/thinqIntegrationService.js";
import { handleThinQError } from "../../../../server/thinqApiError.js";

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
