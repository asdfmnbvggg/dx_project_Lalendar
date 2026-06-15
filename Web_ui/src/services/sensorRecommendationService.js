export function getSensorRecommendation(sensor) {
  if (!sensor) return null;

  if (sensor.humidity >= 70) {
    return {
      type: "humidity",
      title: "실내 습도가 높아요",
      message: "제습기 작동 또는 빨래 건조 상태 확인을 추천합니다.",
    };
  }

  if (sensor.dust >= 80) {
    return {
      type: "dust",
      title: "미세먼지 수치가 높아요",
      message: "환기보다 공기청정기 작동을 추천합니다.",
    };
  }

  if (sensor.temperature >= 28) {
    return {
      type: "temperature",
      title: "실내 온도가 높아요",
      message: "에어컨 예냉 또는 냉방을 추천합니다.",
    };
  }

  return {
    type: "normal",
    title: "실내 환경이 안정적이에요",
    message: "현재 센서 기준으로 추가 조치가 필요하지 않습니다.",
  };
}