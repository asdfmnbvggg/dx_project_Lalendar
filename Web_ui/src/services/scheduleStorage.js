const STORAGE_KEY = "lalendar.familySchedules";
const isDev = import.meta.env.DEV;

function devWarn(...args) {
  if (isDev) console.warn(...args);
}

export function loadSchedules() {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    devWarn("Failed to load family schedules", error);
    return [];
  }
}

export function saveSchedules(schedules) {
  if (typeof window === "undefined") return schedules;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  return schedules;
}

export function addSchedule(schedule) {
  const schedules = loadSchedules();
  const next = [{ ...schedule, id: schedule.id || createScheduleId() }, ...schedules];
  return saveSchedules(next);
}

export function updateSchedule(schedule) {
  const schedules = loadSchedules();
  const next = schedules.map((item) => (item.id === schedule.id ? schedule : item));
  return saveSchedules(next);
}

export function deleteSchedule(id) {
  const schedules = loadSchedules();
  return saveSchedules(schedules.filter((item) => item.id !== id));
}

export function createScheduleId(prefix = "schedule") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
