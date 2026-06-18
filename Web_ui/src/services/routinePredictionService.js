const LOG_STORAGE_KEY = "l-lander-thinq-usage-logs";
const LEGACY_LOG_STORAGE_KEY = "lalendar-thinq-usage-logs";

export function readThinQUsageLogs() {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || localStorage.getItem(LEGACY_LOG_STORAGE_KEY)) || [];
    if (!localStorage.getItem(LOG_STORAGE_KEY) && logs.length > 0) {
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    }
    return logs;
  } catch {
    return [];
  }
}

export function recordThinQUsageLog(entry) {
  const logs = readThinQUsageLogs();
  const next = [
    {
      id: `${Date.now()}-${entry.deviceId || "device"}`,
      capturedAt: new Date().toISOString(),
      ...entry,
    },
    ...logs,
  ].slice(0, 200);

  try {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable; API results should still render.
  }

  return next;
}

export function buildRoutineRecommendations({ devices = [], deviceStates = {}, deviceAux = {}, weatherByDate = {}, selectedDate }) {
  const logs = readThinQUsageLogs();
  const dates = Object.keys(weatherByDate).length ? Object.keys(weatherByDate) : [selectedDate].filter(Boolean);
  const recommendations = [];

  dates.forEach((date) => {
    const weather = weatherByDate[date];
    const dayLogs = logs.filter((log) => isSameWeekday(log.capturedAt, date));

    devices.forEach((device) => {
      const state = deviceStates[device.id];
      const aux = deviceAux[device.id];
      const deviceLogs = dayLogs.filter((log) => log.deviceId === device.id || log.applianceType === device.type);
      const type = normalizeApplianceType(device);

      if (deviceLogs.length >= 2) {
        recommendations.push(
          createRoutineRecommendation(
            date,
            type,
            `${device.name || device.alias || "가전"} 루틴 추천`,
            `${deviceLogs.length}회 반복 사용 기록이 감지되었습니다.`,
            "최근 같은 요일 사용 패턴을 기반으로 추천합니다.",
            78,
            "THINQ_LOG",
            hasWeatherData(weather),
          ),
        );
      }

      if (state && hasCompletionSignal(state)) {
        recommendations.push(
          createRoutineRecommendation(
            date,
            "DRYER",
            "완료 후 정리 루틴 추천",
            "세탁/건조 완료 신호가 감지되어 후속 정리 일정을 추천합니다.",
            "ThinQ 상태에 완료 신호가 포함되어 있습니다.",
            72,
            "THINQ_STATE",
            hasWeatherData(weather),
          ),
        );
      }

      if (aux?.energy && aux.energy.status !== "not_ready") {
        recommendations.push(
          createRoutineRecommendation(
            date,
            type,
            `${device.name || "가전"} 전력 사용 루틴`,
            "전력량 조회 결과를 기반으로 반복 사용 시간대를 추천합니다.",
            "전력량 데이터가 수집되었습니다.",
            68,
            "THINQ_ENERGY",
            hasWeatherData(weather),
          ),
        );
      }

      if (weather?.hasWeatherData && type === "DRYER" && (weather.pop >= 60 || weather.icon === "rain" || weather.icon === "snow")) {
        recommendations.push(
          createRoutineRecommendation(
            date,
            "DRYER",
            "날씨 반영 건조 루틴",
            "비 예보와 ThinQ 기기 정보를 함께 반영해 건조기 사용을 추천합니다.",
            "강수 예보가 있어 자연건조 대신 건조기 루틴을 우선 추천합니다.",
            82,
            "WEATHER_COMBINED",
            true,
          ),
        );
      }
    });
  });

  return dedupe(recommendations).slice(0, 12);
}

function createRoutineRecommendation(date, applianceType, title, description, reason, confidence, source, weatherCombined) {
  return {
    id: `routine-${date}-${applianceType}-${title}`,
    date,
    startTime: "19:00",
    endTime: "20:00",
    applianceType,
    title,
    description,
    reason: weatherCombined ? reason : `${reason} 날씨 정보 없음.`,
    confidence,
    source,
    automationType: "ROUTINE_PREDICTION",
    recommendedStartTime: "19:00",
    recommendedEndTime: "20:00",
    weatherCombined,
  };
}

function normalizeApplianceType(device) {
  const text = `${device.type || ""} ${device.deviceType || ""} ${device.name || ""} ${device.alias || ""}`.toLowerCase();
  if (/wash|washer|세탁/.test(text)) return "WASHER";
  if (/dry|dryer|건조/.test(text)) return "DRYER";
  if (/air|conditioner|에어컨/.test(text)) return "AIR_CONDITIONER";
  if (/purifier|공기/.test(text)) return "AIR_PURIFIER";
  if (/robot|clean|청소/.test(text)) return "ROBOT_CLEANER";
  if (/dehumid|제습/.test(text)) return "DEHUMIDIFIER";
  return "ETC";
}

function hasCompletionSignal(state) {
  const text = JSON.stringify(state).toLowerCase();
  return /complete|finish|done|완료/.test(text);
}

function hasWeatherData(weather) {
  return Boolean(weather?.hasWeatherData);
}

function isSameWeekday(isoDate, dateKey) {
  if (!isoDate || !dateKey) return false;
  return new Date(isoDate).getDay() === new Date(`${dateKey}T00:00:00`).getDay();
}

function dedupe(items) {
  const seen = new Set();
  return items
    .sort((a, b) => b.confidence - a.confidence)
    .filter((item) => {
      const key = `${item.date}:${item.applianceType}:${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
