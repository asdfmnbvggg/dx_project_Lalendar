import { ChevronLeft, ChevronRight, ClipboardList, Minus, Plus, Search, Settings, Trash2, X } from "lucide-react";
import { useState } from "react";
import { dateKey, members } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";
import airConditionerImage from "../assets/appliances/에어컨.png";
import dryerImage from "../assets/appliances/건조기.png";
import fridgeImage from "../assets/appliances/냉장고.png";
import washerImage from "../assets/appliances/세탁기.png";
import lgCharacterImage from "../assets/lg-character.png";

import jaehyeokImage from "../assets/people/재혁님.png";
import suhyunImage from "../assets/people/김수현.jpg";

const weatherIcon = {
  sunny: "☀️",
  partly_cloudy: "⛅",
  cloudy: "☁️",
  rain: "🌧️",
  snow: "❄️",
  unknown: "?",
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

const MONTH_PERSONAL_TASK_LIMIT = 2;
const MONTH_HOUSE_TASK_LIMIT = 2;

const memberImages = {
  me: jaehyeokImage,
  theresa: suhyunImage,
};

const calendarMemberLabels = {
  me: "MY",
  minsu: "김철수",
  theresa: "김수현",
};

const calendarProfileNames = {
  me: "최재혁",
  minsu: "김철수",
  theresa: "김수현",
};

const calendarMemberIconText = {
  me: "MY",
  minsu: "김철수",
  theresa: "김수현",
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
  updateTask,
  postponeTask,
  onAddWeatherRecommendation,
  onAddTask,
  openComposer,
  onOpenPanel,
  calendarView = "month",
  setCalendarView,
}) {
  const [calendarScale, setCalendarScale] = useState(2);
  const [calendarTaskMode, setCalendarTaskMode] = useState("personal");
  const [selectedDetailDate, setSelectedDetailDate] = useState(null);
  const [isDeleteMode, setDeleteMode] = useState(false);
  const [selectedDeleteTaskIds, setSelectedDeleteTaskIds] = useState([]);
  const [activeAddColumn, setActiveAddColumn] = useState(null);
  const [dailyContextTaskId, setDailyContextTaskId] = useState(null);
  const [dailyContextAction, setDailyContextAction] = useState(null);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseDateKey(selectedDate));
  const selectedDay = Number(selectedDate.slice(-2));
  const displayDates = getDisplayDates(calendarView, selectedDate, month);
  const displayLabel = getDisplayLabel(calendarView, selectedDate, monthLabel);
  const calendarTitle = calendarView === "month" ? monthLabel.replace(". ", ".") : displayLabel;
  const leadingBlanks = calendarView === "month" ? monthLeadingBlanks : 0;
  const calendarCells =
    calendarView === "month"
      ? getMonthCells(month, monthLeadingBlanks)
      : displayDates.map((key) => ({ key, day: Number(key.slice(-2)), isCurrentMonth: true }));
  const isExpanded = calendarScale >= 3;
  const selectedWeather = weatherByDate[selectedDate];
  const selectedRecommendations = getRecommendationsForDate(selectedDate, weatherByDate, routineRecommendations);
  const isHouseCalendar = calendarTaskMode === "house";
  const filteredTasksByDate = filterTasksByCalendarMode(tasksByDate, calendarTaskMode);
  const selectedVisibleTasks = filteredTasksByDate[selectedDate] || [];
  const detailDate = selectedDetailDate || selectedDate;
  const detailTasks = filteredTasksByDate[detailDate] || [];
  const dailyFixedTasks = detailTasks.filter((task) => getDailyTaskGroup(task) === "schedule");
  const dailyHouseTasks = detailTasks.filter((task) => getDailyTaskGroup(task) === "housework");
  const dailyHours = buildDailyHours(detailTasks);
  const familyMembers = members.filter((member) => member.id !== "all");
  const selectedMemberProfile = familyMembers.find((member) => member.id === selectedMember) || familyMembers[0] || members[0];
  const selectedMemberName = calendarProfileNames[selectedMemberProfile.id] || selectedMemberProfile.name;
  const calendarOwnerTitle = isHouseCalendar ? "가사 캘린더" : selectedMemberName + "님의 캘린더";

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
    setActiveAddColumn(null);
    setDailyContextTaskId(null);
    setDailyContextAction(null);
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

  function openDailyContext(task) {
    setDailyContextTaskId((current) => (current === task.id ? null : task.id));
    setDailyContextAction(null);
  }

  function chooseDailyContextAction(action, task) {
    if (action === "copy") return;

    setDailyContextAction(action);
    window.setTimeout(() => {
      if (action === "delete") {
        deleteTask(task.id);
      }

      if (action === "edit") {
        onOpenPanel?.({ type: "task", task });
      }

      setDailyContextTaskId(null);
      setDailyContextAction(null);
    }, 140);
  }

  function updateDraftDate(part, value) {
    setDraftDate((current) => {
      const next = { ...current, [part]: value };
      next.day = Math.min(next.day, getDaysInMonth(next.year, next.month));
      return next;
    });
  }

  if (selectedDetailDate && activeAddColumn === "personal") {
    return (
      <DailyPersonalSchedulePage
        selectedDate={detailDate}
        selectedMember={selectedMember}
        onClose={() => setActiveAddColumn(null)}
        onSave={(task) => {
          onAddTask?.(task);
          setActiveAddColumn(null);
          setSelectedDate(task.date);
          setSelectedDetailDate(task.date);
        }}
      />
    );
  }

  if (selectedDetailDate) {
    return (
      <section className="page calendar-page daily-detail-page">
        <section
          className="date-detail-card"
          aria-label="Daily schedule"
          onPointerDown={(event) => {
            if (event.target.closest(".daily-time-block") || event.target.closest(".daily-context-menu")) return;
            setDailyContextTaskId(null);
            setDailyContextAction(null);
          }}
        >
          <div className="date-detail-head">
            <button type="button" className="date-detail-back-button" aria-label="Back to calendar" onClick={closeDateDetail}>
              <ChevronLeft size={22} />
            </button>
            <div>
              <span>{formatDateTitle(detailDate)} · {formatDDay(detailDate)}</span>
              <h3>{selectedMemberName}님의 캘린더</h3>
            </div>
            <span aria-hidden="true" />
          </div>

          <div className="date-detail-member-strip" aria-label="Members">
            {familyMembers.slice(0, 3).map((member) => (
              <span key={member.id} style={{ "--member-color": memberColors[member.id] || member.color }}>
                {memberImages[member.id] ? <img src={memberImages[member.id]} alt="" aria-hidden="true" /> : calendarMemberIconText[member.id] || member.short}
              </span>
            ))}
          </div>

          <div className="daily-timetable-shell" aria-label="Daily timetable" style={{ "--hour-count": dailyHours.length }}>
            <section className="daily-time-rail" aria-label="Time">
              <strong>시간</strong>
              <div className="daily-time-scale" style={{ "--hour-count": dailyHours.length }}>
                {dailyHours.map((hour) => (
                  <span key={hour}>{formatDailyHour(hour)}</span>
                ))}
              </div>
            </section>

            <DailyTimetableColumn
              title="개인 일정"
              tasks={dailyFixedTasks}
              hours={dailyHours}
              memberColors={memberColors}
              variant="personal"
              activeTaskId={dailyContextTaskId}
              activeAction={dailyContextAction}
              onOpenContext={openDailyContext}
              onChooseContextAction={chooseDailyContextAction}
            />
            <DailyTimetableColumn
              title="가사 일정"
              tasks={dailyHouseTasks}
              hours={dailyHours}
              memberColors={memberColors}
              variant="housework"
              activeTaskId={dailyContextTaskId}
              activeAction={dailyContextAction}
              onOpenContext={openDailyContext}
              onChooseContextAction={chooseDailyContextAction}
            />

            {detailTasks.length === 0 && <p className="date-detail-empty">이 날의 일정이 없어요</p>}
          </div>

          {isDeleteMode ? (
            <button type="button" className="date-detail-delete-action" onClick={deleteSelectedTasks} disabled={selectedDeleteTaskIds.length === 0}>
              선택한 일정 삭제
            </button>
          ) : (
            <div className="daily-add-row" aria-label="일정 추가">
              <span aria-hidden="true" />
              <button
                type="button"
                className={["date-detail-add", "personal", activeAddColumn === "personal" ? "active" : ""].filter(Boolean).join(" ")}
                aria-label="개인 일정 추가"
                onClick={() => {
                  setSelectedDate(detailDate);
                  setActiveAddColumn("personal");
                }}
              >
                <Plus size={24} strokeWidth={2.4} />
              </button>
              <button
                type="button"
                className={["date-detail-add", "housework", activeAddColumn === "housework" ? "active" : ""].filter(Boolean).join(" ")}
                aria-label="가사일 일정 추가"
                onClick={() => {
                  setSelectedDate(detailDate);
                  setActiveAddColumn("housework");
                  openComposer();
                }}
              >
                <Plus size={24} strokeWidth={2.4} />
              </button>
            </div>
          )}
        </section>
      </section>
    );
  }
  return (
    <section className={["page", "calendar-page", "calendar-page-" + calendarView].join(" ")}>
      <div className="calendar-filter-block">
        <h1 className="calendar-family-title">{calendarOwnerTitle}</h1>
        <button className="calendar-settings-button" type="button" aria-label="?ㅼ젙" onClick={() => onOpenPanel?.({ type: "settings" })}>
          <Settings size={22} strokeWidth={2.3} />
        </button>
        <p>일정 보기 필터</p>
        <div className="calendar-filter-row">
          <div className="profile-strip" aria-label="캘린더 일정 보기 필터">
            {familyMembers.map((member) => (
              <button
                key={member.id}
                className={selectedMember === member.id || (selectedMember === "all" && member.id === selectedMemberProfile.id) ? "active" : ""}
                aria-label={(calendarProfileNames[member.id] || member.name) + " 캘린더 보기"}
                onClick={() => {
                  setSelectedMember(member.id);
                  setCalendarTaskMode("personal");
                }}
              >
                <span style={{ background: memberImages[member.id] ? "#fff" : memberColors[member.id] || member.color }}>
                  {memberImages[member.id] ? <img src={memberImages[member.id]} alt="" aria-hidden="true" /> : calendarMemberIconText[member.id] || member.short}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={["house-calendar-toggle", isHouseCalendar ? "active" : ""].filter(Boolean).join(" ")}
            aria-label={isHouseCalendar ? "개인 캘린더 보기" : "가사 캘린더 보기"}
            aria-pressed={isHouseCalendar}
            onClick={() => {
              setCalendarTaskMode((current) => (current === "house" ? "personal" : "house"));
              closeDateDetail();
            }}
          >
            <img className="house-calendar-toggle-image" src={dryerImage} alt="" aria-hidden="true" />
          </button>
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
                {calendarTitle}
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
              일정 추가
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
            tasksByDate={filteredTasksByDate}
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
            <div className={["weekdays", calendarView === "day" ? "day-weekday" : ""].filter(Boolean).join(" ")}>
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div
              className={["month-grid", "calendar-scale-" + calendarScale, "calendar-" + calendarView + "-view"].join(" ")}
              style={{ "--calendar-row-count": calendarView === "month" ? calendarCells.length / 7 : 1 }}
            >
              {calendarView !== "month" &&
                Array.from({ length: leadingBlanks }).map((_, index) => <span className="blank-day" key={index} />)}
              {calendarCells.map(({ key, day, isCurrentMonth }) => {
                const tasks = filteredTasksByDate[key] || [];
                const personalTasks = tasks.filter((task) => getDailyTaskGroup(task) !== "housework").slice(0, MONTH_PERSONAL_TASK_LIMIT);
                const houseTasks = tasks.filter((task) => getDailyTaskGroup(task) === "housework").slice(0, MONTH_HOUSE_TASK_LIMIT);
                const weather = weatherByDate[key];
                const hasWeatherData = Boolean(weather?.hasWeatherData);

                return (
                  <button
                    key={key}
                    className={["date-cell", selectedDate === key ? "selected" : "", isCurrentMonth ? "" : "outside-month"].filter(Boolean).join(" ")}
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
                          {!isHouseCalendar &&
                            personalTasks.map((task) => (
                              <i
                                className={[task.tag, task.displayType === "fixed" ? "fixed-event-task" : ""].filter(Boolean).join(" ")}
                                key={task.id}
                                style={{ "--task-bg": task.color || memberColors[task.owner] || memberColors.all }}
                              >
                                <span>{getMonthTaskLabel(task.title)}</span>
                                {isExpanded && (
                                  <small>
                                    {task.place} · {task.repeat}
                                  </small>
                                )}
                              </i>
                            ))}
                          {isHouseCalendar && houseTasks.length > 0 && (
                            <span className="month-house-icons" aria-label="가사 일정">
                              {houseTasks.map((task) => (
                                <span className="month-house-icon" key={task.id} title={task.title}>
                                  <img src={getMonthHouseImage(task)} alt="" aria-hidden="true" />
                                </span>
                              ))}
                            </span>
                          )}
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

      {calendarView === "month" && (
        <section className="calendar-ai-report" aria-label="AI Report">
          <h3>AI Report</h3>
          <div>
            <p>{buildAiReport(selectedDate, selectedVisibleTasks, filteredTasksByDate)}</p>
          </div>
        </section>
      )}

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
                formatter={(value) => value + "년"}
                onChange={(value) => updateDraftDate("year", value)}
              />
              <DateWheel
                label="월"
                values={Array.from({ length: 12 }, (_, index) => index + 1)}
                value={draftDate.month}
                formatter={(value) => value + "월"}
                onChange={(value) => updateDraftDate("month", value)}
                loop
              />
              <DateWheel
                label="일"
                values={Array.from({ length: getDaysInMonth(draftDate.year, draftDate.month) }, (_, index) => index + 1)}
                value={draftDate.day}
                formatter={(value) => value + "일"}
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
              {Number.isFinite(selectedWeather.pop) ? " · 강수 " + selectedWeather.pop + "%" : ""}
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
                      {Number.isFinite(recommendation.confidence) ? " · 신뢰도 " + recommendation.confidence + "%" : ""}
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
            <p>선택한 날짜에 작업이 없어요</p>
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

function DailyPersonalSchedulePage({ selectedDate, selectedMember, onClose, onSave }) {
  const parsedDate = parseDateKey(selectedDate);
  const initialOwner = selectedMember === "all" ? "me" : selectedMember;
  const colorOptions = ["#ff9e9e", "#7bd3ff", "#d7a8ff", "#f7fda6"];
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(colorOptions[1]);
  const [isColorOpen, setColorOpen] = useState(false);
  const [isAllDay, setAllDay] = useState(false);
  const [startMonth, setStartMonth] = useState(parsedDate.month);
  const [startDay, setStartDay] = useState(parsedDate.day);
  const [endMonth, setEndMonth] = useState(parsedDate.month);
  const [endDay, setEndDay] = useState(parsedDate.day);
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:00");
  const [error, setError] = useState("");

  function saveSchedule() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("필수 입력 필요");
      return;
    }

    const date = dateKey(parsedDate.year, startMonth, startDay);
    onSave({
      date,
      title: trimmedTitle,
      place: "개인 일정",
      tag: "plan",
      owner: initialOwner,
      done: false,
      repeat: isAllDay ? "하루종일" : startTime + " ~ " + endTime,
      source: "manual",
      color,
      endDate: dateKey(parsedDate.year, endMonth, endDay),
      displayType: "fixed",
    });
  }

  const daysForStart = getDaysInMonth(parsedDate.year, startMonth);
  const daysForEnd = getDaysInMonth(parsedDate.year, endMonth);

  return (
    <section className="page calendar-page daily-add-page">
      <form
        className="daily-add-card"
        onSubmit={(event) => {
          event.preventDefault();
          saveSchedule();
        }}
      >
        <div className="daily-add-head">
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={28} />
          </button>
          <h2>일정 추가</h2>
          <button type="button" onClick={saveSchedule}>저장</button>
        </div>

        <section className="daily-add-title-section">
          <label htmlFor="daily-add-title">제목</label>
          <div className={["daily-add-title-input", error ? "invalid" : ""].filter(Boolean).join(" ")}>
            <input
              id="daily-add-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError("");
              }}
              placeholder="제목을 입력해 주세요"
              autoFocus
            />
            <button type="button" className="daily-color-button" style={{ "--selected-color": color }} aria-label="색상 변경" onClick={() => setColorOpen((current) => !current)} />
          </div>
          {error && <p className="daily-add-error">{error}</p>}
          {isColorOpen && (
            <div className="daily-color-popover" aria-label="색상 변경">
              {colorOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === color ? "active" : ""}
                  style={{ "--option-color": option }}
                  aria-label={option + " 선택"}
                  onClick={() => {
                    setColor(option);
                    setColorOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section className="daily-add-time-card">
          <label className="daily-all-day-row">
            <span>하루종일</span>
            <input type="checkbox" checked={isAllDay} onChange={(event) => setAllDay(event.target.checked)} />
            <i aria-hidden="true" />
          </label>

          <div className="daily-date-row">
            <strong>기간</strong>
            <div className="daily-date-pair">
              <select value={startMonth} onChange={(event) => setStartMonth(Number(event.target.value))}>
                {monthOptions().map((month) => (
                  <option key={month} value={month}>{month + "월"}</option>
                ))}
              </select>
              <select value={startDay} onChange={(event) => setStartDay(Number(event.target.value))}>
                {dayOptions(daysForStart).map((day) => (
                  <option key={day} value={day}>{day + "일"}</option>
                ))}
              </select>
            </div>
            <span>~</span>
            <div className="daily-date-pair">
              <select value={endMonth} onChange={(event) => setEndMonth(Number(event.target.value))}>
                {monthOptions().map((month) => (
                  <option key={month} value={month}>{month + "월"}</option>
                ))}
              </select>
              <select value={endDay} onChange={(event) => setEndDay(Number(event.target.value))}>
                {dayOptions(daysForEnd).map((day) => (
                  <option key={day} value={day}>{day + "일"}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={["daily-time-row", isAllDay ? "disabled" : ""].filter(Boolean).join(" ")}>
            <strong>?쒓컙</strong>
            <input type="time" value={startTime} disabled={isAllDay} onChange={(event) => setStartTime(event.target.value)} />
            <span>~</span>
            <input type="time" value={endTime} disabled={isAllDay} onChange={(event) => setEndTime(event.target.value)} />
          </div>
        </section>
      </form>
    </section>
  );
}

function monthOptions() {
  return Array.from({ length: 12 }, (_, index) => index + 1);
}

function dayOptions(daysInMonth) {
  return Array.from({ length: daysInMonth }, (_, index) => index + 1);
}

function DailyTimetableColumn({ title, tasks, hours, memberColors, variant, activeTaskId, activeAction, onOpenContext, onChooseContextAction }) {
  const startHour = hours[0] ?? 8;
  const endHour = hours[hours.length - 1] ?? 22;
  const totalMinutes = Math.max(60, (endHour - startHour + 1) * 60);

  return (
    <section className={["daily-timetable-column", variant].filter(Boolean).join(" ")} aria-label={title}>
      <strong>{title}</strong>
      <div className="daily-timetable-track" style={{ "--hour-count": hours.length }}>
        {hours.map((hour) => (
          <span className="daily-timetable-line" key={hour} />
        ))}
        {tasks.map((task, index) => {
          const range = getDailyTaskRange(task, index);
          const top = ((range.startMinutes - startHour * 60) / totalMinutes) * 100;
          const height = Math.max(7, ((range.endMinutes - range.startMinutes) / totalMinutes) * 100);
          const color = getDailyBlockColor(task, memberColors, variant, index);

          return (
            <article
              className={["daily-time-block", activeTaskId === task.id ? "context-open" : ""].filter(Boolean).join(" ")}
              key={task.id}
              role="button"
              tabIndex={0}
              style={{
                "--block-top": Math.max(0, Math.min(96, top)) + "%",
                "--block-height": Math.min(96, height) + "%",
                "--block-color": color,
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                onOpenContext?.(task);
              }}
              onPointerDown={(event) => {
                if (event.target.closest(".daily-context-menu")) return;
                onOpenContext?.(task);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenContext?.(task);
                }
              }}
            >
              <strong>{getDailyBlockTitle(task, variant)}</strong>
              <span>{formatTaskRange(range)}</span>
              {activeTaskId === task.id && (
                <div
                  className="daily-context-menu"
                  role="menu"
                  aria-label={task.title + " options"}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className={activeAction === "delete" ? "active" : ""}
                    role="menuitem"
                    onClick={(event) => {
                      event.stopPropagation();
                      onChooseContextAction?.("delete", task);
                    }}
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    className={activeAction === "edit" ? "active" : ""}
                    role="menuitem"
                    onClick={(event) => {
                      event.stopPropagation();
                      onChooseContextAction?.("edit", task);
                    }}
                  >
                    편집
                  </button>
                  <button type="button" className="disabled" role="menuitem" disabled aria-disabled="true">
                    복사
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function buildDailyHours(tasks) {
  return Array.from({ length: 24 }, (_, index) => index);
}

function getMonthTaskLabel(title) {
  return String(title || "").trim().slice(0, 3);
}

function getMonthHouseImage(task) {
  const type = String(task.applianceType || "").toLowerCase();
  const text = `${type} ${task.title || ""} ${task.place || ""}`.toLowerCase();

  if (text.includes("dryer") || text.includes("건조")) return dryerImage;
  if (text.includes("fridge") || text.includes("냉장")) return fridgeImage;
  if (text.includes("air") || text.includes("에어컨") || text.includes("공기")) return airConditionerImage;
  return washerImage;
}

function filterTasksByCalendarMode(tasksByDate, mode) {
  return Object.fromEntries(
    Object.entries(tasksByDate).map(([date, tasks]) => [
      date,
      tasks.filter((task) => (mode === "house" ? getDailyTaskGroup(task) === "housework" : getDailyTaskGroup(task) !== "housework")),
    ]),
  );
}

function getDailyTaskGroup(task) {
  if (task.displayType === "appliance") return "housework";
  if (task.tag === "house" || task.source === "auto") return "housework";
  return "schedule";
}

function getDailyTaskRange(task, index = 0) {
  const timeText = String(task.repeat || "");
  const rangeMatch = timeText.match(/\b(\d{1,2}):(\d{2})\s*(?:~|-|to)\s*(\d{1,2}):(\d{2})\b/i);

  if (rangeMatch) {
    const startMinutes = Number(rangeMatch[1]) * 60 + Number(rangeMatch[2]);
    const endMinutes = Number(rangeMatch[3]) * 60 + Number(rangeMatch[4]);
    return normalizeTimeRange(startMinutes, endMinutes);
  }

  const clockMatch = timeText.match(/\b(\d{1,2}):(\d{2})\b/);
  if (clockMatch) {
    const startMinutes = Number(clockMatch[1]) * 60 + Number(clockMatch[2]);
    return normalizeTimeRange(startMinutes, startMinutes + 60);
  }

  const koreanTime = timeText.match(/(오전|오후)?\s*(\d{1,2})시?/);
  if (koreanTime) {
    const period = koreanTime[1];
    const hour = Number(koreanTime[2]);
    if (Number.isFinite(hour)) {
      const normalizedHour = period === "오후" && hour < 12 ? hour + 12 : period === "오전" && hour === 12 ? 0 : hour;
      return normalizeTimeRange(normalizedHour * 60, normalizedHour * 60 + 60);
    }
  }

  const fallbackHour = getDailyTaskGroup(task) === "housework" ? 17 + (index % 4) : 9 + (index % 5);
  return normalizeTimeRange(fallbackHour * 60, fallbackHour * 60 + 60);
}

function normalizeTimeRange(startMinutes, endMinutes) {
  const start = Math.max(0, Math.min(23 * 60 + 59, startMinutes));
  const end = Math.max(start + 30, Math.min(24 * 60, endMinutes));
  return { startMinutes: start, endMinutes: end };
}

function formatDailyHour(hour) {
  return String(hour).padStart(2, "0") + ":00";
}

function formatTaskRange(range) {
  return formatMinutes(range.startMinutes) + " ~ " + formatMinutes(range.endMinutes);
}

function formatMinutes(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

function getDailyBlockTitle(task, variant) {
  if (variant === "housework" && task.applianceType) {
    return applianceTypeLabel[task.applianceType] || task.title;
  }
  return task.title;
}

function getDailyBlockColor(task, memberColors, variant, index) {
  const personalPalette = ["#ef4444", "#2563eb", "#16a34a", "#9333ea", "#ea580c"];
  const housePalette = ["#0f766e", "#7c3aed", "#c2410c", "#0891b2", "#be123c"];
  if (task.color) return task.color;
  if (variant === "personal" && memberColors[task.owner]) return memberColors[task.owner];
  return (variant === "housework" ? housePalette : personalPalette)[index % 5];
}
function buildAiReport(selectedDate, selectedTasks, tasksByDate = {}) {
  const date = new Date(selectedDate + "T00:00:00");
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const upcomingTasks = [0, 1, 2]
    .flatMap((offset) => tasksByDate[addDays(selectedDate, offset)] || [])
    .filter((task, index, list) => list.findIndex((item) => item.id === task.id) === index);
  const reportTasks = upcomingTasks.length > 0 ? upcomingTasks : selectedTasks;
  const fixedTasks = reportTasks.filter((task) => task.displayType === "fixed" || getDailyTaskGroup(task) === "schedule");
  const applianceTasks = reportTasks.filter((task) => getDailyTaskGroup(task) === "housework");
  const fixedSummary = fixedTasks.length > 0 ? fixedTasks[0].repeat + " " + fixedTasks[0].title : "등록된 개인 일정이 없습니다";
  const applianceSummary = applianceTasks.length > 0 ? applianceTasks.slice(0, 3).map((task) => task.title).join(", ") : "추천 가사일이 없습니다";

  return month + "." + day + " " + fixedSummary + ". 오늘 진행할 가사일은 " + applianceSummary + " 입니다";
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
  const parsed = new Date(date + "T00:00:00");
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return (parsed.getMonth() + 1) + "월 " + parsed.getDate() + "일 (" + weekdays[parsed.getDay()] + ")";
}

function formatDDay(date) {
  const today = new Date();
  const target = new Date(date + "T00:00:00");
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((target - todayStart) / 86400000);

  if (diff === 0) return "D-day";
  return diff > 0 ? "D - " + diff : "D + " + Math.abs(diff);
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
  const parsed = new Date(date + "T00:00:00");
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return (parsed.getMonth() + 1) + "." + parsed.getDate() + " (" + weekdays[parsed.getDay()] + ")";
}

function WeekTimetable({ dates, tasksByDate, memberColors, selectedDate, onPrevWeek, onNextWeek, onSelectDate }) {
  const hours = Array.from({ length: 25 }, (_, index) => index);
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

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
            const parsed = new Date(date + "T00:00:00");
            return (
              <button
                type="button"
                className={["week-day-head", date === selectedDate ? "active" : ""].filter(Boolean).join(" ")}
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
            dates.map((date, dayIndex) => <span className="week-grid-line" style={{ gridColumn: dayIndex + 2, gridRow: rowIndex + 2 }} key={date + "-" + hour} />),
          )}

          {dates.flatMap((date, dayIndex) =>
            (tasksByDate[date] || []).slice(0, 4).map((task, taskIndex) => {
              const placement = getWeekTaskPlacement(task, dayIndex, taskIndex, hours);
              return (
                <button
                  type="button"
                  className={["week-task-block", task.tag].filter(Boolean).join(" ")}
                  key={date + "-" + task.id}
                  style={{
                    gridColumn: dayIndex + 2,
                    gridRow: placement.row + " / span " + placement.span,
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
  const start = new Date(dates[0] + "T00:00:00");
  const end = new Date(dates[dates.length - 1] + "T00:00:00");
  return (start.getMonth() + 1) + "." + start.getDate() + " - " + (end.getMonth() + 1) + "." + end.getDate();
}

function formatWeekHour(hour) {
  if (hour === 0) {
    return { period: "오전", hour: "12", time: "12:00" };
  }

  if (hour === 12) {
    return { period: "", hour: "정오", time: "12:00" };
  }

  if (hour === 24) {
    return { period: "오후", hour: "12", time: "12:00" };
  }

  if (hour < 12) {
    return { period: "오전", hour: String(hour), time: hour + "시" };
  }

  return { period: "오후", hour: String(hour - 12), time: (hour - 12) + "시" };
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

  const selected = new Date(selectedDate + "T00:00:00");
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
    return year === currentYear ? month + "월" : year + "년 " + month + "월";
  }
  if (view === "day") return selectedDate.replaceAll("-", ". ");

  const dates = getDisplayDates("week", selectedDate, []);
  const start = dates[0].slice(5).replace("-", ".");
  const end = dates[6].slice(5).replace("-", ".");
  return selectedDate.slice(0, 4) + ". " + start + " - " + end;
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
      key: year + "-" + String(monthNumber).padStart(2, "0") + "-" + String(currentDay).padStart(2, "0"),
      day: currentDay,
      isCurrentMonth: true,
    };
  });
}

function addDays(date, amount) {
  const next = new Date(date + "T00:00:00");
  next.setDate(next.getDate() + amount);
  return toDateKey(next);
}

function toDateKey(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function formatTemp(value) {
  return Number.isFinite(value) ? value + "°" : "-";
}
