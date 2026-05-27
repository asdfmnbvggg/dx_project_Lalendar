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
  { id: "air", name: "공기청정기", state: "미세먼지 보통", signal: "환기 20분 가능", accent: "violet" },
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
    task: "짧게 환기 후 공기청정기 켜기",
  },
  {
    title: "야근 일정에 맞춰 취침 루틴 조정",
    reason: "도착 예상 22:40, 조명/에어컨 예약 권장",
    action: "취침 루틴 예약",
    task: "취침 전 조명 낮추기",
  },
];

export const communityTips = [
  { title: "선반 먼지는 4일 주기가 좋아요", source: "1인가구 루틴 인기 글" },
  { title: "냉장고 문을 자주 열면 장보기 전 정리부터", source: "LG HUB 커뮤니티" },
  { title: "로봇청소기는 외출 30분 전에 시작하면 효율적이에요", source: "사용자 자동화 사례" },
];

const baseTasks = [
  { id: 1, date: "2026-05-02", title: "분리수거", place: "현관", tag: "house", owner: "all", done: true, repeat: "매주", source: "manual" },
  { id: 2, date: "2026-05-05", title: "냉장고 정리", place: "주방", tag: "house", owner: "minsu", done: true, repeat: "2주마다", source: "auto" },
  { id: 3, date: "2026-05-08", title: "여행 계획", place: "공유", tag: "plan", owner: "me", done: false, repeat: "없음", source: "manual" },
  { id: 4, date: "2026-05-10", title: "욕실 청소", place: "욕실", tag: "house", owner: "theresa", done: true, repeat: "매주", source: "manual" },
  { id: 5, date: "2026-05-13", title: "침구 교체", place: "침실", tag: "house", owner: "me", done: true, repeat: "2주마다", source: "auto" },
  { id: 6, date: "2026-05-16", title: "장보기", place: "주방", tag: "share", owner: "minsu", done: false, repeat: "매주", source: "manual" },
  { id: 7, date: "2026-05-18", title: "싱크대 청소", place: "주방", tag: "house", owner: "me", done: true, repeat: "매주", source: "manual" },
  { id: 8, date: "2026-05-21", title: "거실 바닥 닦기", place: "거실", tag: "house", owner: "all", done: false, repeat: "매주", source: "auto" },
  { id: 9, date: "2026-05-22", title: "필라테스", place: "운동", tag: "routine", owner: "me", done: true, repeat: "월수금", source: "manual" },
  { id: 10, date: "2026-05-24", title: "책상 정리", place: "작업방", tag: "plan", owner: "theresa", done: false, repeat: "없음", source: "manual" },
  { id: 11, date: "2026-05-26", title: "오늘 집안일 확인", place: "전체", tag: "share", owner: "all", done: true, repeat: "매일", source: "auto" },
  { id: 12, date: "2026-05-26", title: "싱크대 청소", place: "주방", tag: "house", owner: "me", done: true, repeat: "매주", source: "manual" },
  { id: 13, date: "2026-05-26", title: "거울 얼룩 닦기", place: "욕실", tag: "house", owner: "minsu", done: false, repeat: "매주", source: "auto" },
  { id: 14, date: "2026-05-26", title: "빨래 개기", place: "세탁실", tag: "house", owner: "theresa", done: false, repeat: "3일마다", source: "manual" },
  { id: 16, date: "2026-05-30", title: "월말 대청소", place: "전체", tag: "house", owner: "all", done: false, repeat: "월말", source: "auto" },
];

