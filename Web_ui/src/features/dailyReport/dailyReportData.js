import lgCharacterImage from "../../assets/lg-character.png";

const imageModules = import.meta.glob("../../assets/ai_daily_report/*.{png,jpg,jpeg,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const reportImages = Object.entries(imageModules).map(([path, src]) => ({
  name: decodeURIComponent(path.split("/").pop().replace(/\.[^.]+$/, "")),
  src,
}));

const fallbackImage = reportImages.find((image) => image.name === "기본")?.src || "";
const imageKeywords = {
  개인일정많은날: ["일정이 많", "일정 여러", "바쁜", "바쁘", "연속 일정"],
  개인일정없는날: ["일정이 없", "일정 없", "여유", "한가"],
  건조기: ["건조기", "건조", "빨래 말리"],
  공기청정기: ["공기청정기", "공기 청정", "공기질"],
  더운날: ["더운", "더위", "고온", "폭염", "기온이 높", "기온 높"],
  데이트: ["데이트", "연인", "남편과", "아내와"],
  로봇청소기: ["로봇청소기", "로봇 청소기"],
  맑은날: ["맑은", "맑음", "화창", "햇살"],
  미세먼지많은날: ["미세먼지", "초미세먼지", "pm10", "pm2.5", "공기질 나쁨"],
  비오는날: ["비 예보", "비가", "비 오는", "비올", "우산", "강수"],
  생일: ["생일", "생신", "기념일"],
  세탁기: ["세탁기", "세탁", "빨래"],
  소풍: ["소풍", "나들이", "피크닉", "공원 방문", "야외 나들이"],
  습도높은날: ["습도가 높", "높은 습도", "습한", "습기", "눅눅", "제습"],
  식기세척기: ["식기세척기", "식기 세척", "설거지"],
  에어컨: ["에어컨", "냉방", "예냉"],
  운동회: ["운동회", "체육대회", "운동", "조깅", "등산", "축구"],
  추운날: ["추운", "추위", "한파", "기온이 낮", "기온 낮"],
  필라테스: ["필라테스", "요가", "코어 운동", "스트레칭", "체형 교정"],
  회사: ["회사", "출근", "퇴근", "근무", "회의"],
  회식: ["회식", "술자리", "단체 식사"],
  흐린날: ["흐린", "흐림", "구름 많음", "구름이 많", "날씨가 흐"],
};

