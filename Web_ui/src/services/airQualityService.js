// src/services/airQualityService.js

const AIR_SERVICE_KEY = import.meta.env.VITE_AIR_SERVICE_KEY;

const AIR_QUALITY_BASE_URL =
  "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";

const DEFAULT_SIDO_NAME = "서울";

export async function fetchAirQuality({
  sidoName = DEFAULT_SIDO_NAME,
} = {}) {
  if (!AIR_SERVICE_KEY) {
    throw new Error("VITE_AIR_SERVICE_KEY가 설정되지 않았습니다.");
  }

  const params = new URLSearchParams({
    serviceKey: AIR_SERVICE_KEY,
    returnType: "json",
    numOfRows: "100",
    pageNo: "1",
    sidoName,
    ver: "1.0",
  });

  const response = await fetch(`${AIR_QUALITY_BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `대기오염 API 호출 실패: ${response.status}`);
  }

  const data = await response.json();
  const items = data?.response?.body?.items || [];

  return parseAirQualityItems(items);
}

function parseAirQualityItems(items) {
  return items.map((item) => ({
    stationName: item.stationName,
    measuredAt: item.dataTime,
    pm10: toNumberOrNull(item.pm10Value),
    pm25: toNumberOrNull(item.pm25Value),
    ozone: toNumberOrNull(item.o3Value),
    carbonMonoxide: toNumberOrNull(item.coValue),
    nitrogenDioxide: toNumberOrNull(item.no2Value),
    sulfurDioxide: toNumberOrNull(item.so2Value),
    airQualityIndex: item.khaiValue,
    pm10Grade: convertDustGrade(item.pm10Grade),
    pm25Grade: convertDustGrade(item.pm25Grade),
  }));
}

function convertDustGrade(value) {
  const map = {
    1: "good",
    2: "normal",
    3: "bad",
    4: "very_bad",
  };

  return map[value] || "unknown";
}

function toNumberOrNull(value) {
  if (value === "-" || value === undefined || value === null) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}