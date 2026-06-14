import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChartColumnIncreasing,
  ChevronDown,
  Grid2X2,
  House,
  Menu,
  MoreVertical,
  Pencil,
  Plus,
} from "lucide-react";
import { automationAlerts, dateKey, initialTasks, isRainyDate, members, tagLabel, weatherByDate } from "./data.js";
import CalendarPage from "./pages/CalendarPage.jsx";
import CrewPage from "./pages/CrewPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import TaskComposer from "./components/TaskComposer.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import lgCharacter from "./assets/lg-character.png";
import floatingStar from "./assets/floating-star.svg";
import { CURRENT_USER_STORAGE_KEY, USERS, findUserById } from "./constants/users.js";
import { fetchCalendarWeather, fetchShortWeather } from "./services/weatherService.js";
import { fetchMidWeather } from "./services/midWeatherService.js";
import { fetchAirQuality } from "./services/airQualityService.js";
import { buildWeatherRecommendationsByDate } from "./services/weatherRecommendationService.js";
import { buildRoutineRecommendations } from "./services/routinePredictionService.js";

const ENABLE_ONBOARDING_TASK_GENERATION = false;
const USER_COLORS = {
  sumin: "#8b5cf6",
  jea: "#fb4b6f",
  dada: "#14b8a6",
};
const USER_TO_OWNER = {
  sumin: "theresa",
  jea: "me",
  dada: "minsu",
};
const OWNER_TO_USER = Object.fromEntries(Object.entries(USER_TO_OWNER).map(([userId, ownerId]) => [ownerId, userId]));
const APP_SESSION_STORAGE_KEY = "lalendarAppSession";
const DEFAULT_TAB = "schedule";
const DEFAULT_CALENDAR_VIEW = "month";

