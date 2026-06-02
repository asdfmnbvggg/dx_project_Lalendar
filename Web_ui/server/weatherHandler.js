const VILAGE_FCST_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const MID_LAND_FCST_URL = "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst";
const MID_TEMP_FCST_URL = "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa";
const BASE_TIMES = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];
const NO_INFO = "정보 없음";

export default async function weatherHandler(request, response) {
  const weatherApiKey = normalizeSecret(process.env.WEATHER_API_KEY);

  if (!weatherApiKey) {
    response.status(500).send("WEATHER_API_KEY is not configured");
    return;
  }

  const nx = String(request.query?.nx || "59");
  const ny = String(request.query?.ny || "126");

  const [shortTerm, midTerm] = await Promise.all([
    fetchShortTermForecast({ weatherApiKey, nx, ny }).catch((error) => {
      console.error("Short-term weather API failed", { message: getErrorMessage(error) });
      return [];
    }),
    fetchMidTermForecast({ weatherApiKey }).catch((error) => {
      console.error("Mid-term weather API failed", { message: getErrorMessage(error) });
      return [];
    }),
  ]);

  response.setHeader("Cache-Control", "s-maxage=7200, stale-while-revalidate=900");
  response.status(200).json(mergeForecasts(shortTerm, midTerm));
}

async function fetchShortTermForecast({ weatherApiKey, nx, ny }) {
  const { baseDate, baseTime } = getLatestBaseDateTime();
  const url = new URL(VILAGE_FCST_URL);

  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", baseDate);
  url.searchParams.set("base_time", baseTime);
  url.searchParams.set("nx", nx);
  url.searchParams.set("ny", ny);

  const payload = await fetchWeatherPayload(url, weatherApiKey, "short-term");
  const items = payload?.response?.body?.items?.item;

  if (!Array.isArray(items)) {
    throw new Error(payload?.response?.header?.resultMsg || "Invalid short-term weather API response");
  }

  const today = getKstDateStart();
  const allowedDates = new Set(Array.from({ length: 4 }, (_, index) => toDateKey(addDays(today, index))));
  return summarizeShortTermForecastItems(items).filter((item) => allowedDates.has(item.date));
}

async function fetchMidTermForecast({ weatherApiKey }) {
  const landRegId = normalizeSecret(process.env.MID_LAND_REG_ID);
  const tempRegId = normalizeSecret(process.env.MID_TEMP_REG_ID);

  if (!landRegId || !tempRegId) {
    console.error("MID_TERM_REG_ID is not configured");
    return [];
  }

  const tmFc = getLatestMidTermTmFc();
  const [landPayload, tempPayload] = await Promise.all([
    fetchMidTermPayload(MID_LAND_FCST_URL, weatherApiKey, landRegId, tmFc, "mid-land"),
    fetchMidTermPayload(MID_TEMP_FCST_URL, weatherApiKey, tempRegId, tmFc, "mid-temp"),
  ]);
  const landItem = landPayload?.response?.body?.items?.item?.[0];
  const tempItem = tempPayload?.response?.body?.items?.item?.[0];

  if (!landItem && !tempItem) {
    throw new Error("Invalid mid-term weather API response");
  }

  return summarizeMidTermForecastItems(landItem || {}, tempItem || {});
}

async function fetchMidTermPayload(endpoint, weatherApiKey, regId, tmFc, label) {
  const url = new URL(endpoint);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "10");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("regId", regId);
  url.searchParams.set("tmFc", tmFc);
  return fetchWeatherPayload(url, weatherApiKey, label);
}

