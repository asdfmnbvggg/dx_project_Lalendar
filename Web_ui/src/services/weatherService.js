// src/services/weatherService.js

const WEATHER_SERVICE_KEY = import.meta.env.VITE_WEATHER_SERVICE_KEY;

const SHORT_WEATHER_BASE_URL =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

const DEFAULT_NX = 59;
const DEFAULT_NY = 126;

export async function fetchShortWeather({
  nx = DEFAULT_NX,
  ny = DEFAULT_NY,
  baseDate = getTodayDate(),
  baseTime = getSafeBaseTime(),
} = {}) {
  if (!WEATHER_SERVICE_KEY) {
    throw new Error("VITE_WEATHER_SERVICE_KEY가 설정되지 않았습니다.");
  }

  const params = new URLSearchParams({
    serviceKey: WEATHER_SERVICE_KEY,
    pageNo: "1",
    numOfRows: "1000",
    dataType: "JSON",
    base_date: baseDate,
    base_time: baseTime,
    nx: String(nx),
    ny: String(ny),
  });

  const url = `${SHORT_WEATHER_BASE_URL}?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `단기예보 API 호출 실패: ${response.status}`);
  }

  const data = await response.json();
  const items = data?.response?.body?.items?.item || [];

  return parseShortWeatherItems(items);
}

function parseShortWeatherItems(items) {
  const weatherMap = {};

  items.forEach((item) => {
    const key = `${formatDate(item.fcstDate)}_${formatTime(item.fcstTime)}`;

    if (!weatherMap[key]) {
      weatherMap[key] = {
        date: formatDate(item.fcstDate),
        time: formatTime(item.fcstTime),
        temperature: null,
        humidity: null,
        rainProbability: null,
        rainType: null,
        precipitation: null,
        sky: null,
        windSpeed: null,
      };
    }

    const value = item.fcstValue;

    switch (item.category) {
      case "TMP":
        weatherMap[key].temperature = Number(value);
        break;
      case "REH":
        weatherMap[key].humidity = Number(value);
        break;
      case "POP":
        weatherMap[key].rainProbability = Number(value);
        break;
      case "PTY":
        weatherMap[key].rainType = convertRainType(value);
        break;
      case "PCP":
        weatherMap[key].precipitation = value;
        break;
      case "SKY":
        weatherMap[key].sky = convertSkyStatus(value);
        break;
      case "WSD":
        weatherMap[key].windSpeed = Number(value);
        break;
      default:
        break;
    }
  });

  return Object.values(weatherMap);
}

function convertRainType(value) {
  const map = {
    0: "none",
    1: "rain",
    2: "rain_snow",
    3: "snow",
    4: "shower",
  };

  return map[value] || "unknown";
}

function convertSkyStatus(value) {
  const map = {
    1: "clear",
    3: "cloudy",
    4: "overcast",
  };

  return map[value] || "unknown";
}

function getTodayDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  return `${yyyy}${mm}${dd}`;
}

function getSafeBaseTime() {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 5) return "2300";
  if (hour < 8) return "0500";
  if (hour < 11) return "0800";
  if (hour < 14) return "1100";
  if (hour < 17) return "1400";
  if (hour < 20) return "1700";
  if (hour < 23) return "2000";
  return "2300";
}

function formatDate(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return "";

  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function formatTime(hhmm) {
  if (!hhmm || hhmm.length !== 4) return "";

  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

export async function fetchCalendarWeather(options = {}) {
  return fetchShortWeather(options);
}