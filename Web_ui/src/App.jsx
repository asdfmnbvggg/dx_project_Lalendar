import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Menu } from "lucide-react";
import { automationAlerts, dateKey, initialTasks, isRainyDate, members, tagLabel } from "./data.js";
import CarePage from "./pages/CarePage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import CrewPage from "./pages/CrewPage.jsx";
import DevicesPage from "./pages/DevicesPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import TaskComposer from "./components/TaskComposer.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import { CURRENT_USER_STORAGE_KEY, USERS, findUserById } from "./constants/users.js";
import { fetchCalendarWeather } from "./services/weatherService.js";
import { buildWeatherRecommendationsByDate } from "./services/weatherRecommendationService.js";
import { buildRoutineRecommendations, recordThinQUsageLog } from "./services/routinePredictionService.js";
import {
  controlThinQDevice,
  fetchThinQDeviceEnergy,
  fetchThinQDeviceState,
  fetchThinQDevices,
  subscribeThinQDeviceEvent,
  subscribeThinQDevicePush,
} from "./services/thinqIntegrationService.js";
import { mainNavItems } from "./navigation.js";
import {
  buildOnboardingTasks,
  getTodayKey,
  isLaundryTask,
  isTaskVisibleOnDate,
  normalizeGeneratedTaskTitle,
  normalizeGeneratedTaskTitles,
  normalizeThinQDevices,
  pendingTasksForNotification,
  shouldSuggestAutomation,
  sortTasks,
} from "./utils/taskUtils.js";

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

