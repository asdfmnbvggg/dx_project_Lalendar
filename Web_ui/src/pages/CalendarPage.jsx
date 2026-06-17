import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Minus, Plus, Repeat2, Search, Settings, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, ChevronDown, Clock3, Home, Info, Power, Shirt, SlidersHorizontal, Thermometer, WashingMachine, Waves } from "lucide-react";
import { dateKey, members } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";
import {
  aiDailyReportImage,
  airConditionerImage,
  applianceImages,
  applianceModeCatalog,
  applianceTypeColor,
  applianceTypeLabel,
  CALENDAR_CELL_COLLAPSED_TASK_LIMIT,
  CALENDAR_CELL_TASK_LIMIT,
  calendarMemberIconText,
  calendarProfileNames,
  DABIN_MEMBER_IDS,
  DABIN_TASK_OWNER,
  DAILY_TIMETABLE_END_HOUR,
  DAILY_TIMETABLE_END_INPUT_TIME,
  DAILY_TIMETABLE_START_HOUR,
  DAILY_TIMETABLE_START_TIME,
  dryerImage,
  fridgeImage,
  houseCalendarTodayAirQuality,
  houseCalendarWeatherByDate,
  HOUSEWORK_MEMBER_TABS,
  legacyScheduleColorMap,
  lgCharacterImage,
  memberImages,
  SCHEDULE_PLANNING_DELAY,
  scheduleColorOptions,
  washerImage,
  weatherIcon,
} from "./calendarPage/calendarConstants.js";

