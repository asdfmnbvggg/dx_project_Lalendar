import { CalendarDays, Home, Trophy, UsersRound } from "lucide-react";

export const members = [
  { id: "all", name: "우리 집", short: "집", subtitle: "공유 작업 전체" },
  { id: "me", name: "Charlotte", short: "C", subtitle: "이번 주 18개 완료" },
  { id: "minsu", name: "Minsu.kim", short: "M", subtitle: "주방 담당" },
  { id: "theresa", name: "Theresa", short: "T", subtitle: "욕실 로테이션" },
];

export const rooms = [
  { name: "거실", icon: "L", state: "작업 없음" },
  { name: "주방", icon: "K", state: "모두 양호" },
  { name: "욕실", icon: "B", state: "오늘 3개" },
  { name: "침실", icon: "R", state: "2개 대기" },
];

export const presets = ["침대 시트 교체", "방향제 교체", "장식품 청소", "세탁실 정리", "싱크대 청소"];

export const initialTasks = [
  { id: 1, date: "2026-05-02", title: "분리수거", place: "현관", tag: "house", owner: "all", done: true, repeat: "매주" },
  { id: 2, date: "2026-05-05", title: "냉장고 정리", place: "주방", tag: "house", owner: "minsu", done: true, repeat: "2주마다" },
  { id: 3, date: "2026-05-08", title: "여행 계획", place: "공유", tag: "plan", owner: "me", done: false, repeat: "없음" },
  { id: 4, date: "2026-05-10", title: "욕실 청소", place: "욕실", tag: "house", owner: "theresa", done: true, repeat: "매주" },
  { id: 5, date: "2026-05-13", title: "침구 교체", place: "침실", tag: "house", owner: "me", done: true, repeat: "2주마다" },
  { id: 6, date: "2026-05-16", title: "장보기", place: "주방", tag: "share", owner: "minsu", done: false, repeat: "매주" },
  { id: 7, date: "2026-05-18", title: "싱크대 청소", place: "주방", tag: "house", owner: "me", done: true, repeat: "매주" },
  { id: 8, date: "2026-05-21", title: "거실 바닥 닦기", place: "거실", tag: "house", owner: "all", done: false, repeat: "매주" },
  { id: 9, date: "2026-05-22", title: "필라테스", place: "운동", tag: "routine", owner: "me", done: true, repeat: "월수금" },
  { id: 10, date: "2026-05-24", title: "책상 정리", place: "작업방", tag: "plan", owner: "theresa", done: false, repeat: "없음" },
  { id: 11, date: "2026-05-26", title: "오늘 집안일 확인", place: "전체", tag: "share", owner: "all", done: true, repeat: "매일" },
  { id: 12, date: "2026-05-26", title: "싱크대 청소", place: "주방", tag: "house", owner: "me", done: true, repeat: "매주" },
  { id: 13, date: "2026-05-26", title: "거울 얼룩 닦기", place: "욕실", tag: "house", owner: "minsu", done: false, repeat: "매주" },
  { id: 14, date: "2026-05-26", title: "빨래 개기", place: "세탁실", tag: "house", owner: "theresa", done: false, repeat: "3일마다" },
  { id: 15, date: "2026-05-28", title: "보상 스탬프 받기", place: "보상", tag: "reward", owner: "me", done: false, repeat: "주간" },
  { id: 16, date: "2026-05-30", title: "월말 대청소", place: "전체", tag: "house", owner: "all", done: false, repeat: "월말" },
];

export const navItems = [
  { id: "today", label: "오늘", icon: Home },
  { id: "calendar", label: "캘린더", icon: CalendarDays },
  { id: "crew", label: "멤버", icon: UsersRound },
  { id: "reward", label: "보상", icon: Trophy },
];

export const tagLabel = {
  house: "집안일",
  plan: "계획",
  routine: "루틴",
  share: "공유",
  reward: "보상",
};

export function dateKey(day) {
  return `2026-05-${String(day).padStart(2, "0")}`;
}
