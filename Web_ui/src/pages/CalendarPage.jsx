import { ChevronLeft, ChevronRight, ClipboardList, Minus, Plus, Search } from "lucide-react";
import { useState } from "react";
import { members, weatherByDate } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";

const weatherIcon = {
  sunny: "☀️",
  "sun-rain": "🌦️",
  rain: "🌧️",
  sunset: "🌅",
  partly: "🌤️",
  cloudy: "☁️",
  storm: "⛈️",
};

export default function CalendarPage({
  month,
  monthLabel,
  monthLeadingBlanks,
  onPrevMonth,
  onNextMonth,
  tasksByDate,
  selectedDate,
  setSelectedDate,
  selectedMember,
  memberColors,
  setSelectedMember,
  selectedTasks,
  query,
  setQuery,
  toggleTask,
  deleteTask,
  changeTaskOwner,
  postponeTask,
  openComposer,
  onOpenPanel,
}) {
  const [calendarView, setCalendarView] = useState("month");
  const [calendarScale, setCalendarScale] = useState(2);
  const selectedMemberName = members.find((member) => member.id === selectedMember)?.name || "우리 집";
  const selectedDay = Number(selectedDate.slice(-2));
  const displayDates = getDisplayDates(calendarView, selectedDate, month);
  const displayLabel = getDisplayLabel(calendarView, selectedDate, monthLabel);
  const leadingBlanks = calendarView === "month" ? monthLeadingBlanks : 0;
  const isExpanded = calendarScale >= 3;
  const taskLimit = calendarView === "day" ? 99 : calendarScale <= 1 ? 2 : calendarScale >= 4 ? 5 : 3;

  function moveCalendar(offset) {
    if (calendarView === "month") {
      offset < 0 ? onPrevMonth() : onNextMonth();
      return;
    }

    setSelectedDate(addDays(selectedDate, calendarView === "week" ? offset * 7 : offset));
  }

  function changeScale(offset) {
    setCalendarScale((current) => Math.min(4, Math.max(0, current + offset)));
  }

  return (
    <section className="page calendar-page">
      <div className="profile-strip">
        {members.map((member) => (
          <button key={member.id} className={selectedMember === member.id ? "active" : ""} onClick={() => setSelectedMember(member.id)}>
            <span style={{ background: memberColors[member.id] || member.color }}>{member.short}</span>
            {member.name}
          </button>
        ))}
      </div>

      <section className="calendar-profile">
        <div className="profile-avatar" style={{ background: memberColors[selectedMember] || memberColors.all }}>
          {selectedMember === "all" ? "집" : selectedMemberName[0]}
        </div>
        <div>
          <h1>{selectedMemberName}</h1>
          <p>가전 루틴과 집안일을 한눈에 관리해요.</p>
        </div>
      </section>

      <section className="calendar-board">
        <div className="calendar-header">
          <div className="month-switcher">
            <button onClick={() => moveCalendar(-1)} aria-label="이전 기간">
              <ChevronLeft size={18} />
            </button>
            <h2>{displayLabel}</h2>
            <button onClick={() => moveCalendar(1)} aria-label="다음 기간">
              <ChevronRight size={18} />
            </button>
          </div>
          <button className="calendar-add-button" onClick={openComposer}>
            <Plus size={18} />
            할일 추가
          </button>
        </div>
        <div className="calendar-toolbar">
          <div className="calendar-mode-controls" aria-label="캘린더 보기 방식">
            {[
              ["month", "월간"],
              ["week", "주간"],
              ["day", "일간"],
            ].map(([view, label]) => (
              <button key={view} className={calendarView === view ? "active" : ""} onClick={() => setCalendarView(view)}>
                {label}
              </button>
            ))}
          </div>
          <div className="calendar-view-controls" aria-label="캘린더 크기 조절">
            <button onClick={() => changeScale(-1)} disabled={calendarScale === 0} aria-label="캘린더 축소">
              <Minus size={16} />
            </button>
            <span>{calendarScale + 1}단계</span>
            <button onClick={() => changeScale(1)} disabled={calendarScale === 4} aria-label="캘린더 확대">
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className={`weekdays ${calendarView === "day" ? "day-weekday" : ""}`}>
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className={`month-grid calendar-scale-${calendarScale} calendar-${calendarView}-view`}>
          {Array.from({ length: leadingBlanks }).map((_, index) => (
            <span className="blank-day" key={index} />
          ))}
          {displayDates.map((key) => {
            const tasks = tasksByDate[key] || [];
            const day = Number(key.slice(-2));
            const weather = weatherByDate[key];
            return (
              <button key={key} className={`date-cell ${selectedDate === key ? "selected" : ""}`} onClick={() => setSelectedDate(key)}>
                <strong>{day}</strong>
                {weather && (
                  <span className={`day-weather ${weather.status === "none" ? "empty" : ""}`}>
                    {weather.status === "none" ? (
                      <em>없음</em>
                    ) : (
                      <>
                        {weather.condition && (
                          <span className="weather-icon" role="img" aria-label={weather.label}>
                            {weatherIcon[weather.condition]}
                          </span>
                        )}
                        <span className="weather-temps">
                          <b>{weather.high}°</b>
                          <small>{weather.low}°</small>
                        </span>
                      </>
                    )}
                  </span>
                )}
                <div className="date-tasks">
                  {tasks.slice(0, taskLimit).map((task) => (
                    <i className={task.tag} key={task.id} style={{ background: memberColors[task.owner] || memberColors.all }}>
                      <span>{task.title}</span>
                      {isExpanded && (
                        <small>
                          {task.place} · {task.repeat}
                        </small>
                      )}
                    </i>
                  ))}
                  {tasks.length > taskLimit && <em className="more-tasks">+{tasks.length - taskLimit}개</em>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="task-sheet compact">
        <div className="sheet-head">
          <h2>{selectedDay}일 작업</h2>
          <label className="search-field">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색" />
          </label>
        </div>
        {selectedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onOwnerChange={changeTaskOwner}
            onPostpone={postponeTask}
            onOpen={(openedTask) => onOpenPanel({ type: "task", task: openedTask })}
          />
        ))}
        {selectedTasks.length === 0 && (
          <div className="empty-state">
            <ClipboardList size={24} />
            <p>선택한 날짜에 작업이 없어요.</p>
          </div>
        )}
      </section>
    </section>
  );
}

function getDisplayDates(view, selectedDate, month) {
  if (view === "month") return month;
  if (view === "day") return [selectedDate];

  const selected = new Date(`${selectedDate}T00:00:00`);
  const sunday = new Date(selected);
  sunday.setDate(selected.getDate() - selected.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + index);
    return toDateKey(day);
  });
}

function getDisplayLabel(view, selectedDate, monthLabel) {
  if (view === "month") return monthLabel;
  if (view === "day") return selectedDate.replaceAll("-", ". ");

  const dates = getDisplayDates("week", selectedDate, []);
  const start = dates[0].slice(5).replace("-", ".");
  const end = dates[6].slice(5).replace("-", ".");
  return `${selectedDate.slice(0, 4)}. ${start} - ${end}`;
}

function addDays(date, amount) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + amount);
  return toDateKey(next);
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
