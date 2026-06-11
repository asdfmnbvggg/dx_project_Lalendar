const MID_WEATHER_CACHE_PREFIX = "lalendar-mid-weather-v1";
const MID_LAND_FCST_URL = "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst";
const MID_TEMP_FCST_URL = "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa";
const NO_INFO = "정보 없음";

export async function fetchMidWeather({
  landRegId = import.meta.env.VITE_MID_LAND_REG_ID || "11B00000",
  tempRegId = import.meta.env.VITE_MID_TEMP_REG_ID || "11B10101",
} = {}) {
  const serviceKey = getServiceKey("VITE_MID_WEATHER_SERVICE_KEY");
  const tmFc = getLatestMidTermTmFc();
  const cacheKey = `${MID_WEATHER_CACHE_PREFIX}:${landRegId}:${tempRegId}:${tmFc}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const [landPayload, tempPayload] = await Promise.all([
    fetchMidPayload(MID_LAND_FCST_URL, { serviceKey, regId: landRegId, tmFc }, "중기육상예보"),
    fetchMidPayload(MID_TEMP_FCST_URL, { serviceKey, regId: tempRegId, tmFc }, "중기기온예보"),
  ]);

  const land = landPayload?.response?.body?.items?.item?.[0] || null;
  const temp = tempPayload?.response?.body?.items?.item?.[0] || null;
  const data = buildMidTermData(land, temp);
  writeCache(cacheKey, data);
  return data;
}

async function fetchMidPayload(endpoint, { serviceKey, regId, tmFc }, label) {
  const params = new URLSearchParams({
    pageNo: "1",
    numOfRows: "10",
    dataType: "JSON",
    regId,
    tmFc,
    serviceKey,
  });

  const response = await fetch(`${endpoint}?${params.toString()}`);
  if (!response.ok) throw new Error(`${label} API request failed: ${response.status}`);

  const payload = await response.json();
  const resultCode = payload?.response?.header?.resultCode;
  if (resultCode && resultCode !== "00") {
    throw new Error(payload?.response?.header?.resultMsg || `${label} API resultCode ${resultCode}`);
  }
  return payload;
}

function buildMidTermData(land, temp) {
  if (!land && !temp) return [];

  const today = getKstDateStart();

  return Array.from({ length: 7 }, (_, index) => {
    const dayOffset = index + 4;
    const date = toDateKey(addDays(today, dayOffset));
    const amWeather = land?.[`wf${dayOffset}Am`] ?? land?.[`wf${dayOffset}`];
    const pmWeather = land?.[`wf${dayOffset}Pm`] ?? land?.[`wf${dayOffset}`];
    const weatherText = [amWeather, pmWeather].filter(Boolean).join(" / ") || NO_INFO;
    const weather = {
      date,
      minTemp: toNumberOrNull(temp?.[`taMin${dayOffset}`]),
      maxTemp: toNumberOrNull(temp?.[`taMax${dayOffset}`]),
      pop: null,
      humidity: null,
      sky: toMidSkyLabel(weatherText),
      pty: toMidPtyLabel(weatherText),
      icon: toMidIcon(weatherText),
      source: "MID_TERM",
    };

    return {
      ...weather,
      weatherText,
      hasWeatherData: hasRequiredWeatherData(weather),
    };
  });
}

function getLatestMidTermTmFc(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = kst.getUTCHours();
  const date = hour < 6 ? addDays(kst, -1) : kst;
  const time = hour < 6 ? "1800" : hour < 18 ? "0600" : "1800";
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}${time}`;
}

function getKstDateStart() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function toDateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toMidSkyLabel(text) {
  if (/맑/.test(text)) return "맑음";
  if (/흐림|흐리고/.test(text)) return "흐림";
  if (/구름/.test(text)) return "구름많음";
  return text || NO_INFO;
}

function toMidPtyLabel(text) {
  if (/눈/.test(text)) return "눈";
  if (/비|소나기/.test(text)) return "비";
  return "강수 없음";
}

function toMidIcon(text) {
  if (/눈/.test(text)) return "snow";
  if (/비|소나기/.test(text)) return "rain";
  if (/맑/.test(text)) return "sunny";
  if (/구름/.test(text)) return "partly_cloudy";
  return "cloudy";
}

function hasRequiredWeatherData(weather) {
  return Number.isFinite(weather.minTemp) || Number.isFinite(weather.maxTemp) || weather.sky !== NO_INFO || weather.pty !== NO_INFO;
}

function getServiceKey(name) {
  const value = import.meta.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function readCache(key) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(key));
    if (cached && Date.now() - cached.createdAt < 1000 * 60 * 60 * 6) return cached.value;
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
