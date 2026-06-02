import { ChevronLeft, ChevronRight, ClipboardList, Minus, Plus, Search } from "lucide-react";
import { useState } from "react";
import { members } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";

const weatherIcon = {
  sunny: "☀️",
  partly_cloudy: "🌤️",
  cloudy: "☁️",
  rain: "🌧️",
  snow: "❄️",
  unknown: "•",
};

const applianceTypeLabel = {
  WASHER: "세탁기",
  DRYER: "건조기",
  NATURAL_DRY: "자연건조",
  DEHUMIDIFIER: "제습기",
  AIR_CONDITIONER: "에어컨",
  AIR_PURIFIER: "공기청정기",
  ROBOT_CLEANER: "로봇청소기",
  ETC: "가전",
};

export default function CalendarPage({
  month,
  monthLabel,
  monthLeadingBlanks,
  weatherByDate,
  routineRecommendations = [],
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
  onAddWeatherRecommendation,
  openComposer,
  onOpenPanel,
}) {
  const [calendarView, setCalendarView] = useState("month");
  const [calendarScale, setCalendarScale] = useState(2);
  const selectedDay = Number(selectedDate.slice(-2));
  const displayDates = getDisplayDates(calendarView, selectedDate, month);
  const displayLabel = getDisplayLabel(calendarView, selectedDate, monthLabel);
  const leadingBlanks = calendarView === "month" ? monthLeadingBlanks : 0;
  const isExpanded = calendarScale >= 3;
  const taskLimit = calendarView === "day" ? 99 : calendarScale <= 1 ? 2 : calendarScale >= 4 ? 5 : 3;
  const selectedWeather = weatherByDate[selectedDate];
  const selectedRecommendations = getRecommendationsForDate(selectedDate, weatherByDate, routineRecommendations);

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
          <div className="calendar-header-actions">
            <button className="calendar-zoom-button" onClick={() => changeScale(-1)} disabled={calendarScale === 0}>
              <Minus size={15} />
              축소
            </button>
            <button className="calendar-zoom-button" onClick={() => changeScale(1)} disabled={calendarScale === 4}>
              <Plus size={15} />
              확대
            </button>
            <button className="calendar-add-button" onClick={openComposer}>
              <Plus size={18} />
              할일 추가
            </button>
          </div>
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
            const recommendations = getRecommendationsForDate(key, weatherByDate, routineRecommendations);
            const hasWeatherData = Boolean(weather?.hasWeatherData);

            return (
              <button key={key} className={`date-cell ${selectedDate === key ? "selected" : ""}`} onClick={() => setSelectedDate(key)}>
                <strong>{day}</strong>
                <span className={`day-weather ${hasWeatherData ? "" : "empty"}`}>
                  {!hasWeatherData ? (
                    <em>날씨 정보 없음</em>
                  ) : (
                    <>
                      <span className="weather-icon" role="img" aria-label={weather.sky || weather.pty || "날씨"}>
                        {weatherIcon[weather.icon] || weatherIcon.unknown}
                      </span>
                      <span className="weather-temps">
                        <b>{formatTemp(weather.maxTemp)}</b>
                        <small>{formatTemp(weather.minTemp)}</small>
                        {Number.isFinite(weather.pop) && <small className="weather-pop">강수 {weather.pop}%</small>}
                        <small>{formatWeatherState(weather)}</small>
                      </span>
                    </>
                  )}
                </span>

                <div className="date-tasks">
                  {recommendations.length > 0 && <em className="weather-recommendation-chip">추천 {recommendations[0].title}</em>}
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

        {selectedWeather?.hasWeatherData ? (
          <div className="selected-weather-summary">
            <span className="weather-icon" role="img" aria-label={selectedWeather.sky || "날씨"}>
              {weatherIcon[selectedWeather.icon] || weatherIcon.unknown}
            </span>
            <strong>{formatWeatherState(selectedWeather)}</strong>
            <small>
              최고 {formatTemp(selectedWeather.maxTemp)} / 최저 {formatTemp(selectedWeather.minTemp)}
              {Number.isFinite(selectedWeather.pop) ? ` · 강수 ${selectedWeather.pop}%` : ""}
            </small>
          </div>
        ) : (
          <div className="selected-weather-summary empty">
            <strong>날씨 정보 없음</strong>
            <small>기상청 API 응답이 없거나 해당 날짜 예보가 없습니다.</small>
          </div>
        )}

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

        {selectedRecommendations.length > 0 && (
          <section className="weather-recommendation-panel" aria-label="추천 일정">
            <div className="weather-recommendation-head">
              <h3>추천 일정</h3>
              <span>{selectedRecommendations.length}개</span>
            </div>
            <div className="weather-recommendation-list">
              {selectedRecommendations.map((recommendation) => (
                <article key={recommendation.id} className="weather-recommendation-card">
                  <div>
                    <span>{applianceTypeLabel[recommendation.applianceType] || "가전"}</span>
                    <strong>{recommendation.title}</strong>
                    <p>{recommendation.reason}</p>
                    <small>
                      {recommendation.recommendedStartTime || recommendation.startTime}-{recommendation.recommendedEndTime || recommendation.endTime} ·{" "}
                      {formatRecommendationSource(recommendation)}
                      {Number.isFinite(recommendation.confidence) ? ` · 신뢰도 ${recommendation.confidence}%` : ""}
                    </small>
                  </div>
                  <button type="button" onClick={() => onAddWeatherRecommendation(selectedDate, recommendation)}>
                    일정 추가
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

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

function getRecommendationsForDate(date, weatherByDate, routineRecommendations) {
  const routineItems = routineRecommendations.filter((item) => item.date === date);
  if (routineItems.length > 0) return routineItems;
  return weatherByDate[date]?.applianceRecommendations || [];
}

function formatWeatherState(weather) {
  if (!weather?.hasWeatherData) return "정보 없음";
  const sky = weather.sky && weather.sky !== "정보 없음" ? weather.sky : "";
  const pty = weather.pty && weather.pty !== "없음" && weather.pty !== "정보 없음" ? weather.pty : "";
  return [sky, pty].filter(Boolean).join(" · ") || "정보 없음";
}

function formatRecommendationSource(recommendation) {
  const labels = {
    WEATHER_COMBINED: "날씨+ThinQ",
    THINQ_LOG: "ThinQ 기록",
    THINQ_STATE: "ThinQ 상태",
    THINQ_ENERGY: "전력량",
    WEATHER_BASED: "날씨",
  };

  return labels[recommendation.source] || recommendation.automationType || "추천";
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

function formatTemp(value) {
  return Number.isFinite(value) ? `${value}°` : "-";
}
