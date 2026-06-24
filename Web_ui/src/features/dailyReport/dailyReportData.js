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
  title = "",
  detail = "",
  tasks = [],
  weather,
  tags = [],
  weatherNotice = "",
  choreNotice = "",
  imageTheme = "homecare_default",
  priority = "normal",
  source = "gpt",
}) {
  const normalizedText = String(cardText || fallbackText || "").trim();
  const scheduleTasks = tasks.filter((task) => !isApplianceTask(task));
  const detailScheduleItems = scheduleTasks.filter((task) => !isFixedScheduleTask(task)).map(toReportItem);
  const scheduleItems = scheduleTasks.map(toReportItem);
  const applianceItems = tasks.filter(isApplianceTask).map(toReportItem);
  const todoItems = tasks.map(toReportItem);
  const completedCount = todoItems.filter((item) => item.done).length;
  const imageText = [normalizedText, getImageThemeKeywords(imageTheme), weatherNotice, choreNotice, tasks.map((task) => task.title).join(" ")].join(" ");
  const heroImageUrl = getDailyReportImage(imageText) || fallbackImage;
  const resolvedWeatherNotice = weatherNotice || buildWeatherNote(weather);
  const resolvedChoreNotice = choreNotice || buildChoreNote(applianceItems);
  const detailNotices = [weatherNotice, choreNotice].filter(Boolean);
  const fallbackNote = buildFallbackDailyNote(scheduleItems, applianceItems);
  const resolvedTitle = buildReportTitle(normalizedText, title, fallbackNote);
  const resolvedSummary = buildShortReportDetail({
    detail,
    scheduleItems: detailScheduleItems,
    applianceItems,
    weatherNotice: resolvedWeatherNotice,
    choreNotice: resolvedChoreNotice,
    detailNotices,
  });

  return {
    id: date,
    date: formatDate(date),
    dayLabel: formatDayLabel(date),
    cardText: normalizedText,
    title: resolvedTitle,
    subtitle: getPriorityNotice(priority, resolvedWeatherNotice, resolvedChoreNotice),
    summary: resolvedSummary,
    aiNarrative: normalizedText,
    imageTheme,
    priority,
    source,
    heroImageUrl,
    characterImageUrl: lgCharacterImage,
    tags: tags.length > 0 ? tags : ["가전 관리", "일정 연결", "자동 저장"],
    weatherNote: resolvedWeatherNotice,
    choreNote: resolvedChoreNotice,
    scheduleItems,
    todoItems,
    applianceItems,
    completedCount,
    totalTodoCount: todoItems.length,
    imageRecords: buildImageRecords(date, heroImageUrl, tasks),
  };
}

function getImageThemeKeywords(imageTheme) {
  const themes = {
    homecare_laundry: "세탁기 빨래 건조기",
    homecare_cleaning: "로봇청소기 청소",
    homecare_air: "공기청정기 에어컨 공기질",
    homecare_weather: "날씨 비 습도",
    homecare_schedule: "개인 일정 바쁜 날",
    homecare_default: "홈케어",
  };
  return themes[imageTheme] || themes.homecare_default;
}

function getPriorityNotice(priority, weatherNotice, choreNotice) {
  if (priority === "weather" && weatherNotice) return weatherNotice;
  if (priority === "chore" && choreNotice) return choreNotice;
  return choreNotice || weatherNotice || "오늘의 세부 일정과 진행 상황을 아래에서 확인해 주세요.";
}

function buildReportTitle(summary, fallbackTitle, fallbackNote) {
  const preferred = sanitizeTitleCandidate(summary);
  const fallback = sanitizeTitleCandidate(fallbackTitle);
  return trimSentence(preferred || fallback || fallbackNote || "오늘의 일정과 가사일을 확인해요.", 58);
}

function buildShortReportDetail({ detail, scheduleItems, applianceItems, weatherNotice, choreNotice, detailNotices }) {
  const generated = buildOneLineTaskDetail(scheduleItems, applianceItems);
  if (generated) return generated;

  const detailText = normalizeOneLine(detail);
  const source = (isFixedScheduleDetail(detailText) ? "" : detailText) || detailNotices.join(" ") || choreNotice || weatherNotice;
  return trimSentence(source || "오늘의 일정과 가사일을 한 줄로 정리했어요.", 72);
}

