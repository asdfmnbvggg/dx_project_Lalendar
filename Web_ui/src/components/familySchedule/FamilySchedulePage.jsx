import { CalendarPlus, ChevronLeft, ChevronRight, LayoutTemplate } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createScheduleId, loadSchedules, saveSchedules } from "../../services/scheduleStorage.js";
import MemberFilter from "./MemberFilter.jsx";
import ScheduleModal from "./ScheduleModal.jsx";
import TemplateSelector from "./TemplateSelector.jsx";
import WeeklyTimetable from "./WeeklyTimetable.jsx";
import { buildTemplateSchedules, CATEGORY_COLORS, DAYS } from "./scheduleConstants.js";

export default function FamilySchedulePage({ tasks = [], selectedDate, members = [], selectedMember = "all", onSelectedMemberChange }) {
  const [schedules, setSchedules] = useState([]);
  const [filter, setFilter] = useState(selectedMember || "all");
  const [showWeekend, setShowWeekend] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate);
  const [modalState, setModalState] = useState(null);
  const [isTemplateOpen, setTemplateOpen] = useState(false);

  useEffect(() => {
    setViewDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    setFilter(selectedMember);
  }, [selectedMember]);

  const filterMembers = useMemo(() => (members.length > 0 ? members : [{ id: "all", name: "전체" }]), [members]);
  const schedulableMembers = filterMembers.filter((member) => member.id !== "all");
  const defaultMemberId = selectedMember !== "all" ? selectedMember : schedulableMembers[0]?.id || "all";
  const memberNameById = useMemo(() => Object.fromEntries(filterMembers.map((member) => [member.id, member.name])), [filterMembers]);
  const weekRange = useMemo(() => getMondayWeekRange(viewDate), [viewDate]);
  const weekLabel = `${formatShortDate(weekRange.start)} ~ ${formatShortDate(weekRange.end)}`;

  useEffect(() => {
    const validMemberIds = new Set(filterMembers.map((member) => member.id));
    const loaded = loadSchedules();
    const normalized = loaded.map((schedule) => normalizeStoredSchedule(schedule, validMemberIds, defaultMemberId));
    setSchedules(normalized);
    if (JSON.stringify(normalized) !== JSON.stringify(loaded)) {
      saveSchedules(normalized);
    }
  }, [defaultMemberId, filterMembers]);

  const taskSchedules = useMemo(() => buildTaskSchedules(tasks, weekRange), [tasks, weekRange]);
  const visibleSchedules = useMemo(() => {
    const manualSchedules = expandSchedulesForWeek(schedules, weekRange);
    return [...manualSchedules, ...taskSchedules].filter((schedule) => scheduleIncludesMember(schedule, filter));
  }, [filter, schedules, taskSchedules, weekRange]);

  function persist(nextSchedules) {
    setSchedules(saveSchedules(nextSchedules));
  }

  function changeFilter(memberId) {
    setFilter(memberId);
    onSelectedMemberChange?.(memberId);
  }

  function openNewSchedule(defaults = {}) {
    const date = defaults.date || viewDate;
    const day = defaults.day || dayFromDate(date) || "월";
    setModalState({
      mode: "create",
      schedule: {
        id: createScheduleId(),
        title: "",
        member: filter === "all" ? defaultMemberId : filter,
        members: [filter === "all" ? defaultMemberId : filter],
        date,
        day,
        days: [day],
        startTime: "09:00",
        endTime: "10:00",
        location: "우리 집",
        placePreset: "우리 집",
        color: CATEGORY_COLORS.custom,
        repeat: "none",
        repeatWeekly: false,
        category: "custom",
        reminder: "off",
        reminderTarget: "assignees",
        memo: "",
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
    persist(schedules.filter((item) => item.id !== schedule.parentId && item.id !== schedule.id));
    setModalState(null);
  }

  function handleScheduleClick(schedule) {
    if (schedule.source === "task") {
      openNewSchedule({
        title: schedule.title,
        members: schedule.members,
        member: schedule.member,
        date: schedule.date,
        day: schedule.day,
        days: [schedule.day],
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location,
        placePreset: presetForLocation(schedule.location),
        color: schedule.color,
        repeat: "none",
        repeatWeekly: false,
        category: "custom",
      });
      return;
    }
    const original = schedules.find((item) => item.id === schedule.parentId || item.id === schedule.id) || schedule;
    setModalState({ mode: "edit", schedule: original });
  }

  function applyTemplate(template, mode) {
    const generated = buildTemplateSchedules(template, defaultMemberId);
    persist(mode === "replace" ? generated : [...generated, ...schedules]);
    setTemplateOpen(false);
  }

  return (
    <section className="family-schedule-panel">
      <div className="family-schedule-head">
        <div>
          <p>일정 보기 필터</p>
          <h2>이번 주 일정</h2>
          <span>{weekLabel}</span>
        </div>
        <div className="family-schedule-actions">
          <button type="button" onClick={() => setViewDate(addDays(viewDate, -7))} aria-label="이전 주">
            <ChevronLeft size={17} />
          </button>
          <input type="date" value={viewDate} onChange={(event) => setViewDate(event.target.value)} aria-label="기준 날짜 선택" />
          <button type="button" onClick={() => setViewDate(addDays(viewDate, 7))} aria-label="다음 주">
            <ChevronRight size={17} />
          </button>
          <button type="button" onClick={() => setShowWeekend((current) => !current)} className={showWeekend ? "active" : ""}>
            {showWeekend ? "평일만" : "주말 포함"}
          </button>
          <button type="button" onClick={() => setTemplateOpen(true)}>
            <LayoutTemplate size={17} />
            템플릿
          </button>
          <button type="button" className="primary-action" onClick={() => openNewSchedule()}>
            <CalendarPlus size={17} />
            일정 추가
          </button>
        </div>
      </div>

      <MemberFilter value={filter} onChange={changeFilter} members={filterMembers} />

      <WeeklyTimetable
        schedules={visibleSchedules}
        showWeekend={showWeekend}
        getMemberName={(memberIds) => formatMemberNames(memberIds, memberNameById)}
        onEmptyClick={(day, startTime) => openNewSchedule({ day, days: [day], date: dateForDayInWeek(day, weekRange.start), startTime, endTime: addOneHour(startTime) })}
        onScheduleClick={handleScheduleClick}
      />

      {modalState && (
        <ScheduleModal
          mode={modalState.mode}
          initialSchedule={modalState.schedule}
          members={filterMembers}
          onClose={() => setModalState(null)}
          onSave={saveSchedule}
          onDelete={() => deleteSchedule(modalState.schedule)}
        />
      )}

      {isTemplateOpen && <TemplateSelector onClose={() => setTemplateOpen(false)} onApply={applyTemplate} />}
    </section>
  );
}

function normalizeStoredSchedule(schedule, validMemberIds, defaultMemberId) {
  const members = (schedule.members?.length ? schedule.members : [schedule.member || defaultMemberId]).filter((memberId) => validMemberIds.has(memberId));
  const nextMembers = members.length ? members : [defaultMemberId];
  const days = schedule.days?.length ? schedule.days : [schedule.day || dayFromDate(schedule.date) || "월"];
  return {
    ...schedule,
    members: nextMembers,
    member: nextMembers[0],
    days,
    day: days[0],
    repeat: schedule.repeat || (schedule.repeatWeekly ? "weekly" : "none"),
  };
}

function expandSchedulesForWeek(schedules, weekRange) {
  return schedules.flatMap((schedule) => {
    const members = schedule.members?.length ? schedule.members : [schedule.member || "all"];
    const base = { ...schedule, members, member: members[0] };

    if (schedule.date && !schedule.repeatWeekly && schedule.repeat !== "weekly" && schedule.repeat !== "custom") {
      if (schedule.date < weekRange.start || schedule.date > weekRange.end) return [];
      return [{ ...base, day: dayFromDate(schedule.date), parentId: schedule.id }];
    }

    const days = schedule.days?.length ? schedule.days : [schedule.day].filter(Boolean);
    return days.map((day) => ({
      ...base,
      id: `${schedule.id}-${day}`,
      parentId: schedule.id,
      day,
      date: dateForDayInWeek(day, weekRange.start),
    }));
  });
}

function buildTaskSchedules(tasks, weekRange) {
  return tasks
    .filter((task) => task.date >= weekRange.start && task.date <= weekRange.end && !task.done)
    .map((task, index) => {
      const parsed = parseTimeRange(task.repeat);
      const slot = parsed || rotatingTaskSlot(task, index);
      const members = [task.owner || "all"];
      return {
        id: `task-${task.id}`,
        title: task.title,
        member: members[0],
        members,
        date: task.date,
        day: dayFromDate(task.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: task.place || "우리 집",
        color: "#64748b",
        repeat: "none",
        repeatWeekly: false,
        category: "custom",
        source: "task",
      };
    });
}

function scheduleIncludesMember(schedule, filter) {
  if (filter === "all") return true;
  const members = schedule.members?.length ? schedule.members : [schedule.member];
  return members.includes("all") || members.includes(filter);
}

function formatMemberNames(memberIds, memberNameById) {
  const ids = Array.isArray(memberIds) ? memberIds : [memberIds];
  if (ids.includes("all")) return "가족 전체";
  if (ids.length <= 1) return memberNameById[ids[0]] || "미정";
  return `${memberNameById[ids[0]] || ids[0]} 외 ${ids.length - 1}명`;
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

function dayFromDate(date) {
  if (!date) return "";
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

function dateForDayInWeek(day, mondayKey) {
  const index = DAYS.indexOf(day);
  if (index === -1) return mondayKey;
  return addDays(mondayKey, index);
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, amount) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + amount);
  return toDateKey(next);
}

function addOneHour(time) {
  const [hour, minute] = time.split(":").map(Number);
  return `${String(Math.min(hour + 1, 22)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeTime(time) {
  const [hour, minute] = time.split(":");
  return `${String(Number(hour)).padStart(2, "0")}:${minute}`;
}

function formatShortDate(date) {
  return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
}

function presetForLocation(location) {
  return ["우리 집", "회사", "학교", "학원", "마트", "병원"].includes(location) ? location : "직접 입력";
}
