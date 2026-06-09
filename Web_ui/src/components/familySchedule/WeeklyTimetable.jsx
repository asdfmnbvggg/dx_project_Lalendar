import { DAYS, END_HOUR, START_HOUR } from "./scheduleConstants.js";

export default function WeeklyTimetable({ schedules, showWeekend, weekStart, getMemberName, onEmptyClick, onScheduleClick }) {
  const days = showWeekend ? DAYS : DAYS.slice(0, 5);
  const dates = days.map((day) => ({ day, date: dateForDayInWeek(day, weekStart) }));
  const schedulesByDay = groupSchedulesByDay(schedules, days);
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index);

  return (
    <section className="week-timetable-card family-week-timetable" aria-label="주간 일정표">
      <div className="week-timetable-scroll">
        <div className="week-timetable-grid" style={{ "--week-hour-count": hours.length, "--week-day-count": days.length }}>
          <span className="week-time-spacer" />
          {dates.map(({ day, date }) => (
            <button type="button" className="week-day-head" key={day} onClick={() => onEmptyClick(day, "09:00")}>
              <span>{day}</span>
              <strong>{Number(date.slice(8, 10))}</strong>
            </button>
          ))}

          {hours.map((hour, rowIndex) => (
            <span className="week-time-label" style={{ gridRow: rowIndex + 2 }} key={hour}>
              <strong>{formatWeekHour(hour).hour}</strong>
              <small>{formatWeekHour(hour).period}</small>
              <small>{formatWeekHour(hour).time}</small>
            </span>
          ))}

          {hours.map((hour, rowIndex) =>
            days.map((day, dayIndex) => (
              <button
                type="button"
                className="week-grid-line"
                style={{ gridColumn: dayIndex + 2, gridRow: rowIndex + 2 }}
                key={`${day}-${hour}`}
                aria-label={`${day}요일 ${formatTime(hour, 0)} 일정 추가`}
                onClick={() => onEmptyClick(day, formatTime(hour, 0))}
              />
            )),
          )}

          {days.flatMap((day, dayIndex) =>
            layoutSchedules(schedulesByDay[day] || []).map(({ schedule, row, span, lane, laneCount }) => (
              <button
                type="button"
                className={`week-task-block family-week-task ${schedule.source === "task" ? "task-derived" : ""}`}
                key={schedule.id}
                style={{
                  gridColumn: dayIndex + 2,
                  gridRow: `${row} / span ${span}`,
                  background: schedule.color || "#64748b",
                  "--lane-index": lane,
                  "--lane-count": laneCount,
                }}
                onClick={() => onScheduleClick(schedule)}
                title={`${schedule.title} / ${getMemberName(schedule.members || schedule.member)} / ${schedule.location || "장소 없음"}`}
              >
                <strong>{schedule.title}</strong>
                <span>{getMemberName(schedule.members || schedule.member)}</span>
              </button>
            )),
          )}
        </div>
      </div>
    </section>
  );
}

function groupSchedulesByDay(schedules, days) {
  return schedules.reduce((map, schedule) => {
    if (!days.includes(schedule.day)) return map;
    map[schedule.day] = [...(map[schedule.day] || []), schedule];
    return map;
  }, {});
}

function layoutSchedules(schedules) {
  const sorted = [...schedules].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || toMinutes(a.endTime) - toMinutes(b.endTime));
  const lanes = [];

  return sorted.map((schedule) => {
    let lane = lanes.findIndex((end) => end <= toMinutes(schedule.startTime));
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(0);
    }
    lanes[lane] = toMinutes(schedule.endTime);

    const startMinutes = Math.max(START_HOUR * 60, toMinutes(schedule.startTime));
    const endMinutes = Math.min(END_HOUR * 60, toMinutes(schedule.endTime));
    const row = Math.max(2, Math.floor((startMinutes - START_HOUR * 60) / 60) + 2);
    const span = Math.max(1, Math.ceil((endMinutes - startMinutes) / 60));

    return {
      schedule,
      row,
      span,
      lane,
      laneCount: lanes.length,
    };
  });
}

function dateForDayInWeek(day, mondayKey) {
  const index = DAYS.indexOf(day);
  if (index === -1) return mondayKey;
  const date = new Date(`${mondayKey}T00:00:00`);
  date.setDate(date.getDate() + index);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function formatTime(hour, minute) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatWeekHour(hour) {
  if (hour === 0 || hour === 24) return { period: "오전", hour: "12", time: "12시" };
  if (hour === 12) return { period: "", hour: "정오", time: "12시" };
  if (hour < 12) return { period: "오전", hour: String(hour), time: `${hour}시` };
  return { period: "오후", hour: String(hour - 12), time: `${hour - 12}시` };
}
