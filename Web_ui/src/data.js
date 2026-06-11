import { CalendarDays, UsersRound } from "lucide-react";

export const members = [
  { id: "all", name: "우리 집", short: "집", subtitle: "공유 작업 전체", color: "#d4144b" },
  { id: "me", name: "최재혁", short: "최", subtitle: "이번 주 18개 완료", color: "#fb4b6f" },
  { id: "minsu", name: "김다빈", short: "김", subtitle: "주방 담당", color: "#14b8a6" },
  { id: "theresa", name: "김수현", short: "김", subtitle: "욕실 담당", color: "#8b5cf6" },
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

export const weatherIndicators = {
  date: "2026-05-28",
  temperature: "28° / 15°",
  dailyRange: "13°",
  humidity: "68%",
  rain: "오후 비 예보",
  indoorTarget: "22-24° · 습도 45-55%",
};

export const personalScheduleRules = [
  { id: "commute", label: "출근", repeat: "평일 09:00", returnHome: "19:30" },
  { id: "class", label: "수업", repeat: "화/목 18:00", returnHome: "21:20" },
  { id: "dinner", label: "회식/약속", repeat: "추가 일정", returnHome: "일정 종료 30분 전 재계산" },
];

export const applianceLogs = [
  { id: "washer", label: "세탁기", dailyRuntime: "1시간 20분", weeklyRuns: 3 },
  { id: "dryer", label: "건조기", dailyRuntime: "45분", weeklyRuns: 2 },
  { id: "dehumidifier", label: "제습기", dailyRuntime: "2시간", weeklyRuns: 5 },
  { id: "aircon", label: "에어컨", dailyRuntime: "1시간", weeklyRuns: 4 },
  { id: "purifier", label: "공기청정기", dailyRuntime: "8시간", weeklyRuns: 7 },
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
  {
    title: "귀가 시간에 맞춰 집안 환경 준비",
    reason: "퇴근 후 19:30 도착 기준, 세탁 종료와 공기질 관리 예약",
    action: "귀가 자동화 추가",
    task: "귀가 전 세탁 완료 예약",
  },
];

export const communityTips = [
  { title: "선반 먼지는 4일 주기가 좋아요", source: "1인가구 루틴 인기 글" },
  { title: "냉장고 문을 자주 열면 장보기 전 정리부터", source: "LG HUB 커뮤니티" },
  { title: "로봇청소기는 외출 30분 전에 시작하면 효율적이에요", source: "사용자 자동화 사례" },
  { title: "이불 빨래는 1개월에 1번 권장돼요", source: "AI 가전 꿀팁" },
  { title: "베개 커버는 1주일에 1번 세탁하면 좋아요", source: "AI 가전 꿀팁" },
  { title: "에어컨 청소 후 문을 열고 2시간 송풍하세요", source: "AI 가전 꿀팁" },
];

export const automationAlerts = [
  {
    id: "rain-laundry",
    title: "비 예보로 빨래 일정을 당겼어요",
    detail: "2주 예보 기준 비 오는 날을 피해서 세탁기 돌리기를 전날로 조정합니다.",
    date: "2026-05-28",
    taskTitle: "세탁기 돌리기",
    place: "세탁실",
  },
  {
    id: "home-climate",
    title: "귀가 전 최적 환경을 준비할까요?",
    detail: "19:30 도착 예상에 맞춰 제습기, 에어컨, 공기청정기를 미리 켭니다.",
    date: "2026-05-28",
    taskTitle: "귀가 전 실내 환경 자동화",
    place: "LG ThinQ",
  },
  {
    id: "aircon-fan",
    title: "에어컨 청소 후 2시간 송풍할까요?",
    detail: "청소 뒤 문을 열고 송풍하면 내부 습기와 냄새를 줄일 수 있어요.",
    date: "2026-05-28",
    taskTitle: "에어컨 2시간 송풍",
    place: "거실",
  },
];

const baseTasks = [
  { id: 1, date: "2026-05-02", title: "분리수거", place: "현관", tag: "house", owner: "me", done: true, repeat: "매주", source: "manual" },
  { id: 2, date: "2026-05-05", title: "냉장고 정리", place: "주방", tag: "house", owner: "minsu", done: true, repeat: "2주마다", source: "auto" },
  { id: 3, date: "2026-05-08", title: "여행 계획", place: "공유", tag: "plan", owner: "me", done: false, repeat: "없음", source: "manual" },
  { id: 4, date: "2026-05-10", title: "욕실 청소", place: "욕실", tag: "house", owner: "theresa", done: true, repeat: "매주", source: "manual" },
  { id: 5, date: "2026-05-13", title: "침구 교체", place: "침실", tag: "house", owner: "me", done: true, repeat: "2주마다", source: "auto" },
  { id: 6, date: "2026-05-16", title: "장보기", place: "주방", tag: "share", owner: "minsu", done: false, repeat: "매주", source: "manual" },
  { id: 7, date: "2026-05-18", title: "싱크대 청소", place: "주방", tag: "house", owner: "me", done: true, repeat: "매주", source: "manual" },
  { id: 8, date: "2026-05-21", title: "거실 바닥 닦기", place: "거실", tag: "house", owner: "minsu", done: false, repeat: "매주", source: "auto" },
  { id: 9, date: "2026-05-22", title: "필라테스", place: "운동", tag: "routine", owner: "me", done: true, repeat: "월수금", source: "manual" },
  { id: 10, date: "2026-05-24", title: "책상 정리", place: "작업방", tag: "plan", owner: "theresa", done: false, repeat: "없음", source: "manual" },
  { id: 11, date: "2026-05-26", title: "오늘 집안일 확인", place: "전체", tag: "share", owner: "all", done: true, repeat: "매일", source: "auto" },
  { id: 12, date: "2026-05-26", title: "싱크대 청소", place: "주방", tag: "house", owner: "me", done: true, repeat: "매주", source: "manual" },
  { id: 13, date: "2026-05-26", title: "거울 얼룩 닦기", place: "욕실", tag: "house", owner: "minsu", done: false, repeat: "매주", source: "auto" },
  { id: 14, date: "2026-05-26", title: "빨래 개기", place: "세탁실", tag: "house", owner: "theresa", done: false, repeat: "3일마다", source: "manual" },
  { id: 16, date: "2026-05-30", title: "월말 대청소", place: "전체", tag: "house", owner: "all", done: false, repeat: "월말", source: "auto" },
  { id: 17, date: "2026-05-03", title: "신발장 정리", place: "현관", tag: "house", owner: "theresa", done: false, repeat: "월 1회", source: "auto" },
  { id: 18, date: "2026-05-06", title: "가스레인지 닦기", place: "주방", tag: "house", owner: "minsu", done: false, repeat: "매주", source: "auto" },
  { id: 19, date: "2026-05-09", title: "수건 삶기", place: "세탁실", tag: "house", owner: "me", done: false, repeat: "2주마다", source: "auto" },
  { id: 20, date: "2026-05-12", title: "공기청정기 필터 확인", place: "거실", tag: "house", owner: "theresa", done: false, repeat: "2주마다", source: "auto" },
  { id: 21, date: "2026-05-15", title: "전자레인지 청소", place: "주방", tag: "house", owner: "minsu", done: false, repeat: "매주", source: "auto" },
  { id: 22, date: "2026-05-19", title: "베개 커버 세탁", place: "침실", tag: "house", owner: "me", done: false, repeat: "매주", source: "auto" },
  { id: 23, date: "2026-05-23", title: "욕실 배수구 청소", place: "욕실", tag: "house", owner: "theresa", done: false, repeat: "매주", source: "auto" },
  { id: 24, date: "2026-05-27", title: "냉장고 선반 닦기", place: "주방", tag: "house", owner: "minsu", done: false, repeat: "2주마다", source: "auto" },
  { id: 25, date: "2026-05-30", title: "창틀 먼지 닦기", place: "거실", tag: "house", owner: "me", done: false, repeat: "월말", source: "auto" },
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
  "2026-05-29": { high: 29, low: 14, condition: "rain", label: "비" },
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

const demoCalendarTasks = [
  {
    id: 2001,
    date: "2026-06-11",
    title: "오전 스탠드업",
    place: "회사",
    tag: "plan",
    owner: "me",
    done: false,
    repeat: "09:30-10:00",
    source: "manual",
    displayType: "fixed",
    color: "#fb7185",
    sortOrder: 1,
  },
  {
    id: 2002,
    date: "2026-06-11",
    title: "기획 리뷰",
    place: "온라인 회의",
    tag: "plan",
    owner: "minsu",
    done: false,
    repeat: "13:00-14:00",
    source: "manual",
    displayType: "fixed",
    color: "#38bdf8",
    sortOrder: 2,
  },
  {
    id: 2003,
    date: "2026-06-11",
    title: "요가 수업",
    place: "운동",
    tag: "routine",
    owner: "theresa",
    done: false,
    repeat: "19:30-20:30",
    source: "manual",
    displayType: "fixed",
    color: "#a78bfa",
    sortOrder: 3,
  },
  {
    id: 2004,
    date: "2026-06-11",
    title: "세탁 예약",
    place: "세탁실",
    tag: "house",
    owner: "me",
    done: false,
    repeat: "18:00-19:00",
    source: "auto",
    displayType: "appliance",
    applianceType: "WASHER",
    applianceMode: "표준",
    currentMode: "표준",
    color: "#60a5fa",
    sortOrder: 4,
  },
  {
    id: 2005,
    date: "2026-06-11",
    title: "로봇청소 시작",
    place: "거실",
    tag: "house",
    owner: "minsu",
    done: false,
    repeat: "15:30-16:20",
    source: "auto",
    displayType: "appliance",
    applianceType: "ROBOT_CLEANER",
    applianceMode: "전체 청소",
    currentMode: "전체 청소",
    color: "#f59e0b",
    sortOrder: 5,
  },
  {
    id: 2006,
    date: "2026-06-11",
    title: "귀가 전 냉방",
    place: "거실",
    tag: "house",
    owner: "theresa",
    done: false,
    repeat: "18:30-19:10",
    source: "auto",
    displayType: "appliance",
    applianceType: "AIR_CONDITIONER",
    applianceMode: "냉방",
    currentMode: "냉방",
    color: "#22d3ee",
    sortOrder: 6,
  },
  {
    id: 2007,
    date: "2026-06-12",
    title: "병원 예약",
    place: "강남역",
    tag: "plan",
    owner: "me",
    done: false,
    repeat: "10:30-11:30",
    source: "manual",
    displayType: "fixed",
    color: "#fb7185",
    sortOrder: 1,
  },
  {
    id: 2008,
    date: "2026-06-12",
    title: "건조기 예약",
    place: "세탁실",
    tag: "house",
    owner: "me",
    done: false,
    repeat: "12:00-13:00",
    source: "auto",
    displayType: "appliance",
    applianceType: "DRYER",
    applianceMode: "섬세",
    currentMode: "섬세",
    color: "#c084fc",
    sortOrder: 2,
  },
  {
    id: 2009,
    date: "2026-06-12",
    title: "장보기",
    place: "마트",
    tag: "share",
    owner: "minsu",
    done: false,
    repeat: "17:30-18:20",
    source: "manual",
    displayType: "fixed",
    color: "#34d399",
    sortOrder: 3,
  },
  {
    id: 2010,
    date: "2026-06-12",
    title: "식기세척 예약",
    place: "주방",
    tag: "house",
    owner: "minsu",
    done: false,
    repeat: "21:00-22:00",
    source: "auto",
    displayType: "appliance",
    applianceType: "DISHWASHER",
    applianceMode: "에코",
    currentMode: "에코",
    color: "#0ea5e9",
    sortOrder: 4,
  },
  {
    id: 2011,
    date: "2026-06-13",
    title: "가족 점심",
    place: "성수",
    tag: "plan",
    owner: "theresa",
    done: false,
    repeat: "12:00-13:30",
    source: "manual",
    displayType: "fixed",
    color: "#a78bfa",
    sortOrder: 1,
  },
  {
    id: 2012,
    date: "2026-06-13",
    title: "냉장고 정리",
    place: "주방",
    tag: "house",
    owner: "theresa",
    done: false,
    repeat: "16:00-17:00",
    source: "auto",
    displayType: "appliance",
    applianceType: "REFRIGERATOR",
    applianceMode: "절전 모드",
    currentMode: "절전 모드",
    color: "#38bdf8",
    sortOrder: 2,
  },
  {
    id: 2013,
    date: "2026-06-14",
    title: "주간 회고",
    place: "집",
    tag: "routine",
    owner: "me",
    done: false,
    repeat: "20:00-20:40",
    source: "manual",
    displayType: "fixed",
    color: "#fb7185",
    sortOrder: 1,
  },
  {
    id: 2014,
    date: "2026-06-14",
    title: "공기청정기 강력 운전",
    place: "거실",
    tag: "house",
    owner: "theresa",
    done: false,
    repeat: "09:00-10:00",
    source: "auto",
    displayType: "appliance",
    applianceType: "AIR_PURIFIER",
    applianceMode: "강력",
    currentMode: "강력",
    color: "#7c3aed",
    sortOrder: 2,
  },
];

export const initialTasks = [...baseTasks, ...buildWeatherRoutineTasks(), ...demoCalendarTasks];

export const navItems = [
  { id: "calendar", label: "캘린더", icon: CalendarDays },
  { id: "crew", label: "멤버", icon: UsersRound },
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
        owner: ownerForDate(date, "dehumidifier"),
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
        owner: ownerForDate(date, "dryer"),
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
          owner: ownerForDate(date, "humidity"),
          done: false,
          repeat: "습한 날",
          source: "auto",
        });
      }
    }
  });

  for (let index = 1; index < weatherDates.length; index += 3) {
    const targetDate = weatherDates[index];
    const scheduleDate = chooseLaundryDate(targetDate);
    addGenerated(generated, used, {
      id: id++,
      date: scheduleDate,
      title: "세탁기 돌리기",
      place: "세탁실",
      tag: "house",
      owner: ownerForDate(scheduleDate, "washer"),
      done: false,
      repeat: scheduleDate === targetDate ? "3일마다" : "비 예보로 조정",
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

function chooseLaundryDate(date) {
  if (!isRainyDate(date)) return date;

  const previous = addDaysKey(date, -1);
  const next = addDaysKey(date, 1);
  if (!isRainyDate(previous)) return previous;
  if (!isRainyDate(next)) return next;
  return date;
}

function ownerForDate(date, salt) {
  const owners = ["me", "minsu", "theresa"];
  const seed = [...`${date}-${salt}`].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return owners[seed % owners.length];
}

function addDaysKey(date, amount) {
  const current = new Date(`${date}T00:00:00`);
  current.setDate(current.getDate() + amount);
  return dateKey(current.getFullYear(), current.getMonth() + 1, current.getDate());
}
