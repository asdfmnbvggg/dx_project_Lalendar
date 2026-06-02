const DEFAULT_COUNTRY = "KR";
const DEFAULT_API_BASE_URL = "https://api-kic.lgthinq.com";
const AUTH_FAILURE_MESSAGE = "ThinQ API authentication failed. This API may require x-api-key in addition to PAT.";

export async function getThinQDevices() {
  const result = await requestThinQ("/devices");
  return normalizeDeviceList(result);
}

export async function getThinQDeviceState(deviceId: string) {
  return requestThinQ(`/devices/${encodeURIComponent(deviceId)}/state`);
}

export async function controlThinQDevice(deviceId: string, payload: unknown) {
  const body = extractControlPayload(parsePayload(payload));
  assertNonEmptyPayload(body);

  return requestThinQ(`/devices/${encodeURIComponent(deviceId)}/control`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function subscribeThinQDeviceEvent(deviceId: string, payload: unknown) {
  const body = normalizeEventSubscribePayload(parsePayload(payload));

  return requestThinQ(`/event/${encodeURIComponent(deviceId)}/subscribe`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function subscribeThinQDevicePush(deviceId: string, payload: unknown) {
  const body = parsePayload(payload);

  return requestThinQ(`/push/${encodeURIComponent(deviceId)}/subscribe`, {
    method: "POST",
    body: JSON.stringify(body || {}),
  });
}

export async function getThinQDeviceEnergyUsage(deviceId: string) {
  // TODO: Wire this to the official ThinQ energy endpoint when LG documents the path for this API tier.
  return {
    deviceId,
    status: "not_ready",
    message: "전력량 조회 준비 중",
  };
}

async function requestThinQ(path: string, init: RequestInit = {}) {
  const baseUrl = process.env.THINQ_API_BASE_URL || DEFAULT_API_BASE_URL;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...createThinQHeaders(),
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  const body = parseJson(text);

  if (!response.ok) {
    logThinQFailure(path, response.status, response.statusText, text);

    if (response.status === 401 || response.status === 403) {
      console.error(AUTH_FAILURE_MESSAGE);
      throw new ThinQRequestError(AUTH_FAILURE_MESSAGE, response.status);
    }

    const message = body?.message || body?.error || text || `ThinQ API request failed: ${response.status}`;
    throw new ThinQRequestError(message, response.status);
  }

  return body ?? {};
}

export function createThinQHeaders() {
  const pat = process.env.THINQ_PAT;
  const clientId = process.env.THINQ_CLIENT_ID;
  const country = process.env.THINQ_COUNTRY || DEFAULT_COUNTRY;

  if (!pat) {
    throw new Error("THINQ_PAT is not configured");
  }

  if (!clientId) {
    throw new Error("THINQ_CLIENT_ID is not configured");
  }

  return {
    Authorization: `Bearer ${pat}`,
    "Content-Type": "application/json",
    "x-message-id": createMessageId(),
    "x-country": country,
    "x-client-id": clientId,
  };
}

function normalizeDeviceList(result: any) {
  const devices = result?.devices || result?.items || result?.response?.devices || result?.result?.devices || result;
  if (!Array.isArray(devices)) return [];

  return devices.map((device) => ({
    deviceId: device.deviceId || device.id || device.device_id,
    deviceType: device.deviceType || device.type || device.category || "",
    modelName: device.modelName || device.model || "",
    alias: device.alias || device.name || device.deviceName || "",
    reportable: Boolean(device.reportable),
    raw: device,
  }));
}

function assertNonEmptyPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || !Object.keys(payload as Record<string, unknown>).length) {
    throw new ThinQRequestError("ThinQ control payload is required", 400);
  }
}

function parsePayload(payload: unknown) {
  if (typeof payload !== "string") return payload;

  try {
    return JSON.parse(payload);
  } catch {
    throw new ThinQRequestError("Request body must be valid JSON", 400);
  }
}

function extractControlPayload(body: unknown) {
  if (body && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "payload")) {
    return (body as { payload?: unknown }).payload;
  }

  return body;
}

function normalizeEventSubscribePayload(payload: unknown) {
  const body = payload && typeof payload === "object" ? (payload as any) : {};
  const timer = Number(body?.expire?.timer ?? 1);

  if (!Number.isInteger(timer) || timer < 1 || timer > 24) {
    throw new ThinQRequestError("expire.timer must be an integer between 1 and 24", 400);
  }

  return {
    ...body,
    expire: {
      unit: body?.expire?.unit || "HOUR",
      timer,
    },
  };
}

function logThinQFailure(path: string, status: number, reason: string, responseText: string) {
  console.error("ThinQ API request failed", {
    path,
    status,
    reason,
    responseBody: responseText.slice(0, 500),
  });
}

function createMessageId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 22 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function parseJson(text: string) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export class ThinQRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ThinQRequestError";
    this.status = status;
  }
}