export const weatherByDate = {
  "2026-05-01": { high: 24, low: 14 },
  "2026-05-02": { high: 22, low: 13 },
  "2026-05-03": { high: 16, low: 10 },
  "2026-05-04": { high: 20, low: 8 },
  "2026-05-05": { high: 21, low: 8 },
  "2026-05-06": { high: 24, low: 9 },
  "2026-05-07": { high: 20, low: 11 },
  "2026-05-08": { high: 20, low: 10 },
  "2026-05-09": { high: 23, low: 10 },
  "2026-05-10": { high: 25, low: 10 },
  "2026-05-11": { high: 21, low: 13 },
  "2026-05-12": { high: 25, low: 15 },
  "2026-05-13": { high: 26, low: 13 },
  "2026-05-14": { high: 32, low: 15 },
  "2026-05-15": { high: 31, low: 18 },
  "2026-05-16": { high: 30, low: 18 },
  "2026-05-17": { high: 29, low: 16 },
  "2026-05-18": { high: 30, low: 16 },
  "2026-05-19": { high: 26, low: 20 },
  "2026-05-20": { high: 22, low: 15 },
  "2026-05-21": { high: 20, low: 15 },
  "2026-05-22": { high: 27, low: 15 },
  "2026-05-23": { high: 25, low: 16 },
  "2026-05-24": { high: 29, low: 15 },
  "2026-05-25": { high: 30, low: 18 },
  "2026-05-26": { high: 27, low: 21 },
  "2026-05-27": { high: 26, low: 20, condition: "rain", label: "비" },
  "2026-05-28": { high: 28, low: 15, condition: "sun-rain", label: "맑고 비" },
  "2026-05-29": { high: 29, low: 14, condition: "sunny", label: "맑음" },
  "2026-05-30": { high: 29, low: 15, condition: "sunny", label: "맑음" },
  "2026-05-31": { high: 30, low: 16, condition: "sunset", label: "맑음" },
  "2026-06-01": { high: 31, low: 16, condition: "sun-rain", label: "맑고 비" },
  "2026-06-02": { high: 31, low: 18, condition: "sunny", label: "맑음" },
  "2026-06-03": { high: 33, low: 19, condition: "sun-rain", label: "맑고 비" },
  "2026-06-04": { high: 30, low: 18, condition: "sun-rain", label: "맑고 비" },
  "2026-06-05": { high: 27, low: 17, condition: "sunny", label: "맑음" },
  "2026-06-06": { high: 28, low: 17, condition: "sunny", label: "맑음" },
  "2026-06-07": { high: 27, low: 17, condition: "sunny", label: "맑음" },
  "2026-06-08": { high: 28, low: 17, condition: "sunny", label: "맑음" },
  "2026-06-09": { high: 25, low: 16, condition: "sunny", label: "맑음" },
  "2026-06-10": { high: 28, low: 19, condition: "partly", label: "구름 조금" },
  "2026-06-11": { high: 28, low: 18, condition: "partly", label: "구름 조금" },
  "2026-06-12": { high: 28, low: 19, condition: "sunny", label: "맑음" },
  "2026-06-13": { high: 28, low: 19, condition: "sun-rain", label: "맑고 비" },
  "2026-06-14": { high: 28, low: 20, condition: "storm", label: "뇌우" },
  "2026-06-15": { high: 25, low: 19, condition: "partly", label: "구름 조금" },
  "2026-06-16": { high: 26, low: 19, condition: "sun-rain", label: "맑고 비" },
  "2026-06-17": { high: 25, low: 18, condition: "sunny", label: "맑음" },
  "2026-06-18": { high: 26, low: 17, condition: "partly", label: "구름 조금" },
  "2026-06-19": { high: 27, low: 20, condition: "sun-rain", label: "맑고 비" },
  "2026-06-20": { high: 28, low: 20, condition: "partly", label: "구름 조금" },
  "2026-06-21": { high: 29, low: 20, condition: "cloudy", label: "흐림" },
  "2026-06-22": { high: 26, low: 20, condition: "storm", label: "뇌우" },
  "2026-06-23": { high: 26, low: 21, condition: "partly", label: "구름 조금" },
  "2026-06-24": { high: 27, low: 20, condition: "partly", label: "구름 조금" },
  "2026-06-25": { high: 26, low: 21, condition: "cloudy", label: "흐림" },
  "2026-06-26": { high: 27, low: 21, condition: "cloudy", label: "흐림" },
  "2026-06-27": { high: 27, low: 20, condition: "partly", label: "구름 조금" },
  "2026-06-28": { high: 26, low: 19, condition: "cloudy", label: "흐림" },
  "2026-06-29": { high: 26, low: 19, condition: "partly", label: "구름 조금" },
  "2026-06-30": { high: 26, low: 19, condition: "rain", label: "비" },
};

export const initialTasks = [...baseTasks, ...buildWeatherRoutineTasks()];

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

export function dateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildWeatherRoutineTasks() {
  const weatherDates = Object.keys(weatherByDate).sort();
  const generated = [];
  const used = new Set(baseTasks.map((task) => `${task.date}:${task.title}`));
  let id = 1000;

  weatherDates.forEach((date) => {
    const weather = weatherByDate[date];
    const rainy = isRainyWeather(weather);
    if (rainy) {
      addGenerated(generated, used, {
        id: id++,
        date,
        title: "제습기 켜기",
        place: "거실",
        tag: "house",
        owner: "all",
        done: false,
        repeat: "비 오는 날",
        source: "auto",
      });
    }

    if (isHumidWeather(weather)) {
      addGenerated(generated, used, {
        id: id++,
        date,
        title: "건조기 사용",
        place: "세탁실",
        tag: "house",
        owner: "all",
        done: false,
        repeat: "습한 날",
        source: "auto",
      });
      if (!rainy) {
        addGenerated(generated, used, {
          id: id++,
          date,
          title: "제습기 사용",
          place: "거실",
          tag: "house",
          owner: "all",
          done: false,
          repeat: "습한 날",
          source: "auto",
        });
      }
    }
  });

  for (let index = 0; index < weatherDates.length; index += 3) {
    const targetDate = weatherDates[index];
    const scheduleDate = isRainyDate(targetDate) ? previousDateKey(targetDate) : targetDate;
    addGenerated(generated, used, {
      id: id++,
      date: scheduleDate,
      title: "세탁기 돌리기",
      place: "세탁실",
      tag: "house",
      owner: "all",
      done: false,
      repeat: isRainyDate(targetDate) ? "비 예보로 전날" : "3일마다",
      source: "auto",
    });
  }

  return generated;
}

function addGenerated(tasks, used, task) {
  const key = `${task.date}:${task.title}`;
  if (used.has(key)) return;
  used.add(key);
  tasks.push(task);
}

export function isRainyDate(date) {
  return isRainyWeather(weatherByDate[date]);
}

function isRainyWeather(weather) {
  return ["rain", "sun-rain", "storm"].includes(weather?.condition);
}

function isHumidWeather(weather) {
  return ["rain", "sun-rain", "storm", "cloudy"].includes(weather?.condition);
}

function previousDateKey(date) {
  const current = new Date(`${date}T00:00:00`);
  current.setDate(current.getDate() - 1);
  return dateKey(current.getFullYear(), current.getMonth() + 1, current.getDate());
}
