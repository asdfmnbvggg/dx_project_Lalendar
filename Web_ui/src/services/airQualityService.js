const AIR_QUALITY_CACHE_KEY = "l-lander-air-quality-v1";
const AIR_QUALITY_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";

export async function fetchAirQuality({
  sidoName = import.meta.env.VITE_AIR_QUALITY_SIDO || "서울",
  stationName = import.meta.env.VITE_AIR_QUALITY_STATION || "",
} = {}) {
  const serviceKey = getServiceKey("VITE_AIR_SERVICE_KEY");
  const cacheKey = `${AIR_QUALITY_CACHE_KEY}:${sidoName}:${stationName}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    returnType: "json",
    numOfRows: "100",
    pageNo: "1",
    ver: "1.3",
    sidoName,
    serviceKey,
  });

  const response = await fetch(`${AIR_QUALITY_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`미세먼지 API request failed: ${response.status}`);

  const payload = await response.json();
  const resultCode = payload?.response?.header?.resultCode;
  if (resultCode && resultCode !== "00") {
    throw new Error(payload?.response?.header?.resultMsg || `미세먼지 API resultCode ${resultCode}`);
  }

  const items = payload?.response?.body?.items;
  const data = Array.isArray(items) ? items : [];
  const filteredData = stationName ? data.filter((item) => item.stationName === stationName) : data;
  const result = {
    data: filteredData,
    sidoName,
    stationName,
    updatedAt: new Date().toISOString(),
  };

  writeCache(cacheKey, result);
  return result;
}

function getServiceKey(name) {
  const value = import.meta.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function readCache(key) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(key));
    if (cached && Date.now() - cached.createdAt < 1000 * 60 * 30) return cached.value;
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
