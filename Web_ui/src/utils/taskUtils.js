import { dateKey } from "../data.js";

export function sortTasks(tasks) {
  return [...tasks].sort(taskSorter);
}

export function isTaskVisibleOnDate(task, date) {
  return getTaskDateKeys(task).includes(date);
}

export function getTaskDateKeys(task) {
  const startDate = normalizeTaskDateKey(task.date);
  if (!startDate) return [];

  const endDate = normalizeTaskDateKey(task.endDate) || startDate;
  const [fromDate, toDate] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
  const dates = [];
  let currentDate = fromDate;

  for (let count = 0; count < 370; count += 1) {
    dates.push(currentDate);
    if (currentDate === toDate) break;
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

export function normalizeTaskDateKey(value) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

export function taskSorter(a, b) {
  if (a.done !== b.done) return Number(a.done) - Number(b.done);
  if (Number.isFinite(a.sortOrder) || Number.isFinite(b.sortOrder)) {
    return (a.sortOrder ?? 99) - (b.sortOrder ?? 99);
  }
  return b.id - a.id;
}

export function addDays(date, amount) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + amount);
  return dateKey(next.getFullYear(), next.getMonth() + 1, next.getDate());
}

export function getTodayKey() {
  const today = new Date();
  return dateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

export function normalizeGeneratedTaskTitles(tasks) {
  return tasks.map(normalizeGeneratedTaskTitle);
}

export function normalizeGeneratedTaskTitle(task) {
  if (task.displayType !== "fixed") return task;

  const title = String(task.title || "");
  const nextTitle = title.replace(/^\s*\d{1,2}\s*시\s*/, "").trim();
  if (!nextTitle || nextTitle === title) return task;

  return { ...task, title: nextTitle };
}

export function buildOnboardingTasks(profile, selectedMember, onboardingSetup = {}) {
  const baseDate = new Date(`${getTodayKey()}T00:00:00`);
  const familyOwners = ["me", "minsu", "theresa", "all"].slice(0, Math.max(1, Number(profile.familyCount) || 1));
  const timestamp = Date.now();
  const selectedApplianceTypes = normalizeOnboardingApplianceTypes(onboardingSetup.applianceTypes);
  const ownerAt = (index) => {
    if (selectedMember !== "all") return selectedMember;
    return familyOwners[index % familyOwners.length] || "me";
  };
  const at = (offset) => {
    const next = new Date(baseDate);
    next.setDate(baseDate.getDate() + offset);
    return dateKey(next.getFullYear(), next.getMonth() + 1, next.getDate());
  };
  const fixedPlans = [
    { title: "약 문의", place: "고정 일정", repeat: "12:00", tag: "plan" },
    { title: "회식 참석", place: "고정 일정", repeat: "18:00", tag: "plan" },
  ];

  return Array.from({ length: 10 }, (_, dayIndex) => {
    const dayAppliances = [selectedApplianceTypes[dayIndex % selectedApplianceTypes.length], selectedApplianceTypes[(dayIndex + 1) % selectedApplianceTypes.length]];
    const dayTasks = [
      ...fixedPlans.map((plan, index) => ({
        id: timestamp + dayIndex * 10 + index,
        date: at(dayIndex),
        title: plan.title,
        place: plan.place,
        tag: plan.tag,
        owner: ownerAt(index),
        done: false,
        repeat: plan.repeat,
        source: "manual",
        displayType: "fixed",
        sortOrder: index,
      })),
      ...dayAppliances.map((type, index) => {
        const plan = applianceOnboardingPlans[type] || applianceOnboardingPlans.washer;
        return {
          id: timestamp + dayIndex * 10 + index + 2,
          date: at(dayIndex),
          title: plan.titles[(dayIndex + index) % plan.titles.length],
          place: plan.place,
          tag: "house",
          owner: onboardingSetup.applianceAssignees?.[type] || ownerAt(index + 2),
          done: false,
          repeat: profile.returnHomeTime && index === 1 ? `${profile.returnHomeTime} 전 자동` : "AI 자동",
          source: "auto",
          displayType: "appliance",
          applianceType: type,
          sortOrder: index + 2,
        };
      }),
    ];

    return dayTasks;
  }).flat();
}

const applianceOnboardingPlans = {
  washer: {
    place: "세탁실",
    titles: ["세탁 예약", "빨래 시작", "세탁물 정리"],
  },
  air: {
    place: "거실",
    titles: ["에어컨 예냉", "실내 온도 조절", "귀가 전 냉방"],
  },
  fridge: {
    place: "주방",
    titles: ["냉장고 정리", "식재료 확인", "유통기한 체크"],
  },
  dryer: {
    place: "세탁실",
    titles: ["건조 예약", "건조 필터 확인", "습도 맞춤 건조"],
  },
  dehumidifier: {
    place: "거실",
    titles: ["제습기 예약", "습도 맞춤 제습", "실내 습도 확인"],
  },
  robot: {
    place: "거실",
    titles: ["로봇청소 시작", "바닥 청소 예약", "청소 구역 확인"],
  },
};

function normalizeOnboardingApplianceTypes(applianceTypes = []) {
  const normalized = applianceTypes.filter((type) => applianceOnboardingPlans[type]);
  if (normalized.length >= 2) return normalized;

  return [...new Set([...normalized, "washer", "air"])].slice(0, 2);
}

export function isLaundryTask(task) {
  return /세탁|빨래/.test(task.title);
}

export function isCalendarHouseworkTask(task) {
  return task.displayType === "appliance" || task.tag === "house" || task.source === "auto";
}

export function normalizeThinQDevices(result) {
  const devices = result?.devices || result?.items || result?.response?.devices || result?.result?.devices || result;
  if (!Array.isArray(devices)) return [];

  return devices.map((device) => ({
    ...device,
    id: device.deviceId || device.id || device.device_id,
    name: device.alias || device.name || device.deviceName || device.modelName || device.deviceId || device.id,
    type: device.deviceType || device.type || device.category || "ThinQ",
  }));
}

export function shouldSuggestAutomation(task) {
  return task.source !== "auto" && /(회식|약속|여행|출근|수업|퇴근|귀가)/.test(`${task.title} ${task.place} ${task.repeat}`);
}

export function pendingTasksForNotification(tasks) {
  return tasks
    .filter((task) => !task.done)
    .sort(taskSorter)
    .slice(0, 4);
}
