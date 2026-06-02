export const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
export const WEEKDAY_DAYS = DAYS.slice(0, 5);
export const START_HOUR = 7;
export const END_HOUR = 22;
export const HOUR_HEIGHT = 64;

export const CATEGORY_COLORS = {
  school: "#3b82f6",
  academy: "#8b5cf6",
  work: "#334155",
  pickup: "#f97316",
  family: "#10b981",
  custom: "#e11d48",
};

export const CATEGORY_LABELS = {
  school: "학교",
  academy: "학원",
  work: "회사",
  pickup: "픽업",
  family: "가족",
  custom: "직접 입력",
};

export const EMPTY_SCHEDULE = {
  title: "",
  member: "all",
  day: "월",
  startTime: "09:00",
  endTime: "10:00",
  location: "",
  color: CATEGORY_COLORS.custom,
  repeatWeekly: true,
  category: "custom",
};

export const TEMPLATE_GROUPS = [
  {
    id: "school-grade-1",
    title: "초1 학교 시간표",
    description: "월-금 09:00부터 13:00/14:00까지",
    schedules: [
      ["월", "09:00", "09:40", "국어", "1-3반", "school"],
      ["월", "09:50", "10:30", "수학", "1-3반", "school"],
      ["월", "10:40", "11:20", "통합", "1-3반", "school"],
      ["월", "11:30", "12:10", "창체", "1-3반", "school"],
      ["월", "12:10", "13:00", "점심", "학교", "school"],
      ["화", "09:00", "09:40", "수학", "1-3반", "school"],
      ["화", "09:50", "10:30", "국어", "1-3반", "school"],
      ["화", "10:40", "11:20", "미술", "미술실", "school"],
      ["화", "11:30", "12:10", "미술", "미술실", "school"],
      ["화", "12:10", "13:00", "점심", "학교", "school"],
      ["수", "09:00", "09:40", "국어", "1-3반", "school"],
      ["수", "09:50", "10:30", "통합", "1-3반", "school"],
      ["수", "10:40", "11:20", "체육", "운동장", "school"],
      ["수", "11:30", "12:10", "창체", "1-3반", "school"],
      ["수", "12:10", "13:00", "점심", "학교", "school"],
      ["목", "09:00", "09:40", "수학", "1-3반", "school"],
      ["목", "09:50", "10:30", "국어", "1-3반", "school"],
      ["목", "10:40", "11:20", "통합", "1-3반", "school"],
      ["목", "11:30", "12:10", "체육", "체육관", "school"],
      ["목", "12:10", "14:00", "점심/방과후", "학교", "school"],
      ["금", "09:00", "09:40", "국어", "1-3반", "school"],
      ["금", "09:50", "10:30", "수학", "1-3반", "school"],
      ["금", "10:40", "11:20", "통합", "1-3반", "school"],
      ["금", "11:30", "12:10", "창체", "1-3반", "school"],
      ["금", "12:10", "13:00", "점심", "학교", "school"],
    ],
  },
  {
    id: "academy",
    title: "학원 일정",
    description: "월/수 영어, 화/목 수학",
    schedules: [
      ["월", "15:00", "16:00", "영어학원", "영어학원", "academy"],
      ["수", "15:00", "16:00", "영어학원", "영어학원", "academy"],
      ["화", "16:00", "17:00", "수학학원", "수학학원", "academy"],
      ["목", "16:00", "17:00", "수학학원", "수학학원", "academy"],
    ],
  },
  {
    id: "pickup",
    title: "등하교/픽업",
    description: "월-금 등교와 하교 픽업",
    schedules: WEEKDAY_DAYS.flatMap((day) => [
      [day, "08:20", "09:00", "등교", "학교", "pickup"],
      [day, "13:00", "14:00", "하교/픽업", "학교", "pickup"],
    ]),
  },
  {
    id: "work",
    title: "회사 근무 시간",
    description: "월-금 09:00-18:00, 점심 12:00-13:00",
    schedules: WEEKDAY_DAYS.flatMap((day) => [
      [day, "09:00", "12:00", "근무", "회사", "work"],
      [day, "12:00", "13:00", "점심시간", "회사", "work"],
      [day, "13:00", "18:00", "근무", "회사", "work"],
    ]),
  },
];

export function buildTemplateSchedules(template, defaultMemberId = "all") {
  return template.schedules.map(([day, startTime, endTime, title, location, category, member]) => ({
    id: `template-${template.id}-${day}-${startTime}-${title}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    member: member || defaultMemberId,
    day,
    startTime,
    endTime,
    location,
    color: CATEGORY_COLORS[category] || CATEGORY_COLORS.custom,
    repeatWeekly: true,
    category,
  }));
}