async function fetchWeatherPayload(url, weatherApiKey, label) {
  const urls = buildWeatherRequestUrls(url, weatherApiKey);
  let lastPayload = null;
  let lastText = "";
  let lastStatus = 500;

  for (const requestUrl of urls) {
    const weatherResponse = await fetch(requestUrl);
    lastStatus = weatherResponse.status;
    lastText = await weatherResponse.text();

    if (!weatherResponse.ok) {
      console.error("Weather API HTTP failure", {
        label,
        status: weatherResponse.status,
        reason: weatherResponse.statusText,
        body: lastText.slice(0, 300),
      });
      continue;
    }

    const payload = parseWeatherPayload(lastText);
    lastPayload = payload;

    if (payload?.response?.header?.resultCode === "00") {
      return payload;
    }

    console.error("Weather API business failure", {
      label,
      resultCode: payload?.response?.header?.resultCode,
      resultMsg: payload?.response?.header?.resultMsg,
      body: lastText.slice(0, 300),
    });
  }

  if (lastPayload) return lastPayload;
  throw new Error(`Weather API request failed: ${lastStatus}${lastText ? ` ${lastText.slice(0, 120)}` : ""}`);
}

function buildWeatherRequestUrls(url, weatherApiKey) {
  const rawKeyUrl = `${url.toString()}&serviceKey=${weatherApiKey}`;
  const encodedKeyUrl = new URL(url.toString());
  encodedKeyUrl.searchParams.set("serviceKey", weatherApiKey);
  return [...new Set([rawKeyUrl, encodedKeyUrl.toString()])];
}

