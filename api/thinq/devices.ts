import { getThinQDevices } from "../../server/thinqIntegrationService.js";
import { handleThinQError } from "../../server/thinqApiError.js";

export default async function handler(request: any, response: any) {
  if (request.method !== "GET") {
    response.status(405).send("Method Not Allowed");
    return;
  }

  try {
    response.status(200).json(await getThinQDevices());
  } catch (error) {
    handleThinQError(error, response);
  }
}
