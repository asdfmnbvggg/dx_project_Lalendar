const WEATHER_CACHE_PREFIX = "l-lander-short-weather-v1";
const VILAGE_FCST_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const BASE_TIMES = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];
const NO_INFO = "정보 없음";

export async function fetchShortWeather({
  nx = Number(import.meta.env.VITE_WEATHER_NX || 59),
  ny = Number(import.meta.env.VITE_WEATHER_NY || 126),
} = {}) {
  const serviceKey = getServiceKey("VITE_WEATHER_SERVICE_KEY");
  const { baseDate, baseTime } = getLatestBaseDateTime();
  const cacheKey = `${WEATHER_CACHE_PREFIX}:${nx}:${ny}:${baseDate}:${baseTime}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    pageNo: "1",
    numOfRows: "1000",
    dataType: "JSON",
    base_date: baseDate,
    base_time: baseTime,
    nx: String(nx),
    ny: String(ny),
    serviceKey,
  });

  const payload = await fetchJson(`${VILAGE_FCST_URL}?${params.toString()}`, "단기예보");
  const items = payload?.response?.body?.items?.item;
  if (!Array.isArray(items)) return [];

  const today = getKstDateStart();
  const allowedDates = new Set(Array.from({ length: 4 }, (_, index) => toDateKey(addDays(today, index))));
  const data = summarizeShortTermForecastItems(items).filter((item) => allowedDates.has(item.date));
  writeCache(cacheKey, data);
  return data;
}

export async function fetchCalendarWeather(options = {}) {
  const data = await fetchShortWeather(options);
  return Object.fromEntries(data.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date || "")).map((item) => [item.date, item]));
}

function summarizeShortTermForecastItems(items) {
  const map = {};

  items.forEach((item) => {
    const date = toDateKeyFromApi(item.fcstDate);
    if (!date) return;

    map[date] ||= { temps: [], pop: [], humidity: [], sky: [], pty: [] };
    const value = Number(item.fcstValue);

    if (item.category === "TMP" || item.category === "T1H") map[date].temps.push(value);
    if (item.category === "POP") map[date].pop.push(value);
    if (item.category === "REH") map[date].humidity.push(value);
    if (item.category === "SKY") map[date].sky.push(String(item.fcstValue));
    if (item.category === "PTY") map[date].pty.push(String(item.fcstValue));
  });

  return Object.entries(map).map(([date, day]) => {
    const weather = {
      date,
      minTemp: min(day.temps),
      maxTemp: max(day.temps),
      pop: max(day.pop),
      humidity: max(day.humidity),
      sky: toSkyLabel(mode(day.sky)),
      pty: toPtyLabel(mode(day.pty)),
      icon: toWeatherIcon(mode(day.sky), mode(day.pty)),
      source: "SHORT_TERM",
    };

    return {
      ...weather,
      hasWeatherData: hasRequiredWeatherData(weather),
    };
  });
}

async function fetchJson(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} API request failed: ${response.status}`);

  const payload = await response.json();
  const resultCode = payload?.response?.header?.resultCode;
  if (resultCode && resultCode !== "00") {
    throw new Error(payload?.response?.header?.resultMsg || `${label} API resultCode ${resultCode}`);
  }
  return payload;
}

function getLatestBaseDateTime(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const currentMinutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const baseTime = [...BASE_TIMES].reverse().find((time) => {
    const hour = Number(time.slice(0, 2));
    return currentMinutes >= hour * 60 + 10;
  });

  if (baseTime) return { baseDate: toApiDate(kst), baseTime };

  const previousDay = addDays(kst, -1);
  return { baseDate: toApiDate(previousDay), baseTime: BASE_TIMES.at(-1) };
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

function toApiDate(date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function toDateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function toDateKeyFromApi(value) {
  const text = String(value || "");
  if (!/^\d{8}$/.test(text)) return "";
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function toSkyLabel(value) {
  return { 1: "맑음", 3: "구름많음", 4: "흐림" }[value] || NO_INFO;
}

function toPtyLabel(value) {
  return { 0: "강수 없음", 1: "비", 2: "비/눈", 3: "눈", 4: "소나기" }[value] || NO_INFO;
}

function toWeatherIcon(sky, pty) {
  if (pty && pty !== "0") return pty === "3" ? "snow" : "rain";
  return sky === "1" ? "sunny" : sky === "3" ? "partly_cloudy" : "cloudy";
}

function min(values) {
  const numbers = values.filter(Number.isFinite);
  return numbers.length ? Math.min(...numbers) : null;
}

function max(values) {
  const numbers = values.filter(Number.isFinite);
  return numbers.length ? Math.max(...numbers) : null;
}

function mode(values) {
  const counts = values.reduce((map, value) => ({ ...map, [value]: (map[value] || 0) + 1 }), {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function hasRequiredWeatherData(weather) {
  return Number.isFinite(weather.minTemp) || Number.isFinite(weather.maxTemp) || Number.isFinite(weather.pop) || weather.sky !== NO_INFO || weather.pty !== NO_INFO;
}

function getServiceKey(name) {
  const value = import.meta.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function readCache(key) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(key));
    if (cached && Date.now() - cached.createdAt < 1000 * 60 * 60) return cached.value;
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
