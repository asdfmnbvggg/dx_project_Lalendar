import { ChevronLeft, ChevronRight, ClipboardList, Minus, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { members } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";
import airConditionerImage from "../assets/appliances/에어컨.png";
import dryerImage from "../assets/appliances/건조기.png";
import fridgeImage from "../assets/appliances/냉장고.png";
import washerImage from "../assets/appliances/세탁기.png";

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

const applianceImages = {
  air: airConditionerImage,
  dryer: dryerImage,
  fridge: fridgeImage,
  washer: washerImage,
};

export default function CalendarPage({
  month,
  monthLabel,
  monthLeadingBlanks,
  weatherByDate,
  routineRecommendations = [],
  onPrevMonth,
  onNextMonth,
  onSelectCalendarDate,
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
  calendarView = "month",
  setCalendarView,
}) {
  const [calendarScale, setCalendarScale] = useState(2);
  const [selectedDetailDate, setSelectedDetailDate] = useState(null);
  const [isDeleteMode, setDeleteMode] = useState(false);
  const [selectedDeleteTaskIds, setSelectedDeleteTaskIds] = useState([]);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseDateKey(selectedDate));
  const selectedDay = Number(selectedDate.slice(-2));
  const displayDates = getDisplayDates(calendarView, selectedDate, month);
  const displayLabel = getDisplayLabel(calendarView, selectedDate, monthLabel);
  const leadingBlanks = calendarView === "month" ? monthLeadingBlanks : 0;
  const calendarCells =
    calendarView === "month"
      ? getMonthCells(month, monthLeadingBlanks)
      : displayDates.map((key) => ({ key, day: Number(key.slice(-2)), isCurrentMonth: true }));
  const isExpanded = calendarScale >= 3;
  const taskLimit = calendarView === "day" ? 99 : calendarView === "month" ? 4 : calendarScale <= 1 ? 2 : calendarScale >= 4 ? 5 : 3;
  const selectedWeather = weatherByDate[selectedDate];
  const selectedRecommendations = getRecommendationsForDate(selectedDate, weatherByDate, routineRecommendations);
  const detailDate = selectedDetailDate || selectedDate;
  const detailTasks = tasksByDate[detailDate] || [];

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

  function openDatePicker() {
    setDraftDate(parseDateKey(selectedDate));
    setDatePickerOpen(true);
  }

  function chooseToday() {
    const today = new Date();
    setDraftDate({ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() });
  }

  function applyDatePicker() {
    const normalizedDay = Math.min(draftDate.day, getDaysInMonth(draftDate.year, draftDate.month));
    onSelectCalendarDate?.(draftDate.year, draftDate.month, normalizedDay);
    setDatePickerOpen(false);
  }

  function closeDateDetail() {
    setSelectedDetailDate(null);
    setDeleteMode(false);
    setSelectedDeleteTaskIds([]);
  }

  function toggleDeleteMode() {
    setDeleteMode((current) => !current);
    setSelectedDeleteTaskIds([]);
  }

  function toggleDeleteSelection(taskId) {
    setSelectedDeleteTaskIds((current) => (current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]));
  }

  function deleteSelectedTasks() {
    selectedDeleteTaskIds.forEach((taskId) => deleteTask(taskId));
    setSelectedDeleteTaskIds([]);
    setDeleteMode(false);
  }

  function updateDraftDate(part, value) {
    setDraftDate((current) => {
      const next = { ...current, [part]: value };
      next.day = Math.min(next.day, getDaysInMonth(next.year, next.month));
      return next;
    });
  }

  return (
    <section className={`page calendar-page calendar-page-${calendarView}`}>
      <div className="calendar-filter-block">
        <p>일정 보기 필터</p>
        <div className="profile-strip" aria-label="캘린더 일정 보기 필터">
          {members.map((member) => (
            <button key={member.id} className={selectedMember === member.id ? "active" : ""} onClick={() => setSelectedMember(member.id)}>
              <span style={{ background: memberColors[member.id] || member.color }}>{member.short}</span>
              {member.id === "all" ? "전체" : member.name}
            </button>
          ))}
        </div>
      </div>

      <section className="calendar-board">
        <div className="calendar-header">
          <div className="month-switcher">
            <button onClick={() => moveCalendar(-1)} aria-label="이전 기간">
              <ChevronLeft size={18} />
            </button>
            <h2>
              <button type="button" className="month-title-button" onClick={openDatePicker}>
                {displayLabel}
              </button>
            </h2>
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

        {calendarView === "week" ? (
          <WeekTimetable
            dates={displayDates}
            tasksByDate={tasksByDate}
            memberColors={memberColors}
            selectedDate={selectedDate}
            onPrevWeek={() => moveCalendar(-1)}
            onNextWeek={() => moveCalendar(1)}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setSelectedDetailDate(date);
            }}
          />
        ) : (
          <>
            {calendarView === "day" && (
              <DayTimelineHead selectedDate={selectedDate} onPrevDay={() => moveCalendar(-1)} onNextDay={() => moveCalendar(1)} />
            )}
            <div className={`weekdays ${calendarView === "day" ? "day-weekday" : ""}`}>
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div
              className={`month-grid calendar-scale-${calendarScale} calendar-${calendarView}-view`}
              style={{ "--calendar-row-count": calendarView === "month" ? calendarCells.length / 7 : 1 }}
            >
              {calendarView !== "month" &&
                Array.from({ length: leadingBlanks }).map((_, index) => <span className="blank-day" key={index} />)}
              {calendarCells.map(({ key, day, isCurrentMonth }) => {
                const tasks = tasksByDate[key] || [];
                const weather = weatherByDate[key];
                const recommendations = getRecommendationsForDate(key, weatherByDate, routineRecommendations);
                const hasWeatherData = Boolean(weather?.hasWeatherData);

                return (
                  <button
                    key={key}
                    className={`date-cell ${selectedDate === key ? "selected" : ""} ${isCurrentMonth ? "" : "outside-month"}`}
                    onClick={() => {
                      if (!isCurrentMonth) return;
                      setSelectedDate(key);
                      setSelectedDetailDate(key);
                    }}
                    disabled={!isCurrentMonth}
                  >
                    <strong>{day}</strong>
                    {hasWeatherData && (
                      <span className="day-weather">
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
                      </span>
                    )}

                    <div className="date-tasks">
                      {isCurrentMonth && (
                        <>
                          {recommendations.length > 0 && <em className="weather-recommendation-chip">추천 {recommendations[0].title}</em>}
                          {tasks.slice(0, taskLimit).map((task) => (
                            <i
                              className={`${task.tag} ${task.displayType === "fixed" ? "fixed-event-task" : ""} ${
                                task.displayType === "appliance" ? "auto-appliance-task" : ""
                              }`}
                              key={task.id}
                              style={task.displayType === "appliance" ? undefined : { background: memberColors[task.owner] || memberColors.all }}
                            >
                              {task.displayType === "appliance" && (
                                <img className="task-appliance-image" src={applianceImages[task.applianceType] || washerImage} alt="" aria-hidden="true" />
                              )}
                              <span>{task.title}</span>
                              {isExpanded && (
                                <small>
                                  {task.place} · {task.repeat}
                                </small>
                              )}
                            </i>
                          ))}
                          {tasks.length > taskLimit && <em className="more-tasks">+{tasks.length - taskLimit}개</em>}
                        </>
                          )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {isDatePickerOpen && (
        <div className="calendar-date-picker-backdrop" role="presentation" onClick={() => setDatePickerOpen(false)}>
          <section
            className="calendar-date-picker"
            role="dialog"
            aria-modal="true"
            aria-label="날짜 변경"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="date-picker-drag-handle" aria-hidden="true" />
            <div className="date-picker-wheels">
              <DateWheel
                label="연도"
                values={getYearOptions(draftDate.year)}
                value={draftDate.year}
                formatter={(value) => `${value}년`}
                onChange={(value) => updateDraftDate("year", value)}
              />
              <DateWheel
                label="월"
                values={Array.from({ length: 12 }, (_, index) => index + 1)}
                value={draftDate.month}
                formatter={(value) => `${value}월`}
                onChange={(value) => updateDraftDate("month", value)}
                loop
              />
              <DateWheel
                label="일"
                values={Array.from({ length: getDaysInMonth(draftDate.year, draftDate.month) }, (_, index) => index + 1)}
                value={draftDate.day}
                formatter={(value) => `${value}일`}
                onChange={(value) => updateDraftDate("day", value)}
                loop
              />
            </div>
            <div className="date-picker-actions">
              <button type="button" onClick={chooseToday}>
                오늘
              </button>
              <button type="button" onClick={applyDatePicker}>
                완료
              </button>
            </div>
          </section>
        </div>
      )}

      {selectedDetailDate && (
        <div className="date-detail-backdrop" role="presentation" onClick={closeDateDetail}>
          <section className="date-detail-card" role="dialog" aria-modal="true" aria-label={`${formatDateTitle(detailDate)} 할 일`} onClick={(event) => event.stopPropagation()}>
            <div className="date-detail-head">
              <div>
                <h3>{formatDateTitle(detailDate)}</h3>
                <p>{formatDDay(detailDate)}</p>
              </div>
              <button
                type="button"
                className={`date-detail-delete-toggle ${isDeleteMode ? "active" : ""}`}
                aria-label={isDeleteMode ? "삭제 선택 취소" : "일정 삭제"}
                disabled={detailTasks.length === 0}
                onClick={toggleDeleteMode}
              >
                <Trash2 size={24} />
              </button>
            </div>

            <div className="date-detail-list">
              {detailTasks.map((task) => (
                <article
                  className={`date-detail-task ${task.done ? "done" : ""} ${isDeleteMode ? "delete-selecting" : ""} ${
                    selectedDeleteTaskIds.includes(task.id) ? "selected-for-delete" : ""
                  }`}
                  key={task.id}
                  onClick={() => {
                    if (isDeleteMode) toggleDeleteSelection(task.id);
                  }}
                >
                  <button
                    type="button"
                    aria-label={isDeleteMode ? `${task.title} 삭제 선택` : `${task.title} 완료`}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isDeleteMode) {
                        toggleDeleteSelection(task.id);
                        return;
                      }
                      toggleTask(task.id);
                    }}
                  >
                    <span />
                  </button>
                  <div>
                    <strong>{task.title}</strong>
                    <small>
                      {task.place} · {task.repeat}
                    </small>
                  </div>
                </article>
              ))}
              {detailTasks.length === 0 && <p className="date-detail-empty">이 날의 할 일이 없어요.</p>}
            </div>

            {isDeleteMode ? (
              <button type="button" className="date-detail-delete-action" onClick={deleteSelectedTasks} disabled={selectedDeleteTaskIds.length === 0}>
                삭제하기
              </button>
            ) : (
              <button
                type="button"
                className="date-detail-add"
                onClick={() => {
                  setSelectedDate(detailDate);
                  closeDateDetail();
                  openComposer();
                }}
              >
                + 할 일을 추가하세요
              </button>
            )}
          </section>
        </div>
      )}

      <section className="task-sheet compact">
        <div className="sheet-head">
          <h2>{selectedDay}일 작업</h2>
          <label className="search-field">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색" />
          </label>
        </div>

        {selectedWeather?.hasWeatherData && (
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
                    {formatRecommendationReason(recommendation.reason) && <p>{formatRecommendationReason(recommendation.reason)}</p>}
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

function formatRecommendationReason(reason) {
  return String(reason || "")
    .replaceAll("날씨 정보 없음.", "")
    .replaceAll("날씨 정보 없음", "")
    .trim();
}

function formatDateTitle(date) {
  const parsed = new Date(`${date}T00:00:00`);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${parsed.getMonth() + 1}월 ${parsed.getDate()}일 (${weekdays[parsed.getDay()]})`;
}

function formatDDay(date) {
  const today = new Date();
  const target = new Date(`${date}T00:00:00`);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((target - todayStart) / 86400000);

  if (diff === 0) return "D-day";
  return diff > 0 ? `D - ${diff}` : `D + ${Math.abs(diff)}`;
}

function DayTimelineHead({ selectedDate, onPrevDay, onNextDay }) {
  return (
    <div className="day-timeline-head">
      <button type="button" aria-label="이전 날" onClick={onPrevDay}>
        ‹
      </button>
      <strong>{formatDayTitle(selectedDate)}</strong>
      <button type="button" aria-label="다음 날" onClick={onNextDay}>
        ›
      </button>
    </div>
  );
}

function formatDayTitle(date) {
  const parsed = new Date(`${date}T00:00:00`);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${parsed.getMonth() + 1}.${parsed.getDate()} (${weekdays[parsed.getDay()]})`;
}

function WeekTimetable({ dates, tasksByDate, memberColors, selectedDate, onPrevWeek, onNextWeek, onSelectDate }) {
  const hours = Array.from({ length: 25 }, (_, index) => index);
  const dayLabels = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <section className="week-timetable-card" aria-label="주간 시간표">
      <div className="week-timetable-head">
        <button type="button" aria-label="이전 주" onClick={onPrevWeek}>
          ‹
        </button>
        <strong>{formatWeekTitle(dates)}</strong>
        <button type="button" aria-label="다음 주" onClick={onNextWeek}>
          ›
        </button>
      </div>
      <div className="week-timetable-scroll">
        <div className="week-timetable-grid" style={{ "--week-hour-count": hours.length }}>
          <span className="week-time-spacer" />
          {dates.map((date, dayIndex) => {
            const parsed = new Date(`${date}T00:00:00`);
            return (
              <button
                type="button"
                className={`week-day-head ${date === selectedDate ? "active" : ""}`}
                key={date}
                onClick={() => onSelectDate(date)}
              >
                <span>{dayLabels[dayIndex]}</span>
                <strong>{parsed.getDate()}</strong>
              </button>
            );
          })}

          {hours.map((hour, rowIndex) => (
            <span className="week-time-label" style={{ gridRow: rowIndex + 2 }} key={hour}>
              <strong>{formatWeekHour(hour).hour}</strong>
              <small>{formatWeekHour(hour).period}</small>
              <small>{formatWeekHour(hour).time}</small>
            </span>
          ))}

          {hours.map((hour, rowIndex) =>
            dates.map((date, dayIndex) => <span className="week-grid-line" style={{ gridColumn: dayIndex + 2, gridRow: rowIndex + 2 }} key={`${date}-${hour}`} />),
          )}

          {dates.flatMap((date, dayIndex) =>
            (tasksByDate[date] || []).slice(0, 4).map((task, taskIndex) => {
              const placement = getWeekTaskPlacement(task, dayIndex, taskIndex, hours);
              return (
                <button
                  type="button"
                  className={`week-task-block ${task.tag}`}
                  key={`${date}-${task.id}`}
                  style={{
                    gridColumn: dayIndex + 2,
                    gridRow: `${placement.row} / span ${placement.span}`,
                    background: getWeekTaskColor(task, memberColors, taskIndex),
                  }}
                  onClick={() => onSelectDate(date)}
                >
                  <strong>{task.title}</strong>
                  <span>{task.place}</span>
                </button>
              );
            }),
          )}
        </div>
      </div>
    </section>
  );
}

function formatWeekTitle(dates) {
  if (!dates.length) return "주간";
  const start = new Date(`${dates[0]}T00:00:00`);
  const end = new Date(`${dates[dates.length - 1]}T00:00:00`);
  return `${start.getMonth() + 1}.${start.getDate()} - ${end.getMonth() + 1}.${end.getDate()}`;
}

function formatWeekHour(hour) {
  if (hour === 0) {
    return { period: "오전", hour: "12", time: "12시" };
  }

  if (hour === 12) {
    return { period: "", hour: "정오", time: "12시" };
  }

  if (hour === 24) {
    return { period: "오후", hour: "12", time: "12시" };
  }

  if (hour < 12) {
    return { period: "오전", hour: String(hour), time: `${hour}시` };
  }

  return { period: "오후", hour: String(hour - 12), time: `${hour - 12}시` };
}

function getWeekTaskPlacement(task, dayIndex, taskIndex, hours) {
  const parsedHour = Number(String(task.repeat || "").match(/(\d{1,2}):\d{2}/)?.[1]);
  const fallbackHour = 8 + ((dayIndex * 2 + taskIndex * 3) % 10);
  const hour = Number.isFinite(parsedHour) ? parsedHour : fallbackHour;
  const row = Math.max(2, Math.min(hours.length + 1, hour - hours[0] + 2));
  const span = task.source === "auto" ? 2 : 1;
  return { row, span };
}

function getWeekTaskColor(task, memberColors, index) {
  const palette = ["#fb7185", "#fbbf24", "#60a5fa", "#a78bfa", "#fb8a6b", "#34d399"];
  if (task.owner && memberColors[task.owner]) return colorMix(memberColors[task.owner], palette[index % palette.length]);
  return palette[index % palette.length];
}

function colorMix(primary, fallback) {
  return primary === "#d4144b" ? fallback : primary;
}

function DateWheel({ label, values, value, formatter, onChange, loop = false }) {
  const selectedIndex = values.indexOf(value);
  const visibleValues = Array.from({ length: 7 }, (_, offset) => {
    const index = selectedIndex - 3 + offset;
    if (loop) return values[wrapIndex(index, values.length)];
    return values[index];
  }).filter((item) => item !== undefined);

  function startWheelDrag(event) {
    event.preventDefault();
    const startY = event.clientY;
    const startIndex = values.indexOf(value);
    let lastStep = 0;

    event.currentTarget.setPointerCapture?.(event.pointerId);

    const moveWheel = (moveEvent) => {
      moveEvent.preventDefault();
      const step = Math.trunc((startY - moveEvent.clientY) / 12);
      if (step === lastStep) return;

      lastStep = step;
      const nextIndex = loop ? wrapIndex(startIndex + step, values.length) : Math.min(values.length - 1, Math.max(0, startIndex + step));
      onChange(values[nextIndex]);
    };

    const stopWheelDrag = () => {
      window.removeEventListener("pointermove", moveWheel);
      window.removeEventListener("pointerup", stopWheelDrag);
    };

    window.addEventListener("pointermove", moveWheel);
    window.addEventListener("pointerup", stopWheelDrag);
  }

  function handleWheel(event) {
    event.preventDefault();
    const currentIndex = values.indexOf(value);
    const direction = event.deltaY > 0 ? 1 : -1;
    const nextIndex = loop ? wrapIndex(currentIndex + direction, values.length) : Math.min(values.length - 1, Math.max(0, currentIndex + direction));
    onChange(values[nextIndex]);
  }

  return (
    <div className="date-picker-wheel" aria-label={label} onPointerDown={startWheelDrag} onWheel={handleWheel}>
      {visibleValues.map((item) => (
        <button key={item} type="button" className={item === value ? "active" : ""} onClick={() => onChange(item)}>
          {formatter(item)}
        </button>
      ))}
    </div>
  );
}

function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

function parseDateKey(date) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function getYearOptions(year) {
  return Array.from({ length: 9 }, (_, index) => year - 4 + index);
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getDisplayDates(view, selectedDate, month) {
  if (view === "month") return month;
  if (view === "day") return [selectedDate];

  const selected = new Date(`${selectedDate}T00:00:00`);
  const monday = new Date(selected);
  const mondayOffset = (selected.getDay() + 6) % 7;
  monday.setDate(selected.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return toDateKey(day);
  });
}

function getDisplayLabel(view, selectedDate, monthLabel) {
  if (view === "month") {
    const [year, month] = monthLabel.split(". ").map(Number);
    const currentYear = new Date().getFullYear();
    return year === currentYear ? `${month}월` : `${year}년 ${month}월`;
  }
  if (view === "day") return selectedDate.replaceAll("-", ". ");

  const dates = getDisplayDates("week", selectedDate, []);
  const start = dates[0].slice(5).replace("-", ".");
  const end = dates[6].slice(5).replace("-", ".");
  return `${selectedDate.slice(0, 4)}. ${start} - ${end}`;
}

function getMonthCells(month, leadingBlanks) {
  if (month.length === 0) return [];

  const [year, monthNumber] = month[0].split("-").map(Number);
  const totalDays = month.length;
  const previousMonthLastDay = new Date(year, monthNumber - 1, 0).getDate();
  const cellCount = Math.ceil((leadingBlanks + totalDays) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const currentDay = index - leadingBlanks + 1;

    if (currentDay < 1) {
      const day = previousMonthLastDay + currentDay;
      return { key: toDateKey(new Date(year, monthNumber - 2, day)), day, isCurrentMonth: false };
    }

    if (currentDay > totalDays) {
      const day = currentDay - totalDays;
      return { key: toDateKey(new Date(year, monthNumber, day)), day, isCurrentMonth: false };
    }

    return {
      key: `${year}-${String(monthNumber).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`,
      day: currentDay,
      isCurrentMonth: true,
    };
  });
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
