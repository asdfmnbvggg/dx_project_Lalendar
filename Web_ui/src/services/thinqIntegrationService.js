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
    body: JSON.stringify(payload || {}),
  });
}

async function requestInternalThinQ(url, init) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `ThinQ request failed: ${response.status}`);
  }

  return response.json();
}
