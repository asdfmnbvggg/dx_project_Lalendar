const WEATHER_CACHE_PREFIX = "lalendar-weather";

export async function fetchCalendarWeather({
  nx = Number(import.meta.env.VITE_WEATHER_NX || 60),
  ny = Number(import.meta.env.VITE_WEATHER_NY || 127),
} = {}) {
  const cacheKey = `${WEATHER_CACHE_PREFIX}:${nx}:${ny}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const response = await fetch(`/api/weather?nx=${encodeURIComponent(nx)}&ny=${encodeURIComponent(ny)}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Weather API request failed: ${response.status}`);
  }

  const weatherByDate = toWeatherMap(await response.json());
  writeCache(cacheKey, weatherByDate);
  return weatherByDate;
}

function toWeatherMap(payload) {
  if (Array.isArray(payload)) {
    return Object.fromEntries(payload.map((item) => [item.date, item]));
  }

  return payload || {};
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