function parseWeatherPayload(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Weather API returned non-JSON response: ${text.slice(0, 160)}`);
  }
}

function normalizeSecret(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function summarizeShortTermForecastItems(items) {
  const grouped = items.reduce((map, item) => {
    const date = formatFcstDate(item.fcstDate);
    if (!date) return map;
    map[date] ||= { temps: [], pop: [], humidity: [], sky: [], pty: [] };
    collectForecastValue(map[date], item);
    return map;
  }, {});

  return Object.entries(grouped)
    .map(([date, day]) => {
      const ptyCode = preferredPty(day.pty);
      const skyCode = mostCommon(day.sky);
      const weather = {
        date,
        minTemp: day.tmn ?? min(day.temps),
        maxTemp: day.tmx ?? max(day.temps),
        pop: max(day.pop),
        humidity: max(day.humidity),
        sky: toSkyLabel(skyCode),
        pty: toPtyLabel(ptyCode),
        icon: toIcon(ptyCode, skyCode),
        source: "SHORT_TERM",
      };

      return {
        ...weather,
        hasWeatherData: hasRequiredWeatherData(weather),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function summarizeMidTermForecastItems(land, temp) {
  const today = getKstDateStart();

  return Array.from({ length: 7 }, (_, index) => {
    const dayOffset = index + 4;
    const date = toDateKey(addDays(today, dayOffset));
    const amWeather = land[`wf${dayOffset}Am`] ?? land[`wf${dayOffset}`];
    const pmWeather = land[`wf${dayOffset}Pm`] ?? land[`wf${dayOffset}`];
    const weatherText = pickMidTermWeatherText(amWeather, pmWeather);
    const pop = max([toNumber(land[`rnSt${dayOffset}Am`]), toNumber(land[`rnSt${dayOffset}Pm`]), toNumber(land[`rnSt${dayOffset}`])]);
    const weather = {
      date,
      minTemp: toNumber(temp[`taMin${dayOffset}`]),
      maxTemp: toNumber(temp[`taMax${dayOffset}`]),
      pop,
      humidity: null,
      sky: toMidSkyLabel(weatherText),
      pty: toMidPtyLabel(weatherText),
      icon: toMidIcon(weatherText),
      source: "MID_TERM",
    };

    return {
      ...weather,
      hasWeatherData: hasRequiredWeatherData(weather),
    };
  });
}

function collectForecastValue(day, item) {
  const value = item.fcstValue;

  switch (item.category) {
    case "TMP":
      day.temps.push(Number(value));
      break;
    case "TMN":
      day.tmn = Number(value);
      break;
    case "TMX":
      day.tmx = Number(value);
      break;
    case "POP":
      day.pop.push(Number(value));
      break;
    case "REH":
      day.humidity.push(Number(value));
      break;
    case "SKY":
      day.sky.push(value);
      break;
    case "PTY":
      day.pty.push(value);
      break;
    default:
      break;
  }
}

function mergeForecasts(shortTerm, midTerm) {
  const map = new Map();
  shortTerm.forEach((item) => map.set(item.date, item));
  midTerm.forEach((item) => {
    if (!map.has(item.date)) map.set(item.date, item);
  });
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function hasRequiredWeatherData(weather) {
  return Number.isFinite(weather.minTemp) || Number.isFinite(weather.maxTemp) || Number.isFinite(weather.pop) || weather.sky !== NO_INFO || weather.pty !== NO_INFO;
}

function toIcon(pty, sky) {
  if (["1", "4", "5"].includes(pty)) return "rain";
  if (["2", "3", "6", "7"].includes(pty)) return "snow";
  if (sky === "1") return "sunny";
  if (sky === "3") return "partly_cloudy";
  if (sky === "4") return "cloudy";
  return "unknown";
}

function toSkyLabel(sky) {
  if (sky === "1") return "맑음";
  if (sky === "3") return "구름많음";
  if (sky === "4") return "흐림";
  return NO_INFO;
}

function toPtyLabel(pty) {
  if (pty === "0") return "없음";
  if (pty === "1") return "비";
  if (pty === "2") return "비/눈";
  if (pty === "3") return "눈";
  if (pty === "4") return "소나기";
  return NO_INFO;
}

function toMidSkyLabel(text) {
  if (/맑/.test(text || "")) return "맑음";
  if (/구름많/.test(text || "")) return "구름많음";
  if (/흐/.test(text || "")) return "흐림";
  return NO_INFO;
}

function toMidPtyLabel(text) {
  if (!text) return NO_INFO;
  if (/비.*눈|눈.*비/.test(text)) return "비/눈";
  if (/눈/.test(text)) return "눈";
  if (/비|소나기/.test(text)) return "비";
  return "없음";
}

function toMidIcon(text) {
  if (/비.*눈|눈.*비|눈/.test(text || "")) return "snow";
  if (/비|소나기/.test(text || "")) return "rain";
  if (/맑/.test(text || "")) return "sunny";
  if (/구름많/.test(text || "")) return "partly_cloudy";
  if (/흐/.test(text || "")) return "cloudy";
  return "unknown";
}

function pickMidTermWeatherText(amWeather, pmWeather) {
  const values = [amWeather, pmWeather].filter(Boolean);
  return values.find((value) => /비|눈|소나기/.test(value)) || values[0] || NO_INFO;
}

function preferredPty(values) {
  return values.find((value) => value !== "0") || "0";
}

function mostCommon(values) {
  if (!values.length) return null;
  const counts = values.reduce((map, value) => {
    map[value] = (map[value] || 0) + 1;
    return map;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function min(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? Math.round(Math.min(...valid)) : null;
}

function max(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? Math.round(Math.max(...valid)) : null;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatFcstDate(value) {
  if (!/^\d{8}$/.test(value || "")) return null;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function getLatestBaseDateTime(now = new Date()) {
  const available = toKstDate(now);
  available.setMinutes(available.getMinutes() - 10);
  const currentHHMM = `${String(available.getUTCHours()).padStart(2, "0")}${String(available.getUTCMinutes()).padStart(2, "0")}`;
  const baseTime = [...BASE_TIMES].reverse().find((time) => time <= currentHHMM);

  if (baseTime) {
    return { baseDate: toCompactDateFromUtc(available), baseTime };
  }

  available.setUTCDate(available.getUTCDate() - 1);
  return { baseDate: toCompactDateFromUtc(available), baseTime: "2300" };
}

function getLatestMidTermTmFc(now = new Date()) {
  const kst = toKstDate(now);
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const date = new Date(kst);

  if (minutes >= 18 * 60 + 30) {
    return `${toCompactDateFromUtc(date)}1800`;
  }

  if (minutes >= 6 * 60 + 30) {
    return `${toCompactDateFromUtc(date)}0600`;
  }

  date.setUTCDate(date.getUTCDate() - 1);
  return `${toCompactDateFromUtc(date)}1800`;
}

function getKstDateStart(now = new Date()) {
  const kst = toKstDate(now);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

function toKstDate(date) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function toDateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function toCompactDateFromUtc(date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
