const VILAGE_FCST_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const BASE_TIMES = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];
const NO_INFO = "정보 없음";

export default async function weatherHandler(request, response) {
  const weatherApiKey = normalizeSecret(process.env.WEATHER_API_KEY);

  if (!weatherApiKey) {
    response.status(500).send("WEATHER_API_KEY is not configured");
    return;
  }

  const nx = String(request.query?.nx || "60");
  const ny = String(request.query?.ny || "127");
  const { baseDate, baseTime } = getLatestBaseDateTime();
  const url = new URL(VILAGE_FCST_URL);

  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", baseDate);
  url.searchParams.set("base_time", baseTime);
  url.searchParams.set("nx", nx);
  url.searchParams.set("ny", ny);

  try {
    const payload = await fetchWeatherPayload(url, weatherApiKey);
    const items = payload?.response?.body?.items?.item;

    if (!Array.isArray(items)) {
      const header = payload?.response?.header;
      console.error("Weather API returned an invalid body", {
        resultCode: header?.resultCode,
        resultMsg: header?.resultMsg,
      });
      response.status(502).json({
        message: header?.resultMsg || "Invalid weather API response",
        resultCode: header?.resultCode,
      });
      return;
    }

    response.setHeader("Cache-Control", "s-maxage=7200, stale-while-revalidate=900");
    response.status(200).json(summarizeForecastItems(items));
  } catch (error) {
    console.error("Weather API function failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    response.status(502).json({ message: error instanceof Error ? error.message : "Weather API request failed" });
  }
}

async function fetchWeatherPayload(url, weatherApiKey) {
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

function summarizeForecastItems(items) {
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
      };

      return {
        ...weather,
        hasWeatherData: hasRequiredWeatherData(weather),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
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

function formatFcstDate(value) {
  if (!/^\d{8}$/.test(value || "")) return null;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function getLatestBaseDateTime(now = new Date()) {
  const available = new Date(now);
  available.setMinutes(available.getMinutes() - 10);
  const currentHHMM = `${String(available.getHours()).padStart(2, "0")}${String(available.getMinutes()).padStart(2, "0")}`;
  const baseTime = [...BASE_TIMES].reverse().find((time) => time <= currentHHMM);

  if (baseTime) {
    return { baseDate: toCompactDate(available), baseTime };
  }

  available.setDate(available.getDate() - 1);
  return { baseDate: toCompactDate(available), baseTime: "2300" };
}

function toCompactDate(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}
