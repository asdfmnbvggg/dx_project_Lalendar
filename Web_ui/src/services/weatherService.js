const VILAGE_FCST_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const BASE_TIMES = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];
const WEATHER_CACHE_PREFIX = "lalendar-weather";

export async function fetchCalendarWeather({
  nx = Number(import.meta.env.VITE_WEATHER_NX || 60),
  ny = Number(import.meta.env.VITE_WEATHER_NY || 127),
} = {}) {
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
  if (!apiKey) return {};

  const { baseDate, baseTime } = getLatestBaseDateTime();
  const cacheKey = `${WEATHER_CACHE_PREFIX}:${baseDate}:${baseTime}:${nx}:${ny}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const url = new URL(VILAGE_FCST_URL);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", baseDate);
  url.searchParams.set("base_time", baseTime);
  url.searchParams.set("nx", String(nx));
  url.searchParams.set("ny", String(ny));

  const response = await fetch(`${url.toString()}&serviceKey=${apiKey}`);
  if (!response.ok) {
    throw new Error(`Weather API request failed: ${response.status}`);
  }

  const payload = await response.json();
  const items = payload?.response?.body?.items?.item;
  if (!Array.isArray(items)) return {};

  const weatherByDate = summarizeForecastItems(items);
  writeCache(cacheKey, weatherByDate);
  return weatherByDate;
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

function summarizeForecastItems(items) {
  const grouped = items.reduce((map, item) => {
    const date = formatFcstDate(item.fcstDate);
    if (!date) return map;
    map[date] ||= { temps: [], pop: [], sky: [], pty: [], pcp: [], sno: [] };
    collectForecastValue(map[date], item);
    return map;
  }, {});

  return Object.fromEntries(
    Object.entries(grouped).map(([date, day]) => {
      const high = day.tmx ?? max(day.temps);
      const low = day.tmn ?? min(day.temps);
      const ptyCode = preferredPty(day.pty);
      const skyCode = mostCommon(day.sky);
      const condition = toCondition(ptyCode, skyCode);

      return [
        date,
        {
          high,
          low,
          pop: max(day.pop),
          pcp: preferredAmount(day.pcp),
          sno: preferredAmount(day.sno),
          condition,
          label: toWeatherLabel(ptyCode, skyCode),
        },
      ];
    }),
  );
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
    case "SKY":
      day.sky.push(value);
      break;
    case "PTY":
      day.pty.push(value);
      break;
    case "PCP":
      day.pcp.push(value);
      break;
    case "SNO":
      day.sno.push(value);
      break;
    default:
      break;
  }
}

function toCondition(pty, sky) {
  if (["1", "4", "5"].includes(pty)) return "rain";
  if (["2", "3", "6", "7"].includes(pty)) return "storm";
  if (sky === "1") return "sunny";
  if (sky === "3") return "partly";
  return "cloudy";
}

function toWeatherLabel(pty, sky) {
  if (pty === "1") return "비";
  if (pty === "2") return "비/눈";
  if (pty === "3") return "눈";
  if (pty === "4") return "소나기";
  if (sky === "1") return "맑음";
  if (sky === "3") return "구름많음";
  if (sky === "4") return "흐림";
  return "날씨";
}

function preferredPty(values) {
  return values.find((value) => value !== "0") || "0";
}

function preferredAmount(values) {
  return values.find((value) => value && value !== "강수없음" && value !== "적설없음") || null;
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

function toCompactDate(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
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