function buildOneLineTaskDetail(scheduleItems, applianceItems) {
  const hasSchedule = scheduleItems.length > 0;
  const hasAppliance = applianceItems.length > 0;

  if (hasSchedule && hasAppliance) {
    return "바쁜 하루에도 집안일까지 챙기느라 고생 많아요. 오늘은 조금 더 편안한 하루가 되길 바라요.";
  }
  if (hasSchedule) return buildScheduleSummary(scheduleItems);
  if (hasAppliance) return buildApplianceSummary(applianceItems);
  return "오늘은 잠시 숨을 고르기 좋은 하루예요. 가볍게 쉬어가도 괜찮아요.";
}

function buildScheduleSummary(items) {
  const titles = [...new Set(items.map((item) => normalizeOneLine(item.title)).filter(Boolean))];
  if (titles.length === 1) return `${titles[0]} 일정이 예정되어 있어요.`;
  if (titles.length > 1) return `${titles[0]} 외 ${titles.length - 1}개의 일정이 예정되어 있어요.`;
  return "오늘 예정된 일정을 확인해 주세요.";
}

function buildApplianceSummary(items) {
  const applianceTitles = items.map((item) => normalizeOneLine(item.title)).filter(Boolean);
  const applianceSummaries = [
    ["로봇청소기", "예약된 청소 시간과 실행 모드를 확인해 주세요."],
    ["세탁기", "세탁 시간과 완료 예상 시간을 확인해 주세요."],
    ["건조기", "건조 시작 시간과 완료 알림을 확인해 주세요."],
    ["식기세척기", "식기세척기 실행 시간과 모드를 확인해 주세요."],
    ["에어컨", "실내 온도에 맞춘 실행 모드를 확인해 주세요."],
    ["공기청정기", "공기질 상태와 청정 모드를 확인해 주세요."],
  ];

  for (const title of applianceTitles) {
    const matchedSummary = applianceSummaries.find(([applianceName]) => title.includes(applianceName));
    if (matchedSummary) return matchedSummary[1];
  }

  if (applianceTitles[0]) return `${applianceTitles[0]} 작업 일정이 예정되어 있어요.`;
  return "가전 작업 일정이 예정되어 있어요.";
}

function summarizeItems(items, fallbackLabel) {
  const titles = [...new Set(items.map((item) => normalizeOneLine(item.title)).filter(Boolean))];
  if (titles.length === 0) return "";
  if (titles.length === 1) return titles[0];
  return `${titles[0]} 외 ${titles.length - 1}개 ${fallbackLabel}`;
}

function trimSentence(value, limit) {
  const text = normalizeOneLine(value);
  if (!text) return "";
  const firstSentence = text.match(/^.+?[.!?。]|^.+?[요다]\./)?.[0] || text;
  const compact = firstSentence.length <= limit ? firstSentence : text;
  return compact.length <= limit ? compact : `${compact.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function normalizeOneLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sanitizeTitleCandidate(value) {
  const text = normalizeOneLine(value);
  if (!text) return "";
  if (/가족\s*일정\s*및\s*생활\s*정보|Daily\s*AI\s*Report|GPT\s*DAILY/i.test(text)) return "";
  return text;
}

function buildFallbackDailyNote(scheduleItems, applianceItems) {
  const scheduleText = summarizeItems(scheduleItems, "일정");
  const applianceText = summarizeItems(applianceItems, "가사일");
  if (scheduleText && applianceText) return `오늘은 ${scheduleText}이 있고, ${applianceText}도 예정되어 있어요.`;
  if (scheduleText) return `오늘은 ${scheduleText}이 있습니다.`;
  if (applianceText) return `오늘은 ${applianceText}이 예정되어 있어요.`;
  return "오늘은 여유롭게 일정을 확인해도 좋아요.";
}

function isFixedScheduleTask(task = {}) {
  const text = `${task.title || ""} ${task.place || ""} ${task.repeat || ""} ${task.type || ""} ${task.displayType || ""}`;
  if (task.displayType === "fixed" || task.type === "fixed" || task.place === "고정 일정") return true;
  if (Array.isArray(task.daysOfWeek) && task.daysOfWeek.length > 0) return true;
  if (/매주|반복|weekly|고정\s*일정/i.test(text)) return true;
  return isSchoolTimetableText(text);
}

function isFixedScheduleDetail(text) {
  if (!text) return false;
  if (/고정\s*일정|시간표|수업이\s*(있|이어|시작)|내일\s*\d{0,2}\s*월|모레\s*\d{0,2}\s*월/.test(text)) return true;
  return isSchoolTimetableText(text);
}

function isSchoolTimetableText(text) {
  const subjects = ["국어", "영어", "수학", "과학", "사회", "체육", "음악", "미술", "기술가정", "창체", "동아리"];
  const matchCount = subjects.reduce((count, subject) => count + (String(text || "").includes(subject) ? 1 : 0), 0);
  return matchCount >= 3;
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
