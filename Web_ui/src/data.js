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

export const appliances = [
  { id: "washer", name: "세탁기", state: "마지막 사용 4일 전", signal: "오늘 세탁 추천", accent: "mint" },
  { id: "dryer", name: "건조기", state: "습도 낮음", signal: "건조 효율 좋음", accent: "coral" },
  { id: "fridge", name: "냉장고", state: "문 열림 32회", signal: "유통기한 확인", accent: "blue" },
  { id: "air", name: "공기청정기", state: "미세먼지 보통", signal: "환기 20분 후 가동", accent: "violet" },
  { id: "robot", name: "로봇청소기", state: "거실 미청소", signal: "퇴근 전 예약", accent: "navy" },
];

export const smartRecommendations = [
  {
    title: "오늘은 빨래하기 좋은 날이에요",
    reason: "강남구 기준 습도 42%, 강수 확률 10%",
    action: "세탁 루틴 추가",
    task: "세탁기 돌리기",
  },
  {
    title: "미세먼지가 있어 환기는 짧게",
    reason: "창문 열기 10분 뒤 공기청정기 자동 가동",
    action: "환기 알림 만들기",
    task: "짧은 환기 후 공기청정기",
  },
  {
    title: "야근 일정에 맞춰 취침 루틴 조정",
    reason: "도착 예상 22:40, 조명/에어컨 예약 권장",
    action: "취침 루틴 예약",
    task: "취침 전 조명 낮추기",
  },
];

export const communityTips = [
  { title: "선반 위 먼지는 4일 주기가 좋아요", source: "1인가구 루틴 인기 팁" },
  { title: "냉장고 문을 자주 열면 장보기 전 정리부터", source: "LG HUB 커뮤니티" },
  { title: "로봇청소기는 외출 30분 뒤 시작이 효율적", source: "사용자 자동화 사례" },
];

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
