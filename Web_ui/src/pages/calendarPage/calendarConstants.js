import airConditionerImage from "../../assets/appliances/에어컨.png";
import dryerImage from "../../assets/appliances/건조기.png";
import washerImage from "../../assets/appliances/세탁기.png";
import lgCharacterImage from "../../assets/lg-character.png";
import aiDailyReportImage from "../../assets/ai-daily-report.png";

const fridgeImage = airConditionerImage;

import jaehyeokImage from "../../assets/people/재혁님.png";
import suminImage from "../../assets/people/수민님.png";
import dabinImage from "../../assets/people/김수현.jpg";

export const weatherIcon = {
  sunny: "☀️",
  partly_cloudy: "⛅",
  cloudy: "☁️",
  rain: "🌧️",
  snow: "❄️",
  unknown: "?",
};

export const houseCalendarWeatherByDate = {
  "2026-06-01": createHouseWeather("sunny", 31, 16, "맑음"),
  "2026-06-02": createHouseWeather("partly_cloudy", 29, 16, "구름 조금"),
  "2026-06-03": createHouseWeather("partly_cloudy", 33, 19, "구름 조금"),
  "2026-06-04": createHouseWeather("partly_cloudy", 31, 21, "구름 조금"),
  "2026-06-05": createHouseWeather("rain", 28, 16, "비", 30),
  "2026-06-06": createHouseWeather("partly_cloudy", 25, 13, "구름 조금"),
  "2026-06-07": createHouseWeather("partly_cloudy", 28, 20, "구름 조금"),
  "2026-06-08": createHouseWeather("rain", 24, 17, "비", 30),
  "2026-06-09": createHouseWeather("partly_cloudy", 26, 14, "구름 조금"),
  "2026-06-10": createHouseWeather("partly_cloudy", 28, 16, "구름 조금"),
  "2026-06-11": createHouseWeather("partly_cloudy", 27, 15, "구름 조금"),
  "2026-06-12": createHouseWeather("rain", 26, 16, "비", 30),
  "2026-06-13": createHouseWeather("sunny", 28, 16, "맑음"),
  "2026-06-14": createHouseWeather("partly_cloudy", 32, 19, "구름 조금"),
  "2026-06-15": createHouseWeather("cloudy", 31, 19, "흐림"),
  "2026-06-16": createHouseWeather("partly_cloudy", 32, 20, "구름 조금"),
  "2026-06-17": createHouseWeather("partly_cloudy", 32, 20, "구름 조금"),
  "2026-06-18": createHouseWeather("partly_cloudy", 33, 21, "구름 조금"),
  "2026-06-19": createHouseWeather("partly_cloudy", 33, 21, "구름 조금"),
  "2026-06-20": createHouseWeather("partly_cloudy", 33, 22, "구름 조금"),
  "2026-06-21": createHouseWeather("rain", 32, 22, "비", 30),
  "2026-06-22": createHouseWeather("rain", 31, 21, "비", 30),
  "2026-06-23": createHouseWeather("partly_cloudy", 30, 20, "구름 조금"),
  "2026-06-24": createHouseWeather("partly_cloudy", 30, 20, "구름 조금"),
  "2026-06-25": createHouseWeather("rain", 30, 20, "비", 30),
  "2026-06-26": createHouseWeather("rain", 28, 20, "비", 30),
  "2026-06-27": createHouseWeather("rain", 29, 20, "비", 30),
  "2026-06-28": createHouseWeather("cloudy", 28, 20, "평균"),
  "2026-06-29": createHouseWeather("cloudy", 28, 20, "평균"),
  "2026-06-30": createHouseWeather("cloudy", 28, 21, "평균"),
  "2026-07-01": createHouseWeather("cloudy", 28, 21, "평균"),
  "2026-07-02": createHouseWeather("cloudy", 28, 21, "평균"),
  "2026-07-03": createHouseWeather("cloudy", 28, 21, "평균"),
  "2026-07-04": createHouseWeather("cloudy", 28, 21, "평균"),
  "2026-07-05": createHouseWeather("cloudy", 28, 21, "평균"),
};