export default function App() {
  const storedUser = readStoredCurrentUser();
  const storedSession = readStoredAppSession();
  const initialSelectedDate = isDateKey(storedSession?.selectedDate) ? storedSession.selectedDate : getTodayKey();
  const initialVisibleMonth = visibleMonthFromDate(initialSelectedDate);
  const [currentUser, setCurrentUser] = useState(storedUser);
  const [activeCalendarUser, setActiveCalendarUser] = useState(() => findUserById(storedSession?.activeCalendarUserId) || storedUser);
  const [tasks, setTasks] = useState(() => normalizeTasksForUsers(normalizeGeneratedTaskTitles([...initialTasks, ...buildDefaultCalendarTasks()])));
  const [memberColors, setMemberColors] = useState(() => ({
    ...Object.fromEntries(members.map((member) => [member.id, member.color])),
    ...USER_COLORS,
  }));
  const [activeTab, setActiveTab] = useState(storedSession?.activeTab || DEFAULT_TAB);
  const [isOnboardingComplete, setOnboardingComplete] = useState(Boolean(storedSession?.isOnboardingComplete));
  const [hasGeneratedOnboardingTasks, setHasGeneratedOnboardingTasks] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState("intro");
  const [onboardingProfile, setOnboardingProfile] = useState({
    familyCount: 2,
    laundryDays: "월, 목",
    cleaningDay: "일요일",
    returnHomeTime: "19:30",
  });
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [visibleMonth, setVisibleMonth] = useState(initialVisibleMonth);
  const [notificationDemoDate, setNotificationDemoDate] = useState(initialSelectedDate);
  const [notificationDemoTime, setNotificationDemoTime] = useState(() => getCurrentTimeValue());
  const [isNotificationTimeEdited, setNotificationTimeEdited] = useState(false);
  const [selectedDetailDate, setSelectedDetailDate] = useState(isDateKey(storedSession?.selectedDetailDate) ? storedSession.selectedDetailDate : null);
  const [selectedMember, setSelectedMember] = useState(() => storedSession?.selectedMember || storedUser?.id || "jea");
  const [query, setQuery] = useState("");
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [composerOwnerLock, setComposerOwnerLock] = useState(null);
  const [pendingPostpone, setPendingPostpone] = useState(null);
  const [postponePicker, setPostponePicker] = useState(null);
  const [automationPrompt, setAutomationPrompt] = useState(null);
  const [notificationPrompt, setNotificationPrompt] = useState(null);
  const [lastNotificationPromptKey, setLastNotificationPromptKey] = useState("");
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [panel, setPanel] = useState(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isCalendarMenuOpen, setCalendarMenuOpen] = useState(false);
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const [notificationPosition, setNotificationPosition] = useState({ x: 0, y: 0 });
  const [calendarView, setCalendarView] = useState(storedSession?.calendarView || DEFAULT_CALENDAR_VIEW);
  const [calendarWeatherByDate, setCalendarWeatherByDate] = useState({});
  const [weatherApiStatus, setWeatherApiStatus] = useState("loading");

  useEffect(() => {
    setTasks((current) => {
      const normalized = normalizeGeneratedTaskTitles(current);
      return normalized.some((task, index) => task !== current[index]) ? normalized : current;
    });
  }, []);

  useEffect(() => {
    const selectors = [
      "#vercel-toolbar",
      "#vercel-live-feedback",
      "[data-vercel-toolbar]",
      "[data-vercel-live-feedback]",
      'iframe[src*="vercel.live"]',
      'iframe[src*="vercel-toolbar"]',
    ];
    const removeToolbar = () => document.querySelectorAll(selectors.join(",")).forEach((node) => node.remove());
    removeToolbar();
    const observer = new MutationObserver(removeToolbar);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isActive = true;
    setWeatherApiStatus("loading");

    fetchCalendarWeather()
      .then((forecastByDate) => {
        if (isActive) {
          setCalendarWeatherByDate(buildWeatherRecommendationsByDate(forecastByDate));
          setWeatherApiStatus(Object.keys(forecastByDate || {}).length > 0 ? "success" : "empty");
        }
      })
      .catch((error) => {
        console.warn(error);
        if (isActive) {
          setCalendarWeatherByDate({});
          setWeatherApiStatus("error");
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setActiveCalendarUser((current) => current || currentUser);
    setSelectedMember((current) => current || currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    setNotificationDemoDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (isNotificationTimeEdited) return;

    const syncCurrentTime = () => setNotificationDemoTime(getCurrentTimeValue());
    syncCurrentTime();
    const timerId = window.setInterval(syncCurrentTime, 1000);
    return () => window.clearInterval(timerId);
  }, [isNotificationTimeEdited]);

  useEffect(() => {
    if (!currentUser || typeof localStorage === "undefined") return;

    localStorage.setItem(
      APP_SESSION_STORAGE_KEY,
      JSON.stringify({
        activeTab,
        selectedDate,
        selectedDetailDate,
        visibleMonth,
        selectedMember,
        activeCalendarUserId: activeCalendarUser?.id || currentUser.id,
        calendarView,
        isOnboardingComplete,
      }),
    );
  }, [activeCalendarUser, activeTab, calendarView, currentUser, isOnboardingComplete, selectedDate, selectedDetailDate, selectedMember, visibleMonth]);

  const sortedCalendarUsers = useMemo(() => {
    if (!currentUser) return USERS;
    return [currentUser, ...USERS.filter((user) => user.id !== currentUser.id)];
  }, [currentUser]);
  const activeCalendarUserId = activeCalendarUser?.id || currentUser?.id || "";
  const scopedTasks = tasks.filter((task) => !activeCalendarUserId || getTaskUserId(task) === activeCalendarUserId);
  const notificationScopedTasks = tasks.filter((task) => !currentUser?.id || getTaskUserId(task) === currentUser.id);
  const selectedTasks = sortTasks(
    scopedTasks
      .filter((task) => isTaskVisibleOnDate(task, selectedDate))
      .filter((task) => `${task.title} ${task.place} ${tagLabel[task.tag]}`.includes(query)),
  );
  const completed = scopedTasks.filter((task) => task.done).length;
  const completion = Math.round((completed / Math.max(scopedTasks.length, 1)) * 100);
  const month = useMemo(() => {
    const totalDays = new Date(visibleMonth.year, visibleMonth.month, 0).getDate();
    return Array.from({ length: totalDays }, (_, index) => dateKey(visibleMonth.year, visibleMonth.month, index + 1));
  }, [visibleMonth]);
  const monthLeadingBlanks = useMemo(() => new Date(visibleMonth.year, visibleMonth.month - 1, 1).getDay(), [visibleMonth]);
  const monthLabel = `${visibleMonth.year}. ${String(visibleMonth.month).padStart(2, "0")}`;
  const tasksByDate = useMemo(() => {
    return tasks.reduce((map, task) => {
      getTaskDateKeys(task).forEach((date) => {
        map[date] = sortTasks([...(map[date] || []), task]);
      });
      return map;
    }, {});
  }, [tasks]);
  const notificationItems = useMemo(() => {
    const notificationContext = {
      date: notificationDemoDate,
      time: notificationDemoTime,
      userName: currentUser?.displayName || currentUser?.name || "사용자",
      weather: calendarWeatherByDate[notificationDemoDate] || weatherByDate[notificationDemoDate],
    };
    const automationItems = buildConditionalNotifications(notificationScopedTasks, notificationContext)
      .filter((alert) => !dismissedAlerts.includes(alert.id))
      .map((alert) => ({ ...alert, type: "automation" }));
    const savedAutomationItems = automationAlerts
      .filter((alert) => alert.date === notificationDemoDate)
      .filter((alert) => !dismissedAlerts.includes(alert.id))
      .map((alert) => ({ ...alert, type: "automation" }));
    const taskItems = pendingTasksForNotification(notificationScopedTasks, notificationContext).map((task) => ({
      id: `task-${task.id}`,
      type: "task",
      task,
      title: buildTaskNotificationTitle(task, notificationContext),
      detail: buildTaskNotificationDetail(task, notificationContext),
      scheduledTime: getTaskNotificationScheduledTime(task),
      date: task.date,
    }));
    return [...automationItems, ...savedAutomationItems, ...taskItems].slice(0, 8);
  }, [calendarWeatherByDate, currentUser, dismissedAlerts, notificationDemoDate, notificationDemoTime, notificationScopedTasks]);

  useEffect(() => {
    const currentMinutes = timeValueToMinutes(notificationDemoTime);
    const dueItem = notificationItems.find((item) => {
      const triggerMinutes = getNotificationTriggerMinutes(item);
      return Number.isFinite(triggerMinutes) && triggerMinutes <= currentMinutes && triggerMinutes >= currentMinutes - 5;
    });

    if (!dueItem) return;

    const promptKey = `${dueItem.id}-${notificationDemoDate}-${notificationDemoTime}`;
    if (promptKey === lastNotificationPromptKey) return;

    setNotificationPrompt(dueItem);
    setNotificationOpen(true);
    setLastNotificationPromptKey(promptKey);
  }, [lastNotificationPromptKey, notificationDemoDate, notificationDemoTime, notificationItems]);
  const routineRecommendations = useMemo(
    () =>
      buildRoutineRecommendations({
        devices: [],
        deviceStates: {},
        deviceAux: {},
        weatherByDate: calendarWeatherByDate,
        selectedDate,
      }),
    [calendarWeatherByDate, selectedDate],
  );

  function changeVisibleMonth(offset) {
    setVisibleMonth((current) => {
      const next = new Date(current.year, current.month - 1 + offset, 1);
      const year = next.getFullYear();
      const month = next.getMonth() + 1;
      setSelectedDate(dateKey(year, month, 1));
      return { year, month };
    });
  }

  function selectCalendarDate(year, month, day) {
    setVisibleMonth({ year, month });
    setSelectedDate(dateKey(year, month, day));
  }

  function startNotificationDrag(event) {
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = notificationPosition;

    event.currentTarget.setPointerCapture?.(event.pointerId);

    const moveNotification = (moveEvent) => {
      setNotificationPosition({
        x: origin.x + moveEvent.clientX - startX,
        y: origin.y + moveEvent.clientY - startY,
      });
    };

    const stopNotificationDrag = () => {
      window.removeEventListener("pointermove", moveNotification);
      window.removeEventListener("pointerup", stopNotificationDrag);
    };

    window.addEventListener("pointermove", moveNotification);
    window.addEventListener("pointerup", stopNotificationDrag);
  }

  function toggleTask(id) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function changeTaskOwner(id, owner) {
    setTasks((current) => current.map((task) => (task.id === id ? normalizeTaskForUser({ ...task, owner }, OWNER_TO_USER[owner] || task.userId) : task)));
  }

  function updateTask(id, updates) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? normalizeTaskForUser({ ...task, ...updates }, getTaskUserId(task) || activeCalendarUserId) : task)),
    );
  }

  function changeMemberColor(memberId, color) {
    setMemberColors((current) => ({ ...current, [memberId]: color }));
  }

  function postponeTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const range = getTaskNotificationRange(task);
    const nextPerson = sortedCalendarUsers.find((user) => user.id !== getTaskUserId(task)) || sortedCalendarUsers[0];
    setNotificationOpen(false);
    setNotificationPrompt(null);
    setPostponePicker({
      task,
      mode: "date",
      date: addDays(task.date, 1),
      time: range ? formatTimeValue(Math.min(23 * 60 + 59, range.startMinutes + 30)) : "09:00",
      targetUserId: nextPerson?.id || getTaskUserId(task) || activeCalendarUserId,
    });
  }

  function requestMoveTask(task, date) {
    if (isLaundryTask(task) && isRainyDate(date)) {
      setPendingPostpone({ task, nextDate: date });
      return;
    }

    moveTaskDate(task.id, date);
  }

  function moveTaskDate(id, date) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, date, repeat: `${task.repeat} · 미룸` } : task)));
    setSelectedDate(date);
  }

  function moveTaskTime(id, startTime) {
    const normalizedStartTime = normalizeEditableTimeValue(startTime);
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, repeat: buildPostponedRepeat(task, normalizedStartTime) } : task)),
    );
  }

  function moveTaskToPerson(id, targetUserId) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? normalizeTaskForUser(
              {
                ...task,
                userId: targetUserId,
                owner: userIdToOwner(targetUserId),
                repeat: appendPostponeLabel(task.repeat, "담당 변경"),
              },
              targetUserId,
            )
          : task,
      ),
    );
  }

  function addTask(task) {
    const nextTask = normalizeTaskForUser(
      normalizeGeneratedTaskTitle({ id: task.id || Date.now() + (task.copyIndex || 0), source: "manual", ...task }),
      activeCalendarUserId,
    );
    setTasks((current) => [nextTask, ...current]);
    if (nextTask.date) {
      const [year, month] = nextTask.date.split("-").map(Number);
      if (Number.isFinite(year) && Number.isFinite(month)) {
        setVisibleMonth({ year, month });
        setSelectedDate(nextTask.date);
      }
    }
    if (shouldSuggestAutomation(nextTask)) {
      setAutomationPrompt(nextTask);
    }
  }

  function updateOnboardingProfile(field, value) {
    setOnboardingProfile((current) => ({ ...current, [field]: value }));
  }

  function completeOnboarding(onboardingSetup = {}) {
    if (onboardingSetup.skipGeneration) {
      setOnboardingComplete(true);
      return;
    }

    if (!ENABLE_ONBOARDING_TASK_GENERATION || hasGeneratedOnboardingTasks) {
      setOnboardingComplete(true);
      return;
    }

    const generated = normalizeTasksForUsers(buildOnboardingTasks(onboardingProfile, selectedMember, onboardingSetup), activeCalendarUserId);
    setTasks((current) => [...generated, ...current]);
    setHasGeneratedOnboardingTasks(true);
    setSelectedDate(generated[0]?.date || getTodayKey());
    const firstDate = generated[0]?.date?.split("-").map(Number);
    if (firstDate?.length === 3) {
      setVisibleMonth({ year: firstDate[0], month: firstDate[1] });
    }
    setOnboardingComplete(true);
  }

  function selectMainTab(id) {
    setActiveTab(id);
    if (id === "schedule" && !isOnboardingComplete && !hasGeneratedOnboardingTasks) {
      setOnboardingComplete(false);
      setOnboardingStep("intro");
    }
  }

  function handleLogin(user) {
    const savedSession = readStoredAppSession();
    const nextSelectedDate = isDateKey(savedSession?.selectedDate) ? savedSession.selectedDate : selectedDate;
    const nextVisibleMonth = savedSession?.visibleMonth || visibleMonthFromDate(nextSelectedDate);
    const nextCalendarUser = findUserById(savedSession?.activeCalendarUserId) || user;

    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
    setActiveCalendarUser(nextCalendarUser);
    setSelectedMember(savedSession?.selectedMember || nextCalendarUser.id);
    setSelectedDate(nextSelectedDate);
    setNotificationDemoDate(nextSelectedDate);
    setNotificationDemoTime(getCurrentTimeValue());
    setNotificationTimeEdited(false);
    setSelectedDetailDate(isDateKey(savedSession?.selectedDetailDate) ? savedSession.selectedDetailDate : null);
    setVisibleMonth(nextVisibleMonth);
    setCalendarView(savedSession?.calendarView || DEFAULT_CALENDAR_VIEW);
    setActiveTab(savedSession?.activeTab || DEFAULT_TAB);
    setOnboardingComplete(Boolean(savedSession?.isOnboardingComplete));
    setOnboardingStep("intro");
    setHasGeneratedOnboardingTasks(false);
    setPanel(null);
    setMenuOpen(false);
    setCalendarMenuOpen(false);
    setNotificationOpen(false);
    setComposerOpen(false);
    setComposerOwnerLock(null);
  }

  function handleLogout() {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    localStorage.removeItem(APP_SESSION_STORAGE_KEY);
    setCurrentUser(null);
    setActiveCalendarUser(null);
    setSelectedMember("jea");
    setSelectedDetailDate(null);
    setActiveTab(DEFAULT_TAB);
    setOnboardingComplete(false);
    setOnboardingStep("intro");
    setPanel(null);
    setMenuOpen(false);
    setCalendarMenuOpen(false);
    setNotificationOpen(false);
    setComposerOpen(false);
    setComposerOwnerLock(null);
  }

  function selectActiveCalendarUser(userOrId) {
    const user = typeof userOrId === "string" ? findUserById(userOrId) : userOrId;
    if (!user) return;
    setActiveCalendarUser(user);
    setSelectedMember(user.id);
  }

  function openNotificationPopover() {
    setNotificationOpen(true);
    setCalendarMenuOpen(false);
    setMenuOpen(false);
    setPanel(null);
  }

  function openTaskComposer(options = {}) {
    setComposerOwnerLock(options.ownerId || null);
    setComposerOpen(true);
  }

  function closeTaskComposer() {
    setComposerOpen(false);
    setComposerOwnerLock(null);
  }

  function addWeatherRecommendationTask(date, recommendation) {
    const startTime = recommendation.recommendedStartTime || recommendation.startTime || "19:00";
    const endTime = recommendation.recommendedEndTime || recommendation.endTime || "20:00";

    addTask({
      date,
      title: recommendation.title,
      place: appliancePlaceLabel[recommendation.applianceType] || "우리 집",
      tag: "routine",
      owner: userIdToOwner(activeCalendarUserId),
      done: false,
      repeat: `${startTime}-${endTime}`,
      source: "auto",
      displayType: "appliance",
      applianceType: recommendation.applianceType,
      description: recommendation.description,
      automationType: recommendation.automationType,
      recommendationSource: recommendation.source,
      confidence: recommendation.confidence,
    });
    setSelectedDate(date);
  }

  function executeNotification(item) {
    if (item.type === "task") {
      if (!item.task.done) toggleTask(item.task.id);
      return;
    }

    addAutomationTask(item, item.date);
    setDismissedAlerts((current) => [...current, item.id]);
  }

  function postponeNotification(item) {
    setNotificationOpen(false);
    setNotificationPrompt(null);

    if (item.type === "task") {
      onPostponeTaskFromNotification(item.task.id);
      return;
    }

    addAutomationTask(item, addDays(item.date, 1));
    setDismissedAlerts((current) => [...current, item.id]);
  }

  function onPostponeTaskFromNotification(id) {
    postponeTask(id);
  }

  function addAutomationTask(item, date) {
    const task = normalizeTaskForUser(
      {
        id: Date.now(),
        date,
        title: item.taskTitle,
        place: item.place,
        tag: "house",
        owner: userIdToOwner(activeCalendarUserId),
        done: false,
        repeat: "자동화",
        source: "auto",
        displayType: "appliance",
        applianceType: item.applianceType,
      },
      activeCalendarUserId,
    );
    setTasks((current) => [
      task,
      ...current,
    ]);
    setSelectedDate(date);
  }

  function applyScheduleAutomation(task) {
    const owner = userIdToOwner(activeCalendarUserId);
    const generated = [
      "귀가 전 세탁 완료 예약",
      "제습기 미리 켜기",
      "에어컨 예냉",
      "공기청정기 미리 켜기",
    ].map((title, index) => ({
      id: Date.now() + index + 1,
      date: task.date,
      title,
      place: index === 0 ? "세탁실" : "가전 자동화",
      tag: "house",
      owner,
      done: false,
      repeat: "일정 연동",
      source: "auto",
    }));
    setTasks((current) => [...normalizeTasksForUsers(generated, activeCalendarUserId), ...current]);
    setAutomationPrompt(null);
  }

  const pageProps = {
    tasks,
    scopedTasks,
    selectedTasks,
    selectedDate,
    initialSelectedDetailDate: selectedDetailDate,
    onSelectedDetailDateChange: setSelectedDetailDate,
    selectedMember,
    currentUser,
    activeCalendarUser,
    calendarUsers: sortedCalendarUsers,
    memberColors,
    changeMemberColor,
    setSelectedDate,
    setSelectedMember: selectActiveCalendarUser,
    onActiveCalendarUserChange: selectActiveCalendarUser,
    query,
    setQuery,
    month,
    monthLabel,
    monthLeadingBlanks,
    weatherByDate: calendarWeatherByDate,
    weatherApiStatus,
    routineRecommendations,
    onPrevMonth: () => changeVisibleMonth(-1),
    onNextMonth: () => changeVisibleMonth(1),
    onSelectCalendarDate: selectCalendarDate,
    tasksByDate,
    completion,
    toggleTask,
    deleteTask,
    changeTaskOwner,
    updateTask,
    postponeTask,
    onAddWeatherRecommendation: addWeatherRecommendationTask,
    onAddTask: addTask,
    openComposer: openTaskComposer,
    onOpenPanel: setPanel,
    onOpenNotifications: openNotificationPopover,
    calendarView,
    setCalendarView,
  };
  const onboardingBackdropPageProps = {
    ...pageProps,
    tasks: [],
    scopedTasks: [],
    selectedTasks: [],
    tasksByDate: {},
    completion: 0,
    routineRecommendations: [],
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <main className="app-shell">
      <section className={`app-frame ${activeTab === "home" ? "thinq-home-frame" : ""} ${activeTab === "schedule" && !isOnboardingComplete ? "onboarding-frame" : ""}`}>
        {activeTab !== "home" && !(activeTab === "schedule" && !isOnboardingComplete) && (
        <header className="topbar">
          <div className="brand">
            <span>L</span>
            <div>
              <strong>Lalendar</strong>
              <small>housework calendar</small>
            </div>
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              aria-label="알림"
              onClick={() => {
                setNotificationOpen((current) => !current);
                setCalendarMenuOpen(false);
                setMenuOpen(false);
              }}
              aria-expanded={isNotificationOpen}
            >
              <Bell size={20} />
            </button>
            <div className="menu-popover-wrap">
              <button
                className="icon-button"
                aria-label="캘린더 보기"
                onClick={() => {
                  setCalendarMenuOpen((current) => !current);
                  setMenuOpen(false);
                }}
                aria-expanded={isCalendarMenuOpen}
              >
                <CalendarDays size={21} />
              </button>
              {isCalendarMenuOpen && (
                <div className="menu-popover calendar-view-popover" role="menu">
                  {[
                    ["day", "일간"],
                    ["week", "주간"],
                    ["month", "월간"],
                  ].map(([view, label]) => (
                    <button
                      key={view}
                      type="button"
                      className={calendarView === view ? "active" : ""}
                      onClick={() => {
                        setCalendarView(view);
                        setCalendarMenuOpen(false);
                        setActiveTab("schedule");
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="menu-popover-wrap">
              <button
                className="icon-button"
                aria-label="메뉴"
                onClick={() => {
                  setMenuOpen((current) => !current);
                  setCalendarMenuOpen(false);
                }}
                aria-expanded={isMenuOpen}
              >
                <Menu size={22} />
              </button>
              {isMenuOpen && (
                <div className="menu-popover" role="menu">
                  <button type="button" onClick={() => setMenuOpen(false)}>가족 초대</button>
                  <button type="button" onClick={() => { setPanel({ type: "notifications" }); setMenuOpen(false); }}>알림 설정</button>
                  <button type="button" onClick={() => { setPanel({ type: "settings" }); setMenuOpen(false); }}>테마 설정</button>
                  <button type="button" onClick={() => setMenuOpen(false)}>데이터 내보내기</button>
                  <button type="button" onClick={() => { openTaskComposer(); setMenuOpen(false); }}>작업 추가</button>
                  <button type="button" onClick={handleLogout}>로그아웃</button>
                </div>
              )}
            </div>
          </div>
        </header>
        )}

        {activeTab === "home" && <HomePage onOpenNotifications={openNotificationPopover} />}
        {activeTab === "schedule" && !isOnboardingComplete && (
          <div className="onboarding-live-stage">
            <div className="onboarding-calendar-backdrop" aria-hidden="true">
              <CalendarPage {...onboardingBackdropPageProps} />
            </div>
            <OnboardingPage
              step={onboardingStep}
              userName={currentUser?.name || currentUser?.displayName || "00"}
              onNext={() => setOnboardingStep("scheduleInfo")}
              onInfoNext={() => setOnboardingStep("fixedSchedule")}
              onFixedNext={() => setOnboardingStep("googleConfirm")}
              onPreview={() => setOnboardingStep("appliance")}
              onApplianceNext={() => setOnboardingStep("ready")}
              onAssigneeNext={() => setOnboardingStep("ready")}
              onSkip={() => completeOnboarding({ skipGeneration: true })}
              onBack={() =>
                setOnboardingStep(
                  onboardingStep === "ready"
                    ? "appliance"
                    : onboardingStep === "assignee"
                    ? "appliance"
                    : onboardingStep === "appliance"
                      ? "fixedSchedule"
                      : onboardingStep === "googleConfirm"
                        ? "fixedSchedule"
                      : onboardingStep === "fixedSchedule"
                        ? "scheduleInfo"
                      : "intro",
                )
              }
              onComplete={completeOnboarding}
            />
          </div>
        )}
        {activeTab === "schedule" && isOnboardingComplete && <CalendarPage {...pageProps} />}
        {activeTab === "devices" && <SimpleTabPage icon={<Grid2X2 size={28} />} title="디바이스" text="자주 쓰는 제품을 홈 화면에 배치해 바로 사용할 수 있어요." />}
        {activeTab === "care" && <SimpleTabPage icon={<ChartColumnIncreasing size={28} />} title="케어" text="제품 상태와 사용 리포트를 한눈에 볼 수 있게 준비 중이에요." />}
        {activeTab === "menu" && <CrewPage {...pageProps} />}

        <nav className="tabbar thinq-main-tabbar" aria-label="하단 탭">
          {mainNavItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeTab === id ? "active" : ""} onClick={() => selectMainTab(id)}>
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {isNotificationOpen && (
          <section
            className="notification-popover"
            style={{
              "--notification-x": `${notificationPosition.x}px`,
              "--notification-y": `${notificationPosition.y}px`,
            }}
            aria-label="알림"
          >
            <div className="notification-popover-head" onPointerDown={startNotificationDrag}>
              <div>
                <strong>알림</strong>
                <span>{currentUser?.displayName || currentUser?.name || "사용자"} · {notificationItems.length}개</span>
              </div>
              <button type="button" aria-label="알림 닫기" onClick={() => setNotificationOpen(false)}>
                닫기
              </button>
            </div>
            <div className="notification-time-control">
              <label className="notification-time-field">
                <span>현재 시간</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{2}:[0-9]{2}"
                  maxLength={5}
                  value={notificationDemoTime}
                  onChange={(event) => {
                    setNotificationDemoTime(formatEditableTimeValue(event.target.value));
                    setNotificationTimeEdited(true);
                  }}
                  onBlur={(event) => setNotificationDemoTime(normalizeEditableTimeValue(event.target.value))}
                />
                <small>{notificationDemoDate} 기준</small>
              </label>
              <button
                type="button"
                onClick={() => {
                  setNotificationDemoDate(selectedDate);
                  setNotificationDemoTime(getCurrentTimeValue());
                  setNotificationTimeEdited(false);
                }}
              >
                지금
              </button>
            </div>
            <div className="notification-popover-list">
              {notificationItems.map((item) => (
                <article className="notification-popover-item" key={item.id}>
                  <span className="notification-schedule-time">{getNotificationScheduleLabel(item)}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <div>
                    <button type="button" onClick={() => postponeNotification(item)}>
                      미루기
                    </button>
                    <button type="button" onClick={() => executeNotification(item)}>
                      실행
                    </button>
                  </div>
                </article>
              ))}
              {notificationItems.length === 0 && <p className="notification-popover-empty">표시할 알림이 없습니다.</p>}
            </div>
          </section>
        )}
      </section>

      {isComposerOpen && (
        <TaskComposer
          selectedDate={selectedDate}
          selectedMember={selectedMember}
          lockedOwner={composerOwnerLock}
          onClose={closeTaskComposer}
          onAdd={(task) => {
            addTask(task);
            closeTaskComposer();
          }}
        />
      )}

      <DetailPanel
        panel={panel}
        tasks={tasks}
        notifications={notificationItems}
        completion={completion}
        onClose={() => setPanel(null)}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onOwnerChange={changeTaskOwner}
        onPostpone={postponeTask}
        onExecuteNotification={executeNotification}
        onPostponeNotification={postponeNotification}
        onAddTask={(task) => addTask(task)}
        selectedDate={selectedDate}
        selectedMember={selectedMember}
        onOpenComposer={() => openTaskComposer()}
        onLogout={handleLogout}
      />

      {automationPrompt && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="automation-title">
            <p>일정 연동 알림</p>
            <h2 id="automation-title">가전 작동 시간을 바꿀까요?</h2>
            <span>
              {automationPrompt.title} 일정에 맞춰 세탁 종료, 제습기, 에어컨, 공기청정기 작동 시간을 다시 잡을 수 있어요.
            </span>
            <div className="confirm-actions">
              <button type="button" onClick={() => setAutomationPrompt(null)}>
                나중에
              </button>
              <button type="button" onClick={() => applyScheduleAutomation(automationPrompt)}>
                실행하기
              </button>
            </div>
          </section>
        </div>
      )}

      {notificationPrompt && (
        <div className="notification-execute-backdrop" role="presentation">
          <section className="notification-execute-dialog" role="dialog" aria-modal="true" aria-labelledby="notification-execute-title">
            <button type="button" aria-label="알림 닫기" onClick={() => setNotificationPrompt(null)}>
              ×
            </button>
            <p>알림</p>
            <h2 id="notification-execute-title">{notificationPrompt.title}</h2>
            <span>
              {getNotificationScheduleLabel(notificationPrompt)}입니다. 지금 실행하시겠습니까?
            </span>
            <small>{notificationPrompt.detail}</small>
            <div>
              <button
                type="button"
                onClick={() => {
                  postponeNotification(notificationPrompt);
                  setNotificationPrompt(null);
                }}
              >
                미루기
              </button>
              <button
                type="button"
                onClick={() => {
                  executeNotification(notificationPrompt);
                  setNotificationPrompt(null);
                }}
              >
                실행하기
              </button>
            </div>
          </section>
        </div>
      )}

      {pendingPostpone && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="postpone-title">
            <p>비 예보 확인</p>
            <h2 id="postpone-title">정말 다음날로 미룰까요?</h2>
            <span>
              {pendingPostpone.task.title}을 {pendingPostpone.nextDate}로 미루면 비 오는 날과 겹쳐요.
            </span>
            <div className="confirm-actions">
              <button type="button" onClick={() => setPendingPostpone(null)}>
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  moveTaskDate(pendingPostpone.task.id, pendingPostpone.nextDate);
                  setPendingPostpone(null);
                }}
              >
                그래도 미루기
              </button>
            </div>
          </section>
        </div>
      )}

      {postponePicker && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="postpone-picker-title">
            <p>일정 미루기</p>
            <h2 id="postpone-picker-title">언제로 미룰까요?</h2>
            <span>{postponePicker.task.title}의 미루기 방식을 선택해주세요.</span>
            <div className="postpone-option-grid" aria-label="미루기 방식 선택">
              {[
                ["person", "다른 사람에게 미루기"],
                ["time", "시간 미루기"],
                ["date", "날짜 미루기"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={postponePicker.mode === mode ? "active" : ""}
                  onClick={() => setPostponePicker((current) => ({ ...current, mode }))}
                >
                  {label}
                </button>
              ))}
            </div>
            {postponePicker.mode === "person" && (
              <label className="postpone-date-field">
                담당자
                <select
                  value={postponePicker.targetUserId}
                  onChange={(event) => setPostponePicker((current) => ({ ...current, targetUserId: event.target.value }))}
                >
                  {sortedCalendarUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName || user.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {postponePicker.mode === "time" && (
              <label className="postpone-date-field">
                새 시간
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{2}:[0-9]{2}"
                  maxLength={5}
                  value={postponePicker.time}
                  onChange={(event) => setPostponePicker((current) => ({ ...current, time: formatEditableTimeValue(event.target.value) }))}
                  onBlur={(event) => setPostponePicker((current) => ({ ...current, time: normalizeEditableTimeValue(event.target.value) }))}
                />
              </label>
            )}
            {postponePicker.mode === "date" && (
              <label className="postpone-date-field">
                날짜
                <input
                  type="date"
                  value={postponePicker.date}
                  onChange={(event) => setPostponePicker((current) => ({ ...current, date: event.target.value }))}
                />
              </label>
            )}
            <div className="confirm-actions">
              <button type="button" onClick={() => setPostponePicker(null)}>
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (postponePicker.mode === "person") {
                    moveTaskToPerson(postponePicker.task.id, postponePicker.targetUserId);
                  } else if (postponePicker.mode === "time") {
                    moveTaskTime(postponePicker.task.id, postponePicker.time);
                  } else {
                    requestMoveTask(postponePicker.task, postponePicker.date);
                  }
                  setPostponePicker(null);
                }}
              >
                미루기
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}


const mainNavItems = [
  { id: "devices", label: "디바이스", icon: Grid2X2 },
  { id: "schedule", label: "캘린더", icon: CalendarDays },
  { id: "home", label: "홈", icon: House },
  { id: "care", label: "케어", icon: ChartColumnIncreasing },
  { id: "menu", label: "메뉴", icon: Menu },
];

const fixedScheduleColorByTitle = {
  "회사": "#ff8a2a",
  "필라테스": "#f59e0b",
  "공업수학": "#ff8a2a",
  "정역학": "#f59e0b",
  "열역학": "#f97316",
  "유체역학": "#ea580c",
  "기계제도": "#fb923c",
  "재료역학": "#d97706",
  "기계공작법": "#ffb020",
  "기계공학실험": "#c2410c",
  "부트 캠프": "#ff8a2a",
  "삼겹살집 알바": "#f59e0b",
};
const fallbackFixedScheduleColors = ["#ff8a2a", "#f59e0b", "#f97316", "#ea580c"];

const fixedScheduleTemplates = {
  sumin: [
    ...["월", "화", "수", "목", "금"].map((day) => ({
      title: "회사",
      day,
      startTime: "09:00",
      endTime: "18:00",
      color: getFixedScheduleColor("회사"),
    })),
    ...["화", "토"].map((day) => ({
      title: "필라테스",
      day,
      startTime: "19:00",
      endTime: "20:00",
      color: getFixedScheduleColor("필라테스"),
    })),
  ],
  jaehyeok: [
    ["공업수학", "월", "09:00", "10:30"],
    ["정역학", "월", "11:00", "12:30"],
    ["열역학", "월", "14:00", "16:00"],
    ["유체역학", "화", "10:00", "12:00"],
    ["기계제도", "화", "14:00", "17:00"],
    ["공업수학", "수", "09:00", "10:30"],
    ["재료역학", "수", "13:00", "15:00"],
    ["유체역학", "목", "10:00", "12:00"],
    ["기계공작법", "목", "14:00", "16:00"],
    ["기계공학실험", "금", "13:00", "16:00"],
  ].map(([title, day, startTime, endTime]) => ({ title, day, startTime, endTime, color: getFixedScheduleColor(title) })),
  dabin: [
    ...["월", "화", "수", "목", "금"].map((day) => ({
      title: "부트 캠프",
      day,
      startTime: "09:00",
      endTime: "18:00",
      color: getFixedScheduleColor("부트 캠프"),
    })),
    ...["토", "일"].map((day) => ({
      title: "삼겹살집 알바",
      day,
      startTime: "15:00",
      endTime: "18:00",
      color: getFixedScheduleColor("삼겹살집 알바"),
    })),
  ],
};

const defaultFixedScheduleUsers = [
  { templateId: "sumin", userId: "sumin", owner: "theresa" },
  { templateId: "jaehyeok", userId: "jea", owner: "me" },
  { templateId: "dabin", userId: "dada", owner: "minsu" },
];

function buildDefaultCalendarTasks() {
  const fixedTasks = buildDefaultFixedCalendarTasks();
  return [...fixedTasks, ...buildRuleBasedApplianceCalendarTasks(fixedTasks)];
}

function buildDefaultFixedCalendarTasks() {
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const startDate = new Date("2026-06-01T00:00:00");
  const endDate = new Date("2026-06-30T00:00:00");
  const tasks = [];
  let id = 30000;

  for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
    const day = dayLabels[currentDate.getDay()];
    const date = dateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());

    defaultFixedScheduleUsers.forEach(({ templateId, userId, owner }) => {
      (fixedScheduleTemplates[templateId] || [])
        .filter((schedule) => schedule.day === day)
        .forEach((schedule, index) => {
          tasks.push({
            id: id++,
            date,
            title: schedule.title,
            place: "고정 일정",
            tag: schedule.title === "필라테스" ? "routine" : "plan",
            owner,
            userId,
            done: false,
            repeat: `${schedule.startTime}-${schedule.endTime}`,
            source: "manual",
            displayType: "fixed",
            color: schedule.color || getFixedScheduleColor(schedule.title),
            sortOrder: 10 + index,
          });
        });
    });
  }

  return tasks;
}

const applianceCalendarRules = {
  dinner: { startTime: "19:00", endTime: "19:30" },
  dishwasher: { startTime: "19:30", endTime: "20:30" },
  washerDays: new Set(["월", "목", "토"]),
  washer: { startTime: "20:30", endTime: "21:30" },
  dryerDelayMinutes: 0,
  dryerDurationMinutes: 60,
  robotDurationMinutes: 60,
  airconDurationMinutes: 40,
};

const applianceCalendarUserRooms = {
  sumin: { owner: "theresa", name: "수민", room: "수민 방" },
  jea: { owner: "me", name: "재혁", room: "재혁 방" },
  dada: { owner: "minsu", name: "다빈", room: "다빈 방" },
};

const applianceCalendarAssignees = {
  WASHER: "theresa",
  DRYER: "me",
  DISHWASHER: "theresa",
  ROBOT_CLEANER: "minsu",
  AIR_PURIFIER: "me",
};

const applianceCalendarColors = {
  WASHER: "#60a5fa",
  DRYER: "#c084fc",
  ROBOT_CLEANER: "#f59e0b",
  AIR_PURIFIER: "#7c3aed",
  DISHWASHER: "#0ea5e9",
  AIR_CONDITIONER: "#22d3ee",
};

function buildRuleBasedApplianceCalendarTasks(fixedTasks) {
  const fixedByDate = groupFixedTasksByDate(fixedTasks);
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const tasks = [];
  let id = 40000;

  Object.entries(fixedByDate).forEach(([date, dayFixedTasks]) => {
    const day = dayLabels[new Date(`${date}T00:00:00`).getDay()];

    if (isRobotCleanerDate(date)) {
      const robotTask = buildRobotCleanerTask(id++, date, dayFixedTasks);
      if (robotTask) tasks.push(robotTask);
    }

    if (!hasFixedScheduleOverlap(dayFixedTasks, applianceCalendarRules.dinner.startTime, applianceCalendarRules.dishwasher.endTime)) {
      tasks.push(
        createApplianceCalendarTask({
          id: id++,
          date,
          title: "식사 시간 공기청정",
          place: "거실",
          owner: applianceCalendarAssignees.AIR_PURIFIER,
          repeat: `${applianceCalendarRules.dinner.startTime}-${applianceCalendarRules.dinner.endTime}`,
          applianceType: "AIR_PURIFIER",
          applianceMode: "강력",
          sortOrder: 40,
        }),
        createApplianceCalendarTask({
          id: id++,
          date,
          title: "식기세척 예약",
          place: "주방",
          owner: applianceCalendarAssignees.DISHWASHER,
          repeat: `${applianceCalendarRules.dishwasher.startTime}-${applianceCalendarRules.dishwasher.endTime}`,
          applianceType: "DISHWASHER",
          applianceMode: "에코",
          sortOrder: 41,
        }),
      );
    }

    if (applianceCalendarRules.washerDays.has(day) && !hasFixedScheduleOverlap(dayFixedTasks, applianceCalendarRules.washer.startTime, applianceCalendarRules.washer.endTime)) {
      tasks.push(
        createApplianceCalendarTask({
          id: id++,
          date,
          title: "세탁 예약",
          place: "세탁실",
          owner: applianceCalendarAssignees.WASHER,
          repeat: `${applianceCalendarRules.washer.startTime}-${applianceCalendarRules.washer.endTime}`,
          applianceType: "WASHER",
          applianceMode: "표준",
          sortOrder: 50,
        }),
      );

      const dryerStart = addMinutesToTime(applianceCalendarRules.washer.endTime, applianceCalendarRules.dryerDelayMinutes);
      const dryerEnd = addMinutesToTime(dryerStart, applianceCalendarRules.dryerDurationMinutes);
      tasks.push(
        createApplianceCalendarTask({
          id: id++,
          date,
          title: "건조기 예약",
          place: "세탁실",
          owner: applianceCalendarAssignees.DRYER,
          repeat: `${dryerStart}-${dryerEnd}`,
          applianceType: "DRYER",
          applianceMode: "섬세",
          sortOrder: 51,
        }),
      );
    }

    if (isHotCalendarDate(date)) {
      buildAirConditionerTasksForLastSchedules(date, dayFixedTasks, id).forEach((task) => {
        tasks.push(task);
        id += 1;
      });
    }
  });

  return tasks;
}

function groupFixedTasksByDate(fixedTasks) {
  return fixedTasks.reduce((map, task) => {
    map[task.date] = [...(map[task.date] || []), task].sort((first, second) => getTaskStartMinutes(first) - getTaskStartMinutes(second));
    return map;
  }, {});
}

function buildRobotCleanerTask(id, date, fixedTasks) {
  const schedule = fixedTasks.find((task) => {
    const start = getTaskStartMinutes(task);
    const end = getTaskEndMinutes(task);
    return end - start >= applianceCalendarRules.robotDurationMinutes;
  });

  if (!schedule) return null;

  const startTime = addMinutesToTime(getTaskStartTime(schedule), 30);
  const endTime = addMinutesToTime(startTime, applianceCalendarRules.robotDurationMinutes);

  if (toFixedScheduleMinutes(endTime) > getTaskEndMinutes(schedule)) return null;

  return createApplianceCalendarTask({
    id,
    date,
    title: "로봇청소 시작",
    place: "거실",
    owner: applianceCalendarAssignees.ROBOT_CLEANER,
    repeat: `${startTime}-${endTime}`,
    applianceType: "ROBOT_CLEANER",
    applianceMode: "전체 청소",
    sortOrder: 30,
  });
}

function isRobotCleanerDate(date) {
  const startDate = new Date("2026-06-01T00:00:00");
  const currentDate = new Date(`${date}T00:00:00`);
  const dayOffset = Math.round((currentDate - startDate) / 86400000);
  return dayOffset >= 0 && dayOffset % 2 === 0;
}

function buildAirConditionerTasksForLastSchedules(date, fixedTasks, startId) {
  const lastSchedulesByUser = fixedTasks.reduce((map, task) => {
    const room = applianceCalendarUserRooms[task.userId];
    const endTime = getTaskEndTime(task);
    if (!room || !endTime) return map;

    const current = map[task.userId];
    if (!current || getTaskEndMinutes(task) > getTaskEndMinutes(current)) {
      map[task.userId] = task;
    }

    return map;
  }, {});

  return Object.values(lastSchedulesByUser)
    .sort((first, second) => getTaskEndMinutes(first) - getTaskEndMinutes(second))
    .map((fixedTask, index) => {
      const room = applianceCalendarUserRooms[fixedTask.userId];
      const endTime = getTaskEndTime(fixedTask);

      return createApplianceCalendarTask({
        id: startId + index,
        date,
        title: `${room.name} 에어컨 예냉`,
        place: room.room,
        owner: room.owner,
        userId: fixedTask.userId,
        repeat: `${endTime}-${addMinutesToTime(endTime, applianceCalendarRules.airconDurationMinutes)}`,
        applianceType: "AIR_CONDITIONER",
        applianceMode: "냉방",
        sortOrder: 90 + index,
      });
    });
}

function createApplianceCalendarTask({ id, date, title, place, owner, userId, repeat, applianceType, applianceMode, sortOrder }) {
  return {
    id,
    date,
    title,
    place,
    tag: "house",
    owner,
    userId,
    done: false,
    repeat,
    source: "auto",
    displayType: "appliance",
    applianceType,
    applianceMode,
    currentMode: applianceMode,
    color: applianceCalendarColors[applianceType],
    sortOrder,
  };
}

function isHotCalendarDate(date) {
  const weather = weatherByDate[date];
  const temperature = Number(weather?.high ?? weather?.maxTemp ?? weather?.temperature);
  return Number.isFinite(temperature) && temperature >= 28;
}

function hasFixedScheduleOverlap(fixedTasks, startTime, endTime) {
  const start = toFixedScheduleMinutes(startTime);
  const end = toFixedScheduleMinutes(endTime);
  return fixedTasks.some((task) => getTaskStartMinutes(task) < end && start < getTaskEndMinutes(task));
}

function getTaskStartTime(task) {
  return String(task.repeat || "").match(/(\d{1,2}:\d{2})/)?.[1] || "";
}

function getTaskEndTime(task) {
  return String(task.repeat || "").match(/\d{1,2}:\d{2}-(\d{1,2}:\d{2})/)?.[1] || "";
}

function getTaskStartMinutes(task) {
  return toFixedScheduleMinutes(getTaskStartTime(task));
}

function getTaskEndMinutes(task) {
  return toFixedScheduleMinutes(getTaskEndTime(task));
}

function addMinutesToTime(time, minutesToAdd) {
  const totalMinutes = toFixedScheduleMinutes(time) + minutesToAdd;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getFixedScheduleColor(titleOrIndex) {
  if (typeof titleOrIndex === "string" && fixedScheduleColorByTitle[titleOrIndex]) {
    return fixedScheduleColorByTitle[titleOrIndex];
  }

  const index = Number.isFinite(Number(titleOrIndex)) ? Number(titleOrIndex) : 0;
  return fallbackFixedScheduleColors[index % fallbackFixedScheduleColors.length];
}

function getOverlappingFixedScheduleIds(currentSchedules, nextSchedules) {
  const duplicatedIds = new Set();

  currentSchedules.forEach((current) => {
    nextSchedules.forEach((next) => {
      if (current.day !== next.day) return;
      if (current.id === next.id) return;
      if (isFixedScheduleOverlapping(current, next)) {
        duplicatedIds.add(current.id);
      }
    });
  });

  return [...duplicatedIds];
}

function isFixedScheduleOverlapping(first, second) {
  const firstStart = toFixedScheduleMinutes(first.startTime);
  const firstEnd = toFixedScheduleMinutes(first.endTime);
  const secondStart = toFixedScheduleMinutes(second.startTime);
  const secondEnd = toFixedScheduleMinutes(second.endTime);

  return firstStart < secondEnd && secondStart < firstEnd;
}

function OnboardingPage({ step, userName = "00", onNext, onInfoNext, onFixedNext, onPreview, onApplianceNext, onAssigneeNext, onBack, onComplete, onSkip }) {
  const isIntro = step === "intro";
  const isScheduleInfo = step === "scheduleInfo";
  const isFixedSchedule = step === "fixedSchedule";
  const isGoogleConfirm = step === "googleConfirm";
  const isAppliance = step === "appliance";
  const isAssignee = step === "assignee";
  const isReady = step === "ready";
  const [selectedApplianceTypes, setSelectedApplianceTypes] = useState([]);
  const [applianceAssignees, setApplianceAssignees] = useState({});
  const [selectedImportMethod, setSelectedImportMethod] = useState("");
  const [fixedSchedules, setFixedSchedules] = useState([]);
  const [fixedTitle, setFixedTitle] = useState("");
  const [fixedDay, setFixedDay] = useState("");
  const [fixedStartHour, setFixedStartHour] = useState("");
  const [fixedStartMinute, setFixedStartMinute] = useState("");
  const [fixedEndHour, setFixedEndHour] = useState("");
  const [fixedEndMinute, setFixedEndMinute] = useState("");
  const introMessage = "어서오세요!\n최적의 가사일 계획을\n자동으로 짜주는 \nAI 가사일 플래너\n플래니입니다!";
  const scheduleUserName = String(userName || "00").endsWith("님") ? String(userName || "00").slice(0, -1) : String(userName || "00");
  const scheduleInfoMessage = `AI가 최적의 가사일을\n자동으로 계획하려면\n${scheduleUserName}님의 일정 정보가 필요해요!`;
  const [introTextLength, setIntroTextLength] = useState(0);
  const [scheduleInfoTextLength, setScheduleInfoTextLength] = useState(0);
  const guideByStep = {
    intro: "어서오세요",
    scheduleInfo: "일정 정보가 필요해요",
    ready: "추천 준비 완료",
  };
  const onboardingApplianceOptions = [
    ["세탁기", "washer"],
    ["건조기", "dryer"],
    ["식기세척기", "dishwasher"],
    ["로봇청소기", "robot"],
    ["공기청정기", "air-purifier"],
    ["거실 에어컨", "air-living"],
    ["수민 에어컨", "air-sumin"],
    ["다빈 에어컨", "air-dabin"],
    ["재혁 에어컨", "air-jaehyeok"],
  ];
  const selectedAppliances = isAppliance || isAssignee ? onboardingApplianceOptions : onboardingApplianceOptions.filter(([, type]) => selectedApplianceTypes.includes(type));
  const assignedApplianceTypes = useMemo(
    () => onboardingApplianceOptions.map(([, type]) => type).filter((type) => Boolean(applianceAssignees[type])),
    [applianceAssignees],
  );
  const hasAssignedAppliance = selectedAppliances.length > 0 && selectedAppliances.every(([, type]) => Boolean(applianceAssignees[type]));
  const introText = introMessage.slice(0, introTextLength);
  const isIntroComplete = introTextLength >= introMessage.length;
  const scheduleInfoText = scheduleInfoMessage.slice(0, scheduleInfoTextLength);
  const isScheduleInfoComplete = scheduleInfoTextLength >= scheduleInfoMessage.length;
  const fixedDays = ["일", "월", "화", "수", "목", "금", "토"];
  const fixedHours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
  const fixedMinutes = ["00", "10", "20", "30", "40", "50"];
  const fixedTimelineStartHour = 6;
  const fixedTimelineEndHour = 24;
  const fixedTimelineRowHeight = 42;
  const fixedTimelineHours = Array.from({ length: fixedTimelineEndHour - fixedTimelineStartHour }, (_, index) => fixedTimelineStartHour + index);
  const isFixedScheduleReady = Boolean(fixedTitle.trim() && fixedDay && fixedStartHour && fixedStartMinute && fixedEndHour && fixedEndMinute);

  useEffect(() => {
    if (!isIntro) return undefined;

    setIntroTextLength(0);
    const interval = window.setInterval(() => {
      setIntroTextLength((current) => {
        if (current >= introMessage.length) {
          window.clearInterval(interval);
          return current;
        }

        return current + 1;
      });
    }, 34);

    return () => window.clearInterval(interval);
  }, [isIntro, introMessage.length]);

  useEffect(() => {
    if (!isScheduleInfo) return undefined;

    setScheduleInfoTextLength(0);
    const interval = window.setInterval(() => {
      setScheduleInfoTextLength((current) => {
        if (current >= scheduleInfoMessage.length) {
          window.clearInterval(interval);
          return current;
        }

        return current + 1;
      });
    }, 34);

    return () => window.clearInterval(interval);
  }, [isScheduleInfo, scheduleInfoMessage.length]);

  useEffect(() => {
    if (!isReady) return undefined;

    const timeout = window.setTimeout(
      () =>
        onComplete({
          applianceTypes: assignedApplianceTypes,
          applianceAssignees,
        }),
      5000,
    );
    return () => window.clearTimeout(timeout);
  }, [applianceAssignees, assignedApplianceTypes, isReady, onComplete]);

  function toggleApplianceType(type) {
    setSelectedApplianceTypes((current) => {
      if (!current.includes(type)) {
        return [...current, type];
      }

      setApplianceAssignees((assignees) => {
        const { [type]: _removed, ...next } = assignees;
        return next;
      });
      return current.filter((item) => item !== type);
    });
  }

  function changeApplianceAssignee(type, assignee) {
    setApplianceAssignees((current) => ({ ...current, [type]: assignee }));
  }

  function autoFillApplianceAssignees() {
    setApplianceAssignees({
      washer: "theresa",
      dryer: "me",
      dishwasher: "theresa",
      robot: "minsu",
      "air-purifier": "me",
      "air-living": "minsu",
      "air-sumin": "theresa",
      "air-dabin": "minsu",
      "air-jaehyeok": "me",
    });
  }

  function importGoogleCalendar() {
    setSelectedImportMethod("google");
    window.setTimeout(onPreview, 180);
  }

  function registerFixedSchedule(event) {
    event.preventDefault();
    if (!isFixedScheduleReady) return;

    const nextSchedule = {
      id: Date.now(),
      title: fixedTitle.trim(),
      day: fixedDay,
      startTime: `${fixedStartHour}:${fixedStartMinute}`,
      endTime: `${fixedEndHour}:${fixedEndMinute}`,
      color: getFixedScheduleColor(fixedTitle.trim()) || getFixedScheduleColor(fixedSchedules.length),
    };
    const duplicatedIds = getOverlappingFixedScheduleIds(fixedSchedules, [nextSchedule]);

    if (duplicatedIds.length > 0 && !window.confirm("일정이 중복되면 중복된 일정을 삭제하시겠습니까?")) return;

    setFixedSchedules((current) => [...current.filter((schedule) => !duplicatedIds.includes(schedule.id)), nextSchedule]);
    setFixedTitle("");
    setFixedDay("");
    setFixedStartHour("");
    setFixedStartMinute("");
    setFixedEndHour("");
    setFixedEndMinute("");
  }

  function addFixedScheduleTemplate(templateId) {
    const templateSchedules = fixedScheduleTemplates[templateId] || [];
    const timestamp = Date.now();
    const nextSchedules = templateSchedules.map((schedule, index) => ({
      ...schedule,
      id: `${templateId}-${timestamp}-${index}`,
      sourceTemplate: templateId,
      color: schedule.color || getFixedScheduleColor(schedule.title) || getFixedScheduleColor(index),
    }));
    const duplicatedIds = getOverlappingFixedScheduleIds(fixedSchedules, nextSchedules);

    if (duplicatedIds.length > 0 && !window.confirm("일정이 중복되면 중복된 일정을 삭제하시겠습니까?")) return;

    setFixedSchedules((current) => [...current.filter((schedule) => schedule.sourceTemplate !== templateId && !duplicatedIds.includes(schedule.id)), ...nextSchedules]);
  }

  function getFixedScheduleBlockStyle(schedule) {
    const startMinutes = toFixedScheduleMinutes(schedule.startTime);
    const endMinutes = toFixedScheduleMinutes(schedule.endTime);
    const timelineStart = fixedTimelineStartHour * 60;
    const top = Math.max(0, ((startMinutes - timelineStart) / 60) * fixedTimelineRowHeight);
    const height = Math.max(24, ((Math.max(endMinutes, startMinutes + 30) - startMinutes) / 60) * fixedTimelineRowHeight);
    return { top: `${top}px`, height: `${height}px`, "--fixed-schedule-color": schedule.color || getFixedScheduleColor(schedule.title) };
  }

  return (
    <section className={`onboarding-page ${isFixedSchedule ? "onboarding-fixed-page" : ""}`} aria-label="온보딩">
      {!isIntro && !isScheduleInfo && !isReady && <button className="onboarding-back-zone" type="button" onClick={onBack} aria-label="이전 단계로 이동" />}
      {!isIntro && !isScheduleInfo && !isGoogleConfirm && !isFixedSchedule && !isReady && (
        <div className="onboarding-progress" aria-hidden="true">
          {["fixedSchedule", "appliance", "ready"].map((item) => (
            <span key={item} className={step === item ? "active" : ""} />
          ))}
        </div>
      )}

      {isFixedSchedule && false && (
        <div className="onboarding-card">
          <div>
            <p className="onboarding-kicker">기본 정보</p>
            <h1>생활 패턴을 알려주세요</h1>
            <p>입력한 값은 첫 10일 추천 일정과 가족별 담당 배분에만 사용합니다.</p>
          </div>

          <label className="onboarding-field">
            가족 구성원
            <select value={profile.familyCount} onChange={(event) => onChangeProfile("familyCount", Number(event.target.value))}>
              <option value={1}>1명</option>
              <option value={2}>2명</option>
              <option value={3}>3명</option>
              <option value={4}>4명 이상</option>
            </select>
          </label>
          <label className="onboarding-field">
            빨래하는 요일
            <input value={profile.laundryDays} onChange={(event) => onChangeProfile("laundryDays", event.target.value)} />
          </label>
          <label className="onboarding-field">
            주 청소 요일
            <input value={profile.cleaningDay} onChange={(event) => onChangeProfile("cleaningDay", event.target.value)} />
          </label>
          <label className="onboarding-field">
            보통 귀가 시간
            <input type="time" value={profile.returnHomeTime} onChange={(event) => onChangeProfile("returnHomeTime", event.target.value)} />
          </label>

          <div className="onboarding-actions">
            <button type="button" onClick={onBack}>
              이전
            </button>
            <button className="onboarding-primary" type="button" onClick={onPreview}>
              추천 보기
            </button>
          </div>
        </div>
      )}

      <div
        className={`onboarding-character-scene ${isIntro ? "intro" : ""} ${isScheduleInfo ? "info" : ""} ${isFixedSchedule ? "profile fixed" : ""} ${isGoogleConfirm ? "google-confirm" : ""} ${isAppliance ? "appliance" : ""} ${
          isAssignee ? "assignee" : ""
        } ${isReady ? "ready" : ""}`}
      >
        {isIntro ? (
          <section className="onboarding-intro-panel" aria-label="환영 멘트">
            <p className="onboarding-intro-type">
              {renderTypedOnboardingText(introText, "플래니")}
              {!isIntroComplete && <i aria-hidden="true" />}
            </p>
            <button className="onboarding-next-button" type="button" onClick={onNext} disabled={!isIntroComplete} aria-label="다음 단계로 이동">
              <span>NEXT</span>
              <ArrowRight size={18} strokeWidth={2.6} />
            </button>
          </section>
        ) : isScheduleInfo ? (
          <section className="onboarding-intro-panel onboarding-info-panel" aria-label="일정 정보 안내">
            <p className="onboarding-intro-type onboarding-info-type">
              {renderTypedOnboardingText(scheduleInfoText, scheduleUserName)}
              {!isScheduleInfoComplete && <i aria-hidden="true" />}
            </p>
            <button className="onboarding-next-button onboarding-info-next-button" type="button" onClick={onInfoNext} disabled={!isScheduleInfoComplete} aria-label="고정 일정 입력으로 이동">
              <span>NEXT</span>
              <ArrowRight size={18} strokeWidth={2.6} />
            </button>
          </section>
        ) : isFixedSchedule ? (
          <div className="onboarding-card onboarding-method-card onboarding-fixed-card">
            <div className="onboarding-fixed-progress" aria-hidden="true">
              {["fixedSchedule", "appliance", "ready"].map((item) => (
                <span key={item} className={step === item ? "active" : ""} />
              ))}
            </div>
            <div>
              <h1>고정 일정을 알려주세요.</h1>
              <p>일상에서 반복되는 고정 일정을 입력해 주세요.</p>
            </div>

            <div className="onboarding-fixed-timetable" aria-label="입력된 고정 일정 타임테이블">
              <div className="onboarding-fixed-days" aria-hidden="true">
                <span />
                {fixedDays.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="onboarding-fixed-scroll">
                <div
                  className="onboarding-fixed-grid"
                  style={{
                    "--fixed-hour-count": fixedTimelineHours.length,
                    "--fixed-hour-height": `${fixedTimelineRowHeight}px`,
                  }}
                >
                  <div className="onboarding-fixed-time-axis" aria-hidden="true">
                    {fixedTimelineHours.map((hour) => (
                      <span key={hour}>{String(hour).padStart(2, "0")}:00</span>
                    ))}
                  </div>
                  {fixedDays.map((day) => (
                    <div className="onboarding-fixed-day-column" key={day}>
                      {fixedTimelineHours.map((hour) => (
                        <span className="onboarding-fixed-hour-line" key={hour} aria-hidden="true" />
                      ))}
                      {fixedSchedules
                        .filter((schedule) => schedule.day === day)
                        .map((schedule) => (
                          <span key={schedule.id} className="onboarding-fixed-block" style={getFixedScheduleBlockStyle(schedule)}>
                            <strong>{schedule.title}</strong>
                            <small>
                              {schedule.startTime} - {schedule.endTime}
                            </small>
                          </span>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <form className="onboarding-fixed-form" onSubmit={registerFixedSchedule}>
              <label>
                <span className="onboarding-fixed-title-row">
                  <strong>일정명</strong>
                  <button className={`onboarding-fixed-register ${isFixedScheduleReady ? "active" : ""}`} type="submit" disabled={!isFixedScheduleReady}>
                    등록
                  </button>
                </span>
                <input value={fixedTitle} onChange={(event) => setFixedTitle(event.target.value)} placeholder="일정명을 입력해 주세요" />
              </label>

              <fieldset>
                <legend>요일</legend>
                <div className="onboarding-fixed-day-row">
                  {fixedDays.map((day) => (
                    <button key={day} type="button" className={fixedDay === day ? "selected" : ""} onClick={() => setFixedDay(day)}>
                      {day}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>일정 시간</legend>
                <div className="onboarding-fixed-time-row">
                  <TimeSelect label="시작 시" value={fixedStartHour} options={fixedHours} onChange={setFixedStartHour} />
                  <TimeSelect label="시작 분" value={fixedStartMinute} options={fixedMinutes} onChange={setFixedStartMinute} />
                  <span>시작</span>
                  <TimeSelect label="끝 시" value={fixedEndHour} options={fixedHours} onChange={setFixedEndHour} />
                  <TimeSelect label="끝 분" value={fixedEndMinute} options={fixedMinutes} onChange={setFixedEndMinute} />
                  <span>끝</span>
                </div>
              </fieldset>
            </form>

            <div className="onboarding-fixed-auto-actions" aria-label="자동 일정 추가">
              <button type="button" onClick={() => addFixedScheduleTemplate("sumin")}>
                수민 일정 추가
              </button>
              <button type="button" onClick={() => addFixedScheduleTemplate("jaehyeok")}>
                재혁 일정 추가
              </button>
              <button type="button" onClick={() => addFixedScheduleTemplate("dabin")}>
                다빈 일정 추가
              </button>
            </div>

            <button className="onboarding-next-button onboarding-fixed-next-button" type="button" onClick={onFixedNext} aria-label="구글 캘린더 연동 확인으로 이동">
              <span>NEXT</span>
              <ArrowRight size={18} strokeWidth={2.6} />
            </button>
          </div>
        ) : isGoogleConfirm ? (
          <section className="onboarding-intro-panel onboarding-google-confirm" aria-label="구글 캘린더 연동 확인">
            <p className="onboarding-intro-type onboarding-info-type">
              구글 캘린더에 등록된 일정도
              <br />
              함께 불러올까요?
            </p>
            <div className="onboarding-google-actions">
              <button type="button" onClick={onPreview}>
                나중에
              </button>
              <button className={selectedImportMethod === "google" ? "active" : ""} type="button" onClick={importGoogleCalendar}>
                연동하기
              </button>
            </div>
          </section>
        ) : isAppliance ? (
          <div className="onboarding-card onboarding-appliance-card onboarding-combined-appliance-card">
            <div className="onboarding-assignee-head">
              <div>
                <h1>가전별 담당자를 지정해주세요.</h1>
                <p>담당자에게 가전 작동 알림이 가요.</p>
              </div>
              <button type="button" onClick={autoFillApplianceAssignees}>
                자동으로 채우기
              </button>
            </div>

            <div className="onboarding-assignee-list" aria-label="가전별 담당자 지정">
              {selectedAppliances.map(([label, type]) => (
                <label className={`onboarding-assignee-row ${applianceAssignees[type] ? "assigned" : ""}`} key={type}>
                  <span className={`onboarding-assignee-icon ${type}`} aria-hidden="true">
                    <i />
                  </span>
                  <strong>{label}</strong>
                  <select
                    className={applianceAssignees[type] ? "assigned" : ""}
                    value={applianceAssignees[type] || ""}
                    onChange={(event) => changeApplianceAssignee(type, event.target.value)}
                  >
                    <option value="" disabled>
                      담당자를 선택해 주세요.
                    </option>
                    {members
                      .filter((member) => member.id !== "all")
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="onboarding-appliance-layout">
              <div className="onboarding-appliance-grid" aria-label="자동화할 가전 선택">
                {onboardingApplianceOptions.map(([label, type]) => {
                  const isSelected = selectedApplianceTypes.includes(type);

                  return (
                    <button
                      key={label}
                      className={isSelected ? "selected" : ""}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleApplianceType(type)}
                    >
                      <span className={`onboarding-appliance-icon ${type}`} aria-hidden="true">
                        <i />
                      </span>
                      <strong>{label}</strong>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              className={`onboarding-assignee-complete ${hasAssignedAppliance ? "active" : ""}`}
              type="button"
              onClick={onApplianceNext}
              disabled={!hasAssignedAppliance}
              aria-label="담당자 지정 완료"
            >
              <span>NEXT</span>
              <ArrowRight size={18} strokeWidth={2.6} />
            </button>
          </div>
        ) : isAssignee ? (
          <div className="onboarding-card onboarding-assignee-card">
            <div className="onboarding-assignee-head">
              <div>
                <h1>가전별 담당자를 지정해주세요.</h1>
                <p>담당자에게 가전 작동 알림이 가요.</p>
              </div>
              <button type="button" onClick={autoFillApplianceAssignees}>
                자동으로 채우기
              </button>
            </div>

            <div className="onboarding-assignee-list" aria-label="가전별 담당자 지정">
              {selectedAppliances.map(([label, type]) => (
                <label className={`onboarding-assignee-row ${applianceAssignees[type] ? "assigned" : ""}`} key={type}>
                  <span className={`onboarding-assignee-icon ${type}`} aria-hidden="true">
                    <i />
                  </span>
                  <strong>{label}</strong>
                  <select
                    className={applianceAssignees[type] ? "assigned" : ""}
                    value={applianceAssignees[type] || ""}
                    onChange={(event) => changeApplianceAssignee(type, event.target.value)}
                  >
                    <option value="" disabled>
                      담당자를 선택해 주세요.
                    </option>
                    {members
                      .filter((member) => member.id !== "all")
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
            </div>

            <button
              className={`onboarding-assignee-complete ${hasAssignedAppliance ? "active" : ""}`}
              type="button"
              onClick={onAssigneeNext}
              disabled={!hasAssignedAppliance}
              aria-label="담당자 지정 완료"
            >
              <span>NEXT</span>
              <ArrowRight size={18} strokeWidth={2.6} />
            </button>
          </div>
        ) : (
          <div className="onboarding-ai-wait" role="status" aria-live="polite">
            <section className="onboarding-ai-wait-card">
              <span className="onboarding-ai-spinner" aria-hidden="true" />
              <p>
                {scheduleUserName}님의 일정, 날씨, 온습도
                <br />
                데이터를 분석해서
                <br />
                플래니가 <span className="onboarding-ai-highlight">최적의 가사일 계획</span>을
                <br />
                짜고 있어요!
              </p>
              <span className="onboarding-ai-character-wrap" aria-hidden="true">
                <img className="onboarding-floating-star star-a" src={floatingStar} alt="" />
                <img className="onboarding-floating-star star-b" src={floatingStar} alt="" />
                <img className="onboarding-character-image" src={lgCharacter} alt="" />
              </span>
            </section>
          </div>
        )}
        {!isReady && !isFixedSchedule && (
          <span className="onboarding-character-wrap" aria-hidden="true">
            <img className="onboarding-floating-star star-a" src={floatingStar} alt="" />
            <img className="onboarding-floating-star star-b" src={floatingStar} alt="" />
            <img className="onboarding-character-image" src={lgCharacter} alt="" />
          </span>
        )}
      </div>
    </section>
  );
}

function renderTypedOnboardingText(text, highlightWord = "") {
  const lines = text.split("\n");

  return lines.map((line, index) => {
    const highlightIndex = highlightWord ? line.indexOf(highlightWord) : -1;
    const isPartialHighlight = highlightWord && highlightIndex === -1 && highlightWord.startsWith(line) && line.length > 0;

    return (
      <span key={index}>
        {highlightIndex >= 0 ? (
          <>
            {line.slice(0, highlightIndex)}
            <span className="onboarding-highlight-name">{highlightWord}</span>
            {line.slice(highlightIndex + highlightWord.length)}
          </>
        ) : isPartialHighlight ? (
          <span className="onboarding-highlight-name">{line}</span>
        ) : (
          line
        )}
        {index < lines.length - 1 && <br />}
      </span>
    );
  });
}

function HomePage({ onOpenNotifications }) {
  const [environmentData, setEnvironmentData] = useState(() => ({
    short: { status: "idle", data: null, error: "" },
    mid: { status: "idle", data: null, error: "" },
    air: { status: "idle", data: null, error: "" },
  }));

  useEffect(() => {
    let isActive = true;

    async function loadEnvironmentData() {
      setEnvironmentData({
        short: { status: "loading", data: null, error: "" },
        mid: { status: "loading", data: null, error: "" },
        air: { status: "loading", data: null, error: "" },
      });

      const [shortResult, midResult, airResult] = await Promise.allSettled([
        fetchShortWeather(),
        fetchMidWeather(),
        fetchAirQuality(),
      ]);

      if (!isActive) return;

      setEnvironmentData({
        short: resultToApiState(shortResult),
        mid: resultToApiState(midResult),
        air: resultToApiState(airResult),
      });
    }

    loadEnvironmentData();

    return () => {
      isActive = false;
    };
  }, []);

  function refreshEnvironmentData() {
    setEnvironmentData((current) => ({
      short: { ...current.short, status: "loading", error: "" },
      mid: { ...current.mid, status: "loading", error: "" },
      air: { ...current.air, status: "loading", error: "" },
    }));

    Promise.allSettled([fetchShortWeather(), fetchMidWeather(), fetchAirQuality()]).then(([shortResult, midResult, airResult]) => {
      setEnvironmentData({
        short: resultToApiState(shortResult),
        mid: resultToApiState(midResult),
        air: resultToApiState(airResult),
      });
    });
  }

  return (
    <section className="thinq-home-page" aria-label="홈">
      <header className="thinq-statusbar" aria-label="상태 표시줄">
        <strong>6:21</strong>
        <span>⌁ 5G ▮▮ 63</span>
      </header>

      <div className="thinq-home-top">
        <button className="thinq-home-selector" type="button">
          <strong>우리 집</strong>
          <ChevronDown size={24} />
        </button>
        <div className="thinq-home-actions">
          <button type="button" aria-label="추가">
            <Plus size={34} strokeWidth={1.6} />
          </button>
          <button className="thinq-bell-button" type="button" aria-label="알림" onClick={onOpenNotifications}>
            <Bell size={29} fill="currentColor" strokeWidth={1.6} />
            <i aria-hidden="true" />
          </button>
          <button type="button" aria-label="더보기">
            <MoreVertical size={31} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <section className="thinq-event-card">
        <div className="thinq-temp-badge" aria-hidden="true">
          <span>26°C</span>
        </div>
        <div>
          <h1>여름철 에어컨 에너지도 아끼면서 풍성한 혜택도 함께 받아보세요!</h1>
          <button type="button">이벤트 알아보기</button>
        </div>
      </section>

      <section className="thinq-homeview-card">
        <div className="thinq-homeview-model" aria-hidden="true">
          <div className="model-floor" />
          <div className="model-wall wall-a" />
          <div className="model-wall wall-b" />
          <div className="model-wall wall-c" />
          <div className="model-sofa" />
          <div className="model-tv" />
          <div className="model-bed" />
          <div className="model-fridge" />
          <div className="model-washer" />
          <div className="model-plant plant-a" />
          <div className="model-plant plant-b" />
        </div>
        <p>3D 홈뷰를 만들고 있어요.</p>
      </section>

      <section className="thinq-favorites-section">
        <h2>즐겨 찾는 제품</h2>
        <div className="thinq-favorites-empty">
          <p>자주 쓰는 제품을 배치해 홈 화면에서 바로 사용해보세요.</p>
          <button type="button">
            <Pencil size={22} fill="currentColor" />
            편집하기
          </button>
        </div>
      </section>

      <button className="thinq-play-banner" type="button">
        <span className="thinq-play-icon" aria-hidden="true" />
        <span>
          <strong>ThinQ PLAY</strong>
          앱을 다운로드하여 제품과 공간을 업그레이드해보세요.
        </span>
        <i aria-hidden="true">∞</i>
      </button>

      <EnvironmentDataPanel data={environmentData} onRefresh={refreshEnvironmentData} />

      <section className="thinq-smart-routine">
        <h2>스마트 루틴</h2>
      </section>
    </section>
  );
}

function EnvironmentDataPanel({ data, onRefresh }) {
  const isLoading = Object.values(data).some((item) => item.status === "loading");
  const shortItems = normalizePayloadList(data.short.data);
  const midItems = normalizePayloadList(data.mid.data);
  const airItems = normalizePayloadList(data.air.data);
  const airNow = airItems[0] || (data.air.data && typeof data.air.data === "object" ? data.air.data : null);

  return (
    <section className="environment-panel" aria-label="날씨와 미세먼지">
      <div className="environment-panel-head">
        <div>
          <h2>오늘의 환경</h2>
          <p>단기예보, 중기예보, 미세먼지 데이터를 API에서 불러와요.</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? "불러오는 중" : "새로고침"}
        </button>
      </div>

      <div className="environment-grid">
        <ForecastSummaryCard title="단기예보" state={data.short} items={shortItems} emptyText="단기예보 데이터가 없습니다." />
        <ForecastSummaryCard title="중기예보" state={data.mid} items={midItems} emptyText="중기예보 데이터가 없습니다." />
        <AirQualityCard state={data.air} item={airNow} />
      </div>
    </section>
  );
}

function ForecastSummaryCard({ title, state, items, emptyText }) {
  return (
    <article className="environment-card">
      <span>{title}</span>
      {state.status === "loading" ? (
        <p className="environment-message">데이터를 불러오고 있어요.</p>
      ) : state.status === "error" ? (
        <p className="environment-error">{state.error}</p>
      ) : items.length === 0 ? (
        <p className="environment-message">{emptyText}</p>
      ) : (
        <div className="environment-forecast-list">
          {items.slice(0, 3).map((item, index) => (
            <div className="environment-forecast-row" key={`${title}-${item.date || index}`}>
              <strong>{formatWeatherDate(item.date) || `${index + 1}번째 예보`}</strong>
              <p>
                {formatWeatherIcon(item.icon)}
                {formatWeatherTemperatures(item)}
              </p>
              <small>{formatWeatherDetail(item)}</small>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function AirQualityCard({ state, item }) {
  const grade = item ? item.khaiGrade || item.pm10Grade || item.pm25Grade || item.grade || item.status : "";

  return (
    <article className="environment-card air">
      <span>미세먼지</span>
      {state.status === "loading" ? (
        <p className="environment-message">데이터를 불러오고 있어요.</p>
      ) : state.status === "error" ? (
        <p className="environment-error">{state.error}</p>
      ) : !item ? (
        <p className="environment-message">미세먼지 데이터가 없습니다.</p>
      ) : (
        <div className="environment-air-body">
          <strong>{formatAirQualityGrade(grade)}</strong>
          <p>
            PM10 {formatNullableValue(item.pm10Value || item.pm10, "ug/m3")} · PM2.5 {formatNullableValue(item.pm25Value || item.pm25, "ug/m3")}
          </p>
          <small>{item.stationName || item.sidoName || item.dataTime || "측정소 정보 없음"}</small>
        </div>
      )}
    </article>
  );
}

function TimeSelect({ label, value, options, onChange }) {
  const [isOpen, setOpen] = useState(false);

  function chooseOption(option) {
    onChange(option);
    setOpen(false);
  }

  return (
    <div className="onboarding-time-select" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setOpen((current) => !current)}>
        {value || "--"}
        <i aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="onboarding-time-options" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              className={value === option ? "selected" : ""}
              onClick={() => chooseOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function toFixedScheduleMinutes(time) {
  const [hour, minute] = String(time || "00:00").split(":").map(Number);
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function SimpleTabPage({ icon, title, text }) {
  return (
    <section className="page simple-tab-page">
      <div className="simple-tab-icon">{icon}</div>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

function resultToApiState(result) {
  if (result.status === "fulfilled") {
    return { status: "success", data: result.value, error: "" };
  }

  return {
    status: "error",
    data: null,
    error: result.reason instanceof Error ? result.reason.message : "API 호출에 실패했습니다.",
  };
}

function normalizePayloadList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const candidates = [
    payload.data,
    payload.items,
    payload.list,
    payload.results,
    payload.response?.body?.items?.item,
    payload.response?.body?.items,
    payload.body?.items?.item,
    payload.body?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") return [candidate];
  }

  return [payload];
}

function formatWeatherDate(date) {
  if (!date) return "";
  const text = String(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const [, month, day] = text.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function formatWeatherTemperatures(item) {
  const minTemp = item.minTemp ?? item.minTemperature ?? item.tmn;
  const maxTemp = item.maxTemp ?? item.maxTemperature ?? item.tmx;
  const currentTemp = item.temp ?? item.temperature ?? item.tmp;

  if (Number.isFinite(Number(minTemp)) || Number.isFinite(Number(maxTemp))) {
    return `${formatNullableValue(minTemp, "C")} / ${formatNullableValue(maxTemp, "C")}`;
  }

  return Number.isFinite(Number(currentTemp)) ? `${currentTemp}C` : "기온 정보 없음";
}

function formatWeatherIcon(icon) {
  const iconMap = {
    sunny: "☀️ ",
    partly_cloudy: "⛅ ",
    cloudy: "☁️ ",
    rain: "🌧️ ",
    snow: "❄️ ",
  };

  return iconMap[icon] || "";
}

function formatWeatherDetail(item) {
  const parts = [
    item.sky,
    item.pty,
    Number.isFinite(Number(item.pop)) ? `강수확률 ${item.pop}%` : "",
    Number.isFinite(Number(item.humidity)) ? `습도 ${item.humidity}%` : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : item.source || "상세 정보 없음";
}

function formatAirQualityGrade(grade) {
  const gradeMap = {
    1: "좋음",
    2: "보통",
    3: "나쁨",
    4: "매우 나쁨",
  };

  return gradeMap[grade] || grade || "등급 정보 없음";
}

function formatNullableValue(value, suffix = "") {
  return value === null || value === undefined || value === "" || value === "-" ? "정보 없음" : `${value}${suffix}`;
}

function sortTasks(tasks) {
  return [...tasks].sort(taskSorter);
}

function isTaskVisibleOnDate(task, date) {
  return getTaskDateKeys(task).includes(date);
}

function getTaskDateKeys(task) {
  const startDate = normalizeTaskDateKey(task.date);
  if (!startDate) return [];

  const endDate = normalizeTaskDateKey(task.endDate) || startDate;
  const [fromDate, toDate] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
  const dates = [];
  let currentDate = fromDate;

  for (let count = 0; count < 370; count += 1) {
    dates.push(currentDate);
    if (currentDate === toDate) break;
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

function normalizeTaskDateKey(value) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function taskSorter(a, b) {
  if (a.done !== b.done) return Number(a.done) - Number(b.done);
  if (Number.isFinite(a.sortOrder) || Number.isFinite(b.sortOrder)) {
    return (a.sortOrder ?? 99) - (b.sortOrder ?? 99);
  }
  return b.id - a.id;
}

function addDays(date, amount) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + amount);
  return dateKey(next.getFullYear(), next.getMonth() + 1, next.getDate());
}

function getTodayKey() {
  const today = new Date();
  return dateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

function normalizeGeneratedTaskTitles(tasks) {
  return tasks.map(normalizeGeneratedTaskTitle);
}

function normalizeGeneratedTaskTitle(task) {
  if (task.displayType !== "fixed") return task;

  const title = String(task.title || "");
  const nextTitle = title.replace(/^\s*\d{1,2}\s*시\s*/, "").trim();
  if (!nextTitle || nextTitle === title) return task;

  return { ...task, title: nextTitle };
}

function buildOnboardingTasks(profile, selectedMember, onboardingSetup = {}) {
  const baseDate = new Date(`${getTodayKey()}T00:00:00`);
  const familyOwners = ["me", "minsu", "theresa", "all"].slice(0, Math.max(1, Number(profile.familyCount) || 1));
  const timestamp = Date.now();
  const selectedApplianceTypes = normalizeOnboardingApplianceTypes(onboardingSetup.applianceTypes);
  const ownerAt = (index) => {
    if (selectedMember !== "all") return selectedMember;
    return familyOwners[index % familyOwners.length] || "me";
  };
  const at = (offset) => {
    const next = new Date(baseDate);
    next.setDate(baseDate.getDate() + offset);
    return dateKey(next.getFullYear(), next.getMonth() + 1, next.getDate());
  };
  const fixedPlans = [
    { title: "약 문의", place: "고정 일정", repeat: "12:00", tag: "plan" },
    { title: "회식 참석", place: "고정 일정", repeat: "18:00", tag: "plan" },
  ];

  return Array.from({ length: 10 }, (_, dayIndex) => {
    const dayAppliances = [selectedApplianceTypes[dayIndex % selectedApplianceTypes.length], selectedApplianceTypes[(dayIndex + 1) % selectedApplianceTypes.length]];
    const dayTasks = [
      ...fixedPlans.map((plan, index) => ({
        id: timestamp + dayIndex * 10 + index,
        date: at(dayIndex),
        title: plan.title,
        place: plan.place,
        tag: plan.tag,
        owner: ownerAt(index),
        done: false,
        repeat: plan.repeat,
        source: "manual",
        displayType: "fixed",
        sortOrder: index,
      })),
      ...dayAppliances.map((type, index) => {
        const plan = applianceOnboardingPlans[type] || applianceOnboardingPlans.washer;
        return {
          id: timestamp + dayIndex * 10 + index + 2,
          date: at(dayIndex),
          title: plan.titles[(dayIndex + index) % plan.titles.length],
          place: plan.place,
          tag: "house",
          owner: onboardingSetup.applianceAssignees?.[type] || ownerAt(index + 2),
          done: false,
          repeat: profile.returnHomeTime && index === 1 ? `${profile.returnHomeTime} 전 자동` : "AI 자동",
          source: "auto",
          displayType: "appliance",
          applianceType: type,
          sortOrder: index + 2,
        };
      }),
    ];

    return dayTasks;
  }).flat();
}

const applianceOnboardingPlans = {
  washer: {
    place: "세탁실",
    titles: ["세탁 예약", "빨래 시작", "세탁물 정리"],
  },
  air: {
    place: "거실",
    titles: ["에어컨 예냉", "실내 온도 조절", "귀가 전 냉방"],
  },
  fridge: {
    place: "주방",
    titles: ["냉장고 정리", "식재료 확인", "유통기한 체크"],
  },
  dryer: {
    place: "세탁실",
    titles: ["건조 예약", "건조 필터 확인", "습도 맞춤 건조"],
  },
  dehumidifier: {
    place: "거실",
    titles: ["제습기 예약", "습도 맞춤 제습", "실내 습도 확인"],
  },
  robot: {
    place: "거실",
    titles: ["로봇청소 시작", "바닥 청소 예약", "청소 구역 확인"],
  },
  dishwasher: {
    place: "주방",
    titles: ["식기세척 예약", "식기세척기 작동", "그릇 정리"],
  },
  "air-purifier": {
    place: "거실",
    titles: ["공기청정기 작동", "실내 공기 정화", "환기 후 공기청정"],
  },
  "air-living": {
    place: "거실",
    titles: ["거실 에어컨 예냉", "거실 냉방 예약", "거실 온도 조절"],
  },
  "air-sumin": {
    place: "수민 방",
    titles: ["수민 에어컨 예냉", "수민 방 냉방", "수민 방 온도 조절"],
  },
  "air-dabin": {
    place: "다빈 방",
    titles: ["다빈 에어컨 예냉", "다빈 방 냉방", "다빈 방 온도 조절"],
  },
  "air-jaehyeok": {
    place: "재혁 방",
    titles: ["재혁 에어컨 예냉", "재혁 방 냉방", "재혁 방 온도 조절"],
  },
};

function normalizeOnboardingApplianceTypes(applianceTypes = []) {
  const normalized = applianceTypes.filter((type) => applianceOnboardingPlans[type]);
  if (normalized.length >= 2) return normalized;

  return [...new Set([...normalized, "washer", "air"])].slice(0, 2);
}

const appliancePlaceLabel = {
  WASHER: "세탁실",
  DRYER: "세탁실",
  NATURAL_DRY: "세탁실",
  DEHUMIDIFIER: "거실",
  AIR_CONDITIONER: "거실",
  AIR_PURIFIER: "거실",
  ROBOT_CLEANER: "현관",
};

function isLaundryTask(task) {
  return /세탁|빨래/.test(task.title);
}

function isCalendarHouseworkTask(task) {
  return task.displayType === "appliance" || task.tag === "house" || task.source === "auto";
}

function shouldSuggestAutomation(task) {
  return task.source !== "auto" && /(회식|약속|여행|출근|수업|퇴근|귀가)/.test(`${task.title} ${task.place} ${task.repeat}`);
}

function pendingTasksForNotification(tasks, context = {}) {
  const currentMinutes = timeValueToMinutes(context.time);
  return tasks
    .filter((task) => !task.done)
    .filter((task) => isTaskVisibleOnDate(task, context.date))
    .filter((task) => {
      const range = getTaskNotificationRange(task);
      if (!range) return true;
      return range.startMinutes <= currentMinutes + 30 && range.endMinutes >= currentMinutes - 10;
    })
    .sort(taskSorter)
    .slice(0, 5);
}

function buildConditionalNotifications(tasks, context = {}) {
  const dateTasks = tasks.filter((task) => !task.done && isTaskVisibleOnDate(task, context.date));
  const currentMinutes = timeValueToMinutes(context.time);
  const notifications = [];
  const hasLaundry = dateTasks.some((task) => /세탁|빨래|건조/i.test(`${task.title} ${task.place}`));
  const hasRain = isRainyWeatherLike(context.weather);
  const soonEndingTask = dateTasks.find((task) => {
    const range = getTaskNotificationRange(task);
    return range && range.endMinutes >= currentMinutes && range.endMinutes <= currentMinutes + 60;
  });

  if (hasRain && hasLaundry) {
    notifications.push({
      id: `condition-rain-laundry-${context.date}`,
      date: context.date,
      title: "비 예보로 세탁 일정을 확인해 주세요",
      detail: `${context.userName}님의 ${context.date} 세탁/건조 일정이 날씨 영향을 받을 수 있어요.`,
      taskTitle: "세탁 일정 날씨 맞춤 조정",
      place: "세탁실",
      applianceType: "WASHER",
      scheduledTime: context.time,
    });
  }

  if (soonEndingTask && /(회사|부트\s*캠프|수업|알바|필라테스|공업|정역학|열역학|유체|재료|기계)/i.test(soonEndingTask.title)) {
    notifications.push({
      id: `condition-after-schedule-${soonEndingTask.id}`,
      date: context.date,
      title: `${soonEndingTask.title} 후 집안 환경을 준비할까요?`,
      detail: `${formatNotificationTimeRange(soonEndingTask)} 일정에 맞춰 에어컨과 공기청정기 자동화를 시연할 수 있어요.`,
      taskTitle: "귀가 전 실내 환경 자동화",
      place: "LG ThinQ",
      applianceType: "AIR_CONDITIONER",
      scheduledTime: formatTimeValue(getTaskNotificationRange(soonEndingTask).endMinutes),
    });
  }

  return notifications;
}

function buildTaskNotificationTitle(task, context = {}) {
  const range = getTaskNotificationRange(task);
  const currentMinutes = timeValueToMinutes(context.time);

  if (range && currentMinutes >= range.startMinutes && currentMinutes <= range.endMinutes) {
    return `${task.title} 진행 중`;
  }

  if (range && range.startMinutes > currentMinutes) {
    return `${task.title} 시작 예정`;
  }

  return `${task.title} 확인`;
}

function buildTaskNotificationDetail(task, context = {}) {
  const rangeText = formatNotificationTimeRange(task);
  const place = task.place || "장소 미정";
  return `${context.date} · ${rangeText} · ${place}`;
}

function getTaskNotificationScheduledTime(task = {}) {
  const range = getTaskNotificationRange(task);
  if (!range) return "";
  return formatTimeValue(range.startMinutes);
}

function getNotificationTriggerMinutes(item = {}) {
  if (item.scheduledTime) return timeValueToMinutes(item.scheduledTime);
  if (item.task) {
    const range = getTaskNotificationRange(item.task);
    return range?.startMinutes;
  }
  return undefined;
}

function getNotificationScheduleLabel(item = {}) {
  const triggerMinutes = getNotificationTriggerMinutes(item);
  if (!Number.isFinite(triggerMinutes)) return "시간 미정";
  return `${formatTimeValue(triggerMinutes)} 알림 예정`;
}

function getTaskNotificationRange(task = {}) {
  const text = String(task.repeat || "");
  const rangeMatch = text.match(/\b(\d{1,2}):(\d{2})\s*(?:~|-|to)\s*(\d{1,2}):(\d{2})\b/i);
  if (rangeMatch) {
    return {
      startMinutes: Number(rangeMatch[1]) * 60 + Number(rangeMatch[2]),
      endMinutes: Number(rangeMatch[3]) * 60 + Number(rangeMatch[4]),
    };
  }

  const clockMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (clockMatch) {
    const startMinutes = Number(clockMatch[1]) * 60 + Number(clockMatch[2]);
    return { startMinutes, endMinutes: startMinutes + 60 };
  }

  return null;
}

function formatNotificationTimeRange(task = {}) {
  const range = getTaskNotificationRange(task);
  if (!range) return task.repeat || "시간 미정";
  return `${formatTimeValue(range.startMinutes)}-${formatTimeValue(range.endMinutes)}`;
}

function buildPostponedRepeat(task = {}, startTime) {
  const range = getTaskNotificationRange(task);
  const startMinutes = timeValueToMinutes(startTime);
  const duration = range ? Math.max(30, range.endMinutes - range.startMinutes) : 60;
  const endMinutes = Math.min(23 * 60 + 59, startMinutes + duration);
  const nextRange = `${formatTimeValue(startMinutes)}-${formatTimeValue(endMinutes)}`;
  const repeat = String(task.repeat || "");
  const rangePattern = /\b\d{1,2}:\d{2}\s*(?:~|-|to)\s*\d{1,2}:\d{2}\b/i;
  const clockPattern = /\b\d{1,2}:\d{2}\b/;

  if (rangePattern.test(repeat)) return repeat.replace(rangePattern, nextRange);
  if (clockPattern.test(repeat)) return repeat.replace(clockPattern, startTime);
  return appendPostponeLabel(nextRange, "시간 변경");
}

function appendPostponeLabel(repeat, label) {
  const text = String(repeat || "").trim();
  if (!text) return label;
  if (text.includes(label)) return text;
  return `${text} · ${label}`;
}

function timeValueToMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatEditableTimeValue(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function normalizeEditableTimeValue(value) {
  const digits = String(value || "").replace(/\D/g, "").padEnd(4, "0").slice(0, 4);
  const hour = Math.min(23, Number(digits.slice(0, 2)) || 0);
  const minute = Math.min(59, Number(digits.slice(2, 4)) || 0);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTimeValue(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getCurrentTimeValue() {
  const now = new Date();
  return formatTimeValue(now.getHours() * 60 + now.getMinutes());
}

function isRainyWeatherLike(weather = {}) {
  const text = `${weather.condition || ""} ${weather.label || ""} ${weather.sky || ""} ${weather.pty || ""} ${weather.icon || ""}`;
  return /rain|storm|비|소나기|우천|강수|뇌우/i.test(text);
}

function readStoredCurrentUser() {
  if (typeof localStorage === "undefined") return null;

  try {
    const savedUser = JSON.parse(localStorage.getItem(CURRENT_USER_STORAGE_KEY) || "null");
    return findUserById(savedUser?.id);
  } catch {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    return null;
  }
}

function readStoredAppSession() {
  if (typeof localStorage === "undefined") return null;

  try {
    const session = JSON.parse(localStorage.getItem(APP_SESSION_STORAGE_KEY) || "null");
    if (!session || typeof session !== "object") return null;
    return session;
  } catch {
    localStorage.removeItem(APP_SESSION_STORAGE_KEY);
    return null;
  }
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function visibleMonthFromDate(date) {
  const [year, month] = String(date || getTodayKey()).split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  }
  return { year, month };
}

function normalizeTasksForUsers(tasks, fallbackUserId) {
  return tasks.map((task) => normalizeTaskForUser(task, fallbackUserId));
}

function normalizeTaskForUser(task, fallbackUserId) {
  const userId = getTaskUserId(task) || fallbackUserId || "jea";
  const owner = USERS.some((user) => user.id === task.owner) ? userIdToOwner(task.owner) : task.owner || userIdToOwner(userId);

  return {
    ...task,
    owner,
    userId,
  };
}

function getTaskUserId(task) {
  if (USERS.some((user) => user.id === task.userId)) return task.userId;
  if (USERS.some((user) => user.id === task.owner)) return task.owner;
  return OWNER_TO_USER[task.owner] || "";
}

function userIdToOwner(userId) {
  return USER_TO_OWNER[userId] || "me";
}
