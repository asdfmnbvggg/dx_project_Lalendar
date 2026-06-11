// src/services/midWeatherService.js

const MID_WEATHER_SERVICE_KEY = import.meta.env.VITE_MID_WEATHER_SERVICE_KEY;

const MID_LAND_FORECAST_URL =
  "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst";

const MID_TEMPERATURE_FORECAST_URL =
  "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa";

const DEFAULT_REGION_CODE = "11B00000"; // 서울, 인천, 경기
const DEFAULT_TEMP_REGION_CODE = "11B10101"; // 서울

export async function fetchMidWeather({
  landRegId = DEFAULT_REGION_CODE,
  tempRegId = DEFAULT_TEMP_REGION_CODE,
  tmFc = getMidForecastTime(),
} = {}) {
  if (!MID_WEATHER_SERVICE_KEY) {
    throw new Error("VITE_MID_WEATHER_SERVICE_KEY가 설정되지 않았습니다.");
  }

  const [landForecast, temperatureForecast] = await Promise.all([
    fetchMidLandForecast({ regId: landRegId, tmFc }),
    fetchMidTemperatureForecast({ regId: tempRegId, tmFc }),
  ]);

  return mergeMidWeatherData(landForecast, temperatureForecast);
}

async function fetchMidLandForecast({ regId, tmFc }) {
  const params = new URLSearchParams({
    serviceKey: MID_WEATHER_SERVICE_KEY,
    pageNo: "1",
    numOfRows: "10",
    dataType: "JSON",
    regId,
    tmFc,
  });

  const response = await fetch(`${MID_LAND_FORECAST_URL}?${params.toString()}`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `중기육상예보 API 호출 실패: ${response.status}`);
  }

  const data = await response.json();
  return data?.response?.body?.items?.item?.[0] || null;
}

async function fetchMidTemperatureForecast({ regId, tmFc }) {
  const params = new URLSearchParams({
    serviceKey: MID_WEATHER_SERVICE_KEY,
    pageNo: "1",
    numOfRows: "10",
    dataType: "JSON",
    regId,
    tmFc,
  });

  const response = await fetch(`${MID_TEMPERATURE_FORECAST_URL}?${params.toString()}`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `중기기온예보 API 호출 실패: ${response.status}`);
  }

  const data = await response.json();
  return data?.response?.body?.items?.item?.[0] || null;
}

function mergeMidWeatherData(land, temperature) {
  if (!land && !temperature) return [];

  const result = [];

  for (let day = 3; day <= 10; day += 1) {
    const date = addDays(new Date(), day);

    result.push({
      date: formatDate(date),
      dayOffset: day,
      morningRainProbability: land?.[`rnSt${day}Am`] ?? null,
      afternoonRainProbability: land?.[`rnSt${day}Pm`] ?? null,
      morningWeather: land?.[`wf${day}Am`] ?? null,
      afternoonWeather: land?.[`wf${day}Pm`] ?? null,
      minTemperature: temperature?.[`taMin${day}`] ?? null,
      maxTemperature: temperature?.[`taMax${day}`] ?? null,
    });
  }

  return result;
}

function getMidForecastTime() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const hour = now.getHours();

  const baseHour = hour < 18 ? "0600" : "1800";

  return `${yyyy}${mm}${dd}${baseHour}`;
}

function addDays(date, days) {
  const copied = new Date(date);
  copied.setDate(copied.getDate() + days);
  return copied;
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