export default function CalendarPage({
  month,
  monthLabel,
  monthLeadingBlanks,
  weatherByDate,
  weatherApiStatus = "idle",
  routineRecommendations = [],
  onPrevMonth,
  onNextMonth,
  onSelectCalendarDate,
  tasksByDate,
  selectedDate,
  initialSelectedDetailDate,
  onSelectedDetailDateChange,
  setSelectedDate,
  selectedMember,
  currentUser,
  activeCalendarUser,
  calendarUsers = [],
  applianceAssignees = {},
  memberColors,
  setSelectedMember,
  onActiveCalendarUserChange,
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
  onUpdateApplianceColor,
  openComposer,
  onOpenPanel,
  onOpenNotifications,
  calendarView = "month",
  setCalendarView,
}) {
  const [calendarScale, setCalendarScale] = useState(2);
  const [calendarTaskMode, setCalendarTaskMode] = useState("personal");
  const [selectedDetailDate, setSelectedDetailDate] = useState(initialSelectedDetailDate || null);
  const [isDeleteMode, setDeleteMode] = useState(false);
  const [selectedDeleteTaskIds, setSelectedDeleteTaskIds] = useState([]);
  const [activeAddColumn, setActiveAddColumn] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [dailyContextTaskId, setDailyContextTaskId] = useState(null);
  const [dailyContextAction, setDailyContextAction] = useState(null);
  const [dailyContextMenuPosition, setDailyContextMenuPosition] = useState(null);
  const [dailyDetailView, setDailyDetailView] = useState("timetable");
  const [applianceModeTask, setApplianceModeTask] = useState(null);
  const [selectedApplianceModeId, setSelectedApplianceModeId] = useState("");
  const [applianceModeMessage, setApplianceModeMessage] = useState("");
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [pendingScheduleSave, setPendingScheduleSave] = useState(null);
  const [draftDate, setDraftDate] = useState(() => parseDateKey(selectedDate));
  const selectedDay = Number(selectedDate.slice(-2));
  const isHouseCalendar = calendarTaskMode === "house";
  const maxCalendarScale = isHouseCalendar || calendarView === "month" ? 2 : 4;
  const displayDates = getDisplayDates(calendarView, selectedDate, month);
  const displayLabel = getDisplayLabel(calendarView, selectedDate, monthLabel);
  const calendarTitle = isHouseCalendar ? getTwoWeekCalendarTitle(selectedDate) : calendarView === "month" ? monthLabel.replace(". ", ".") : displayLabel;
  const leadingBlanks = calendarView === "month" ? monthLeadingBlanks : 0;
  const calendarCells =
    isHouseCalendar
      ? getTwoWeekCells(selectedDate)
      : calendarView === "month"
      ? getMonthCells(month, monthLeadingBlanks)
      : displayDates.map((key) => ({ key, day: Number(key.slice(-2)), isCurrentMonth: true }));
  const isExpanded = calendarScale >= 3;
  const selectedWeather = weatherByDate[selectedDate];
  const shouldShowWeatherMissing = weatherApiStatus !== "loading" && !selectedWeather?.hasWeatherData;
  const selectedRecommendations = getRecommendationsForDate(selectedDate, weatherByDate, routineRecommendations);
  const filteredTasksByDate = filterTasksByCalendarMode(tasksByDate, calendarTaskMode, selectedMember);
  const mainCalendarTasksByDate = hideFixedTasksByDate(filteredTasksByDate);
  const selectedVisibleTasks = mainCalendarTasksByDate[selectedDate] || [];
  const detailDate = selectedDetailDate || selectedDate;
  const detailTasks = filteredTasksByDate[detailDate] || [];
  const dailyFixedTasks = detailTasks.filter((task) => getDailyTaskGroup(task) === "schedule");
  const dailyHouseTasks = detailTasks
    .filter((task) => getDailyTaskGroup(task) === "housework")
    .map((task) => ({ ...task, memberName: getHouseworkTaskMemberName(task) }));
  const dailyHours = buildDailyHours(detailTasks);
  const familyMembers = calendarUsers.length > 0 ? calendarUsers : members.filter((member) => member.id !== "all");
  const dailyAddMembers = familyMembers.filter(isDabinMember);
  const selectedMemberProfile = activeCalendarUser || familyMembers.find((member) => member.id === selectedMember) || familyMembers[0] || members[0];
  const selectedMemberName = calendarProfileNames[selectedMemberProfile.id] || selectedMemberProfile.name;
  const calendarOwnerTitle = isHouseCalendar ? "가사 캘린더" : `${activeCalendarUser?.displayName || selectedMemberName + "님"}의 캘린더`;
  const calendarOwnerDesignName = getCalendarOwnerDesignName(activeCalendarUser?.displayName || selectedMemberName);
  const currentHouseworkMember = HOUSEWORK_MEMBER_TABS.find((member) => member.userId === currentUser?.id || member.ownerId === currentUser?.id);
  const orderedHouseworkMembers = currentHouseworkMember
    ? [currentHouseworkMember, ...HOUSEWORK_MEMBER_TABS.filter((member) => member.userId !== currentHouseworkMember.userId)]
    : HOUSEWORK_MEMBER_TABS;
  const activeCalendarOwnerId = activeCalendarUser?.id || selectedMemberProfile.id;
  const canEditPersonalCalendar = !isHouseCalendar && Boolean(currentUser?.id) && activeCalendarOwnerId === currentUser.id;
  const canUseCalendarAdd = isHouseCalendar ? Boolean(currentHouseworkMember) : canEditPersonalCalendar;

  useEffect(() => {
    onSelectedDetailDateChange?.(selectedDetailDate);
  }, [onSelectedDetailDateChange, selectedDetailDate]);

  useEffect(() => {
    if (!isHouseCalendar && !canEditPersonalCalendar && selectedDetailDate) {
      closeDateDetail();
    }
  }, [canEditPersonalCalendar, isHouseCalendar, selectedDetailDate]);

  useEffect(() => {
    setCalendarScale((current) => Math.min(current, maxCalendarScale));
  }, [maxCalendarScale]);

  function moveCalendar(offset) {
    if (isHouseCalendar) {
      const nextDate = addDays(selectedDate, offset * 14);
      const next = parseDateKey(nextDate);
      onSelectCalendarDate?.(next.year, next.month, next.day);
      return;
    }

    if (calendarView === "month") {
      offset < 0 ? onPrevMonth() : onNextMonth();
      return;
    }

    setSelectedDate(addDays(selectedDate, calendarView === "week" ? offset * 7 : offset));
  }

  function changeScale(offset) {
    setCalendarScale((current) => Math.min(maxCalendarScale, Math.max(0, current + offset)));
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
    setEditingTask(null);
    setDailyContextTaskId(null);
    setDailyContextAction(null);
    setDailyContextMenuPosition(null);
    setApplianceModeTask(null);
    setSelectedApplianceModeId("");
    setApplianceModeMessage("");
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

  function openDailyContext(task, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const taskKey = getDailyTaskKey(task);
    setDailyContextTaskId((current) => {
      const isClosing = current === taskKey;
      if (isClosing) {
        setDailyContextMenuPosition(null);
        return null;
      }

      setDailyContextMenuPosition(getDailyContextMenuPosition(event?.currentTarget));
      return taskKey;
    });
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
        setActiveAddColumn(null);
        setEditingTask(task);
      }

      setDailyContextTaskId(null);
      setDailyContextAction(null);
      setDailyContextMenuPosition(null);
    }, 140);
  }

  function openApplianceMode(task) {
    const applianceType = normalizeApplianceType(resolveApplianceTask(task));
    const catalog = applianceModeCatalog[applianceType] || applianceModeCatalog.ETC;
    const currentMode = task.applianceMode || task.currentMode || "";
    const selectedMode = catalog.modes.find((mode) => mode.label === currentMode || mode.id === currentMode) || catalog.modes[0];

    setApplianceModeTask({ ...task, applianceType, displayType: "appliance" });
    setSelectedApplianceModeId(selectedMode?.id || "");
    setApplianceModeMessage("");
    setDailyContextTaskId(null);
    setDailyContextAction(null);
    setDailyContextMenuPosition(null);
  }

  function openHouseworkComposerFor(member) {
    if (!currentUser || member?.userId !== currentUser.id) return;

    setSelectedDate(detailDate);
    onActiveCalendarUserChange?.(currentUser);
    setSelectedMember(currentUser.id);
    setActiveAddColumn("housework");
  }

  function openCalendarComposer() {
    if (isHouseCalendar && currentUser) {
      const member = HOUSEWORK_MEMBER_TABS.find((item) => item.userId === currentUser.id);
      if (!member) return;
      onActiveCalendarUserChange?.(currentUser);
      setSelectedMember(currentUser.id);
      setSelectedDetailDate(selectedDate);
      setActiveAddColumn("housework");
      return;
    }

    if (!canEditPersonalCalendar) return;
    setSelectedDetailDate(selectedDate);
    setActiveAddColumn("personal");
  }

  function changeApplianceMode(task, mode) {
    if (!task || !mode) return;

    const nextTask = {
      ...task,
      applianceMode: mode.label,
      currentMode: mode.label,
      modeUpdatedAt: new Date().toISOString(),
    };

    try {
      updateTask?.(task.id, {
        applianceMode: mode.label,
        currentMode: mode.label,
        modeUpdatedAt: nextTask.modeUpdatedAt,
      });
      setApplianceModeTask(nextTask);
      setApplianceModeMessage("ThinQ API 없이 mock 데이터로 모드가 저장됐어요.");
    } catch (error) {
      setApplianceModeTask(nextTask);
      setApplianceModeMessage("API 연결에 실패해 화면에서만 mock 모드로 반영했어요.");
    }
  }

  function updateDraftDate(part, value) {
    setDraftDate((current) => {
      const next = { ...current, [part]: value };
      next.day = Math.min(next.day, getDaysInMonth(next.year, next.month));
      return next;
    });
  }

  function startSchedulePlanning(nextSave) {
    setPendingScheduleSave({ ...nextSave, startedAt: Date.now() });
  }

  function completeSchedulePlanning(nextSave) {
    setPendingScheduleSave(null);

    if (nextSave.type === "edit") {
      const updatedTask = { ...nextSave.task, ...nextSave.updates };
      updateTask?.(nextSave.task.id, nextSave.updates);
      setEditingTask(null);
      const nextDate = updatedTask.date || detailDate;
      setSelectedDate(nextDate);
      setSelectedDetailDate(nextDate);
      return;
    }

    onAddTask?.(nextSave.task);
    setActiveAddColumn(null);
    setSelectedDate(nextSave.task.date);
    setSelectedDetailDate(nextSave.task.date);
  }

  if (pendingScheduleSave) {
    return <SchedulePlanningLoadingPage pendingSave={pendingScheduleSave} onComplete={completeSchedulePlanning} />;
  }

  if (applianceModeTask) {
    const nearestRunSchedule = getNearestApplianceSchedule(tasksByDate, normalizeApplianceType(applianceModeTask), selectedDate);

    return (
      <ApplianceModePage
        task={applianceModeTask}
        selectedModeId={selectedApplianceModeId}
        message={applianceModeMessage}
        nearestRunText={nearestRunSchedule ? formatNearestRunText(nearestRunSchedule) : ""}
        onSelectMode={setSelectedApplianceModeId}
        onApply={(mode) => changeApplianceMode(applianceModeTask, mode)}
        onClose={() => {
          setApplianceModeTask(null);
          setSelectedApplianceModeId("");
          setApplianceModeMessage("");
        }}
      />
    );
  }

  if (selectedDetailDate && editingTask && (isHouseCalendar || canEditPersonalCalendar)) {
    return (
      <DailyScheduleEditPage
        task={editingTask}
        selectedDate={detailDate}
        onApplianceColorChange={onUpdateApplianceColor}
        onClose={() => setEditingTask(null)}
        onSave={(updates) => {
          startSchedulePlanning({ type: "edit", task: editingTask, updates });
        }}
      />
    );
  }

  if (selectedDetailDate && (activeAddColumn === "personal" || activeAddColumn === "housework") && (isHouseCalendar || canEditPersonalCalendar)) {
    const houseworkMember = HOUSEWORK_MEMBER_TABS.find((member) => member.userId === currentUser?.id || member.ownerId === currentUser?.id);

    return (
      <DailyScheduleAddPage
        selectedDate={detailDate}
        selectedMember={selectedMember}
        scheduleType={activeAddColumn}
        houseworkOwnerId={houseworkMember?.ownerId}
        applianceAssignees={applianceAssignees}
        onApplianceColorChange={onUpdateApplianceColor}
        onClose={() => setActiveAddColumn(null)}
        onSave={(task) => {
          startSchedulePlanning({ type: "add", task });
        }}
      />
    );
  }

  if (selectedDetailDate && (isHouseCalendar || canEditPersonalCalendar)) {
    return (
      <section className="page calendar-page daily-detail-page">
        <section
          className="date-detail-card"
          aria-label="Daily schedule"
          onPointerDown={(event) => {
            if (event.target.closest(".daily-time-block") || event.target.closest(".daily-context-menu") || event.target.closest(".appliance-mode-backdrop")) return;
            setDailyContextTaskId(null);
            setDailyContextAction(null);
            setDailyContextMenuPosition(null);
          }}
        >
          <div className="date-detail-head">
            <button type="button" className="date-detail-back-button" aria-label="Back to calendar" onClick={closeDateDetail}>
              <ChevronLeft size={22} />
            </button>
            <div>
              <h3>{calendarOwnerTitle}</h3>
              <span></span>
              <span>{formatDateTitle(detailDate)}</span>
            </div>
            <button
              type="button"
              className="date-detail-view-toggle"
              aria-label={dailyDetailView === "timetable" ? "리스트 방식으로 보기" : "타임테이블 방식으로 보기"}
              title={dailyDetailView === "timetable" ? "리스트 보기" : "타임테이블 보기"}
              onClick={() => {
                setDailyDetailView((current) => (current === "timetable" ? "list" : "timetable"));
                setDailyContextTaskId(null);
                setDailyContextAction(null);
                setDailyContextMenuPosition(null);
              }}
            >
              <Repeat2 size={21} strokeWidth={3} />
            </button>
          </div>

          {isHouseCalendar ? (
            <>
              {dailyDetailView === "timetable" ? (
                <div className="daily-timetable-shell housework-detail three-members" aria-label="가사 일정" style={{ "--hour-count": dailyHours.length - 1 }}>
                  <DailyTimeRail hours={dailyHours} />
                  {orderedHouseworkMembers.map((member) => (
                    <DailyTimetableColumn
                      key={member.memberName}
                      title={member.label}
                      tasks={dailyHouseTasks.filter((task) => task.memberName === member.memberName)}
                      hours={dailyHours}
                      memberColors={memberColors}
                      variant="housework"
                      activeTaskId={dailyContextTaskId}
                      activeAction={dailyContextAction}
                      contextMenuPosition={dailyContextMenuPosition}
                      onOpenContext={openDailyContext}
                      onChooseContextAction={chooseDailyContextAction}
                      onOpenModeChange={openApplianceMode}
                    />
                  ))}
                </div>
              ) : (
                <div className="daily-list-shell housework-detail three-members" aria-label="가사 일정 목록">
                  {orderedHouseworkMembers.map((member) => (
                    <DailyListColumn
                      key={member.memberName}
                      title={member.label}
                      tasks={dailyHouseTasks.filter((task) => task.memberName === member.memberName)}
                      memberColors={memberColors}
                      variant="housework"
                      activeTaskId={dailyContextTaskId}
                      activeAction={dailyContextAction}
                      contextMenuPosition={dailyContextMenuPosition}
                      onOpenContext={openDailyContext}
                      onChooseContextAction={chooseDailyContextAction}
                      onOpenModeChange={openApplianceMode}
                    />
                  ))}
                </div>
              )}
            </>
          ) : dailyDetailView === "timetable" ? (
            <div className="daily-timetable-shell" aria-label="Daily timetable" style={{ "--hour-count": dailyHours.length - 1 }}>
              <DailyTimeRail hours={dailyHours} />

              <DailyTimetableColumn
                title="개인 일정"
                tasks={dailyFixedTasks}
                hours={dailyHours}
                memberColors={memberColors}
                variant="personal"
                activeTaskId={dailyContextTaskId}
                activeAction={dailyContextAction}
                contextMenuPosition={dailyContextMenuPosition}
                onOpenContext={openDailyContext}
                onChooseContextAction={chooseDailyContextAction}
                onOpenModeChange={openApplianceMode}
              />
              <DailyTimetableColumn
                title="가사 일정"
                tasks={dailyHouseTasks}
                hours={dailyHours}
                memberColors={memberColors}
                variant="housework"
                activeTaskId={dailyContextTaskId}
                activeAction={dailyContextAction}
                contextMenuPosition={dailyContextMenuPosition}
                onOpenContext={openDailyContext}
                onChooseContextAction={chooseDailyContextAction}
                onOpenModeChange={openApplianceMode}
              />

            </div>
          ) : (
            <div className="daily-list-shell" aria-label="Daily schedule list">
              <DailyListColumn
                title="개인 일정"
                tasks={dailyFixedTasks}
                memberColors={memberColors}
                variant="personal"
                activeTaskId={dailyContextTaskId}
                activeAction={dailyContextAction}
                contextMenuPosition={dailyContextMenuPosition}
                onOpenContext={openDailyContext}
                onChooseContextAction={chooseDailyContextAction}
                onOpenModeChange={openApplianceMode}
              />
              <DailyListColumn
                title="가사 일정"
                tasks={dailyHouseTasks}
                memberColors={memberColors}
                variant="housework"
                activeTaskId={dailyContextTaskId}
                activeAction={dailyContextAction}
                contextMenuPosition={dailyContextMenuPosition}
                onOpenContext={openDailyContext}
                onChooseContextAction={chooseDailyContextAction}
                onOpenModeChange={openApplianceMode}
              />
            </div>
          )}

          {isDeleteMode ? (
            <button type="button" className="date-detail-delete-action" onClick={deleteSelectedTasks} disabled={selectedDeleteTaskIds.length === 0}>
              선택한 일정 삭제
            </button>
          ) : (
            <div className={["daily-add-row", isHouseCalendar ? "housework-only three-members" : "", dailyDetailView + "-view"].filter(Boolean).join(" ")} aria-label="일정 추가">
              {isHouseCalendar ? (
                <>
                  {dailyDetailView === "timetable" && <span aria-hidden="true" />}
                  {orderedHouseworkMembers.map((member) =>
                    member.userId === currentHouseworkMember?.userId ? (
                      <button
                        type="button"
                        key={member.userId}
                        className={["date-detail-add", "housework", activeAddColumn === "housework" ? "active" : ""].filter(Boolean).join(" ")}
                        aria-label="내 가사 일정 추가"
                        onClick={() => openHouseworkComposerFor(member)}
                      >
                        <Plus size={24} strokeWidth={2.4} />
                      </button>
                    ) : (
                      <span className="daily-add-placeholder" aria-hidden="true" key={member.userId} />
                    ),
                  )}
                </>
              ) : (
                <>
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
                    aria-label="가사 일정 추가"
                    onClick={() => {
                      setSelectedDate(detailDate);
                      setActiveAddColumn("housework");
                    }}
                  >
                    <Plus size={24} strokeWidth={2.4} />
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      </section>
    );
  }
  return (
    <section className={["page", "calendar-page", "calendar-page-" + calendarView].join(" ")}>
      <div className="calendar-filter-block">
        <h1 className="calendar-family-title">
          {isHouseCalendar ? (
            calendarOwnerTitle
          ) : (
            <>
              <span>{calendarOwnerDesignName}</span>의 캘린더
            </>
          )}
        </h1>
        <button className="calendar-notification-button" type="button" aria-label="알림" onClick={() => onOpenNotifications?.()}>
          <Bell size={19} strokeWidth={2.4} />
        </button>
        <button className="calendar-settings-button" type="button" aria-label="설정" onClick={() => onOpenPanel?.({ type: "settings" })}>
          <Settings size={22} strokeWidth={2.3} />
        </button>
        <p>일정 보기 필터</p>
        <div className="calendar-filter-row">
          <div className="profile-strip" aria-label="캘린더 일정 보기 필터">
            {familyMembers.map((member) => (
              <button
                key={member.id}
                className={!isHouseCalendar && (selectedMember === member.id || (selectedMember === "all" && member.id === selectedMemberProfile.id)) ? "active" : ""}
                aria-label={(calendarProfileNames[member.id] || member.name) + " 캘린더 보기"}
                onClick={() => {
                  closeDateDetail();
                  onActiveCalendarUserChange?.(member);
                  setSelectedMember(member.id);
                  setCalendarTaskMode("personal");
                }}
              >
                <span style={{ background: memberImages[member.id] ? "#fff" : memberColors[member.id] || member.color }}>
                  {memberImages[member.id] ? <img src={memberImages[member.id]} alt="" aria-hidden="true" /> : calendarMemberIconText[member.id] || member.short || member.name?.slice(0, 1)}
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
            <span className="family-split-avatar" aria-hidden="true">
              {familyMembers.slice(0, 3).map((member, index) => (
                <span
                  className={"family-split-part part-" + (index + 1)}
                  key={member.id}
                  style={{ "--member-color": memberColors[member.id] || member.color || "#d9d9d9" }}
                >
                  {memberImages[member.id] ? (
                    <img src={memberImages[member.id]} alt="" />
                  ) : (
                    <b>{calendarMemberIconText[member.id] || member.short || member.name?.slice(0, 1)}</b>
                  )}
                </span>
              ))}
            </span>
          </button>
        </div>
      </div>

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
          <button className="calendar-zoom-button" onClick={() => changeScale(1)} disabled={calendarScale === maxCalendarScale}>
            <Plus size={15} />
            확대
          </button>
          {canUseCalendarAdd && (
            <button className="calendar-add-button" onClick={openCalendarComposer}>
              <Plus size={18} />
              일정 추가
            </button>
          )}
        </div>
      </div>

      <section className="calendar-board">
        {!isHouseCalendar && (
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
        )}

        {!isHouseCalendar && calendarView === "week" ? (
          <WeekTimetable
            dates={displayDates}
            tasksByDate={mainCalendarTasksByDate}
            memberColors={memberColors}
            selectedDate={selectedDate}
            onPrevWeek={() => moveCalendar(-1)}
            onNextWeek={() => moveCalendar(1)}
            onSelectDate={(date) => {
              if (!canEditPersonalCalendar) return;
              setSelectedDate(date);
              setSelectedDetailDate(date);
            }}
          />
        ) : (
          <>
            {!isHouseCalendar && calendarView === "day" && (
              <DayTimelineHead selectedDate={selectedDate} onPrevDay={() => moveCalendar(-1)} onNextDay={() => moveCalendar(1)} />
            )}
            <div className={["weekdays", !isHouseCalendar && calendarView === "day" ? "day-weekday" : ""].filter(Boolean).join(" ")}>
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div
              className={[
                "month-grid",
                "calendar-scale-" + calendarScale,
                isHouseCalendar ? "calendar-house-view" : "calendar-" + calendarView + "-view",
              ].join(" ")}
              style={{ "--calendar-row-count": isHouseCalendar ? 2 : calendarView === "month" ? calendarCells.length / 7 : 1 }}
            >
              {!isHouseCalendar && calendarView !== "month" &&
                Array.from({ length: leadingBlanks }).map((_, index) => <span className="blank-day" key={index} />)}
              {calendarCells.map(({ key, day, isCurrentMonth }) => {
                const tasks = mainCalendarTasksByDate[key] || [];
                const cellTasks = getCalendarCellTasks(tasks, isHouseCalendar);
                const visibleTasks =
                  !isHouseCalendar && cellTasks.length >= CALENDAR_CELL_TASK_LIMIT
                    ? cellTasks.slice(0, CALENDAR_CELL_COLLAPSED_TASK_LIMIT)
                    : cellTasks;
                const hiddenTaskCount = cellTasks.length - visibleTasks.length;
                const weather = isHouseCalendar ? houseCalendarWeatherByDate[key] || weatherByDate[key] : weatherByDate[key];
                const hasWeatherData = Boolean(weather?.hasWeatherData);
                const shouldShowAirQuality = isHouseCalendar && key === getTodayDateKey();

                return (
                  <button
                    key={key}
                    className={["date-cell", selectedDate === key ? "selected" : "", isCurrentMonth ? "" : "outside-month"].filter(Boolean).join(" ")}
                    onClick={() => {
                      if (!isHouseCalendar && !isCurrentMonth) return;
                      if (!isHouseCalendar && !canEditPersonalCalendar) return;
                      setSelectedDate(key);
                      setSelectedDetailDate(key);
                    }}
                    disabled={!isHouseCalendar && !isCurrentMonth}
                  >
                    <strong>{day}</strong>
                    {hasWeatherData ? (
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
                            {shouldShowAirQuality && (
                              <small className="air-quality-chip">
                                미세 {houseCalendarTodayAirQuality.grade} · PM10 {houseCalendarTodayAirQuality.pm10}
                              </small>
                            )}
                          </span>
                        </>
                      </span>
                    ) : weatherApiStatus !== "loading" ? (
                      <span className="day-weather empty">
                        <em>안 받아와짐.</em>
                      </span>
                    ) : null}

                    <div className="date-tasks">
                      {isCurrentMonth && (
                        <>
                          {visibleTasks.map((task) => (
                            (() => {
                              const taskGroup = getDailyTaskGroup(task);
                              const isHousework = taskGroup === "housework";
                              const taskColor = getTaskDisplayColor(task, memberColors, isHousework ? "housework" : "personal");
                              return (
                            <i
                              className={[
                                task.tag,
                                task.displayType === "fixed" ? "fixed-event-task" : "",
                                isHousework ? "housework-task" : "",
                              ].filter(Boolean).join(" ")}
                              key={task.id}
                              style={{ "--task-bg": taskColor, "--task-fg": getReadableTextColor(taskColor) }}
                            >
                              <span>{getCalendarCellTaskLabel(task)}</span>
                              {isExpanded && (
                                <small>
                                  {task.place} · {task.repeat}
                                </small>
                              )}
                            </i>
                              );
                            })()
                          ))}
                          {hiddenTaskCount > 0 && <span className="more-tasks">+{hiddenTaskCount}</span>}
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

      {(isHouseCalendar || calendarView === "month") && (
        <section className="calendar-ai-report" aria-label="AI Report">
          <h3>Daily AI Report</h3>
          <div>
            <p>{buildAiReport(selectedDate, selectedVisibleTasks, mainCalendarTasksByDate)}</p>
            <img src={aiDailyReportImage} alt="" aria-hidden="true" />
            <div className="calendar-ai-report-tags" aria-hidden="true">
              {buildAiReportTags(selectedDate, selectedVisibleTasks, mainCalendarTasksByDate).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
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

        {selectedWeather?.hasWeatherData ? (
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
        ) : shouldShowWeatherMissing ? (
          <div className="selected-weather-summary empty">
            <strong>안 받아와짐.</strong>
          </div>
        ) : null}

        {selectedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={getDisplayTask(task)}
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

function SchedulePlanningLoadingPage({ pendingSave, onComplete }) {
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timer = window.setTimeout(() => onCompleteRef.current(pendingSave), SCHEDULE_PLANNING_DELAY);
    return () => window.clearTimeout(timer);
  }, [pendingSave]);

  return (
    <section className="page calendar-page schedule-loading-page" aria-live="polite" aria-label="AI 일정 생성 중">
      <div className="schedule-loading-stage" aria-hidden="true">
        <div className="schedule-loading-orbit">
          <span />
          <span />
          <span />
        </div>
        <img className="schedule-loading-character" src={lgCharacterImage} alt="" />
      </div>

      <div className="schedule-loading-copy">
        <span>AI 루틴 정리 중</span>
        <strong>새로운 하루 계획을 만드는 중</strong>
        <p>입력한 일정을 반영해 AI가 가사 계획을 다시 정리하고 있어요</p>
        <div className="schedule-loading-progress" aria-hidden="true">
          <i />
        </div>
      </div>
    </section>
  );
}

function getHouseworkApplianceOptions(ownerId, applianceAssignees = {}) {
  const options = [
    { id: "washer", type: "WASHER", label: "세탁기" },
    { id: "dryer", type: "DRYER", label: "건조기" },
    { id: "dishwasher", type: "DISHWASHER", label: "식기세척기" },
    { id: "robot", type: "ROBOT_CLEANER", label: "로봇청소기" },
    { id: "air-purifier", type: "AIR_PURIFIER", label: "공기청정기" },
    { id: "air-living", type: "AIR_CONDITIONER", label: "거실 에어컨" },
    { id: "air-sumin", type: "AIR_CONDITIONER", label: "수민 에어컨", room: "수민 방" },
    { id: "air-dabin", type: "AIR_CONDITIONER", label: "다빈 에어컨", room: "다빈 방" },
    { id: "air-jaehyeok", type: "AIR_CONDITIONER", label: "재혁 에어컨", room: "재혁 방" },
  ];
  const hasAssigneeSetting = Object.values(applianceAssignees || {}).some(Boolean);
  if (!ownerId || !hasAssigneeSetting) return options;

  return options.filter((option) => applianceAssignees[option.id] === ownerId);
}

function getDefaultApplianceModeLabel(applianceType) {
  return applianceModeCatalog[applianceType]?.modes?.[0]?.label || "자동";
}

function DailyScheduleAddPage({ selectedDate, selectedMember, scheduleType = "personal", houseworkOwnerId, applianceAssignees = {}, onClose, onSave, onApplianceColorChange }) {
  const parsedDate = parseDateKey(selectedDate);
  const initialOwner = scheduleType === "housework" ? houseworkOwnerId || selectedMember || DABIN_TASK_OWNER : selectedMember || DABIN_TASK_OWNER;
  const isHouseworkSchedule = scheduleType === "housework";
  const applianceOptions = getHouseworkApplianceOptions(houseworkOwnerId, applianceAssignees);
  const applianceOptionKey = applianceOptions.map((option) => option.id).join("|");
  const colorOptions = scheduleColorOptions;
  const initialApplianceType = applianceOptions[0]?.type || "ETC";
  const [title, setTitle] = useState(isHouseworkSchedule ? applianceOptions[0]?.label || "" : "");
  const [applianceOptionId, setApplianceOptionId] = useState(applianceOptions[0]?.id || "washer");
  const [isApplianceOpen, setApplianceOpen] = useState(false);
  const [color, setColor] = useState(isHouseworkSchedule ? applianceTypeColor[initialApplianceType] || colorOptions[1] : colorOptions[1]);
  const [isColorOpen, setColorOpen] = useState(false);
  const [isAllDay, setAllDay] = useState(false);
  const [startMonth, setStartMonth] = useState(parsedDate.month);
  const [startDay, setStartDay] = useState(parsedDate.day);
  const [endMonth, setEndMonth] = useState(parsedDate.month);
  const [endDay, setEndDay] = useState(parsedDate.day);
  const [startTime, setStartTime] = useState(DAILY_TIMETABLE_START_TIME);
  const [endTime, setEndTime] = useState("07:00");
  const [error, setError] = useState("");
  const selectedAppliance = applianceOptions.find((option) => option.id === applianceOptionId) || applianceOptions[0];
  const fixedApplianceColor = applianceTypeColor[selectedAppliance?.type] || colorOptions[1];
  const selectedColor = isHouseworkSchedule ? color || fixedApplianceColor : color;
  const applianceSelectLabel = selectedAppliance?.label || (isHouseworkSchedule ? "담당 가전 없음" : "");

  useEffect(() => {
    if (!isHouseworkSchedule) return;
    if (!applianceOptions.length) {
      setApplianceOptionId("");
      setTitle("");
      setColor(colorOptions[1]);
      return;
    }
    if (applianceOptions.some((option) => option.id === applianceOptionId)) return;

    const nextOption = applianceOptions[0];
    setApplianceOptionId(nextOption.id);
    setTitle(nextOption.label);
    setColor(applianceTypeColor[nextOption.type] || colorOptions[1]);
  }, [applianceOptionKey, applianceOptionId, colorOptions, isHouseworkSchedule]);

  function saveSchedule() {
    const applianceType = selectedAppliance?.type || "ETC";
    const trimmedTitle = isHouseworkSchedule ? selectedAppliance?.label || "" : title.trim();
    if (!trimmedTitle) {
      setError(isHouseworkSchedule ? "담당 가전이 없어요. 설정에서 담당 가전을 먼저 지정해 주세요." : "제목을 입력해 주세요.");
      return;
    }

    const startDate = dateKey(parsedDate.year, startMonth, startDay);
    const endDate = dateKey(parsedDate.year, endMonth, endDay);
    if (isInvalidScheduleTime(startDate, endDate, startTime, endTime, isAllDay)) {
      setError("종료 시간은 시작 시간보다 늦어야 해요.");
      return;
    }

    const scheduleDates = orderScheduleDates(startDate, endDate);
    if (isHouseworkSchedule && selectedColor !== fixedApplianceColor) {
      onApplianceColorChange?.(applianceType, selectedColor);
    }
    onSave({
      date: scheduleDates.date,
      title: trimmedTitle,
      place: scheduleType === "housework" ? selectedAppliance?.room || "가사 일정" : "개인 일정",
      tag: scheduleType === "housework" ? "house" : "plan",
      owner: initialOwner,
      done: false,
      repeat: isAllDay ? "하루종일" : startTime + " ~ " + endTime,
      source: "manual",
      color: selectedColor,
      endDate: scheduleDates.endDate,
      displayType: isHouseworkSchedule ? "appliance" : "manual",
      applianceType: isHouseworkSchedule ? applianceType : undefined,
      applianceMode: isHouseworkSchedule ? getDefaultApplianceModeLabel(applianceType) : undefined,
      currentMode: isHouseworkSchedule ? getDefaultApplianceModeLabel(applianceType) : undefined,
    });
  }

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
          <label htmlFor="daily-add-title">{isHouseworkSchedule ? "작동시킬 가전" : "제목"}</label>
          <div className={["daily-add-title-input", error ? "invalid" : ""].filter(Boolean).join(" ")}>
            {isHouseworkSchedule ? (
              <div
                className={["daily-appliance-select", isApplianceOpen ? "open" : ""].filter(Boolean).join(" ")}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setApplianceOpen(false);
                }}
              >
                <button id="daily-add-title" type="button" onClick={() => setApplianceOpen((current) => !current)} aria-expanded={isApplianceOpen}>
                  <span>{applianceSelectLabel}</span>
                  <ChevronDown size={16} strokeWidth={2.5} />
                </button>
                {isApplianceOpen && (
                  <div className="daily-appliance-options" role="listbox" aria-label="작동시킬 가전 선택">
                    {applianceOptions.length === 0 ? (
                      <p className="daily-appliance-empty">담당 가전이 없어요</p>
                    ) : applianceOptions.map((option) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={option.id === applianceOptionId}
                        className={option.id === applianceOptionId ? "active" : ""}
                        key={option.id}
                        onClick={() => {
                          setApplianceOptionId(option.id);
                          setTitle(option.label);
                          setColor(applianceTypeColor[option.type] || colorOptions[1]);
                          setError("");
                          setApplianceOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <input
                id="daily-add-title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setError("");
                }}
                placeholder="제목을 입력해 주세요."
                aria-invalid={Boolean(error)}
                autoFocus
              />
            )}
            {isHouseworkSchedule ? (
              <button
                type="button"
                className="daily-color-button appliance-color-button"
                style={{ "--selected-color": selectedColor }}
                aria-label={selectedColor === fixedApplianceColor ? "가전 고정 색상 변경" : "가전 변경 색상 변경"}
                title={selectedColor === fixedApplianceColor ? "고정 색상" : "변경된 색상"}
                onClick={() => setColorOpen((current) => !current)}
              />
            ) : (
              <button type="button" className="daily-color-button" style={{ "--selected-color": color }} aria-label="색상 변경" onClick={() => setColorOpen((current) => !current)} />
            )}
          </div>
          {error && <p className="daily-add-error">{error}</p>}
          {isColorOpen && (
            <div className="daily-color-popover" aria-label="색상 변경">
              {colorOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === selectedColor ? "active" : ""}
                  style={{ "--option-color": option }}
                  aria-label={option + " 선택"}
                  onClick={() => {
                    if (isHouseworkSchedule && option !== fixedApplianceColor && option !== selectedColor) {
                      const applianceLabel = selectedAppliance?.label || applianceTypeLabel[selectedAppliance?.type] || "해당";
                      const shouldUpdateAll = window.confirm(`${applianceLabel} 가전의 전체 캘린더 색상을 바꾸겠습니까?`);
                      if (!shouldUpdateAll) return;
                    }
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
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(event) => {
                setAllDay(event.target.checked);
                setError("");
              }}
            />
            <i aria-hidden="true" />
          </label>

          <div className="daily-date-row">
            <strong>기간</strong>
            <DailyCalendarDatePicker
              label="시작 날짜"
              value={dateKey(parsedDate.year, startMonth, startDay)}
              onChange={(value) => {
                const next = parseDateKey(value);
                setStartMonth(next.month);
                setStartDay(next.day);
                setError("");
              }}
            />
            <span>~</span>
            <DailyCalendarDatePicker
              label="종료 날짜"
              value={dateKey(parsedDate.year, endMonth, endDay)}
              onChange={(value) => {
                const next = parseDateKey(value);
                setEndMonth(next.month);
                setEndDay(next.day);
                setError("");
              }}
            />
          </div>

          <div className={["daily-time-row", isAllDay ? "disabled" : ""].filter(Boolean).join(" ")}>
            <strong>시간</strong>
            <DailyScrollTimePicker
              label="시작 시간"
              value={startTime}
              disabled={isAllDay}
              onChange={(value) => {
                setStartTime(value);
                setError("");
              }}
            />
            <span>~</span>
            <DailyScrollTimePicker
              label="종료 시간"
              value={endTime}
              disabled={isAllDay}
              onChange={(value) => {
                setEndTime(value);
                setError("");
              }}
            />
          </div>
        </section>
      </form>
    </section>
  );
}

function DailyScheduleEditPage({ task, selectedDate, onClose, onSave, onApplianceColorChange }) {
  const parsedDate = parseDateKey(task.date || selectedDate);
  const parsedEndDate = parseDateKey(task.endDate || task.date || selectedDate);
  const colorOptions = scheduleColorOptions;
  const initialTime = getEditableTaskTime(task);
  const isHouseworkTask = getDailyTaskGroup(task) === "housework";
  const fixedApplianceColor = task.applianceType ? applianceTypeColor[task.applianceType] : "";
  const applianceLabel = task.applianceType ? applianceTypeLabel[task.applianceType] || task.title || "해당" : task.title || "해당";
  const [title, setTitle] = useState(task.title || "");
  const [color, setColor] = useState(normalizeScheduleColor(task.color) || fixedApplianceColor || colorOptions[1]);
  const [isColorOpen, setColorOpen] = useState(false);
  const [pendingApplianceColor, setPendingApplianceColor] = useState(null);
  const [isAllDay, setAllDay] = useState(initialTime.isAllDay);
  const [startMonth, setStartMonth] = useState(parsedDate.month);
  const [startDay, setStartDay] = useState(parsedDate.day);
  const [endMonth, setEndMonth] = useState(parsedEndDate.month);
  const [endDay, setEndDay] = useState(parsedEndDate.day);
  const [startTime, setStartTime] = useState(initialTime.startTime);
  const [endTime, setEndTime] = useState(initialTime.endTime);
  const [error, setError] = useState("");

  function saveSchedule() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("제목을 입력해 주세요.");
      return;
    }

    const startDate = dateKey(parsedDate.year, startMonth, startDay);
    const endDate = dateKey(parsedDate.year, endMonth, endDay);
    if (isInvalidScheduleTime(startDate, endDate, startTime, endTime, isAllDay)) {
      setError("종료 시간은 시작 시간보다 늦어야 해요.");
      return;
    }

    const scheduleDates = orderScheduleDates(startDate, endDate);
    if (pendingApplianceColor && task.applianceType) {
      onApplianceColorChange?.(task.applianceType, pendingApplianceColor);
    }
    onSave({
      title: trimmedTitle,
      date: scheduleDates.date,
      color,
      endDate: scheduleDates.endDate,
      repeat: isAllDay ? "하루종일" : startTime + " ~ " + endTime,
    });
  }

  return (
    <section className="page calendar-page daily-add-page daily-edit-page">
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
          <h2>일정 수정</h2>
          <button type="button" onClick={saveSchedule}>저장</button>
        </div>

        <section className="daily-add-title-section">
          <label htmlFor="daily-edit-title">제목</label>
          <div className={["daily-add-title-input", error ? "invalid" : ""].filter(Boolean).join(" ")}>
            <input
              id="daily-edit-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError("");
              }}
              placeholder="제목을 입력해 주세요."
              aria-invalid={Boolean(error)}
              autoFocus
            />
            <button
              type="button"
              className="daily-color-button"
              style={{ "--selected-color": color }}
              aria-label="색상 변경"
              onClick={() => setColorOpen((current) => !current)}
            />
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
                    if (isHouseworkTask && task.applianceType && option !== color) {
                      if (fixedApplianceColor && option !== fixedApplianceColor) {
                        const shouldUpdateAll = window.confirm(`${applianceLabel} 가전의 전체 캘린더 색상을 바꾸겠습니까?`);
                        if (!shouldUpdateAll) return;
                      }
                      setPendingApplianceColor(option);
                    }
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
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(event) => {
                setAllDay(event.target.checked);
                setError("");
              }}
            />
            <i aria-hidden="true" />
          </label>

          <div className="daily-date-row">
            <strong>기간</strong>
            <DailyCalendarDatePicker
              label="시작 날짜"
              value={dateKey(parsedDate.year, startMonth, startDay)}
              onChange={(value) => {
                const next = parseDateKey(value);
                setStartMonth(next.month);
                setStartDay(next.day);
                setError("");
              }}
            />
            <span>~</span>
            <DailyCalendarDatePicker
              label="종료 날짜"
              value={dateKey(parsedDate.year, endMonth, endDay)}
              onChange={(value) => {
                const next = parseDateKey(value);
                setEndMonth(next.month);
                setEndDay(next.day);
                setError("");
              }}
            />
          </div>

          <div className={["daily-time-row", isAllDay ? "disabled" : ""].filter(Boolean).join(" ")}>
            <strong>시간</strong>
            <DailyScrollTimePicker
              label="시작 시간"
              value={startTime}
              disabled={isAllDay}
              onChange={(value) => {
                setStartTime(value);
                setError("");
              }}
            />
            <span>~</span>
            <DailyScrollTimePicker
              label="종료 시간"
              value={endTime}
              disabled={isAllDay}
              onChange={(value) => {
                setEndTime(value);
                setError("");
              }}
            />
          </div>
        </section>
      </form>
    </section>
  );
}

function DailyScrollTimePicker({ label, value, disabled = false, onChange }) {
  const [isOpen, setOpen] = useState(false);
  const normalizedValue = normalizeDailyPickerTime(value);
  const [hour, minute] = normalizedValue.split(":");
  const hours = Array.from({ length: DAILY_TIMETABLE_END_HOUR - DAILY_TIMETABLE_START_HOUR }, (_, index) =>
    String(DAILY_TIMETABLE_START_HOUR + index).padStart(2, "0"),
  );
  const minutes = buildDailyPickerMinutes(minute);

  return (
    <div
      className={["daily-scroll-time-picker", isOpen ? "open" : "", disabled ? "disabled" : ""].filter(Boolean).join(" ")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button type="button" className="daily-scroll-time-display" disabled={disabled} onClick={() => setOpen((current) => !current)} aria-expanded={isOpen}>
        <span>{formatDailyPickerTime(normalizedValue)}</span>
        <Clock3 size={14} strokeWidth={2.4} />
      </button>
      {isOpen && !disabled && (
        <div className="daily-scroll-time-panel" aria-label={label}>
          <div className="daily-scroll-time-column" role="listbox" aria-label="시">
            {hours.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={hour === option}
                className={hour === option ? "active" : ""}
                onClick={() => onChange?.(`${option}:${minute}`)}
              >
                {Number(option)}시
              </button>
            ))}
          </div>
          <div className="daily-scroll-time-column" role="listbox" aria-label="분">
            {minutes.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={minute === option}
                className={minute === option ? "active" : ""}
                onClick={() => onChange?.(`${hour}:${option}`)}
              >
                {option}분
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DailyCalendarDatePicker({ label, value, onChange }) {
  const [isOpen, setOpen] = useState(false);
  const selected = parseDateKey(value);
  const [viewDate, setViewDate] = useState(() => new Date(selected.year, selected.month - 1, 1));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1;
  const daysInMonth = getDaysInMonth(year, month);
  const leadingBlanks = new Date(year, month - 1, 1).getDay();
  const cells = [
    ...Array.from({ length: leadingBlanks }, (_, index) => ({ key: `blank-${index}`, day: "", date: "" })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = dateKey(year, month, day);
      return { key: date, day, date };
    }),
  ];

  useEffect(() => {
    const next = parseDateKey(value);
    setViewDate(new Date(next.year, next.month - 1, 1));
  }, [value]);

  function moveMonth(offset) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <div
      className={["daily-calendar-date-picker", isOpen ? "open" : ""].filter(Boolean).join(" ")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button type="button" className="daily-calendar-date-display" onClick={() => setOpen((current) => !current)} aria-expanded={isOpen}>
        <span>{formatDailyPickerDate(value)}</span>
        <CalendarDays size={14} strokeWidth={2.4} />
      </button>
      {isOpen && (
        <div className="daily-calendar-date-panel" aria-label={label}>
          <div className="daily-calendar-date-head">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달">
              <ChevronLeft size={15} />
            </button>
            <strong>
              {year}년 {month}월
            </strong>
            <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="daily-calendar-date-weekdays" aria-hidden="true">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="daily-calendar-date-grid">
            {cells.map((cell) =>
              cell.date ? (
                <button
                  key={cell.key}
                  type="button"
                  className={cell.date === value ? "active" : ""}
                  onClick={() => {
                    onChange?.(cell.date);
                    setOpen(false);
                  }}
                >
                  {cell.day}
                </button>
              ) : (
                <span key={cell.key} />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDailyPickerDate(value) {
  const parsed = parseDateKey(value);
  return `${parsed.month}월 ${parsed.day}일`;
}

function normalizeDailyPickerTime(value) {
  const match = String(value || DAILY_TIMETABLE_START_TIME).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return DAILY_TIMETABLE_START_TIME;
  const hour = Math.max(DAILY_TIMETABLE_START_HOUR, Math.min(DAILY_TIMETABLE_END_HOUR - 1, Number(match[1])));
  const minute = Math.max(0, Math.min(59, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function buildDailyPickerMinutes(currentMinute) {
  return Array.from(new Set([...["00", "10", "20", "30", "40", "50"], currentMinute])).sort((first, second) => Number(first) - Number(second));
}

function formatDailyPickerTime(value) {
  const [hourText, minute] = normalizeDailyPickerTime(value).split(":");
  const hour = Number(hourText);
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${period} ${String(displayHour).padStart(2, "0")}:${minute}`;
}

function orderScheduleDates(date, endDate) {
  return date <= endDate ? { date, endDate } : { date: endDate, endDate: date };
}

function isInvalidScheduleTime(startDate, endDate, startTime, endTime, isAllDay) {
  if (isAllDay) return false;
  if (!startDate || !endDate || !startTime || !endTime) return true;
  if (startDate !== endDate) return false;
  return timeToMinutes(startTime) >= timeToMinutes(endTime);
}

function timeToMinutes(time) {
  const [hour, minute] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

function DailyTimeRail({ hours }) {
  return (
    <section className="daily-time-rail" aria-label="Time">
      <strong>시간</strong>
      <div className="daily-time-scale" style={{ "--hour-count": hours.length - 1 }}>
        {hours.map((hour, index) => (
          <span
            key={hour}
            className={index === 0 ? "start" : index === hours.length - 1 ? "end" : ""}
            style={{ "--hour-index": index }}
          >
            {formatDailyHour(hour)}
          </span>
        ))}
      </div>
    </section>
  );
}

function getDailyContextMenuPosition(anchor) {
  if (!anchor?.getBoundingClientRect) return null;

  const rect = anchor.getBoundingClientRect();
  const menuWidth = 76;
  const menuHeight = 82;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 390;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720;
  const openToRight = rect.right + menuWidth + 10 <= viewportWidth;
  const left = openToRight ? rect.right + 8 : Math.max(8, rect.left - menuWidth - 8);
  const top = Math.min(Math.max(8, rect.top), Math.max(8, viewportHeight - menuHeight - 8));

  return { left, top };
}

function getDailyContextMenuStyle(position) {
  if (!position) return undefined;

  return {
    "--context-menu-left": `${position.left}px`,
    "--context-menu-top": `${position.top}px`,
  };
}

function DailyTimetableColumn({ title, tasks, hours, memberColors, variant, activeTaskId, activeAction, contextMenuPosition, onOpenContext, onChooseContextAction, onOpenModeChange }) {
  const startHour = hours[0] ?? DAILY_TIMETABLE_START_HOUR;
  const endHour = hours[hours.length - 1] ?? DAILY_TIMETABLE_END_HOUR;
  const totalMinutes = Math.max(60, (endHour - startHour) * 60);
  const displayStartMinutes = startHour * 60;
  const displayEndMinutes = endHour * 60;
  const blockLayouts = layoutDailyTimetableTasks(tasks, displayStartMinutes, displayEndMinutes, totalMinutes);

  return (
    <section className={["daily-timetable-column", variant].filter(Boolean).join(" ")} aria-label={title}>
      <strong>{title}</strong>
      <div className="daily-timetable-track" style={{ "--hour-count": hours.length - 1 }}>
        {hours.slice(0, -1).map((hour, index) => (
          <span className="daily-timetable-line" key={hour} style={{ "--line-index": index }} />
        ))}
        {blockLayouts.map(({ task, index, range, top, height, lane, laneCount }) => {
          const color = getDailyBlockColor(task, memberColors, variant, index);
          const taskKey = getDailyTaskKey(task);

          return (
            <article
              className={["daily-time-block", activeTaskId === taskKey ? "context-open" : ""].filter(Boolean).join(" ")}
              key={taskKey}
              role="button"
              tabIndex={0}
              style={{
                "--block-top": Math.max(0, Math.min(96, top)) + "%",
                "--block-height": Math.min(100, height) + "%",
                "--block-color": color,
                "--block-lane": lane,
                "--block-lane-count": laneCount,
              }}
              onContextMenu={(event) => {
                onOpenContext?.(task, event);
              }}
              onPointerDown={(event) => {
                if (event.target.closest(".daily-context-menu")) return;
                onOpenContext?.(task, event);
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
              {activeTaskId === taskKey && (
                <div
                  className="daily-context-menu"
                  role="menu"
                  aria-label={task.title + " options"}
                  style={getDailyContextMenuStyle(contextMenuPosition)}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className={activeAction === "edit" ? "active" : ""}
                    role="menuitem"
                    onClick={(event) => {
                      event.stopPropagation();
                      onChooseContextAction?.("edit", task);
                    }}
                  >
                    수정
                  </button>
                  {variant === "housework" ? (
                    <button
                      type="button"
                      className={activeAction === "mode" ? "active" : ""}
                      role="menuitem"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenModeChange?.(task);
                      }}
                    >
                      모드
                    </button>
                  ) : (
                    <button type="button" className="disabled" role="menuitem" disabled aria-disabled="true">
                      복사
                    </button>
                  )}
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
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DailyListColumn({ title, tasks, memberColors, variant, activeTaskId, activeAction, contextMenuPosition, onOpenContext, onChooseContextAction, onOpenModeChange }) {
  return (
    <section className={["daily-list-column", variant].filter(Boolean).join(" ")} aria-label={title}>
      <strong>{title}</strong>
      <div>
        {tasks.length === 0 ? (
          <p>등록된 일정이 없습니다.</p>
        ) : (
          tasks.map((task, index) => {
            const range = getDailyTaskRange(task, index);
            const color = getDailyBlockColor(task, memberColors, variant, index);
            const taskKey = getDailyTaskKey(task);

            return (
              <article
                className={["daily-list-task", activeTaskId === taskKey ? "context-open" : ""].filter(Boolean).join(" ")}
                key={taskKey}
                role="button"
                tabIndex={0}
                style={{ "--block-color": color }}
                onPointerDown={(event) => {
                  if (event.target.closest(".daily-context-menu")) return;
                  onOpenContext?.(task, event);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenContext?.(task);
                  }
                }}
              >
                <time>{formatBlockStartTime(range)}</time>
                <div className="daily-list-task-card">
                  <strong>{getDailyBlockTitle(task, variant)}</strong>
                  <span>{formatTaskRange(range)}</span>
                </div>
                {activeTaskId === taskKey && (
                  <div
                    className="daily-context-menu"
                    role="menu"
                    aria-label={task.title + " options"}
                    style={getDailyContextMenuStyle(contextMenuPosition)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className={activeAction === "edit" ? "active" : ""}
                      role="menuitem"
                      onClick={(event) => {
                        event.stopPropagation();
                        onChooseContextAction?.("edit", task);
                      }}
                    >
                      수정
                    </button>
                    {variant === "housework" ? (
                      <button
                        type="button"
                        className={activeAction === "mode" ? "active" : ""}
                        role="menuitem"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenModeChange?.(task);
                        }}
                      >
                        모드
                      </button>
                    ) : (
                      <button type="button" className="disabled" role="menuitem" disabled aria-disabled="true">
                        복사
                      </button>
                    )}
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
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function ApplianceModePage({ task, selectedModeId, message, nearestRunText, onSelectMode, onApply, onClose }) {
  const applianceType = normalizeApplianceType(task);
  const catalog = applianceModeCatalog[applianceType] || applianceModeCatalog.ETC;
  const applianceName = applianceTypeLabel[applianceType] || task.title || "가전";
  const modes = catalog.modes;
  const selectedMode = modes.find((mode) => mode.id === selectedModeId) || modes[0];
  const currentMode = task.applianceMode || task.currentMode || selectedMode?.label || modes[0]?.label || "자동";
  const image = getApplianceModeImage(applianceType);
  const isDryer = applianceType === "DRYER";
  const [isPowerOn, setPowerOn] = useState(false);
  const [isModeMenuOpen, setModeMenuOpen] = useState(false);
  const [rinseCount, setRinseCount] = useState(2);
  const [spinLevel, setSpinLevel] = useState("강");
  const [waterTemp, setWaterTemp] = useState(40);
  const [ecoMode, setEcoMode] = useState("자동");
  const [dryLevel, setDryLevel] = useState("표준");
  const [washCourse, setWashCourse] = useState(currentMode);
  const [careEnabled, setCareEnabled] = useState(false);
  const [options, setOptions] = useState(() => getApplianceModeOptions(applianceType));
  const [activeTab, setActiveTab] = useState("product");
  const [statusText, setStatusText] = useState("");

  function selectMode(mode) {
    onSelectMode(mode.id);
    setWashCourse(mode.label);
    setModeMenuOpen(false);
    setStatusText(`${mode.label} 코스로 변경했어요.`);
  }

  function toggleOption(label) {
    setOptions((current) => current.map((option) => (option.label === label ? { ...option, active: !option.active } : option)));
  }

  function sendToAppliance() {
    onApply(selectedMode);
    setPowerOn(true);
    setStatusText(`${applianceName}에 설정을 전송했어요.`);
  }

  function reserveCourse() {
    setStatusText(nearestRunText || "가까운 실행 예정 일정이 없어요.");
  }

  return (
    <section className={["page", "calendar-page", "washer-control-page", isDryer ? "dryer-control-page" : ""].filter(Boolean).join(" ")} aria-label={`${applianceName} 작동 설정`}>
      <header className="washer-control-head">
        <button type="button" aria-label="뒤로가기" onClick={onClose}>
          <ChevronLeft size={30} strokeWidth={2.2} />
        </button>
        <h2>{applianceName}</h2>
        <div>
          <button type="button" aria-label="홈 보기" onClick={() => setStatusText("홈 화면 버튼을 눌렀어요.")}>
            <Home size={26} strokeWidth={2.1} />
          </button>
          <button type="button" aria-label="설정" className="washer-settings-button" onClick={() => setStatusText("설정 버튼을 눌렀어요.")}>
            <Settings size={30} strokeWidth={2.4} />
          </button>
        </div>
      </header>

      <div className="washer-hero">
        <img src={image} alt="" aria-hidden="true" />
        <span>
          원격제어 꺼짐
          <Info size={15} strokeWidth={2.3} />
        </span>
      </div>

      <section className="washer-course-section" aria-label={`${applianceName} 코스`}>
        <div className="washer-course-row">
          <div className="washer-mode-picker">
            <button type="button" aria-expanded={isModeMenuOpen} onClick={() => setModeMenuOpen((current) => !current)}>
              {selectedMode?.label || washCourse || currentMode}
              <ChevronDown size={24} strokeWidth={2.5} />
            </button>
            {isModeMenuOpen && (
              <div className="washer-mode-menu">
                {modes.map((mode) => (
                  <button type="button" key={mode.id} className={mode.id === selectedMode?.id ? "active" : ""} onClick={() => selectMode(mode)}>
                    {mode.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className={["washer-power-button", isPowerOn ? "active" : ""].filter(Boolean).join(" ")} aria-label="전원" onClick={() => setPowerOn((current) => !current)}>
            <Power size={40} strokeWidth={2.1} />
          </button>
        </div>

        {isDryer ? (
          <div className="washer-setting-grid dryer-setting-grid">
            <button type="button" className="washer-setting-card dryer-saving" onClick={() => setEcoMode((current) => (current === "자동" ? "켜짐" : current === "켜짐" ? "꺼짐" : "자동"))}>
              <Shirt size={50} strokeWidth={2.2} />
              <span>절약모드</span>
              <strong>{ecoMode}</strong>
            </button>
            <button type="button" className="washer-setting-card dryer-level" onClick={() => setDryLevel((current) => (current === "표준" ? "강력" : current === "강력" ? "약" : "표준"))}>
              <Shirt size={50} strokeWidth={2.2} />
              <span>
                건조정도
                <i aria-hidden="true" />
              </span>
              <strong>{dryLevel}</strong>
            </button>
          </div>
        ) : (
          <>
            <div className="washer-setting-grid">
              <button type="button" className="washer-setting-card rinse" onClick={() => setRinseCount((current) => (current >= 5 ? 1 : current + 1))}>
                <Shirt size={50} strokeWidth={2.2} />
                <span>헹굼</span>
                <strong>{rinseCount}회</strong>
              </button>
              <button type="button" className="washer-setting-card spin" onClick={() => setSpinLevel((current) => (current === "강" ? "중" : current === "중" ? "약" : "강"))}>
                <Waves size={50} strokeWidth={2.2} />
                <span>탈수</span>
                <strong>{spinLevel}</strong>
              </button>
              <button type="button" className="washer-setting-card temp" onClick={() => setWaterTemp((current) => (current >= 60 ? 20 : current + 10))}>
                <Thermometer size={50} strokeWidth={2.2} />
                <span>물온도</span>
                <strong>{waterTemp}도</strong>
              </button>
            </div>

            <button type="button" className="washer-cycle-card" onClick={() => setStatusText("세탁 단계 상세를 눌렀어요.")}>
              <Shirt size={50} strokeWidth={2.2} />
              <span>세탁</span>
              <strong>{washCourse || selectedMode?.label || "표준"}</strong>
            </button>
          </>
        )}

        <button type="button" className="washer-send-button" onClick={sendToAppliance}>
          {applianceName}에 전송
        </button>

        <button type="button" className="washer-reserve-button" onClick={reserveCourse}>
          <Clock3 size={25} strokeWidth={2.3} />
          {nearestRunText || "가까운 실행 예정 일정이 없어요."}
        </button>
      </section>

      <section className="washer-care-card" aria-label="종료 후 세탁물 케어">
        <WashingMachine size={31} strokeWidth={2.2} />
        <div>
          <strong>
            종료 후 세탁물 케어
            <i aria-hidden="true" />
          </strong>
          <span>원격제어를 켠 뒤 사용할 수 있어요.</span>
        </div>
        <button type="button" onClick={() => setCareEnabled((current) => !current)}>
          {careEnabled ? "켜짐" : "꺼짐"}
        </button>
      </section>

      <section className={["washer-option-list", isDryer ? "dryer-option-list" : ""].filter(Boolean).join(" ")} aria-label="제품 기능">
        {options.map((option) => (
          <button type="button" className="washer-option-row" key={option.label} onClick={() => toggleOption(option.label)}>
            <span className="washer-option-icon">{getWasherOptionIcon(option.label)}</span>
            <strong>{option.label}</strong>
            {isDryer ? (
              <span className="dryer-option-state">
                {option.active ? "켜짐" : "꺼짐"}
                <ChevronRight size={25} strokeWidth={2.6} />
              </span>
            ) : (
              <i className={option.active ? "active" : ""} aria-hidden="true" />
            )}
          </button>
        ))}
      </section>

      <p className="washer-mode-feedback" aria-live="polite">
        {statusText || message || "ThinQ API 없이 mock 데이터로 버튼 동작을 구성했어요."}
      </p>

      <nav className="washer-bottom-tabs" aria-label="세탁기 보기 전환">
        <button type="button" className={activeTab === "product" ? "active" : ""} onClick={() => setActiveTab("product")}>
          제품
        </button>
        <button type="button" className={activeTab === "features" ? "active" : ""} onClick={() => setActiveTab("features")}>
          유용한 기능
        </button>
      </nav>
    </section>
  );
}

function getWasherOptionIcon(label) {
  if (label === "터보샷") return <Waves size={26} strokeWidth={2.5} />;
  if (label === "알림") return <Bell size={25} strokeWidth={2.4} />;
  if (label === "구김방지") return <Shirt size={25} strokeWidth={2.3} />;
  return <SlidersHorizontal size={24} strokeWidth={2.3} />;
}

function getApplianceModeOptions(applianceType) {
  const common = [
    { label: "터보샷", icon: "T", active: true },
    { label: "알림", icon: "!", active: false },
    { label: "구김방지", icon: "G", active: false },
  ];

  if (applianceType === "DRYER") {
    return [
      { label: "다림질알림", icon: "I", active: false },
      { label: "구김방지", icon: "G", active: false },
    ];
  }

  if (applianceType === "AIR_CONDITIONER") {
    return [
      { label: "절전", icon: "E", active: true },
      { label: "쾌적 절전", icon: "Q", active: false },
      { label: "예약", icon: "R", active: false },
    ];
  }

  if (applianceType === "ROBOT_CLEANER") {
    return [
      { label: "흡입 세기", icon: "S", active: true },
      { label: "물걸레", icon: "M", active: false },
      { label: "예약", icon: "R", active: true },
    ];
  }

  if (applianceType === "REFRIGERATOR") {
    return [
      { label: "절전", icon: "E", active: true },
      { label: "급속 냉동", icon: "F", active: false },
      { label: "문 열림 알림", icon: "!", active: true },
    ];
  }

  return common;
}

function buildDailyHours(tasks) {
  return Array.from(
    { length: DAILY_TIMETABLE_END_HOUR - DAILY_TIMETABLE_START_HOUR + 1 },
    (_, index) => DAILY_TIMETABLE_START_HOUR + index,
  );
}

function normalizeApplianceType(task = {}) {
  const rawType = String(task.applianceType || "").toUpperCase();
  if (applianceModeCatalog[rawType]) return rawType;

  const text = [task.title, task.place, task.description].filter(Boolean).join(" ");
  if (/세탁|빨래|washer/i.test(text)) return "WASHER";
  if (/건조|dryer/i.test(text)) return "DRYER";
  if (/로봇|청소|robot|cleaner/i.test(text)) return "ROBOT_CLEANER";
  if (/에어컨|냉방|air\s*conditioner/i.test(text)) return "AIR_CONDITIONER";
  if (/공기청정|청정기|purifier/i.test(text)) return "AIR_PURIFIER";
  if (/식기|세척|dish/i.test(text)) return "DISHWASHER";
  if (/냉장|냉동|fridge|refrigerator/i.test(text)) return "REFRIGERATOR";
  if (/가습|humidifier/i.test(text)) return "HUMIDIFIER";
  return "ETC";
}

function getApplianceModeImage(applianceType) {
  if (applianceType === "WASHER") return applianceImages.washer;
  if (applianceType === "DRYER") return applianceImages.dryer;
  if (applianceType === "AIR_CONDITIONER") return applianceImages.air;
  if (applianceType === "REFRIGERATOR") return applianceImages.fridge;
  return lgCharacterImage;
}

function getMonthTaskLabel(title) {
  return String(title || "").trim();
}

function getHouseTaskLabel(title) {
  return String(title || "").trim();
}

function getCalendarCellTasks(tasks, isHouseCalendar) {
  const visibleTasks = isHouseCalendar ? tasks.filter((task) => getDailyTaskGroup(task) === "housework") : tasks;
  return [...visibleTasks].sort((first, second) => getCalendarTaskOrder(first) - getCalendarTaskOrder(second));
}

function getCalendarTaskOrder(task) {
  return getDailyTaskGroup(task) === "housework" ? 1 : 0;
}

function getCalendarCellTaskLabel(task) {
  return getDailyTaskGroup(task) === "housework" ? `${getHouseTaskEmoji(task)} ${getHouseTaskLabel(getHouseworkDisplayTitle(task))}` : getMonthTaskLabel(task.title);
}

function getHouseworkDisplayTitle(task = {}) {
  const explicitType = String(task.applianceType || "").toUpperCase();
  if (explicitType === "AIR_CONDITIONER") return formatAirConditionerDisplayTitle(task);
  if (applianceTypeLabel[explicitType]) return applianceTypeLabel[explicitType];

  const title = String(task.title || "");
  if (/세탁기|세탁 예약|세탁기 돌리기/i.test(title)) return applianceTypeLabel.WASHER;
  if (/건조기|건조기 예약|건조기 사용/i.test(title)) return applianceTypeLabel.DRYER;
  if (/식기세척|식기세척기/i.test(title)) return applianceTypeLabel.DISHWASHER;
  if (/공기청정|공기청정기/i.test(title)) return applianceTypeLabel.AIR_PURIFIER;
  if (/에어컨|냉방/i.test(title)) return applianceTypeLabel.AIR_CONDITIONER;
  if (/냉장고/i.test(title)) return applianceTypeLabel.REFRIGERATOR;
  if (/제습기/i.test(title)) return applianceTypeLabel.DEHUMIDIFIER;
  if (/가습기/i.test(title)) return applianceTypeLabel.HUMIDIFIER;

  return title;
}

function formatAirConditionerDisplayTitle(task = {}) {
  const title = String(task.title || "");
  const nameMatch = title.match(/(수민|다빈|재혁)\s*에어컨/);
  if (nameMatch) return `${nameMatch[1]} 에어컨`;

  const place = String(task.place || "");
  const placeMatch = place.match(/(수민|다빈|재혁)\s*방/);
  if (placeMatch) return `${placeMatch[1]} 에어컨`;

  return applianceTypeLabel.AIR_CONDITIONER;
}

function getDisplayTask(task) {
  if (getDailyTaskGroup(task) !== "housework") return task;
  const title = getHouseworkDisplayTitle(task);
  return title === task.title ? task : { ...task, title };
}

function resolveApplianceTask(task = {}) {
  const title = getHouseworkDisplayTitle(task);
  const applianceType = Object.entries(applianceTypeLabel).find(([, label]) => label === title)?.[0];
  return applianceType ? { ...task, applianceType } : task;
}

function getHouseTaskEmoji(task) {
  const type = String(task.applianceType || "").toUpperCase();
  const text = `${type} ${task.title || ""} ${task.place || ""}`.toLowerCase();

  if (type === "WASHER" || text.includes("세탁") || text.includes("빨래")) return "🧺";
  if (type === "DRYER" || text.includes("건조")) return "🌀";
  if (type === "AIR_PURIFIER" || text.includes("공기") || text.includes("청정")) return "🌀";
  if (type === "ROBOT_CLEANER" || text.includes("청소")) return "🤖";
  if (type === "DISHWASHER" || text.includes("식기")) return "🍽️";
  if (type === "REFRIGERATOR" || text.includes("냉장")) return "🧊";
  if (type === "AIR_CONDITIONER" || text.includes("에어컨")) return "❄️";
  if (type === "HUMIDIFIER" || text.includes("가습") || text.includes("제습")) return "💧";
  return "🏠";
}

function getMonthHouseImage(task) {
  const type = String(task.applianceType || "").toLowerCase();
  const text = `${type} ${task.title || ""} ${task.place || ""}`.toLowerCase();

  if (text.includes("dryer") || text.includes("건조")) return dryerImage;
  if (text.includes("fridge") || text.includes("냉장")) return fridgeImage;
  if (text.includes("air") || text.includes("에어컨") || text.includes("공기")) return airConditionerImage;
  return washerImage;
}

function filterTasksByCalendarMode(tasksByDate, mode, selectedMember) {
  const memberFilterIds = getMemberFilterIds(selectedMember);

  return Object.fromEntries(
    Object.entries(tasksByDate).map(([date, tasks]) => [
      date,
      tasks.filter((task) => {
        const isHousework = getDailyTaskGroup(task) === "housework";
        if (mode === "house") return isHousework;
        return selectedMember === "all" || memberFilterIds.has(task.userId) || memberFilterIds.has(task.owner);
      }),
    ]),
  );
}

function hideFixedTasksByDate(tasksByDate) {
  return Object.fromEntries(
    Object.entries(tasksByDate).map(([date, tasks]) => [
      date,
      tasks.filter((task) => task.displayType !== "fixed"),
    ]),
  );
}

function getMemberFilterIds(memberId) {
  const aliasMap = {
    dada: ["dada", "minsu"],
    minsu: ["dada", "minsu"],
    sumin: ["sumin", "theresa"],
    theresa: ["sumin", "theresa"],
    jea: ["jea", "me"],
    me: ["jea", "me"],
  };

  return new Set(aliasMap[memberId] || [memberId].filter(Boolean));
}

function getHouseworkTaskMemberName(task = {}) {
  if (task.memberName) return task.memberName;

  const member = HOUSEWORK_MEMBER_TABS.find((item) => [item.userId, item.ownerId].includes(task.userId) || [item.userId, item.ownerId].includes(task.owner));
  return member?.memberName || HOUSEWORK_MEMBER_TABS[0].memberName;
}

function getDailyTaskGroup(task) {
  if (task.applianceType || task.applianceMode || task.currentMode || task.automationType) return "housework";
  if (task.displayType === "appliance") return "housework";
  if (task.tag === "house" || task.source === "auto") return "housework";
  return "schedule";
}

function getDailyTaskKey(task = {}) {
  return [task.id, task.date, task.endDate, task.userId, task.owner, getDailyTaskGroup(task), task.title, task.repeat].filter((item) => item !== undefined && item !== null).join("::");
}

function getDailyTaskRange(task, index = 0) {
  const timeText = String(task.repeat || "");
  if (timeText.includes("하루종일")) {
    return { startMinutes: 0, endMinutes: 24 * 60, isAllDay: true };
  }

  if (task.startTime && task.endTime) {
    return normalizeTimeRange(timeToMinutes(task.startTime), timeToMinutes(task.endTime));
  }

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

function layoutDailyTimetableTasks(tasks, displayStartMinutes, displayEndMinutes, totalMinutes) {
  const visibleTasks = tasks
    .map((task, index) => {
      const range = getDailyTaskRange(task, index);
      const visibleStartMinutes = Math.max(displayStartMinutes, range.startMinutes);
      const visibleEndMinutes = Math.min(displayEndMinutes, range.endMinutes);
      if (visibleEndMinutes <= visibleStartMinutes) return null;

      return {
        task,
        index,
        range,
        visibleStartMinutes,
        visibleEndMinutes,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.visibleStartMinutes - b.visibleStartMinutes || a.visibleEndMinutes - b.visibleEndMinutes || a.index - b.index);

  return visibleTasks.map((item, itemIndex) => {
    const overlappingItems = visibleTasks.filter(
      (candidate) => candidate.visibleStartMinutes < item.visibleEndMinutes && candidate.visibleEndMinutes > item.visibleStartMinutes,
    );
    const earlierOverlaps = overlappingItems.filter(
      (candidate) =>
        candidate.visibleStartMinutes < item.visibleStartMinutes ||
        (candidate.visibleStartMinutes === item.visibleStartMinutes && candidate.index < item.index),
    );

    return {
      ...item,
      lane: Math.min(earlierOverlaps.length, overlappingItems.length - 1),
      laneCount: Math.max(1, overlappingItems.length),
      top: ((item.visibleStartMinutes - displayStartMinutes) / totalMinutes) * 100,
      height: Math.max(7, ((item.visibleEndMinutes - item.visibleStartMinutes) / totalMinutes) * 100),
      key: item.task.id || `${item.task.title}-${itemIndex}`,
    };
  });
}

function getEditableTaskTime(task) {
  const timeText = String(task.repeat || "");
  if (timeText.includes("하루종일")) {
    return { isAllDay: true, startTime: DAILY_TIMETABLE_START_TIME, endTime: DAILY_TIMETABLE_END_INPUT_TIME };
  }

  const rangeMatch = timeText.match(/\b(\d{1,2}):(\d{2})\s*(?:~|-|to)\s*(\d{1,2}):(\d{2})\b/i);
  if (rangeMatch) {
    const range = normalizeTimeRange(Number(rangeMatch[1]) * 60 + Number(rangeMatch[2]), Number(rangeMatch[3]) * 60 + Number(rangeMatch[4]));
    return { isAllDay: false, startTime: formatMinutes(range.startMinutes), endTime: formatMinutes(range.endMinutes) };
  }

  const clockMatch = timeText.match(/\b(\d{1,2}):(\d{2})\b/);
  if (clockMatch) {
    const startMinutes = Number(clockMatch[1]) * 60 + Number(clockMatch[2]);
    const range = normalizeTimeRange(startMinutes, startMinutes + 60);
    return { isAllDay: false, startTime: formatMinutes(range.startMinutes), endTime: formatMinutes(range.endMinutes) };
  }

  const fallbackRange = getDailyTaskRange(task);
  return { isAllDay: false, startTime: formatMinutes(fallbackRange.startMinutes), endTime: formatMinutes(fallbackRange.endMinutes) };
}

function normalizeTimeRange(startMinutes, endMinutes) {
  const minMinutes = DAILY_TIMETABLE_START_HOUR * 60;
  const maxMinutes = DAILY_TIMETABLE_END_HOUR * 60;
  const start = Math.max(minMinutes, Math.min(maxMinutes - 30, startMinutes));
  const end = Math.max(start + 30, Math.min(maxMinutes, endMinutes));
  return { startMinutes: start, endMinutes: end };
}

function formatDailyHour(hour) {
  return String(hour).padStart(2, "0") + ":00";
}

function formatTaskRange(range) {
  if (range.isAllDay) return "하루종일";
  return formatMinutes(range.startMinutes) + " ~ " + formatMinutes(range.endMinutes);
}

function formatBlockStartTime(range) {
  if (range.isAllDay) return "종일";
  return formatCompactMinutes(range.startMinutes);
}

function formatCompactMinutes(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return String(hour) + ":" + String(minute).padStart(2, "0");
}

function formatMinutes(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

function getDailyBlockTitle(task, variant) {
  return variant === "housework" ? getHouseworkDisplayTitle(task) : task.title;
}

function getDailyBlockColor(task, memberColors, variant, index) {
  const personalPalette = scheduleColorOptions;
  const housePalette = scheduleColorOptions;
  const taskColor = getTaskDisplayColor(task, memberColors, variant);
  if (taskColor) return taskColor;
  return (variant === "housework" ? housePalette : personalPalette)[index % scheduleColorOptions.length];
}

function getTaskDisplayColor(task, memberColors, variant) {
  if (task.color) return normalizeScheduleColor(task.color);
  if (variant === "housework" && task.applianceType && applianceTypeColor[task.applianceType]) {
    return applianceTypeColor[task.applianceType];
  }
  const memberColor = memberColors[task.userId] || memberColors[task.owner] || memberColors.all;
  return normalizeScheduleColor(memberColor);
}

function normalizeScheduleColor(color) {
  if (!color) return "";
  const normalizedColor = String(color).trim().toLowerCase();
  const paletteMatch = scheduleColorOptions.find((option) => option.toLowerCase() === normalizedColor);
  if (paletteMatch) return paletteMatch;
  return legacyScheduleColorMap[normalizedColor] || scheduleColorOptions[0];
}

function getReadableTextColor(backgroundColor) {
  const hex = String(backgroundColor || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#ffffff";

  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.62 ? "#243047" : "#ffffff";
}
function buildAiReport(selectedDate, selectedTasks, tasksByDate = {}) {
  const date = new Date(selectedDate + "T00:00:00");
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateLabel = month + "월 " + day + "일";
  const upcomingTasks = [0, 1, 2]
    .flatMap((offset) => tasksByDate[addDays(selectedDate, offset)] || [])
    .filter((task, index, list) => list.findIndex((item) => item.id === task.id) === index);
  const reportTasks = upcomingTasks.length > 0 ? upcomingTasks : selectedTasks;
  const fixedTasks = reportTasks.filter((task) => task.displayType === "fixed" || getDailyTaskGroup(task) === "schedule");
  const applianceTasks = reportTasks.filter((task) => getDailyTaskGroup(task) === "housework");
  const fixedTask = fixedTasks[0];
  const applianceSummary = formatReportList(getUniqueAiReportApplianceLabels(applianceTasks).slice(0, 3));

  if (fixedTask && applianceSummary) {
    return dateLabel + "에는 " + fixedTask.title + " 일정이 있어요. 오늘은 " + applianceSummary + "을 챙기면 좋아요.";
  }

  if (fixedTask) {
    return dateLabel + "에는 " + fixedTask.title + " 일정이 있어요. 추천 가사일은 아직 없어서 개인 일정에 집중해도 좋아요.";
  }

  if (applianceSummary) {
    return "오늘 등록된 개인 일정은 없어요. 대신 " + applianceSummary + "을 진행하면 좋아요.";
  }

  return "오늘은 등록된 개인 일정과 추천 가사일이 없어요. 여유 있게 하루를 보내도 괜찮아요.";
}

function buildAiReportTags(selectedDate, selectedTasks, tasksByDate = {}) {
  const upcomingTasks = [0, 1, 2]
    .flatMap((offset) => tasksByDate[addDays(selectedDate, offset)] || [])
    .filter((task, index, list) => list.findIndex((item) => item.id === task.id) === index);
  const reportTasks = upcomingTasks.length > 0 ? upcomingTasks : selectedTasks;
  const tags = [];

  reportTasks.forEach((task) => {
    const tag = getAiReportTaskTag(task);
    if (tag && !tags.includes(tag)) tags.push(tag);
  });

  return tags.slice(0, 3).length > 0 ? tags.slice(0, 3) : ["세탁", "청소", "실내 케어"];
}

function getAiReportTaskTag(task = {}) {
  if (getDailyTaskGroup(task) === "housework") {
    return getHouseworkDisplayTitle(resolveApplianceTask(task)) || task.title || "가전 일정";
  }

  return String(task.title || "").trim() || "개인 일정";
}

function getUniqueAiReportApplianceLabels(tasks = []) {
  const labels = [];

  tasks.forEach((task) => {
    const label = getHouseworkDisplayTitle(resolveApplianceTask(task)) || task.title || "";
    if (label && !labels.includes(label)) labels.push(label);
  });

  return labels;
}

function getNearestApplianceSchedule(tasksByDate = {}, applianceType, referenceDate) {
  const referenceKey = referenceDate || getTodayDateKey();
  const candidates = Object.values(tasksByDate)
    .flat()
    .filter((task) => !task.done)
    .filter((task) => getDailyTaskGroup(task) === "housework")
    .filter((task) => normalizeApplianceType(task) === applianceType)
    .map((task, index) => {
      const range = getDailyTaskRange(task, index);
      return {
        task,
        date: task.date,
        startMinutes: range.startMinutes,
        timestamp: new Date(`${task.date}T${formatMinutes(range.startMinutes)}:00`).getTime(),
      };
    })
    .filter((item) => item.date >= referenceKey)
    .sort((first, second) => first.timestamp - second.timestamp);

  return candidates[0] || null;
}

function formatNearestRunText(schedule) {
  const name = getScheduleOwnerDisplayName(schedule.task);
  return `${name}님이 ${formatRunDate(schedule.date)} ${formatKoreanTime(schedule.startMinutes)}에 실행시킬 예정입니다.`;
}

function getScheduleOwnerDisplayName(task = {}) {
  const ownerId = task.owner || task.userId;
  const mappedName = calendarProfileNames[ownerId];
  if (mappedName) return mappedName;
  const member = members.find((item) => item.id === ownerId);
  return member?.name || "사용자";
}

function getCalendarOwnerDesignName(name = "") {
  const trimmed = String(name || "").replace(/님$/, "").trim();
  if (!trimmed) return "나";
  return trimmed.length >= 3 ? trimmed.slice(1) : trimmed;
}

function formatRunDate(date) {
  const parsed = parseDateKey(date);
  return parsed.day + "일";
}

function formatKoreanTime(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 || 12;
  return period + " " + displayHour + "시" + (minute ? " " + minute + "분" : "");
}

function formatReportList(items) {
  const filtered = items.map((item) => String(item || "").trim()).filter(Boolean);
  if (filtered.length <= 1) return filtered[0] || "";
  if (filtered.length === 2) return filtered[0] + "와 " + filtered[1];
  return filtered.slice(0, -1).join(", ") + "와 " + filtered[filtered.length - 1];
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
                  <strong>{getDailyTaskGroup(task) === "housework" ? getHouseworkDisplayTitle(task) : task.title}</strong>
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
  const palette = scheduleColorOptions;
  if (task.color) return normalizeScheduleColor(task.color);
  if (task.userId && memberColors[task.userId]) return colorMix(normalizeScheduleColor(memberColors[task.userId]), palette[index % palette.length]);
  if (task.owner && memberColors[task.owner]) return colorMix(normalizeScheduleColor(memberColors[task.owner]), palette[index % palette.length]);
  return palette[index % palette.length];
}

function colorMix(primary, fallback) {
  return normalizeScheduleColor(primary) || fallback;
}

function isDabinMember(member) {
  const name = `${member?.name || ""} ${member?.displayName || ""}`;
  return DABIN_MEMBER_IDS.has(member?.id) || name.includes("다빈");
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

function getTwoWeekCells(selectedDate) {
  const start = getWeekStartDate(selectedDate);
  return Array.from({ length: 14 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return {
      key: toDateKey(next),
      day: next.getDate(),
      isCurrentMonth: true,
    };
  });
}

function getTwoWeekCalendarTitle(selectedDate) {
  const start = getWeekStartDate(selectedDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 13);
  const startText = start.getFullYear() + "." + String(start.getMonth() + 1).padStart(2, "0");
  const endText = end.getFullYear() + "." + String(end.getMonth() + 1).padStart(2, "0");
  return startText === endText ? startText : startText + " ~ " + endText;
}

function getWeekStartDate(date) {
  const start = new Date(date + "T00:00:00");
  start.setDate(start.getDate() - start.getDay());
  return start;
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

function getTodayDateKey() {
  return toDateKey(new Date());
}

function toDateKey(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function formatTemp(value) {
  return Number.isFinite(value) ? value + "°" : "-";
}
