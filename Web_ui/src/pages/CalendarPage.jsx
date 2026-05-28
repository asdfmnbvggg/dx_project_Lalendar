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
  const [calendarSize, setCalendarSize] = useState("medium");
  const selectedMemberName = members.find((member) => member.id === selectedMember)?.name || "우리 집";
  const selectedDay = Number(selectedDate.slice(-2));
  const taskLimit = calendarSize === "compact" ? 2 : calendarSize === "large" ? 5 : 3;

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
            <button onClick={onPrevMonth} aria-label="이전 달">
              <ChevronLeft size={18} />
            </button>
            <h2>{monthLabel}</h2>
            <button onClick={onNextMonth} aria-label="다음 달">
              <ChevronRight size={18} />
            </button>
          </div>
          <button className="calendar-add-button" onClick={openComposer} aria-label="할 일 추가">
            <Plus size={18} />
          </button>
        </div>
        <div className="calendar-view-controls" aria-label="캘린더 크기 조절">
          <button className={calendarSize === "compact" ? "active" : ""} onClick={() => setCalendarSize("compact")} aria-label="캘린더 작게 보기">
            <Minus size={16} />
          </button>
          <button className={calendarSize === "medium" ? "active" : ""} onClick={() => setCalendarSize("medium")}>
            중간
          </button>
          <button className={calendarSize === "large" ? "active" : ""} onClick={() => setCalendarSize("large")} aria-label="캘린더 크게 보기">
            <Plus size={16} />
          </button>
        </div>
        <div className="weekdays">
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className={`month-grid calendar-${calendarSize}`}>
          {Array.from({ length: monthLeadingBlanks }).map((_, index) => (
            <span className="blank-day" key={index} />
          ))}
          {month.map((key) => {
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
                      {calendarSize === "large" && (
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
