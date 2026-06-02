const VILAGE_FCST_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const BASE_TIMES = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];
const NO_INFO = "정보 없음";

export default async function handler(request: any, response: any) {
  const weatherApiKey = process.env.WEATHER_API_KEY;

  if (!weatherApiKey) {
    response.status(500).send("WEATHER_API_KEY is not configured");
    return;
  }

  const nx = String(request.query.nx || "60");
  const ny = String(request.query.ny || "127");
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
    const weatherResponse = await fetch(`${url.toString()}&serviceKey=${weatherApiKey}`);

    if (!weatherResponse.ok) {
      response.status(weatherResponse.status).send(`Weather API request failed: ${weatherResponse.status}`);
      return;
    }

    const payload = await weatherResponse.json();
    const items = payload?.response?.body?.items?.item;

    if (!Array.isArray(items)) {
      response.status(502).json({ message: "Invalid weather API response" });
      return;
    }

    response.setHeader("Cache-Control", "s-maxage=7200, stale-while-revalidate=900");
    response.status(200).json(summarizeForecastItems(items));
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : "Weather API request failed" });
  }
}

function summarizeForecastItems(items: any[]) {
  const grouped = items.reduce((map: Record<string, any>, item) => {
    const date = formatFcstDate(item.fcstDate);
    if (!date) return map;
    map[date] ||= { temps: [], pop: [], humidity: [], sky: [], pty: [] };
    collectForecastValue(map[date], item);
    return map;
  }, {});

  return Object.entries(grouped)
    .map(([date, day]: [string, any]) => {
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

function collectForecastValue(day: any, item: any) {
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

function hasRequiredWeatherData(weather: any) {
  return Number.isFinite(weather.minTemp) || Number.isFinite(weather.maxTemp) || Number.isFinite(weather.pop) || weather.sky !== NO_INFO || weather.pty !== NO_INFO;
}

function toIcon(pty: string, sky: string | null) {
  if (["1", "4", "5"].includes(pty)) return "rain";
  if (["2", "3", "6", "7"].includes(pty)) return "snow";
  if (sky === "1") return "sunny";
  if (sky === "3") return "partly_cloudy";
  if (sky === "4") return "cloudy";
  return "unknown";
}

function toSkyLabel(sky: string | null) {
  if (sky === "1") return "맑음";
  if (sky === "3") return "구름많음";
  if (sky === "4") return "흐림";
  return NO_INFO;
}

function toPtyLabel(pty: string) {
  if (pty === "0") return "없음";
  if (pty === "1") return "비";
  if (pty === "2") return "비/눈";
  if (pty === "3") return "눈";
  if (pty === "4") return "소나기";
  return NO_INFO;
}

function preferredPty(values: string[]) {
  return values.find((value) => value !== "0") || "0";
}

function mostCommon(values: string[]) {
  if (!values.length) return null;
  const counts = values.reduce((map: Record<string, number>, value) => {
    map[value] = (map[value] || 0) + 1;
    return map;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function min(values: number[]) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? Math.round(Math.min(...valid)) : null;
}

function max(values: number[]) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? Math.round(Math.max(...valid)) : null;
}

function formatFcstDate(value: string) {
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

function toCompactDate(date: Date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}
