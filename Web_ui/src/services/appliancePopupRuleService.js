export const THRESHOLDS = {
  temperatureCooling: 32,
  temperaturePowerCooling: 35,
  humidityDry: 70,
  pm10Bad: 80,
  pm25Bad: 35,
  washerEmptyWeight: 0.3,
};

export function buildAppliancePopup(sensor = {}) {
  if (!sensor || typeof sensor !== "object") return null;

  const temperature = toNumber(sensor.temperature);
  const humidity = toNumber(sensor.humidity);
  const pm10 = toNumber(sensor.pm10);
  const pm25 = toNumber(sensor.pm25);
  const weight = toNumber(sensor.weight);

  if (sensor.washerDoorOpen === true) {
    return {
      applianceType: "WASHER",
      applianceName: "세탁기",
      mode: "작동 차단",
      command: null,
      title: "세탁기 문이 열려 있어요",
      message: "세탁기 문이 열려 있어 작동할 수 없습니다. 문을 닫은 뒤 다시 시도해 주세요.",
      blocked: true,
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
      message: "세탁기 안에 세탁물이 없어 작동을 시작할 수 없습니다.",
      blocked: true,
      metricLabel: "현재 무게",
      metricValue: `${formatNumber(weight)}kg`,
      thresholdLabel: `${THRESHOLDS.washerEmptyWeight}kg 이하`,
      updatedAt: sensor.last_updated || "",
    };
  }

  if (Number.isFinite(temperature) && temperature >= THRESHOLDS.temperaturePowerCooling) {
    return {
      applianceType: "AIR_CONDITIONER",
      applianceName: "에어컨",
      mode: "파워냉방",
      command: "power_cooling",
      title: "실내 온도가 매우 높아요",
      message: `현재 실내 온도가 ${formatNumber(temperature)}C입니다. 빠른 냉방을 위해 에어컨 파워냉방 모드 실행을 추천합니다.`,
      blocked: false,
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
      message: `현재 실내 온도가 ${formatNumber(temperature)}C입니다. 쾌적한 실내 환경을 위해 에어컨 냉방 모드 실행을 추천합니다.`,
      blocked: false,
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
      message: `현재 실내 습도가 ${formatNumber(humidity)}%입니다. 쾌적한 실내 환경을 위해 제습 모드 실행을 추천합니다.`,
      blocked: false,
      metricLabel: "현재 습도",
      metricValue: `${formatNumber(humidity)}%`,
      thresholdLabel: `${THRESHOLDS.humidityDry}% 이상`,
      updatedAt: sensor.last_updated || "",
    };
  }

  if (
    (Number.isFinite(pm10) && pm10 >= THRESHOLDS.pm10Bad) ||
    (Number.isFinite(pm25) && pm25 >= THRESHOLDS.pm25Bad)
  ) {
    return {
      applianceType: "AIR_PURIFIER",
      applianceName: "공기청정기",
      mode: "강력",
      command: "strong",
      title: "실내 공기질이 좋지 않아요",
      message: "실내 미세먼지 수치가 높습니다. 공기청정기 강력 모드 실행을 추천합니다.",
      blocked: false,
      metricLabel: "미세먼지",
      metricValue: `PM10 ${formatSensorValue(pm10)} / PM2.5 ${formatSensorValue(pm25)}`,
      thresholdLabel: `PM10 ${THRESHOLDS.pm10Bad} 또는 PM2.5 ${THRESHOLDS.pm25Bad} 이상`,
      updatedAt: sensor.last_updated || "",
    };
  }

  return null;
}

export function getAppliancePopupKey(popup = {}) {
  return [popup.applianceType, popup.command || "blocked", popup.title].join("|");
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