function createHouseWeather(icon, maxTemp, minTemp, sky, pop = null) {
  return {
    icon,
    maxTemp,
    minTemp,
    pop,
    sky,
    pty: pop ? "비" : "없음",
    source: "HARDCODED",
    hasWeatherData: true,
  };
}

export const houseCalendarTodayAirQuality = {
  grade: "보통",
  pm10: 34,
  pm25: 18,
};

export const applianceTypeLabel = {
  WASHER: "세탁기",
  DRYER: "건조기",
  NATURAL_DRY: "자연건조",
  DEHUMIDIFIER: "제습기",
  AIR_CONDITIONER: "에어컨",
  AIR_PURIFIER: "공기청정기",
  ROBOT_CLEANER: "로봇청소기",
  DISHWASHER: "식기세척기",
  REFRIGERATOR: "냉장고",
  HUMIDIFIER: "가습기",
  ETC: "가전",
};

export const applianceTypeColor = {
  WASHER: "#95cff5",
  DRYER: "#d3b5f3",
  NATURAL_DRY: "#95cff5",
  DEHUMIDIFIER: "#cbf39d",
  AIR_CONDITIONER: "#95cff5",
  AIR_PURIFIER: "#cbf39d",
  ROBOT_CLEANER: "#ffb063",
  DISHWASHER: "#ffc68f",
  REFRIGERATOR: "#95cff5",
  HUMIDIFIER: "#cbf39d",
  ETC: "#ffd5d6",
};

export const applianceImages = {
  air: airConditionerImage,
  dryer: dryerImage,
  washer: washerImage,
};

export const applianceModeCatalog = {
  WASHER: {
    status: "표준 코스로 대기 중",
    modes: [
      { id: "standard", label: "표준", meta: "기본 세탁", icon: "표" },
      { id: "quick", label: "쾌속", meta: "짧은 코스", icon: "쾌" },
      { id: "delicate", label: "섬세", meta: "저자극", icon: "섬" },
      { id: "blanket", label: "이불", meta: "부피 큰 빨래", icon: "이" },
      { id: "rinse-spin", label: "헹굼+탈수", meta: "마무리", icon: "헹" },
    ],
  },
  DRYER: {
    status: "표준 건조로 대기 중",
    modes: [
      { id: "standard", label: "표준", meta: "일반 의류", icon: "표" },
      { id: "strong", label: "강력", meta: "두꺼운 옷", icon: "강" },
      { id: "delicate", label: "섬세", meta: "손상 방지", icon: "섬" },
      { id: "air", label: "송풍", meta: "냄새 제거", icon: "송" },
      { id: "blanket", label: "이불", meta: "대형 빨래", icon: "이" },
    ],
  },
  ROBOT_CLEANER: {
    status: "충전 도크에서 대기 중",
    modes: [
      { id: "all", label: "전체 청소", meta: "집 전체", icon: "전" },
      { id: "spot", label: "부분 청소", meta: "선택 영역", icon: "부" },
      { id: "schedule", label: "예약 청소", meta: "일정 연동", icon: "예" },
      { id: "deep", label: "꼼꼼 청소", meta: "구석까지", icon: "꼼" },
    ],
  },
  AIR_CONDITIONER: {
    status: "자동 운전 준비 중",
    modes: [
      { id: "cool", label: "냉방", meta: "희망 24C", icon: "냉" },
      { id: "dry", label: "제습", meta: "습도 관리", icon: "제" },
      { id: "fan", label: "송풍", meta: "공기 순환", icon: "송" },
      { id: "auto", label: "자동", meta: "쾌적 모드", icon: "자" },
    ],
  },
  AIR_PURIFIER: {
    status: "실내 공기 감지 중",
    modes: [
      { id: "auto", label: "자동", meta: "센서 기반", icon: "자" },
      { id: "strong_wind", label: "강풍", meta: "풍량 강화", icon: "강" },
      { id: "sleep", label: "취침", meta: "저소음", icon: "취" },
      { id: "quick_clean", label: "쾌속청정", meta: "빠른 정화", icon: "쾌" },
    ],
  },
  DISHWASHER: {
    status: "세척 시작 전",
    modes: [
      { id: "standard", label: "표준", meta: "일반 식기", icon: "표" },
      { id: "strong", label: "강력", meta: "기름때", icon: "강" },
      { id: "eco", label: "에코", meta: "절전 세척", icon: "에" },
      { id: "reserve", label: "예약 세척", meta: "시간 맞춤", icon: "예" },
    ],
  },
  HUMIDIFIER: {
    status: "습도 유지 대기 중",
    modes: [
      { id: "auto", label: "자동", meta: "습도 맞춤", icon: "자" },
      { id: "strong", label: "강력", meta: "빠른 가습", icon: "강" },
      { id: "sleep", label: "취침", meta: "저소음", icon: "취" },
      { id: "clean", label: "청정", meta: "필터 순환", icon: "청" },
    ],
  },
  ETC: {
    status: "ThinQ mock 연결",
    modes: [
      { id: "auto", label: "자동", meta: "추천 운전", icon: "자" },
      { id: "eco", label: "절전", meta: "에너지 절약", icon: "절" },
      { id: "strong", label: "강력", meta: "빠른 작동", icon: "강" },
    ],
  },
};

