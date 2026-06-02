const DEFAULT_COUNTRY = "KR";
const DEFAULT_API_BASE_URL = "https://api-kic.lgthinq.com";

export function assertThinQConfigured() {
  if (!process.env.THINQ_PAT) {
    throw new Error("THINQ_PAT is not configured");
  }
}

export async function getThinQDevices() {
  return requestThinQ("/devices");
}

export async function getThinQDeviceState(deviceId: string) {
  return requestThinQ(`/devices/${encodeURIComponent(deviceId)}/state`);
}

export async function controlThinQDevice(deviceId: string, payload: unknown) {
  return requestThinQ(`/devices/${encodeURIComponent(deviceId)}/control`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

async function requestThinQ(path: string, init: RequestInit = {}) {
  assertThinQConfigured();

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
    const message = body?.message || body?.error || text || `ThinQ API request failed: ${response.status}`;
    throw new ThinQRequestError(message, response.status);
  }

  return body ?? {};
}

export function createThinQHeaders() {
  return {
    Authorization: `Bearer ${process.env.THINQ_PAT}`,
    "Content-Type": "application/json",
    "x-message-id": createMessageId(),
    "x-country": process.env.THINQ_COUNTRY || DEFAULT_COUNTRY,
    "x-client-id": process.env.THINQ_CLIENT_ID || "",
    "x-api-key": process.env.THINQ_API_KEY || "",
  };
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
