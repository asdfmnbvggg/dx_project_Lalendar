export function addApplianceRecommendations(weatherByDate) {
  return Object.fromEntries(
    Object.entries(weatherByDate).map(([date, weather]) => [
      date,
      {
        ...weather,
        applianceRecommendations: weather.applianceRecommendations || buildApplianceRecommendations(date, weather),
      },
    ]),
  );
}

function buildApplianceRecommendations(date, weather) {
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

function createRecommendation(date, applianceType, title, description, startTime, endTime, priority, reason) {
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

function dedupeRecommendations(recommendations) {
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