export const CALENDAR_CELL_TASK_LIMIT = 6;
export const CALENDAR_CELL_COLLAPSED_TASK_LIMIT = 5;
export const DAILY_TIMETABLE_START_HOUR = 6;
export const DAILY_TIMETABLE_END_HOUR = 24;
export const DAILY_TIMETABLE_HOUR_HEIGHT = 52;
export const DAILY_TIMETABLE_START_TIME = "06:00";
export const DAILY_TIMETABLE_END_INPUT_TIME = "23:59";
export const scheduleColorOptions = ["#ff7976", "#ffd5d6", "#ffc68f", "#ffb063", "#fff294", "#cbf39d", "#95cff5", "#d3b5f3"];
export const legacyScheduleColorMap = {
  "#fb7185": "#ff7976",
  "#ff9e9e": "#ff7976",
  "#38bdf8": "#95cff5",
  "#7bd3ff": "#95cff5",
  "#a78bfa": "#d3b5f3",
  "#d7a8ff": "#d3b5f3",
  "#60a5fa": "#95cff5",
  "#f59e0b": "#ffb063",
  "#22d3ee": "#95cff5",
  "#c084fc": "#d3b5f3",
  "#34d399": "#cbf39d",
  "#0ea5e9": "#95cff5",
  "#7c3aed": "#d3b5f3",
  "#ff8a2a": "#ffb063",
  "#f97316": "#ffb063",
  "#ea580c": "#ffb063",
  "#fb923c": "#ffb063",
  "#d97706": "#ffc68f",
  "#ffb020": "#ffc68f",
  "#c2410c": "#ff7976",
  "#ef4444": "#ff7976",
  "#2563eb": "#95cff5",
  "#16a34a": "#cbf39d",
  "#9333ea": "#d3b5f3",
  "#0f766e": "#cbf39d",
  "#0891b2": "#95cff5",
  "#be123c": "#ff7976",
  "#d4144b": "#ff7976",
  "#fb4b6f": "#ff7976",
  "#14b8a6": "#cbf39d",
  "#8b5cf6": "#d3b5f3",
};

export const memberImages = {
  jea: jaehyeokImage,
  me: jaehyeokImage,
  sumin: suminImage,
  dada: dabinImage,
};

export const calendarProfileNames = {
  sumin: "한수민",
  jea: "최재혁",
  dada: "김다빈",
  me: "최재혁",
  minsu: "김다빈",
  theresa: "한수민",
};

export const calendarMemberIconText = {
  sumin: "수",
  jea: "재",
  dada: "다",
  me: "MY",
  minsu: "다",
  theresa: "수",
};

export const HOUSEWORK_MEMBER_TABS = [
  { userId: "jea", ownerId: "me", memberName: "최재혁", label: "최재혁 가사 일정" },
  { userId: "sumin", ownerId: "theresa", memberName: "한수민", label: "한수민 가사 일정" },
  { userId: "dada", ownerId: "minsu", memberName: "김다빈", label: "김다빈 가사 일정" },
];

export const DABIN_MEMBER_IDS = new Set(["dada", "minsu"]);
export const DABIN_TASK_OWNER = "minsu";

export { aiDailyReportImage, lgCharacterImage, airConditionerImage, dryerImage, fridgeImage, washerImage };
