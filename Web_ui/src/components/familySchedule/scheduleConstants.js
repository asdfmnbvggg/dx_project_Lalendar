export const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
export const WEEKDAY_DAYS = DAYS.slice(0, 5);
export const START_HOUR = 7;
export const END_HOUR = 22;
export const HOUR_HEIGHT = 64;

export const CATEGORY_COLORS = {
  custom: "#e11d48",
  weather: "#0ea5e9",
  appliance: "#14b8a6",
  routine: "#8b5cf6",
  housework: "#f97316",
};

export const CATEGORY_LABELS = {
  custom: "직접 입력",
  weather: "날씨 기반 추천",
  appliance: "가전 상태 기반 추천",
  routine: "가족 루틴 기반 추천",
  housework: "생활/가사 추천",
};

export const REPEAT_OPTIONS = [
  { value: "none", label: "없음" },
  { value: "daily", label: "매일" },
  { value: "weekly", label: "매주" },
  { value: "monthly", label: "매월" },
  { value: "custom", label: "사용자 지정" },
];

export const REMINDER_OPTIONS = [
  { value: "off", label: "OFF" },
  { value: "at-time", label: "정시" },
  { value: "10m", label: "10분 전" },
  { value: "30m", label: "30분 전" },
  { value: "1h", label: "1시간 전" },
  { value: "1d", label: "하루 전" },
];

export const REMINDER_TARGETS = [
  { value: "me", label: "나만" },
  { value: "assignees", label: "담당자" },
  { value: "family", label: "가족 전체" },
];

export const PLACE_PRESETS = ["우리 집", "회사", "학교", "학원", "마트", "병원", "직접 입력"];

export const EMPTY_SCHEDULE = {
  title: "",
  member: "all",
  members: ["all"],
  date: "",
  day: "월",
  days: ["월"],
  startTime: "09:00",
  endTime: "10:00",
  location: "우리 집",
  placePreset: "우리 집",
  repeat: "none",
  repeatWeekly: false,
  category: "custom",
  color: CATEGORY_COLORS.custom,
  reminder: "off",
  reminderTarget: "assignees",
  memo: "",
};

export const TEMPLATE_GROUPS = [
  {
    id: "school-grade-1",
    title: "초등학교 시간표",
    description: "평일 09:00부터 점심 이후까지",
    schedules: [
      ["월", "09:00", "09:40", "국어", "1-3반", "custom"],
      ["월", "09:50", "10:30", "수학", "1-3반", "custom"],
      ["화", "09:00", "09:40", "수학", "1-3반", "custom"],
      ["화", "09:50", "10:30", "국어", "1-3반", "custom"],
      ["수", "10:40", "11:20", "체육", "운동장", "routine"],
      ["목", "09:00", "09:40", "통합", "1-3반", "custom"],
      ["금", "11:30", "12:10", "창체", "1-3반", "custom"],
    ],
  },
  {
    id: "academy",
    title: "학원 일정",
    description: "영어, 수학 학원 반복 일정",
    schedules: [
      ["월", "15:00", "16:00", "영어학원", "영어학원", "routine"],
      ["수", "15:00", "16:00", "영어학원", "영어학원", "routine"],
      ["화", "16:00", "17:00", "수학학원", "수학학원", "routine"],
      ["목", "16:00", "17:00", "수학학원", "수학학원", "routine"],
    ],
  },
  {
    id: "pickup",
    title: "등하교 픽업",
    description: "평일 등교와 하교 픽업",
    schedules: WEEKDAY_DAYS.flatMap((day) => [
      [day, "08:20", "09:00", "등교", "학교", "routine"],
      [day, "13:00", "14:00", "하교/픽업", "학교", "routine"],
    ]),
  },
  {
    id: "work",
    title: "회사 근무 시간",
    description: "평일 09:00-18:00",
    schedules: WEEKDAY_DAYS.map((day) => [day, "09:00", "18:00", "근무", "회사", "routine"]),
  },
];

export function buildTemplateSchedules(template, defaultMemberId = "all") {
  return template.schedules.map(([day, startTime, endTime, title, location, category]) => ({
    id: `template-${template.id}-${day}-${startTime}-${title}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    member: defaultMemberId,
    members: [defaultMemberId],
    day,
    days: [day],
    startTime,
    endTime,
    location,
    placePreset: PLACE_PRESETS.includes(location) ? location : "직접 입력",
    color: CATEGORY_COLORS[category] || CATEGORY_COLORS.custom,
    repeat: "weekly",
    repeatWeekly: true,
    category,
    reminder: "off",
    reminderTarget: "assignees",
    memo: "",
  }));
}