export function getDailyReportImage(reportText = "") {
  const normalizedText = normalizeText(reportText);
  let bestImage = null;
  let bestScore = 0;

  reportImages.forEach((image) => {
    if (image.name === "기본") return;
    const compactName = image.name.replace(/많은날$|없는날$|오는날$|높은날$|운날$|날$/g, "");
    const keywords = [...new Set([image.name, compactName, ...(imageKeywords[image.name] || [])])].filter(Boolean);
    const score = keywords.reduce((total, keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      return normalizedKeyword && normalizedText.includes(normalizedKeyword) ? total + normalizedKeyword.length : total;
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestImage = image.src;
    }
  });

  return bestImage || fallbackImage;
}

export function createTodayDailyReport({
  date,
  cardText,
  fallbackText,
  tasks = [],
  weather,
  tags = [],
  weatherNotice = "",
  choreNotice = "",
}) {
  const normalizedText = String(cardText || fallbackText || "").trim();
  const sentences = normalizedText.split(/(?<=[.!?요])\s+/).filter(Boolean);
  const title = sentences[0] || "오늘 홈케어 일정을 정리했어요!";
  const subtitle = sentences.slice(1).join(" ") || choreNotice || "오늘의 일정과 가사일을 확인해 주세요.";
  const scheduleItems = tasks.filter((task) => !isApplianceTask(task)).map(toReportItem);
  const applianceItems = tasks.filter(isApplianceTask).map(toReportItem);
  const todoItems = tasks.map(toReportItem);
  const completedCount = todoItems.filter((item) => item.done).length;
  const imageText = [normalizedText, weatherNotice, choreNotice, tasks.map((task) => task.title).join(" ")].join(" ");
  const heroImageUrl = getDailyReportImage(imageText) || fallbackImage;

  return {
    id: date,
    date: formatDate(date),
    dayLabel: formatDayLabel(date),
    title,
    subtitle,
    summary: "오늘의 일정과 가사일을 바탕으로 홈케어 리포트를 만들었어요.",
    heroImageUrl,
    characterImageUrl: lgCharacterImage,
    tags: tags.length > 0 ? tags : ["가전 관리", "일정 연결", "자동 저장"],
    weatherNote: weatherNotice || buildWeatherNote(weather),
    choreNote: choreNotice || buildChoreNote(applianceItems),
    scheduleItems,
    todoItems,
    applianceItems,
    completedCount,
    totalTodoCount: todoItems.length,
    imageRecords: buildImageRecords(date, heroImageUrl, tasks),
  };
}

function buildImageRecords(date, heroImageUrl, tasks) {
  const todayTitle = tasks.find(isApplianceTask)?.title || "홈케어 준비";
  const history = [
    { offset: 0, title: todayTitle, imageUrl: heroImageUrl, isToday: true },
    { offset: -1, title: "가족 일정", imageUrl: getDailyReportImage("가족 일정이 있는 따뜻한 하루") },
    { offset: -2, title: "로봇청소기", imageUrl: getDailyReportImage("로봇청소기 예약 청소") },
    { offset: -3, title: "빨래 관리", imageUrl: getDailyReportImage("세탁기 빨래 관리") },
  ];

  return history.map((record) => {
    const recordDate = addDays(date, record.offset);
    return {
      id: recordDate,
      date: formatShortDate(recordDate),
      ...record,
    };
  });
}

function toReportItem(task = {}) {
  return {
    id: task.id,
    title: task.title || "일정",
    time: getTaskTime(task),
    place: task.place || "",
    done: Boolean(task.done),
    applianceType: task.applianceType || "",
  };
}

function getTaskTime(task = {}) {
  if (task.startTime) return task.startTime;
  const match = String(task.repeat || "").match(/\b(\d{1,2}:\d{2})\b/);
  return match?.[1] || "시간 미정";
}

function isApplianceTask(task = {}) {
  return Boolean(task.applianceType || task.displayType === "appliance" || task.tag === "house" || task.source === "auto");
}

function buildWeatherNote(weather = {}) {
  const text = `${weather.sky || ""} ${weather.pty || ""} ${weather.label || ""} ${weather.icon || ""}`;
  if (/비|소나기|rain|storm/i.test(text)) return "비 소식이 있어 우산과 실내 제습 일정을 함께 확인해 주세요.";
  if (Number(weather.maxTemp ?? weather.high) >= 28) return "기온이 높은 날이에요. 귀가 전 냉방 일정을 확인해 주세요.";
  if (weather.hasWeatherData === false) return "날씨 정보가 준비되면 홈케어 안내에 함께 반영할게요.";
  return "오늘 날씨에 맞춰 가전 일정과 실내 환경을 함께 확인했어요.";
}

function buildChoreNote(items) {
  if (items.length === 0) return "오늘 예정된 가사일이나 가전 작업은 없어요.";
  return `${items.slice(0, 2).map((item) => item.title).join(", ")} 작업이 예정되어 있어요.`;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}.]/gu, "");
}

function formatDate(date) {
  return String(date || "").replaceAll("-", ".");
}

function formatShortDate(date) {
  const parsed = new Date(`${date}T00:00:00`);
  return `${String(parsed.getMonth() + 1).padStart(2, "0")}.${String(parsed.getDate()).padStart(2, "0")} (${formatDayLabel(date).slice(0, 1)})`;
}

function formatDayLabel(date) {
  return `${["일", "월", "화", "수", "목", "금", "토"][new Date(`${date}T00:00:00`).getDay()]}요일`;
}

function addDays(date, amount) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + amount);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

