import { CalendarPlus, LayoutTemplate } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createScheduleId, loadSchedules, saveSchedules } from "../../services/scheduleStorage.js";
import MemberFilter from "./MemberFilter.jsx";
import ScheduleModal from "./ScheduleModal.jsx";
import TemplateSelector from "./TemplateSelector.jsx";
import WeeklyTimetable from "./WeeklyTimetable.jsx";
import { buildTemplateSchedules, CATEGORY_COLORS } from "./scheduleConstants.js";

export default function FamilySchedulePage({ tasks = [], selectedDate }) {
  const [schedules, setSchedules] = useState([]);
  const [filter, setFilter] = useState("전체");
  const [showWeekend, setShowWeekend] = useState(false);
  const [modalState, setModalState] = useState(null);
  const [isTemplateOpen, setTemplateOpen] = useState(false);

  useEffect(() => {
    setSchedules(loadSchedules());
  }, []);

  const taskSchedules = useMemo(() => buildTaskSchedules(tasks, selectedDate), [tasks, selectedDate]);
  const visibleSchedules = useMemo(() => {
    return [...schedules, ...taskSchedules].filter((schedule) => filter === "전체" || schedule.member === filter);
  }, [filter, schedules, taskSchedules]);

  function persist(nextSchedules) {
    setSchedules(saveSchedules(nextSchedules));
  }

  function openNewSchedule(defaults = {}) {
    setModalState({
      mode: "create",
      schedule: {
        id: createScheduleId(),
        title: "",
        member: filter === "전체" ? "아이" : filter,
        day: "월",
        startTime: "09:00",
        endTime: "10:00",
        location: "",
        color: CATEGORY_COLORS.custom,
        repeatWeekly: true,
        category: "custom",
        ...defaults,
      },
    });
  }

  function saveSchedule(schedule, shouldContinue) {
    const nextSchedule = { ...schedule, id: schedule.id || createScheduleId() };
    const exists = schedules.some((item) => item.id === nextSchedule.id);
    const next = exists ? schedules.map((item) => (item.id === nextSchedule.id ? nextSchedule : item)) : [nextSchedule, ...schedules];
    persist(next);
    if (!shouldContinue) setModalState(null);
  }

  function deleteSchedule(schedule) {
    if (schedule.source === "task") return;
    if (!window.confirm("이 일정을 삭제할까요?")) return;
    persist(schedules.filter((item) => item.id !== schedule.id));
    setModalState(null);
  }

  function handleScheduleClick(schedule) {
    if (schedule.source === "task") {
      openNewSchedule({
        title: schedule.title,
        member: schedule.member,
        day: schedule.day,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location,
        color: schedule.color,
        repeatWeekly: false,
        category: "custom",
      });
      return;
    }
    setModalState({ mode: "edit", schedule });
  }

  function applyTemplate(template, mode) {
    const generated = buildTemplateSchedules(template);
    persist(mode === "replace" ? generated : [...generated, ...schedules]);
    setTemplateOpen(false);
  }

  return (
    <section className="family-schedule-panel">
      <div className="family-schedule-head">
        <div>
          <p>가족 시간표</p>
          <h2>이번 주 일정</h2>
        </div>
        <div className="family-schedule-actions">
          <button type="button" onClick={() => setShowWeekend((current) => !current)} className={showWeekend ? "active" : ""}>
            {showWeekend ? "월-금 보기" : "주말 포함"}
          </button>
          <button type="button" onClick={() => setTemplateOpen(true)}>
            <LayoutTemplate size={17} />
            템플릿
          </button>
          <button type="button" onClick={() => openNewSchedule()}>
            <CalendarPlus size={17} />
            일정 추가
          </button>
        </div>
      </div>

      <MemberFilter value={filter} onChange={setFilter} />

      <WeeklyTimetable
        schedules={visibleSchedules}
        showWeekend={showWeekend}
        onEmptyClick={(day, startTime) => openNewSchedule({ day, startTime, endTime: addOneHour(startTime) })}
        onScheduleClick={handleScheduleClick}
      />

      {modalState && (
        <ScheduleModal
          mode={modalState.mode}
          initialSchedule={modalState.schedule}
          onClose={() => setModalState(null)}
          onSave={saveSchedule}
          onDelete={() => deleteSchedule(modalState.schedule)}
        />
      )}

      {isTemplateOpen && <TemplateSelector onClose={() => setTemplateOpen(false)} onApply={applyTemplate} />}
    </section>
  );
}

function buildTaskSchedules(tasks, selectedDate) {
  const weekRange = getMondayWeekRange(selectedDate);

  return tasks
    .filter((task) => task.date >= weekRange.start && task.date <= weekRange.end && !task.done)
    .map((task, index) => {
      const parsed = parseTimeRange(task.repeat);
      const slot = parsed || rotatingTaskSlot(task, index);
      return {
        id: `task-${task.id}`,
        title: task.title,
        member: memberFromOwner(task.owner),
        day: dayFromDate(task.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: task.place || "집",
        color: "#64748b",
        repeatWeekly: false,
        category: "custom",
        source: "task",
      };
    });
}

function parseTimeRange(value = "") {
  const match = String(value).match(/(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  return { startTime: normalizeTime(match[1]), endTime: normalizeTime(match[2]) };
}

function rotatingTaskSlot(task, index) {
  const slots = [
    ["07:30", "08:00"],
    ["18:30", "19:00"],
    ["19:00", "19:30"],
    ["19:30", "20:00"],
    ["20:00", "20:30"],
    ["20:30", "21:00"],
    ["21:00", "21:30"],
  ];
  const seed = [...`${task.date}-${task.id}-${task.title}`].reduce((sum, char) => sum + char.charCodeAt(0), index);
  const [startTime, endTime] = slots[seed % slots.length];
  return { startTime, endTime };
}

function memberFromOwner(owner) {
  if (owner === "minsu") return "아이";
  if (owner === "theresa") return "아빠";
  if (owner === "all") return "가족";
  return "엄마";
}

function dayFromDate(date) {
  return ["일", "월", "화", "수", "목", "금", "토"][new Date(`${date}T00:00:00`).getDay()];
}

function getMondayWeekRange(date) {
  const current = new Date(`${date}T00:00:00`);
  const day = current.getDay();
  const monday = new Date(current);
  monday.setDate(current.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toDateKey(monday), end: toDateKey(sunday) };
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addOneHour(time) {
  const [hour, minute] = time.split(":").map(Number);
  return `${String(Math.min(hour + 1, 22)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeTime(time) {
  const [hour, minute] = time.split(":");
  return `${String(Number(hour)).padStart(2, "0")}:${minute}`;
}