export default function App() {
  const [currentUser, setCurrentUser] = useState(readStoredCurrentUser);
  const [activeCalendarUser, setActiveCalendarUser] = useState(readStoredCurrentUser);
  const [tasks, setTasks] = useState(() => normalizeTasksForUsers(normalizeGeneratedTaskTitles(initialTasks)));
  const [memberColors, setMemberColors] = useState(() => ({
    ...Object.fromEntries(members.map((member) => [member.id, member.color])),
    ...USER_COLORS,
  }));
  const [activeTab, setActiveTab] = useState(() => (readStoredCurrentUser() ? "schedule" : "home"));
  const [isOnboardingComplete, setOnboardingComplete] = useState(() => Boolean(readStoredCurrentUser()));
  const [hasGeneratedOnboardingTasks, setHasGeneratedOnboardingTasks] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState("intro");
  const [onboardingProfile, setOnboardingProfile] = useState({
    familyCount: 2,
    laundryDays: "월, 목",
    cleaningDay: "토요일",
    returnHomeTime: "19:30",
  });
  const [selectedDate, setSelectedDate] = useState(getTodayKey);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  });
  const [selectedMember, setSelectedMember] = useState(() => readStoredCurrentUser()?.id || "jea");
  const [query, setQuery] = useState("");
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [pendingPostpone, setPendingPostpone] = useState(null);
  const [postponePicker, setPostponePicker] = useState(null);
  const [automationPrompt, setAutomationPrompt] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [panel, setPanel] = useState(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isCalendarMenuOpen, setCalendarMenuOpen] = useState(false);
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const [notificationPosition, setNotificationPosition] = useState({ x: 0, y: 0 });
  const [calendarView, setCalendarView] = useState("month");
  const [calendarWeatherByDate, setCalendarWeatherByDate] = useState({});
  const [thinQDevices, setThinQDevices] = useState([]);
  const [thinQDeviceStates, setThinQDeviceStates] = useState({});
  const [thinQDeviceAux, setThinQDeviceAux] = useState({});
  const [thinQError, setThinQError] = useState("");
  const [isThinQLoading, setThinQLoading] = useState(false);
  const [pendingThinQControl, setPendingThinQControl] = useState(null);

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

    fetchCalendarWeather()
      .then((forecastByDate) => {
        if (isActive) {
          setCalendarWeatherByDate(buildWeatherRecommendationsByDate(forecastByDate));
        }
      })
      .catch((error) => {
        console.warn(error);
        if (isActive) {
          setCalendarWeatherByDate({});
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (panel?.type === "thinq") {
      loadThinQDevices();
    }
  }, [panel?.type]);

  useEffect(() => {
    if (!currentUser) return;
    setActiveCalendarUser((current) => current || currentUser);
    setSelectedMember((current) => current || currentUser.id);
  }, [currentUser]);

  const sortedCalendarUsers = useMemo(() => {
    if (!currentUser) return USERS;
    return [currentUser, ...USERS.filter((user) => user.id !== currentUser.id)];
  }, [currentUser]);
  const activeCalendarUserId = activeCalendarUser?.id || currentUser?.id || "";
  const scopedTasks = tasks.filter((task) => !activeCalendarUserId || getTaskUserId(task) === activeCalendarUserId);
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
      const shouldShowTask = !activeCalendarUserId || getTaskUserId(task) === activeCalendarUserId;
      if (!shouldShowTask) return map;

      getTaskDateKeys(task).forEach((date) => {
        map[date] = sortTasks([...(map[date] || []), task]);
      });
      return map;
    }, {});
  }, [tasks, activeCalendarUserId]);
  const notificationItems = useMemo(() => {
    const automationItems = automationAlerts
      .filter((alert) => !dismissedAlerts.includes(alert.id))
      .map((alert) => ({ ...alert, type: "automation" }));
    const taskItems = pendingTasksForNotification(scopedTasks).map((task) => ({
      id: `task-${task.id}`,
      type: "task",
      task,
      title: task.title,
      detail: `${task.date} · ${task.place} · ${task.repeat}`,
      date: task.date,
    }));
    return [...automationItems, ...taskItems].slice(0, 8);
  }, [dismissedAlerts, scopedTasks]);
  const routineRecommendations = useMemo(
    () =>
      buildRoutineRecommendations({
        devices: thinQDevices,
        deviceStates: thinQDeviceStates,
        deviceAux: thinQDeviceAux,
        weatherByDate: calendarWeatherByDate,
        selectedDate,
      }),
    [thinQDevices, thinQDeviceStates, thinQDeviceAux, calendarWeatherByDate, selectedDate],
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
    setPostponePicker({ task, date: addDays(task.date, 1) });
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
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
    setActiveCalendarUser(user);
    setSelectedMember(user.id);
    setActiveTab("schedule");
    setOnboardingComplete(true);
  }

  function handleLogout() {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    setCurrentUser(null);
    setActiveCalendarUser(null);
    setSelectedMember("jea");
    setActiveTab("home");
    setMenuOpen(false);
    setCalendarMenuOpen(false);
    setNotificationOpen(false);
  }

  function selectActiveCalendarUser(userOrId) {
    const user = typeof userOrId === "string" ? findUserById(userOrId) : userOrId;
    if (!user) return;
    setActiveCalendarUser(user);
    setSelectedMember(user.id);
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
      description: recommendation.description,
      automationType: recommendation.automationType,
      recommendationSource: recommendation.source,
      confidence: recommendation.confidence,
    });
    setSelectedDate(date);
  }

  async function loadThinQDevices() {
    setThinQLoading(true);
    setThinQError("");

    try {
      const result = await fetchThinQDevices();
      setThinQDevices(normalizeThinQDevices(result));
    } catch (error) {
      setThinQError(error instanceof Error ? error.message : "ThinQ 기기 목록을 불러오지 못했습니다.");
    } finally {
      setThinQLoading(false);
    }
  }

  async function loadThinQDeviceState(deviceId) {
    setThinQError("");

    try {
      const state = await fetchThinQDeviceState(deviceId);
      setThinQDeviceStates((current) => ({ ...current, [deviceId]: state }));
      recordThinQUsageLog({
        deviceId,
        applianceType: thinQDevices.find((device) => device.id === deviceId)?.type,
        eventType: "STATE",
        stateSummary: state,
      });
    } catch (error) {
      setThinQError(error instanceof Error ? error.message : "ThinQ 기기 상태를 불러오지 못했습니다.");
    }
  }

  async function subscribeThinQEvent(deviceId) {
    setThinQError("");

    try {
      const result = await subscribeThinQDeviceEvent(deviceId);
      setThinQDeviceAux((current) => ({ ...current, [deviceId]: { ...current[deviceId], eventSubscription: result } }));
      recordThinQUsageLog({ deviceId, eventType: "EVENT_SUBSCRIBE", result });
    } catch (error) {
      setThinQError(error instanceof Error ? error.message : "ThinQ 이벤트 구독에 실패했습니다.");
    }
  }

  async function subscribeThinQPush(deviceId) {
    setThinQError("");

    try {
      const result = await subscribeThinQDevicePush(deviceId);
      setThinQDeviceAux((current) => ({ ...current, [deviceId]: { ...current[deviceId], pushSubscription: result } }));
      recordThinQUsageLog({ deviceId, eventType: "PUSH_SUBSCRIBE", result });
    } catch (error) {
      setThinQError(error instanceof Error ? error.message : "ThinQ 푸시 구독에 실패했습니다.");
    }
  }

  async function loadThinQDeviceEnergy(deviceId) {
    setThinQError("");

    try {
      const result = await fetchThinQDeviceEnergy(deviceId);
      setThinQDeviceAux((current) => ({ ...current, [deviceId]: { ...current[deviceId], energy: result } }));
      recordThinQUsageLog({
        deviceId,
        applianceType: thinQDevices.find((device) => device.id === deviceId)?.type,
        eventType: "ENERGY",
        energySummary: result,
      });
    } catch (error) {
      setThinQError(error instanceof Error ? error.message : "ThinQ 전력량 조회에 실패했습니다.");
    }
  }

  function requestThinQControl(device) {
    setPendingThinQControl({
      device,
      payload: { operation: "POWER_ON" },
    });
  }

  async function executeThinQControl() {
    if (!pendingThinQControl) return;
    setThinQError("");

    try {
      await controlThinQDevice(pendingThinQControl.device.id, pendingThinQControl.payload);
      recordThinQUsageLog({
        deviceId: pendingThinQControl.device.id,
        applianceType: pendingThinQControl.device.type,
        eventType: "CONTROL",
        payload: pendingThinQControl.payload,
      });
      await loadThinQDeviceState(pendingThinQControl.device.id);
    } catch (error) {
      setThinQError(error instanceof Error ? error.message : "ThinQ 제어 요청에 실패했습니다.");
    } finally {
      setPendingThinQControl(null);
    }
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
      place: index === 0 ? "세탁실" : "LG ThinQ",
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
    selectedMember,
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
    openComposer: () => setComposerOpen(true),
    onOpenPanel: setPanel,
    calendarView,
    setCalendarView,
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <main className="app-shell">
      <section className={`app-frame ${activeTab === "home" ? "thinq-home-frame" : ""} ${activeTab === "schedule" && !isOnboardingComplete ? "onboarding-frame" : ""}`}>
        <button className="session-logout-button" type="button" onClick={handleLogout}>
          {currentUser.displayName} 로그아웃
        </button>
        {activeTab !== "home" && (
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
                  <button type="button" onClick={() => { setPanel({ type: "thinq" }); setMenuOpen(false); }}>LG ThinQ 연동</button>
                  <button type="button" onClick={() => { setPanel({ type: "settings" }); setMenuOpen(false); }}>테마 설정</button>
                  <button type="button" onClick={() => setMenuOpen(false)}>데이터 내보내기</button>
                  <button type="button" onClick={() => { setComposerOpen(true); setMenuOpen(false); }}>작업 추가</button>
                </div>
              )}
            </div>
          </div>
        </header>
        )}

        {activeTab === "home" && <HomePage onOpenNotifications={() => setNotificationOpen(true)} onOpenThinQ={() => setPanel({ type: "thinq" })} />}
        {activeTab === "schedule" && !isOnboardingComplete && (
          <div className="onboarding-live-stage">
            <div className="onboarding-calendar-backdrop" aria-hidden="true">
              <CalendarPage {...pageProps} />
            </div>
            <OnboardingPage
              step={onboardingStep}
              onNext={() => setOnboardingStep("profile")}
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
                        ? "profile"
                        : "intro",
                )
              }
              onComplete={completeOnboarding}
            />
          </div>
        )}
        {activeTab === "schedule" && isOnboardingComplete && <CalendarPage {...pageProps} />}
        {activeTab === "devices" && <DevicesPage />}
        {activeTab === "care" && <CarePage />}
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
                <span>{notificationItems.length}개</span>
              </div>
              <button type="button" aria-label="알림 닫기" onClick={() => setNotificationOpen(false)}>
                닫기
              </button>
            </div>
            <div className="notification-popover-list">
              {notificationItems.map((item) => (
                <article className="notification-popover-item" key={item.id}>
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
          onClose={() => setComposerOpen(false)}
          onAdd={(task) => {
            addTask(task);
            setComposerOpen(false);
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
        onOpenComposer={() => setComposerOpen(true)}
        thinQDevices={thinQDevices}
        thinQDeviceStates={thinQDeviceStates}
        thinQDeviceAux={thinQDeviceAux}
        thinQError={thinQError}
        isThinQLoading={isThinQLoading}
        onRefreshThinQDevices={loadThinQDevices}
        onLoadThinQDeviceState={loadThinQDeviceState}
        onRequestThinQControl={requestThinQControl}
        onSubscribeThinQEvent={subscribeThinQEvent}
        onSubscribeThinQPush={subscribeThinQPush}
        onLoadThinQDeviceEnergy={loadThinQDeviceEnergy}
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
            <span>{postponePicker.task.title}의 새 날짜를 선택해주세요.</span>
            <label className="postpone-date-field">
              날짜
              <input
                type="date"
                value={postponePicker.date}
                onChange={(event) => setPostponePicker((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <div className="confirm-actions">
              <button type="button" onClick={() => setPostponePicker(null)}>
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  requestMoveTask(postponePicker.task, postponePicker.date);
                  setPostponePicker(null);
                }}
              >
                미루기
              </button>
            </div>
          </section>
        </div>
      )}

      {pendingThinQControl && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="thinq-control-title">
            <p>LG ThinQ 제어 확인</p>
            <h2 id="thinq-control-title">{pendingThinQControl.device.name || pendingThinQControl.device.id} 제어를 실행할까요?</h2>
            <span>실제 가전 제어 요청은 확인 후에만 전송됩니다.</span>
            <div className="confirm-actions">
              <button type="button" onClick={() => setPendingThinQControl(null)}>
                취소
              </button>
              <button type="button" onClick={executeThinQControl}>
                실행하기
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
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
