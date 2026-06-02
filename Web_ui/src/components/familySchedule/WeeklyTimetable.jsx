import ScheduleBlock from "./ScheduleBlock.jsx";
import { DAYS, END_HOUR, HOUR_HEIGHT, START_HOUR } from "./scheduleConstants.js";

const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

export default function WeeklyTimetable({ schedules, showWeekend, getMemberName, onEmptyClick, onScheduleClick }) {
  const days = showWeekend ? DAYS : DAYS.slice(0, 5);
  const schedulesByDay = groupSchedulesByDay(schedules, days);
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index);

  return (
    <div className="weekly-timetable-shell">
      <div className="weekly-timetable" style={{ "--day-count": days.length, "--schedule-total-height": `${TOTAL_HEIGHT}px` }}>
        <div className="time-spacer" />
        {days.map((day) => (
          <div className="day-head" key={day}>
            {day}
          </div>
        ))}

        <div className="time-axis" style={{ "--column-height": `${TOTAL_HEIGHT}px` }}>
          {hours.slice(0, -1).map((hour) => (
            <span key={hour} style={{ height: HOUR_HEIGHT }}>
              {formatHour(hour)}
            </span>
          ))}
        </div>

        {days.map((day) => (
          <div
            key={day}
            className="day-column"
            style={{ "--column-height": `${TOTAL_HEIGHT}px` }}
            onClick={(event) => onEmptyClick(day, timeFromOffset(event.nativeEvent.offsetY))}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onEmptyClick(day, "09:00");
            }}
            role="button"
            tabIndex={0}
            aria-label={`${day}요일 시간표`}
          >
            {hours.slice(0, -1).map((hour) => (
              <span key={hour} className="hour-line" style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }} />
            ))}
            {layoutSchedules(schedulesByDay[day] || []).map(({ schedule, layout }) => (
              <ScheduleBlock key={schedule.id} schedule={schedule} layout={layout} memberName={getMemberName(schedule.members || schedule.member)} onClick={onScheduleClick} />
            ))}
          </div>
        ))}
      </div>
    </div>
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
  const groups = [];

  sorted.forEach((schedule) => {
    const group = groups.find((items) => items.some((item) => overlaps(item, schedule)));
    if (group) group.push(schedule);
    else groups.push([schedule]);
  });

  return groups.flatMap((group) => {
    const columns = [];
    const assignments = group.map((schedule) => {
      let columnIndex = columns.findIndex((end) => end <= toMinutes(schedule.startTime));
      if (columnIndex === -1) {
        columnIndex = columns.length;
        columns.push(0);
      }
      columns[columnIndex] = toMinutes(schedule.endTime);
      return { schedule, columnIndex };
    });
    const width = 100 / Math.max(columns.length, 1);

    return assignments.map(({ schedule, columnIndex }) => ({
      schedule,
      layout: {
        top: minutesToPixels(toMinutes(schedule.startTime) - START_HOUR * 60),
        height: Math.max(26, minutesToPixels(toMinutes(schedule.endTime) - toMinutes(schedule.startTime)) - 4),
        left: columnIndex * width,
        width: width - 2,
      },
    }));
  });
}

function overlaps(a, b) {
  return toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime);
}

function timeFromOffset(offsetY) {
  const minutes = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60 - 30, Math.floor((offsetY / HOUR_HEIGHT) * 60)));
  const rounded = Math.floor(minutes / 30) * 30 + START_HOUR * 60;
  return formatTime(rounded);
}

function minutesToPixels(minutes) {
  return (minutes / 60) * HOUR_HEIGHT;
}

function toMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function formatTime(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatHour(hour) {
  return hour < 12 ? `오전 ${hour}시` : `오후 ${hour === 12 ? 12 : hour - 12}시`;
}
