export const THRESHOLDS = {
  temperatureCooling: 27,
  temperaturePowerCooling: 30,
  humidityDry: 60,
  pm10On: 31,
  pm10Strong: 81,
  pm25On: 16,
  pm25Strong: 36,
  washerEmptyWeight: 0.3,
};

export function buildRealtimeAppliancePopup(sensor = {}, context = {}) {
  return buildRealtimeAppliancePopups(sensor, context)[0] || null;
}

export function buildRealtimeAppliancePopups(sensor = {}, context = {}) {
  if (!sensor || typeof sensor !== "object") return [];

  return [
    buildAirConditionerPopup(sensor, context),
    buildAirQualityPopup(sensor, context),
  ].filter(Boolean);
}

export function buildScheduledWasherPopup(sensor = {}, context = {}) {
  if (!sensor || typeof sensor !== "object" || !context.washerTask) return null;

  const targetUserId = context.targetUserId || "";
  const weight = toNumber(sensor.weight);
  const scheduleTitle = context.washerTask.title || "세탁 일정";

  if (sensor.washerDoorOpen === true) {
    return {
      applianceType: "WASHER",
      applianceName: "세탁기",
      mode: "작동 차단",
      command: null,
      title: "세탁기 문이 열려 있어요",
      message: `오늘 ${scheduleTitle}이 있지만 세탁기 문이 열려 있습니다. 문을 닫은 뒤 세탁을 시작해 주세요.`,
      blocked: true,
      targetUserId,
      scheduleKey: getWasherScheduleKey(context.washerTask),
      metricLabel: "문 상태",
      metricValue: "열림",
      thresholdLabel: "닫힘 필요",
      updatedAt: sensor.last_updated || "",
    };
  }

  if (Number.isFinite(weight) && weight <= THRESHOLDS.washerEmptyWeight) {
    return {
      applianceType: "WASHER",
      applianceName: "세탁기",
      mode: "작동 차단",
      command: null,
      title: "세탁물이 감지되지 않아요",
      message: `오늘 ${scheduleTitle}이 있지만 세탁기 안에 세탁물이 감지되지 않습니다. 세탁물을 넣은 뒤 세탁을 시작해 주세요.`,
      blocked: true,
      targetUserId,
      scheduleKey: getWasherScheduleKey(context.washerTask),
      metricLabel: "현재 무게",
      metricValue: `${formatNumber(weight)}kg`,
      thresholdLabel: `${THRESHOLDS.washerEmptyWeight}kg 이하`,
      updatedAt: sensor.last_updated || "",
    };
  }

  return null;
}

export function getPopupKey(popup = {}) {
  return [popup.targetUserId || "unknown", popup.applianceType, popup.command || "blocked", popup.title, popup.scheduleKey || ""].join("|");
}

export const buildAppliancePopup = buildRealtimeAppliancePopup;
export const buildAppliancePopups = buildRealtimeAppliancePopups;
export const getAppliancePopupKey = getPopupKey;

