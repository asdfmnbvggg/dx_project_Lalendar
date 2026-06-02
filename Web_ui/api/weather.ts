const VILAGE_FCST_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const BASE_TIMES = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];

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

function summarizeForecastItems(items: any[]) {
  const grouped = items.reduce((map: Record<string, any>, item) => {
    const date = formatFcstDate(item.fcstDate);
    if (!date) return map;
    map[date] ||= { temps: [], pop: [], humidity: [], sky: [], pty: [], pcp: [], sno: [] };
    collectForecastValue(map[date], item);
    return map;
  }, {});

  return Object.fromEntries(
    Object.entries(grouped).map(([date, day]: [string, any]) => {
      const high = day.tmx ?? max(day.temps);
      const low = day.tmn ?? min(day.temps);
      const ptyCode = preferredPty(day.pty);
      const skyCode = mostCommon(day.sky);
      const condition = toCondition(ptyCode, skyCode);
      const weather = {
        high,
        low,
        pop: max(day.pop),
        humidity: max(day.humidity),
        pcp: preferredAmount(day.pcp),
        sno: preferredAmount(day.sno),
        condition,
        label: toWeatherLabel(ptyCode, skyCode),
        sky: toSkyLabel(skyCode),
        pty: toPtyLabel(ptyCode),
      };

      return [
        date,
        {
          ...weather,
          applianceRecommendations: buildApplianceRecommendations(date, weather),
        },
      ];
    }),
  );
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

function toCondition(pty: string, sky: string | null) {
  if (["1", "4", "5"].includes(pty)) return "rain";
  if (["2", "3", "6", "7"].includes(pty)) return "storm";
  if (sky === "1") return "sunny";
  if (sky === "3") return "partly";
  return "cloudy";
}

function toWeatherLabel(pty: string, sky: string | null) {
  if (pty !== "0") return toPtyLabel(pty);
  return toSkyLabel(sky);
}

function toSkyLabel(sky: string | null) {
  if (sky === "1") return "맑음";
  if (sky === "3") return "구름많음";
  if (sky === "4") return "흐림";
  return "날씨";
}

function toPtyLabel(pty: string) {
  if (pty === "1") return "비";
  if (pty === "2") return "비/눈";
  if (pty === "3") return "눈";
  if (pty === "4") return "소나기";
  if (pty === "5") return "빗방울";
  if (pty === "6") return "빗방울/눈날림";
  if (pty === "7") return "눈날림";
  return "없음";
}

function buildApplianceRecommendations(date: string, weather: any) {
  const recommendations = [];
  const pop = Number.isFinite(weather.pop) ? weather.pop : 0;
  const isRainy = ["rain", "storm", "sun-rain"].includes(weather.condition) || pop >= 60;
  const isClearDryingDay = ["sunny", "partly"].includes(weather.condition) && pop <= 30;

  if (isRainy) {
    recommendations.push(createRecommendation(date, "DRYER", "건조기 사용 추천", "비 예보가 있어 자연건조보다 건조기 사용이 안정적입니다.", "18:00", "20:00", 90, "강수확률이 높거나 비 예보가 있습니다."));
    recommendations.push(createRecommendation(date, "DEHUMIDIFIER", "실내 제습 추천", "실내 빨래 냄새와 습기 관리를 위해 제습 루틴을 권장합니다.", "19:00", "21:00", 85, "비 예보로 실내 습도가 높아질 수 있습니다."));
    recommendations.push(createRecommendation(date, "ROBOT_CLEANER", "현관/거실 청소 추천", "비 오는 날 유입 먼지와 물기를 줄이기 위해 짧은 청소를 추천합니다.", "21:00", "21:30", 65, "비 예보가 있는 날은 현관 주변 오염이 늘 수 있습니다."));
  }

  if (Number(weather.humidity) >= 70) {
    recommendations.push(createRecommendation(date, "DEHUMIDIFIER", "제습기 가동 추천", "습도가 높아 곰팡이와 꿉꿉한 냄새 예방을 위한 제습을 추천합니다.", "19:00", "21:00", 95, `습도 ${weather.humidity}% 예보입니다.`));
  }

  if (isClearDryingDay) {
    recommendations.push(createRecommendation(date, "WASHER", "세탁하기 좋은 날", "맑고 강수확률이 낮아 세탁과 자연건조에 적합합니다.", "09:00", "11:00", 80, "맑고 강수확률이 낮습니다."));
    recommendations.push(createRecommendation(date, "NATURAL_DRY", "자연건조 추천", "햇볕과 통풍을 활용해 빨래를 말리기 좋은 조건입니다.", "11:00", "16:00", 70, "맑은 날씨 조건입니다."));
  }

  if (Number(weather.high) >= 28) {
    recommendations.push(createRecommendation(date, "AIR_CONDITIONER", "에어컨 사전 가동 알림", "더운 시간 전에 실내 온도를 미리 낮추는 일정을 추천합니다.", "17:30", "18:00", 75, `최고기온 ${weather.high}° 예보입니다.`));
    recommendations.push(createRecommendation(date, "AIR_PURIFIER", "필터 관리 알림", "에어컨과 공기청정기 필터 상태를 확인해 주세요.", "10:00", "10:15", 55, "고온 예보가 있어 냉방기 사용이 늘 수 있습니다."));
  }

  return dedupeRecommendations(recommendations).slice(0, 4);
}

function createRecommendation(date: string, applianceType: string, title: string, description: string, startTime: string, endTime: string, priority: number, reason: string) {
  return {
    id: `${date}-${applianceType}-${startTime}`,
    applianceType,
    title,
    description,
    recommendedStartTime: startTime,
    recommendedEndTime: endTime,
    priority,
    reason,
    automationType: "WEATHER_BASED",
  };
}

function dedupeRecommendations(recommendations: any[]) {
  const seen = new Set();
  return recommendations
    .sort((a, b) => b.priority - a.priority)
    .filter((item) => {
      const key = `${item.applianceType}:${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function preferredPty(values: string[]) {
  return values.find((value) => value !== "0") || "0";
}

function preferredAmount(values: string[]) {
  return values.find((value) => value && value !== "강수없음" && value !== "적설없음") || null;
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

function toCompactDate(date: Date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}
