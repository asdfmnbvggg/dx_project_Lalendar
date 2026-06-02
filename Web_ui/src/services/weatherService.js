const WEATHER_CACHE_PREFIX = "lalendar-weather-v2";

export async function fetchCalendarWeather({
  nx = Number(import.meta.env.VITE_WEATHER_NX || 59),
  ny = Number(import.meta.env.VITE_WEATHER_NY || 126),
} = {}) {
  const cacheKey = `${WEATHER_CACHE_PREFIX}:${nx}:${ny}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  let response;
  try {
    response = await fetch(`/api/weather?nx=${encodeURIComponent(nx)}&ny=${encodeURIComponent(ny)}`);
  } catch (error) {
    console.warn("Weather API request failed", error);
    return {};
  }

  if (!response.ok) {
    const message = await response.text();
    console.warn(message || `Weather API request failed: ${response.status}`);
    return {};
  }

  const payload = await response.json();
  if (payload?.debug) {
    console.info("Weather API debug", payload.debug);
  }

  const weatherByDate = toWeatherMap(payload);
  writeCache(cacheKey, weatherByDate);
  return weatherByDate;
}

function toWeatherMap(payload) {
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];

  if (items.length) {
    return Object.fromEntries(items.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item?.date || "")).map((item) => [item.date, item]));
  }

  return {};
}

function readCache(key) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(key));
    if (cached && Date.now() - cached.createdAt < 1000 * 60 * 60 * 2) {
      return cached.value;
    }
  } catch {
    return null;
  }
  return null;
}

function writeCache(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ createdAt: Date.now(), value }));
  } catch {
    // Storage can be unavailable in private browsing.
  }
}