function buildAirConditionerPopup(sensor, context) {
  const temperature = toNumber(sensor.temperature);
  const humidity = toNumber(sensor.humidity);
  const targetUserId = getTargetUserId(context, "AIR_CONDITIONER");

  if (Number.isFinite(temperature) && temperature >= THRESHOLDS.temperaturePowerCooling) {
    return {
      applianceType: "AIR_CONDITIONER",
      applianceName: "에어컨",
      mode: "파워냉방",
      command: "power_cooling",
      title: "실내 온도가 매우 높아요",
      message: `현재 실내 온도가 ${formatNumber(temperature)}C입니다. 빠른 냉방을 위해 에어컨 파워냉방 모드 실행을 추천합니다.`,
      blocked: false,
      targetUserId,
      metricLabel: "현재 온도",
      metricValue: `${formatNumber(temperature)}C`,
      thresholdLabel: `${THRESHOLDS.temperaturePowerCooling}C 이상`,
      updatedAt: sensor.last_updated || "",
    };
  }

  if (Number.isFinite(temperature) && temperature >= THRESHOLDS.temperatureCooling) {
    return {
      applianceType: "AIR_CONDITIONER",
      applianceName: "에어컨",
      mode: "냉방",
      command: "cooling",
      title: "실내 온도가 높아요",
      message: `현재 실내 온도가 ${formatNumber(temperature)}C입니다. 더위를 느낄 수 있어 에어컨 냉방 모드 실행을 추천합니다.`,
      blocked: false,
      targetUserId,
      metricLabel: "현재 온도",
      metricValue: `${formatNumber(temperature)}C`,
      thresholdLabel: `${THRESHOLDS.temperatureCooling}C 이상`,
      updatedAt: sensor.last_updated || "",
    };
  }

  if (Number.isFinite(humidity) && humidity >= THRESHOLDS.humidityDry) {
    return {
      applianceType: "AIR_CONDITIONER",
      applianceName: "에어컨",
      mode: "제습",
      command: "dry",
      title: "실내 습도가 높아요",
      message: `현재 실내 습도가 ${formatNumber(humidity)}%입니다. 불쾌감을 줄이기 위해 에어컨 제습 모드 실행을 추천합니다.`,
      blocked: false,
      targetUserId,
      metricLabel: "현재 습도",
      metricValue: `${formatNumber(humidity)}%`,
      thresholdLabel: `${THRESHOLDS.humidityDry}% 이상`,
      updatedAt: sensor.last_updated || "",
    };
  }

  return null;
}

function buildAirQualityPopup(sensor, context) {
  const pm10 = toNumber(sensor.pm10);
  const pm25 = toNumber(sensor.pm25);
  const targetUserId = getTargetUserId(context, "AIR_PURIFIER");

  if (
    (Number.isFinite(pm10) && pm10 >= THRESHOLDS.pm10Strong) ||
    (Number.isFinite(pm25) && pm25 >= THRESHOLDS.pm25Strong)
  ) {
    return {
      applianceType: "AIR_PURIFIER",
      applianceName: "공기청정기",
      mode: "강력",
      command: "strong",
      title: "실내 공기질이 좋지 않아요",
      message: "실내 미세먼지 수치가 높습니다. 공기청정기 강력 모드 실행을 추천합니다.",
      blocked: false,
      targetUserId,
      metricLabel: "미세먼지",
      metricValue: `PM10 ${formatSensorValue(pm10)} / PM2.5 ${formatSensorValue(pm25)}`,
      thresholdLabel: `PM10 ${THRESHOLDS.pm10Strong} 또는 PM2.5 ${THRESHOLDS.pm25Strong} 이상`,
      updatedAt: sensor.last_updated || "",
    };
  }

  if (
    (Number.isFinite(pm10) && pm10 >= THRESHOLDS.pm10On) ||
    (Number.isFinite(pm25) && pm25 >= THRESHOLDS.pm25On)
  ) {
    return {
      applianceType: "AIR_PURIFIER",
      applianceName: "공기청정기",
      mode: "자동",
      command: "air_purifier_on",
      title: "실내 공기 관리가 필요해요",
      message: "실내 미세먼지 수치가 보통 이상입니다. 공기청정기 작동을 추천합니다.",
      blocked: false,
      targetUserId,
      metricLabel: "미세먼지",
      metricValue: `PM10 ${formatSensorValue(pm10)} / PM2.5 ${formatSensorValue(pm25)}`,
      thresholdLabel: `PM10 ${THRESHOLDS.pm10On} 또는 PM2.5 ${THRESHOLDS.pm25On} 이상`,
      updatedAt: sensor.last_updated || "",
    };
  }

  return null;
}

function getTargetUserId(context, applianceType) {
  return context.targetUserIds?.[applianceType] || context.targetUserId || "";
}

function getWasherScheduleKey(task = {}) {
  return [task.id, task.date, task.repeat, task.userId, task.owner].filter(Boolean).join(":");
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatSensorValue(value) {
  return Number.isFinite(value) ? formatNumber(value) : "-";
}
