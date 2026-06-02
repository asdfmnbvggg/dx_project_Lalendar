export async function fetchThinQDevices() {
  return requestInternalThinQ("/api/thinq/devices");
}

export async function fetchThinQDeviceState(deviceId) {
  return requestInternalThinQ(`/api/thinq/devices/${encodeURIComponent(deviceId)}/state`);
}

export async function controlThinQDevice(deviceId, payload) {
  return requestInternalThinQ(`/api/thinq/devices/${encodeURIComponent(deviceId)}/control`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: payload || {} }),
  });
}

export async function subscribeThinQDeviceEvent(deviceId, payload = { expire: { unit: "HOUR", timer: 1 } }) {
  return requestInternalThinQ(`/api/thinq/devices/${encodeURIComponent(deviceId)}/event/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function subscribeThinQDevicePush(deviceId, payload = {}) {
  return requestInternalThinQ(`/api/thinq/devices/${encodeURIComponent(deviceId)}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchThinQDeviceEnergy(deviceId) {
  return requestInternalThinQ(`/api/thinq/devices/${encodeURIComponent(deviceId)}/energy`);
}

async function requestInternalThinQ(url, init) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `ThinQ request failed: ${response.status}`);
  }

  return response.json();
}
