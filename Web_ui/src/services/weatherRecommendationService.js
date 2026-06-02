export function buildWeatherRecommendationsByDate(weatherByDate) {
  return Object.fromEntries(
    Object.entries(weatherByDate).map(([date, weather]) => [
      date,
      {
        ...weather,
        applianceRecommendations: buildWeatherRecommendations(date, weather),
      },
    ]),
  );
}

export function buildWeatherRecommendations(date, weather) {
  if (!weather?.hasWeatherData) return [];

  const recommendations = [];
  const pop = Number.isFinite(weather.pop) ? weather.pop : 0;
  const maxTemp = Number.isFinite(weather.maxTemp) ? weather.maxTemp : weather.high;
  const isRainy = ["rain", "snow"].includes(weather.icon) || pop >= 60 || ["비", "비/눈", "눈", "소나기"].includes(weather.pty);
  const isClearDryingDay = ["sunny", "partly_cloudy"].includes(weather.icon) && pop <= 30;

  if (isRainy) {
    recommendations.push(
      createRecommendation(
        date,
        "DRYER",
        "건조기 사용 추천",
        "비 예보가 있어 자연건조보다 건조기 사용이 안정적입니다.",
        "18:00",
        "20:00",
        70,
        "강수 예보가 있어 빨래 건조가 어려울 수 있습니다.",
        true,
      ),
    );
    recommendations.push(
      createRecommendation(
        date,
        "DEHUMIDIFIER",
        "실내 제습 추천",
        "비 오는 날 실내 습도 관리를 위해 제습 루틴을 추천합니다.",
        "19:00",
        "21:00",
        65,
        "비 예보로 실내 습도가 높아질 수 있습니다.",
        true,
      ),
    );
  }

  if (Number(weather.humidity) >= 70) {
    recommendations.push(
      createRecommendation(
        date,
        "DEHUMIDIFIER",
        "제습기 가동 추천",
        "습도가 높아 쾌적한 실내 관리를 위해 제습을 추천합니다.",
        "19:00",
        "21:00",
        75,
        `습도 ${weather.humidity}% 예보입니다.`,
        true,
      ),
    );
  }

  if (isClearDryingDay) {
    recommendations.push(
      createRecommendation(
        date,
        "WASHER",
        "세탁하기 좋은 날",
        "맑고 강수확률이 낮아 세탁과 자연건조에 적합합니다.",
        "09:00",
        "11:00",
        70,
        "맑고 강수확률이 낮습니다.",
        true,
      ),
    );
  }

  if (Number(maxTemp) >= 28) {
    recommendations.push(
      createRecommendation(
        date,
        "AIR_CONDITIONER",
        "에어컨 사전 가동 추천",
        "더운 시간 전에 실내 온도를 미리 낮추는 일정을 추천합니다.",
        "17:30",
        "18:00",
        60,
        `최고기온 ${maxTemp}도 예보입니다.`,
        true,
      ),
    );
  }

  return dedupeRecommendations(recommendations).slice(0, 3);
}

export function createRecommendation(date, applianceType, title, description, startTime, endTime, confidence, reason, weatherCombined = false) {
  return {
    id: `${date}-${applianceType}-${startTime}-${title}`,
    date,
    startTime,
    endTime,
    applianceType,
    title,
    description,
    reason,
    confidence,
    source: weatherCombined ? "WEATHER_COMBINED" : "WEATHER_BASED",
    automationType: "WEATHER_BASED",
    recommendedStartTime: startTime,
    recommendedEndTime: endTime,
    weatherCombined,
  };
}

function dedupeRecommendations(recommendations) {
  const seen = new Set();
  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .filter((item) => {
      const key = `${item.applianceType}:${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
