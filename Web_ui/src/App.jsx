import { useEffect, useMemo, useRef, useState } from "react";
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
import { dateKey, members, tagLabel, weatherByDate } from "./data.js";
import CalendarPage from "./pages/CalendarPage.jsx";
import CrewPage from "./pages/CrewPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import TaskComposer from "./components/TaskComposer.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import introLogo from "./assets/intro.png";
import lgCharacter from "./assets/lg-character.png";
import floatingStar from "./assets/floating-star.svg";
import { CURRENT_USER_STORAGE_KEY, LEGACY_CURRENT_USER_STORAGE_KEY, USERS, findUserById, isMasterUser } from "./constants/users.js";
import { fetchCalendarWeather } from "./services/weatherService.js";
import { fetchAirQuality } from "./services/airQualityService.js";
import { logAnalyticsEvent } from "./firebase.js";
import { buildWeatherRecommendationsByDate } from "./services/weatherRecommendationService.js";
import { buildRoutineRecommendations } from "./services/routinePredictionService.js";
import { DAILY_REPORT_FALLBACK_TEXT, createDailyReportFallback, fetchDailyReport } from "./services/dailyReportService.js";
import { predictHouseworkTask } from "./services/taskPredictionService.js";
import { sendDeviceCommand, subscribeSensorLatest } from "./services/sensorRealtimeService.js";
import { THRESHOLDS, buildRealtimeAppliancePopups, buildScheduledWasherPopup, getPopupKey } from "./services/appliancePopupRuleService.js";
import { createUserSchedule, deleteUserSchedule, getUserSchedules, isFirestoreScheduleUser, updateUserSchedule } from "./services/taskService.js";

const ENABLE_ONBOARDING_TASK_GENERATION = false;
const SENSOR_DEVICE_ID = "living_room_01";
const POPUP_COOLDOWN_MS = 10 * 60 * 1000;
const isDev = import.meta.env.DEV;
const CALENDAR_SCHEDULE_COLORS = ["#ff7976", "#ffd5d6", "#ffc68f", "#ffb063", "#fff294", "#cbf39d", "#95cff5", "#d3b5f3"];
const LEGACY_CALENDAR_COLOR_MAP = {
  "#fb7185": "#ff7976",
  "#ff9e9e": "#ff7976",
  "#38bdf8": "#95cff5",
  "#7bd3ff": "#95cff5",
  "#a78bfa": "#d3b5f3",
  "#d7a8ff": "#d3b5f3",
  "#60a5fa": "#95cff5",
  "#f59e0b": "#ffb063",
  "#22d3ee": "#95cff5",
  "#c084fc": "#d3b5f3",
  "#34d399": "#cbf39d",
  "#0ea5e9": "#95cff5",
  "#7c3aed": "#d3b5f3",
  "#ff8a2a": "#ffb063",
  "#f97316": "#ffb063",
  "#ea580c": "#ffb063",
  "#fb923c": "#ffb063",
  "#d97706": "#ffc68f",
  "#ffb020": "#ffc68f",
  "#c2410c": "#ff7976",
  "#ef4444": "#ff7976",
  "#2563eb": "#95cff5",
  "#16a34a": "#cbf39d",
  "#9333ea": "#d3b5f3",
  "#0f766e": "#cbf39d",
  "#0891b2": "#95cff5",
  "#be123c": "#ff7976",
  "#d4144b": "#ff7976",
  "#fb4b6f": "#ff7976",
  "#14b8a6": "#cbf39d",
  "#8b5cf6": "#d3b5f3",
};
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
const APP_SESSION_STORAGE_KEY = "l-landerAppSession";
const LEGACY_APP_SESSION_STORAGE_KEY = "lalendarAppSession";
const DEFAULT_TAB = "schedule";
const DEFAULT_CALENDAR_VIEW = "month";
const DEFAULT_ONBOARDING_APPLIANCE_TYPES = [];
const DEFAULT_ONBOARDING_APPLIANCE_ASSIGNEES = {};
const DAILY_REPORT_LOADING_TEXT = "오늘의 일정을 정리하고 있어요...";
const DAILY_REPORT_DEBOUNCE_MS = 400;
const DAILY_REPORT_CACHE_PREFIX = "l-landerDailyReport:";
const DAY_OF_WEEK_INDEX = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export default function App() {
  const storedUser = readStoredCurrentUser();
  const storedSession = readStoredAppSession();
  const initialSelectedDate = isDateKey(storedSession?.selectedDate) ? storedSession.selectedDate : getTodayKey();
  const initialVisibleMonth = visibleMonthFromDate(initialSelectedDate);
  const [currentUser, setCurrentUser] = useState(storedUser);
  const [activeCalendarUser, setActiveCalendarUser] = useState(() => getInitialCalendarUser(storedUser, storedSession?.activeCalendarUserId));
  const [tasks, setTasks] = useState(() => normalizeCalendarTaskColors(normalizeTasksForUsers(normalizeGeneratedTaskTitles(buildDefaultCalendarTasks()))));
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
  const [onboardingSetup, setOnboardingSetup] = useState(() =>
    storedSession?.isOnboardingComplete ? normalizeOnboardingSetup(storedSession?.onboardingSetup) : createDefaultOnboardingSetup(),
  );
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
  const [isLoginIntroOpen, setLoginIntroOpen] = useState(false);
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
  const [airQualityPm10, setAirQualityPm10] = useState(null);
  const [airQualityApiStatus, setAirQualityApiStatus] = useState("loading");
  const [aiRecommendationNotice, setAiRecommendationNotice] = useState("");
  const [aiRecommendationRequestCount, setAiRecommendationRequestCount] = useState(0);
  const [dailyAiReport, setDailyAiReport] = useState(() => ({
    title: "",
    summary: "",
    detail: "",
    weatherTip: "",
    taskTip: "",
    imageTheme: "homecare_default",
    tags: [],
    priority: "normal",
    source: "loading",
  }));
  const [isDailyAiReportLoading, setDailyAiReportLoading] = useState(false);
  const [dailyReportCreationToken, setDailyReportCreationToken] = useState("initial");
  const [aiAssignmentPopup, setAiAssignmentPopup] = useState(null);
  const [sensorPopup, setSensorPopup] = useState(null);
  const [sensorPopupQueue, setSensorPopupQueue] = useState([]);
  const [latestSensorData, setLatestSensorData] = useState(null);
  const sensorPopupCooldownRef = useRef({});
  const washerPopupShownRef = useRef({});
  const sensorDemoPopupIndexRef = useRef(0);
  const dailyReportGeneratedKeyRef = useRef("");
  const dailyReportKnownTaskIdsRef = useRef(null);
  const dailyReportKnownUserIdRef = useRef("");
  const dailyReportTaskChangePendingRef = useRef(false);
  const weatherAdjustedTaskIdsRef = useRef(new Set());

  useEffect(() => {
    setTasks((current) => {
      const normalized = normalizeCalendarTaskColors(normalizeGeneratedTaskTitles(current));
      return normalized.some((task, index) => task !== current[index]) ? normalized : current;
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return undefined;

    let isActive = true;
    const userIds = getFirestoreScheduleUserIds(currentUser);

    Promise.all(
      userIds.map((userId) =>
        getUserSchedules(userId).catch((error) => {
          devWarn("[firestore] user schedules unavailable", { userId, error });
          return [];
        }),
      ),
    ).then((scheduleGroups) => {
      if (!isActive) return;
      const firestoreTasks = normalizeCalendarTaskColors(
        normalizeTasksForUsers(
          normalizeGeneratedTaskTitles(scheduleGroups.flat().map((schedule) => firestoreScheduleToTask(schedule))),
        ),
      );
      setTasks((current) => [...firestoreTasks, ...current.filter((task) => !task.firestoreSchedule)]);
    });

    return () => {
      isActive = false;
    };
  }, [currentUser]);

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
    const setVisualViewportVars = () => {
      const viewport = window.visualViewport;
      const height = Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight);
      const offsetTop = Math.round(viewport?.offsetTop || 0);
      document.documentElement.style.setProperty("--app-visual-height", `${height}px`);
      document.documentElement.style.setProperty("--app-visual-offset-top", `${offsetTop}px`);
    };

    setVisualViewportVars();
    window.visualViewport?.addEventListener("resize", setVisualViewportVars);
    window.visualViewport?.addEventListener("scroll", setVisualViewportVars);
    window.addEventListener("resize", setVisualViewportVars);
    window.addEventListener("orientationchange", setVisualViewportVars);

    return () => {
      window.visualViewport?.removeEventListener("resize", setVisualViewportVars);
      window.visualViewport?.removeEventListener("scroll", setVisualViewportVars);
      window.removeEventListener("resize", setVisualViewportVars);
      window.removeEventListener("orientationchange", setVisualViewportVars);
    };
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
        devWarn(error);
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
    if (Object.keys(calendarWeatherByDate).length === 0) return;

    const today = getTodayKey();
    const adjustments = tasks
      .filter((task) => !task.done && task.date >= today && isLaundryTask(task))
      .filter((task) => !weatherAdjustedTaskIdsRef.current.has(String(task.id)))
      .filter((task) => isRainyWeatherLike(calendarWeatherByDate[task.date] || weatherByDate[task.date]))
      .map((task) => {
        const nextDate = findNextAvailableLaundryDate(task, tasks, calendarWeatherByDate);
        return nextDate ? { task, nextDate } : null;
      })
      .filter(Boolean);

    if (adjustments.length === 0) return;

    adjustments.forEach(({ task }) => weatherAdjustedTaskIdsRef.current.add(String(task.id)));
    setTasks((current) =>
      current.map((task) => {
        const adjustment = adjustments.find((item) => item.task.id === task.id);
        return adjustment
          ? {
              ...task,
              date: adjustment.nextDate,
              repeat: appendPostponeLabel(task.repeat, "날씨 자동 조정"),
            }
          : task;
      }),
    );

    adjustments.forEach(({ task, nextDate }) => {
      if (!task.firestoreSchedule) return;
      const updates = {
        date: nextDate,
        repeat: appendPostponeLabel(task.repeat, "날씨 자동 조정"),
      };
      updateUserSchedule(task.userId, task.scheduleId || task.id, taskToFirestoreSchedule({ ...task, ...updates }))
        .catch((error) => devWarn("[firestore] weather schedule adjustment failed", error));
    });
  }, [calendarWeatherByDate, tasks]);

  useEffect(() => {
    let isActive = true;

    fetchAirQuality()
      .then((result) => {
        if (isActive) {
          setAirQualityPm10(getAirQualityPm10(result));
          setAirQualityApiStatus("ready");
        }
      })
      .catch((error) => {
        devWarn("Air quality data unavailable for AI recommendation", error);
        if (isActive) {
          setAirQualityPm10(null);
          setAirQualityApiStatus("ready");
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!aiRecommendationNotice) return undefined;
    const timerId = window.setTimeout(() => setAiRecommendationNotice(""), 3200);
    return () => window.clearTimeout(timerId);
  }, [aiRecommendationNotice]);

  useEffect(() => {
    if (!currentUser || !isOnboardingComplete) return undefined;

    return subscribeSensorLatest(SENSOR_DEVICE_ID, (sensorData) => {
      setLatestSensorData(sensorData);

      const popups = buildRealtimeAppliancePopups(sensorData, {
        targetUserIds: getRealtimeApplianceTargetUserIds(onboardingSetup.applianceAssignees, activeCalendarUser, currentUser),
      });
      const scheduleFilteredPopups = filterRealtimePopupsBySchedule(popups, tasks, new Date());
      enqueueSensorPopups(scheduleFilteredPopups.filter((popup) => isMasterUser(currentUser) || popup.targetUserId === currentUser.id), "realtime");
    });
  }, [activeCalendarUser, currentUser, isOnboardingComplete, onboardingSetup.applianceAssignees, tasks]);

  useEffect(() => {
    if (!currentUser || !isOnboardingComplete || !latestSensorData) return undefined;

    const checkScheduledWasherAlerts = () => {
      const now = new Date();
      const today = dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const washerCandidates = getDueWasherAlertCandidates(tasks, today, nowMinutes, activeCalendarUser, currentUser);

      const popups = washerCandidates
        .map(({ washerTask, targetUserId, alertMinutes }) => {
          if (!isMasterUser(currentUser) && targetUserId !== currentUser.id) return null;

          const washerWeight = Number(latestSensorData?.weight);
          const washerStatus = {
            targetUserId,
            alertMinutes,
            scheduleId: washerTask?.id,
            scheduleTitle: washerTask?.title,
            weight: Number.isFinite(washerWeight) ? washerWeight : null,
            weightThreshold: THRESHOLDS.washerEmptyWeight,
            hasLaundry: Number.isFinite(washerWeight) && washerWeight > THRESHOLDS.washerEmptyWeight,
            washerDoorOpen: latestSensorData?.washerDoorOpen === true,
            runnable:
              Number.isFinite(washerWeight) &&
              washerWeight > THRESHOLDS.washerEmptyWeight &&
              latestSensorData?.washerDoorOpen !== true,
          };
          const popup = buildScheduledWasherPopup(latestSensorData, {
            washerTask,
            targetUserId,
          });

          return popup;
        })
        .filter((popup) => {
          if (!popup) return false;
          const popupKey = getPopupKey(popup);
          if (washerPopupShownRef.current[popupKey]) {
            return false;
          }
          return true;
        });

      enqueueSensorPopups(popups, "washer-schedule");
    };

    checkScheduledWasherAlerts();
    const intervalId = window.setInterval(checkScheduledWasherAlerts, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [activeCalendarUser, currentUser, isOnboardingComplete, latestSensorData, tasks]);

  useEffect(() => {
    if (isOnboardingComplete) return;
    setSensorPopup(null);
    setSensorPopupQueue([]);
  }, [isOnboardingComplete]);

  useEffect(() => {
    if (!currentUser) return;
    const fallbackCalendarUser = getInitialCalendarUser(currentUser);
    setActiveCalendarUser((current) => current || fallbackCalendarUser);
    setSelectedMember((current) => current || fallbackCalendarUser.id);
  }, [currentUser]);

  useEffect(() => {
    if (!isLoginIntroOpen) return undefined;

    const timer = window.setTimeout(() => setLoginIntroOpen(false), 1650);
    return () => window.clearTimeout(timer);
  }, [isLoginIntroOpen]);

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
        onboardingSetup,
      }),
    );
  }, [activeCalendarUser, activeTab, calendarView, currentUser, isOnboardingComplete, onboardingSetup, selectedDate, selectedDetailDate, selectedMember, visibleMonth]);

  const sortedCalendarUsers = useMemo(() => {
    if (!currentUser) return USERS;
    if (isMasterUser(currentUser)) return USERS;
    return [currentUser, ...USERS.filter((user) => user.id !== currentUser.id)];
  }, [currentUser]);
  const activeCalendarUserId = activeCalendarUser?.id || currentUser?.id || "";
  const scopedTasks = tasks.filter((task) => !activeCalendarUserId || getTaskUserId(task) === activeCalendarUserId);
  const notificationScopedTasks = isMasterUser(currentUser)
    ? tasks.filter((task) => USERS.some((user) => user.id === getTaskUserId(task)))
    : tasks.filter((task) => !currentUser?.id || getTaskUserId(task) === currentUser.id);
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
  const dailyReportUserId = currentUser?.id || "";
  useEffect(() => {
    const currentIds = new Set(
      tasks
        .filter((task) => !dailyReportUserId || getTaskUserId(task) === dailyReportUserId)
        .map((task) => String(task.id)),
    );

    if (dailyReportKnownUserIdRef.current !== dailyReportUserId || dailyReportKnownTaskIdsRef.current === null) {
      dailyReportKnownUserIdRef.current = dailyReportUserId;
      dailyReportKnownTaskIdsRef.current = currentIds;
      dailyReportTaskChangePendingRef.current = false;
      return;
    }

    const knownIds = dailyReportKnownTaskIdsRef.current;
    const newTaskIdsInReportRange = tasks.filter((task) => {
      if (dailyReportUserId && getTaskUserId(task) !== dailyReportUserId) return false;
      if (knownIds.has(String(task.id))) return false;
      return [0, 1, 2].some((offset) => isTaskVisibleOnDate(task, addDays(selectedDate, offset)));
    }).map((task) => String(task.id));

    dailyReportKnownTaskIdsRef.current = currentIds;
    if (newTaskIdsInReportRange.length > 0) {
      dailyReportTaskChangePendingRef.current = true;
      setDailyReportCreationToken(newTaskIdsInReportRange.sort().join(","));
    } else {
      dailyReportTaskChangePendingRef.current = false;
    }
  }, [dailyReportUserId, selectedDate, tasks]);

  const dailyReportTaskData = useMemo(
    () => collectDailyReportTasks(tasks, selectedDate, dailyReportUserId),
    [dailyReportUserId, selectedDate, tasks],
  );
  const dailyReportWeather = useMemo(
    () => collectDailyReportWeather(selectedDate, calendarWeatherByDate, airQualityPm10),
    [airQualityPm10, calendarWeatherByDate, selectedDate],
  );
  const dailyReportInput = useMemo(
    () => ({
      today: selectedDate,
      dateRange: {
        start: selectedDate,
        end: addDays(selectedDate, 2),
      },
      weather: dailyReportWeather,
      events: dailyReportTaskData.events,
      houseworkTasks: dailyReportTaskData.houseworkTasks,
      todoProgress: dailyReportTaskData.todoProgress,
    }),
    [dailyReportTaskData, dailyReportWeather, selectedDate],
  );
  const dailyReportRequestKey = useMemo(
    () => JSON.stringify({ version: 2, userId: dailyReportUserId, creationToken: dailyReportCreationToken, input: dailyReportInput }),
    [dailyReportCreationToken, dailyReportInput, dailyReportUserId],
  );

  useEffect(() => {
    if (!currentUser) {
      setDailyAiReportLoading(false);
      return undefined;
    }
    if (weatherApiStatus === "loading" || airQualityApiStatus === "loading") return undefined;
    if (aiRecommendationRequestCount > 0) return undefined;
    if (dailyReportTaskChangePendingRef.current) return undefined;
    if (dailyReportGeneratedKeyRef.current === dailyReportRequestKey) return undefined;

    const cachedReport = readCachedDailyReport(dailyReportRequestKey);
    if (cachedReport) {
      dailyReportGeneratedKeyRef.current = dailyReportRequestKey;
      setDailyAiReport(cachedReport);
      setDailyAiReportLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setDailyAiReportLoading(true);

    const timer = window.setTimeout(async () => {
      dailyReportGeneratedKeyRef.current = dailyReportRequestKey;
      try {
        const report = await fetchDailyReport(dailyReportInput, { signal: controller.signal });
        setDailyAiReport(report);
        writeCachedDailyReport(dailyReportRequestKey, report);
      } catch (error) {
        if (error?.name === "AbortError") return;
        setDailyAiReport(createDailyReportFallback());
      } finally {
        if (!controller.signal.aborted) setDailyAiReportLoading(false);
      }
    }, DAILY_REPORT_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    airQualityApiStatus,
    aiRecommendationRequestCount,
    currentUser,
    dailyReportRequestKey,
    dailyReportInput,
    weatherApiStatus,
  ]);

  const notificationItems = useMemo(() => {
    const notificationContext = {
      date: notificationDemoDate,
      time: notificationDemoTime,
      userName: currentUser?.displayName || currentUser?.name || "사용자",
      weather: calendarWeatherByDate[notificationDemoDate] || weatherByDate[notificationDemoDate],
    };
    const taskItems = tasksForNotification(notificationScopedTasks, notificationContext)
      .filter(isExecutionNotificationTask)
      .map((task) => {
        const owner = findUserById(getTaskUserId(task));
        const ownerPrefix = isMasterUser(currentUser) && owner ? `${owner.displayName || owner.name} · ` : "";
        const completed = isNotificationTaskCompleted(task, notificationContext);

        return {
          id: `task-${task.id}`,
          type: "task",
          task,
          completed,
          title: completed ? `${getNotificationActionName({ task })} 실행 완료` : buildTaskNotificationTitle(task, notificationContext),
          detail: `${ownerPrefix}${buildTaskNotificationDetail(task, notificationContext)}`,
          scheduledTime: getTaskNotificationScheduledTime(task),
          date: task.date,
        };
      });
    return taskItems.sort(notificationItemSorter);
  }, [calendarWeatherByDate, currentUser, notificationDemoDate, notificationDemoTime, notificationScopedTasks]);

  useEffect(() => {
    if (activeTab !== "home" && !isNotificationOpen) return;

    const currentMinutes = timeValueToMinutes(notificationDemoTime);
    const dueItem = notificationItems.find((item) => {
      if (item.completed) return false;
      const triggerMinutes = getNotificationTriggerMinutes(item);
      return Number.isFinite(triggerMinutes) && triggerMinutes === currentMinutes;
    });

    if (!dueItem) return;

    const promptKey = `${dueItem.id}-${notificationDemoDate}-${notificationDemoTime}`;
    if (promptKey === lastNotificationPromptKey) return;

    setNotificationPrompt(dueItem);
    setNotificationOpen(false);
    setLastNotificationPromptKey(promptKey);
  }, [activeTab, isNotificationOpen, lastNotificationPromptKey, notificationDemoDate, notificationDemoTime, notificationItems]);
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
    const selectedDateKey = dateKey(year, month, day);
    setVisibleMonth({ year, month });
    setSelectedDate(selectedDateKey);
    logAnalyticsEvent("calendar_date_click", { date: selectedDateKey, userId: activeCalendarUserId || currentUser?.id || "" });
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
    const task = tasks.find((item) => item.id === id);
    const updates = { done: !task?.done };
    setTasks((current) => current.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    if (task?.firestoreSchedule) {
      updateUserSchedule(task.userId, task.scheduleId || task.id, updates).catch((error) => devWarn("[firestore] schedule toggle failed", error));
    }
  }

  function deleteTask(id) {
    const task = tasks.find((item) => item.id === id);
    setTasks((current) => current.filter((task) => task.id !== id));
    if (task?.firestoreSchedule) {
      deleteUserSchedule(task.userId, task.scheduleId || task.id)
        .then(() => logAnalyticsEvent("schedule_delete", { userId: task.userId, scheduleId: task.scheduleId || task.id }))
        .catch((error) => devWarn("[firestore] schedule delete failed", error));
    }
  }

  function changeTaskOwner(id, owner) {
    setTasks((current) => current.map((task) => (task.id === id ? normalizeTaskForUser({ ...task, owner }, OWNER_TO_USER[owner] || task.userId) : task)));
  }

  function updateTask(id, updates) {
    const existingTask = tasks.find((task) => task.id === id);
    setTasks((current) =>
      current.map((task) => (task.id === id ? normalizeTaskForUser({ ...task, ...updates }, getTaskUserId(task) || activeCalendarUserId) : task)),
    );
    if (existingTask?.firestoreSchedule) {
      const nextTask = normalizeTaskForUser({ ...existingTask, ...updates }, getTaskUserId(existingTask) || activeCalendarUserId);
      updateUserSchedule(nextTask.userId, nextTask.scheduleId || nextTask.id, taskToFirestoreSchedule(nextTask))
        .then(() => logAnalyticsEvent("schedule_update", { userId: nextTask.userId, scheduleId: nextTask.scheduleId || nextTask.id }))
        .catch((error) => devWarn("[firestore] schedule update failed", error));
    }
  }

  function updateApplianceCalendarColor(applianceType, color) {
    if (!applianceType || !color) return;
    setTasks((current) => current.map((task) => (task.applianceType === applianceType ? { ...task, color } : task)));
  }

  function changeMemberColor(memberId, color) {
    setMemberColors((current) => ({ ...current, [memberId]: color }));
  }

  function postponeTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const range = getTaskNotificationRange(task);
    const currentTaskUserId = getTaskUserId(task) || currentUser?.id || activeCalendarUserId;
    const postponeTargetUsers = getPostponeTargetUsers(sortedCalendarUsers, currentTaskUserId);
    const nextPerson = postponeTargetUsers[0];
    setNotificationOpen(false);
    setNotificationPrompt(null);
    setPostponePicker({
      task,
      mode: "date",
      date: addDays(task.date, 1),
      time: range ? formatTimeValue(Math.min(23 * 60 + 59, range.startMinutes + 30)) : "09:00",
      targetUserId: nextPerson?.id || currentTaskUserId,
    });
  }

  function requestMoveTask(task, date, startTime) {
    const restriction = getTaskDateRestriction(
      task,
      { date, startTime, repeat: startTime ? buildPostponedRepeat(task, startTime) : task.repeat },
      tasks,
      calendarWeatherByDate,
    );
    if (restriction) {
      setPendingPostpone({ task, nextDate: date, nextTime: startTime, reason: restriction });
      return;
    }

    moveTaskDate(task.id, date, startTime);
  }

  function moveTaskDate(id, date, startTime) {
    const task = tasks.find((item) => item.id === id);
    const updates = {
      date,
      repeat: startTime ? buildPostponedRepeat(task || {}, startTime) : appendPostponeLabel(task?.repeat, "미룸"),
    };
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, ...updates }
          : task,
      ),
    );
    if (task?.firestoreSchedule) {
      updateUserSchedule(task.userId, task.scheduleId || task.id, taskToFirestoreSchedule({ ...task, ...updates }))
        .then(() => logAnalyticsEvent("schedule_update", { userId: task.userId, scheduleId: task.scheduleId || task.id }))
        .catch((error) => devWarn("[firestore] schedule move failed", error));
    }
    setSelectedDate(date);
  }

  function moveTaskTime(id, startTime) {
    const normalizedStartTime = normalizeEditableTimeValue(startTime);
    const task = tasks.find((item) => item.id === id);
    const updates = { repeat: buildPostponedRepeat(task || {}, normalizedStartTime), startTime: normalizedStartTime };
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...updates } : task)));
    if (task?.firestoreSchedule) {
      updateUserSchedule(task.userId, task.scheduleId || task.id, taskToFirestoreSchedule({ ...task, ...updates }))
        .then(() => logAnalyticsEvent("schedule_update", { userId: task.userId, scheduleId: task.scheduleId || task.id }))
        .catch((error) => devWarn("[firestore] schedule time update failed", error));
    }
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

  async function addTask(task) {
    let nextTask = normalizeTaskForUser(
      normalizeGeneratedTaskTitle({ id: task.id || createTaskId() + (task.copyIndex || 0), source: "manual", ...task }),
      activeCalendarUserId,
    );
    if (shouldPersistUserSchedule(nextTask)) {
      try {
        const scheduleId = await createUserSchedule(nextTask.userId, taskToFirestoreSchedule(nextTask));
        nextTask = {
          ...nextTask,
          id: scheduleId,
          scheduleId,
          firestoreSchedule: true,
          repeat: formatScheduleDisplayRepeat({
            repeat: normalizeFirestoreRepeat(nextTask.repeat, nextTask.type),
            type: nextTask.type,
            daysOfWeek: nextTask.daysOfWeek,
            startTime: nextTask.startTime,
            endTime: nextTask.endTime,
          }),
        };
        logAnalyticsEvent("schedule_create", { userId: nextTask.userId, scheduleId });
      } catch (error) {
        devWarn("[firestore] schedule create failed", error);
      }
    }
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
    if (shouldRequestAiHouseworkTask(nextTask)) {
      requestAiHouseworkTask(nextTask);
    }
  }

  async function requestAiHouseworkTask(eventTask) {
    const timeRange = getTaskNotificationRange(eventTask);
    if (!timeRange) {
      devWarn("AI task prediction skipped: event time range is missing", eventTask);
      return;
    }

    const weather = calendarWeatherByDate[eventTask.date] || weatherByDate[eventTask.date] || {};
    const input = {
      event_title: eventTask.title,
      event_date: eventTask.date,
      event_start_time: formatTimeValue(timeRange.startMinutes),
      event_end_time: formatTimeValue(timeRange.endMinutes),
      day_temp: getPredictionTemperature(weather),
      day_humidity: toNullableFiniteNumber(weather.humidity),
      day_dust: toNullableFiniteNumber(latestSensorData?.pm10) ?? airQualityPm10,
    };

    setAiRecommendationRequestCount((current) => current + 1);

    try {
      const prediction = await predictHouseworkTask(input);
      if (prediction.task_appliance === "none") return;

      const applianceType = toCalendarApplianceType(prediction.task_appliance);
      const eventUserId = getTaskUserId(eventTask);
      const assignment = resolveAiTaskAssignment(prediction.task_appliance, eventUserId, onboardingSetup.applianceAssignees);
      const applianceDisplayName = getAiTaskApplianceDisplayName(prediction.task_appliance);
      const aiTask = normalizeTaskForUser(
        {
          id: createTaskId(),
          type: "ai_task",
          source: "together_ai",
          title: `${prediction.task_appliance_mode} · ${applianceDisplayName}`,
          date: prediction.task_date,
          startTime: prediction.task_start_time,
          endTime: prediction.task_end_time,
          repeat: `${prediction.task_start_time} ~ ${prediction.task_end_time}`,
          place: getAiTaskPlace(applianceType, assignment.applianceSettingKey),
          tag: "house",
          owner: assignment.ownerId,
          userId: assignment.userId,
          done: false,
          displayType: "appliance",
          appliance: prediction.task_appliance,
          applianceSettingKey: assignment.applianceSettingKey,
          applianceType,
          applianceMode: prediction.task_appliance_mode,
          currentMode: prediction.task_appliance_mode,
          requestedByUserId: eventUserId,
          aiInput: input,
        },
        assignment.userId,
      );

      setTasks((current) => [aiTask, ...current]);
      const assignee = findUserById(assignment.userId);
      setAiAssignmentPopup({
        assigneeName: assignee?.displayName || assignee?.name || "담당자",
        taskTitle: aiTask.title,
        date: aiTask.date,
        startTime: aiTask.startTime,
        endTime: aiTask.endTime,
      });
    } catch (error) {
      setAiRecommendationNotice(
        error?.code === "TOGETHER_API_KEY_MISSING"
          ? "AI API 설정이 필요해요. Vercel 환경변수를 확인해 주세요."
          : "AI 가사일 추천을 생성하지 못했어요.",
      );
    } finally {
      setAiRecommendationRequestCount((current) => Math.max(0, current - 1));
    }
  }

  function updateOnboardingProfile(field, value) {
    setOnboardingProfile((current) => ({ ...current, [field]: value }));
  }

  function updateOnboardingSetup(nextSetup) {
    const normalizedSetup = normalizeOnboardingSetup(nextSetup);
    setOnboardingSetup(normalizedSetup);
    setTasks((current) => current.map((task) => reassignTogetherAiTask(task, normalizedSetup.applianceAssignees)));
  }

  function completeOnboarding(onboardingSetup = {}) {
    const nextOnboardingSetup = onboardingSetup.skipGeneration ? createDefaultOnboardingSetup() : normalizeOnboardingSetup(onboardingSetup);
    setOnboardingSetup(nextOnboardingSetup);

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
    if (id === "menu") {
      showNextSensorDemoPopup();
    }
    if (id === "schedule" && !isOnboardingComplete && !hasGeneratedOnboardingTasks) {
      setOnboardingSetup(createDefaultOnboardingSetup());
      setOnboardingComplete(false);
      setOnboardingStep("intro");
    }
  }

  function handleLogin(user) {
    const savedSession = readStoredAppSession();
    const nextSelectedDate = isDateKey(savedSession?.selectedDate) ? savedSession.selectedDate : selectedDate;
    const nextVisibleMonth = savedSession?.visibleMonth || visibleMonthFromDate(nextSelectedDate);
    const nextCalendarUser = getInitialCalendarUser(user, savedSession?.activeCalendarUserId);

    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    setLoginIntroOpen(true);
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
    setOnboardingSetup(savedSession?.isOnboardingComplete ? normalizeOnboardingSetup(savedSession?.onboardingSetup) : createDefaultOnboardingSetup());
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
    localStorage.removeItem(LEGACY_CURRENT_USER_STORAGE_KEY);
    localStorage.removeItem(APP_SESSION_STORAGE_KEY);
    localStorage.removeItem(LEGACY_APP_SESSION_STORAGE_KEY);
    setCurrentUser(null);
    setActiveCalendarUser(null);
    setSelectedMember("jea");
    setSelectedDetailDate(null);
    setActiveTab(DEFAULT_TAB);
    setOnboardingComplete(false);
    setOnboardingSetup(createDefaultOnboardingSetup());
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
    const currentOwnerId = currentUser?.id ? userIdToOwner(currentUser.id) : "";
    if (!isMasterUser(currentUser) && options.ownerId && options.ownerId !== currentOwnerId) return;
    if (!isMasterUser(currentUser) && !options.ownerId && activeCalendarUserId && currentUser?.id && activeCalendarUserId !== currentUser.id) return;

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

  async function executeNotification(item, source = "notification") {
    if (item.type === "task") {
      const devicePayload = buildDeviceCommandPayloadFromTask(item.task, {
        requestedBy: currentUser?.id || "",
        debugSource: source,
      });

      if (!devicePayload) {
        devWarn("[notification] executable task has no device command payload", item.task);
        return;
      }

      await sendDeviceCommandFromNotification(devicePayload);
      if (!item.task.done) toggleTask(item.task.id);
      return;
    }

    addAutomationTask(item, item.date);
    setDismissedAlerts((current) => [...current, item.id]);
  }

  async function executeApplianceCommandFromCalendar(task = {}, mode = null) {
    const taskWithMode = {
      ...task,
      applianceMode: mode?.label || task.applianceMode || task.currentMode,
      currentMode: mode?.label || task.currentMode || task.applianceMode,
    };

    const payload = buildDeviceCommandPayloadFromTask(taskWithMode, {
      requestedBy: currentUser?.id || "",
      debugSource: "calendar-appliance-page",
    });

    if (!payload) {
      throw new Error("No executable appliance command for this task");
    }

    logAnalyticsEvent("device_execute_click", payload);
    logDeviceExecuteEvent(taskWithMode, payload);
    await sendDeviceCommand(SENSOR_DEVICE_ID, payload);
    return payload;
  }

  function showNextSensorDemoPopup() {
    if (!currentUser || !isOnboardingComplete) return;

    const demoSensors = [
      { temperature: 30.5, humidity: 45, pm10: 12, pm25: 8, last_updated: "테스트 알림" },
      { temperature: 26, humidity: 63, pm10: 12, pm25: 8, last_updated: "테스트 알림" },
      { temperature: 24, humidity: 45, pm10: 35, pm25: 12, last_updated: "테스트 알림" },
      { temperature: 24, humidity: 45, pm10: 86, pm25: 38, last_updated: "테스트 알림" },
    ];
    const sensor = demoSensors[sensorDemoPopupIndexRef.current % demoSensors.length];
    sensorDemoPopupIndexRef.current += 1;

    const popups = buildRealtimeAppliancePopups(sensor, {
      targetUserIds: {
        AIR_CONDITIONER: currentUser.id,
        AIR_PURIFIER: currentUser.id,
      },
    }).filter((popup) => popup.targetUserId === currentUser.id);

    enqueueSensorPopups(popups.slice(0, 1), "menu-demo", { bypassCooldown: true });
  }

  function enqueueSensorPopups(popups, source = "sensor", options = {}) {
    if (popups.length === 0) {
      return;
    }

    const now = Date.now();
    const availablePopups = popups.filter((popup) => {
      const popupKey = getPopupKey(popup);
      const lastClosedAt = sensorPopupCooldownRef.current[popupKey] || 0;

      if (!options.bypassCooldown && now - lastClosedAt < POPUP_COOLDOWN_MS) {
        return false;
      }

      return true;
    });

    if (availablePopups.length === 0) return;

    setSensorPopup((currentPopup) => {
      const currentPopupKey = currentPopup ? getPopupKey(currentPopup) : "";
      const nextPopups = availablePopups.filter((popup) => getPopupKey(popup) !== currentPopupKey);

      if (nextPopups.length === 0) {
        return currentPopup;
      }

      if (currentPopup) {
        setSensorPopupQueue((queue) => appendUniqueSensorPopups(queue, nextPopups));
        return currentPopup;
      }

      const [nextPopup, ...queuedPopups] = nextPopups;
      setSensorPopupQueue((queue) => appendUniqueSensorPopups(queue, queuedPopups));
      return nextPopup;
    });
  }

  function closeSensorPopup() {
    if (sensorPopup) {
      const popupKey = getPopupKey(sensorPopup);
      sensorPopupCooldownRef.current[popupKey] = Date.now();
      if (sensorPopup.applianceType === "WASHER") {
        washerPopupShownRef.current[popupKey] = true;
      }
    }
    setSensorPopupQueue((queue) => {
      const [nextPopup, ...restQueue] = queue;
      setSensorPopup(nextPopup || null);
      return restQueue;
    });
  }

  async function executeSensorPopup() {
    if (!sensorPopup || sensorPopup.blocked) {
      closeSensorPopup();
      return;
    }

    try {
      const commandPayload = buildDeviceCommandPayloadFromRealtimePopup({
        command: sensorPopup.command,
        mode: sensorPopup.mode,
        applianceType: sensorPopup.applianceType,
        applianceId: sensorPopup.applianceId,
        applianceName: sensorPopup.applianceName,
        reason: sensorPopup.reason || sensorPopup.message,
        targetUserId: sensorPopup.targetUserId,
        requestedBy: currentUser?.id || "",
      });
      logAnalyticsEvent("device_execute_click", commandPayload);
      logDeviceExecuteEvent(sensorPopup, commandPayload);
      await sendDeviceCommand(SENSOR_DEVICE_ID, commandPayload);
    } catch (error) {
      devWarn("[sensor] device command failed", error);
    } finally {
      closeSensorPopup();
    }
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
    applianceAssignees: onboardingSetup.applianceAssignees,
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
    validateTaskUpdate: (task, updates) => getTaskDateRestriction(task, updates, tasks, calendarWeatherByDate),
    onUpdateApplianceColor: updateApplianceCalendarColor,
    postponeTask,
    onAddWeatherRecommendation: addWeatherRecommendationTask,
    onAddTask: addTask,
    onExecuteApplianceCommand: executeApplianceCommandFromCalendar,
    openComposer: openTaskComposer,
    onOpenPanel: setPanel,
    onOpenNotifications: openNotificationPopover,
    isAiRecommendationLoading: aiRecommendationRequestCount > 0,
    dailyAiReportText: isDailyAiReportLoading ? DAILY_REPORT_LOADING_TEXT : dailyAiReport.summary || DAILY_REPORT_FALLBACK_TEXT,
    dailyAiReport,
    isDailyAiReportLoading,
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

  if (isLoginIntroOpen) {
    return <LoginIntroSplash />;
  }

  return (
    <main className="app-shell">
      <section className={`app-frame ${activeTab === "home" ? "thinq-home-frame" : ""} ${activeTab === "schedule" && !isOnboardingComplete ? "onboarding-frame" : ""}`}>
        {activeTab !== "home" && !(activeTab === "schedule" && !isOnboardingComplete) && (
        <header className="topbar">
          <div className="brand">
            <span><img src="/icons/icon-192.png" alt="" aria-hidden="true" /></span>
            <div>
              <strong>L-lander</strong>
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
              onboardingSetup={onboardingSetup}
              onSetupChange={setOnboardingSetup}
              onNext={() => setOnboardingStep("scheduleInfo")}
              onInfoNext={() => setOnboardingStep("fixedSchedule")}
              onFixedNext={() => setOnboardingStep("googleConfirm")}
              onPreview={() => setOnboardingStep("ready")}
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
          <>
            <div className="notification-popover-backdrop" role="presentation" onClick={() => setNotificationOpen(false)} />
            <section
              className="notification-popover"
              style={{
                "--notification-x": `${notificationPosition.x}px`,
                "--notification-y": `${notificationPosition.y}px`,
              }}
              aria-label="알림"
              onClick={(event) => event.stopPropagation()}
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
              <div className="notification-time-picker-wrap">
                <PostponeTimePicker
                  label="현재 시간"
                  value={notificationDemoTime}
                  onChange={(time) => {
                    setNotificationDemoTime(time);
                    setNotificationTimeEdited(true);
                  }}
                />
                <small>{notificationDemoDate} 기준</small>
              </div>
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
                <article className={["notification-popover-item", item.completed ? "completed" : ""].filter(Boolean).join(" ")} key={item.id}>
                  <span className="notification-schedule-time">{getNotificationScheduleLabel(item)}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  {item.completed ? (
                    <div className="notification-completed-label">실행 완료</div>
                  ) : (
                    <div>
                      <button type="button" onClick={() => postponeNotification(item)}>
                        미루기
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          executeNotification(item, "notification-popover").catch((error) => {
                            devWarn("[notification] device command failed", error);
                          });
                        }}
                      >
                        실행
                      </button>
                    </div>
                  )}
                </article>
              ))}
              {notificationItems.length === 0 && <p className="notification-popover-empty">표시할 알림이 없습니다.</p>}
            </div>
            </section>
          </>
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
        onExecuteNotification={(item) =>
          executeNotification(item, "detail-panel-notifications").catch((error) => {
            devWarn("[notification] device command failed", error);
          })
        }
        onPostponeNotification={postponeNotification}
        onAddTask={(task) => addTask(task)}
        selectedDate={selectedDate}
        selectedMember={selectedMember}
        currentUser={currentUser}
        onboardingSetup={onboardingSetup}
        onOnboardingSetupChange={updateOnboardingSetup}
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
            <p>실행 확인 알림</p>
            <h2 id="notification-execute-title">{getNotificationExecuteTitle(notificationPrompt)}</h2>
            <span>
              {getNotificationExecuteDescription(notificationPrompt)}
            </span>
            <small>{getNotificationExecuteMeta(notificationPrompt)}</small>
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
                onClick={async () => {
                  try {
                    await executeNotification(notificationPrompt, "notification-confirm-dialog");
                  } catch (error) {
                    devWarn("[notification] device command failed", error);
                    return;
                  }
                  setNotificationPrompt(null);
                }}
              >
                실행하기
              </button>
            </div>
          </section>
        </div>
      )}

      {sensorPopup && (
        <SensorPopupDialog
          popup={sensorPopup}
          onClose={closeSensorPopup}
          onExecute={executeSensorPopup}
        />
      )}

      {pendingPostpone && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="postpone-title">
            <p>날짜 변경 불가</p>
            <h2 id="postpone-title">{pendingPostpone.nextDate}로 변경할 수 없어요.</h2>
            <span>
              {pendingPostpone.reason}
            </span>
            <div className="confirm-actions">
              <button type="button" onClick={() => setPendingPostpone(null)}>
                확인
              </button>
            </div>
          </section>
        </div>
      )}

      {postponePicker && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="postpone-picker-title">
            <p>일정 미루기</p>
            <h3 id="postpone-picker-title">{postponePicker.task.title}의 미루기 방식을 선택해주세요.</h3>
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
                  {getPostponeTargetUsers(sortedCalendarUsers, getTaskUserId(postponePicker.task) || currentUser?.id).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName || user.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {postponePicker.mode === "time" && (
              <PostponeTimePicker
                label="새 시간"
                value={postponePicker.time}
                onChange={(time) => setPostponePicker((current) => ({ ...current, time }))}
              />
            )}
            {postponePicker.mode === "date" && (
              <div className="postpone-date-time-fields">
                <PostponeDatePicker
                  label="날짜"
                  value={postponePicker.date}
                  onChange={(date) => setPostponePicker((current) => ({ ...current, date }))}
                />
                <PostponeTimePicker
                  label="새 시간"
                  value={postponePicker.time}
                  onChange={(time) => setPostponePicker((current) => ({ ...current, time }))}
                />
              </div>
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
                    requestMoveTask(postponePicker.task, postponePicker.date, postponePicker.time);
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

      {aiAssignmentPopup && (
        <div className="confirm-backdrop ai-assignment-backdrop" role="presentation">
          <section className="confirm-dialog ai-assignment-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-assignment-title">
            <p>AI 가사일 할당 완료</p>
            <h2 id="ai-assignment-title">
              {aiAssignmentPopup.assigneeName}에게 {aiAssignmentPopup.taskTitle} 일정이 새로 할당되었어요.
            </h2>
            <span>
              {aiAssignmentPopup.date} · {aiAssignmentPopup.startTime}-{aiAssignmentPopup.endTime}
            </span>
            <div className="confirm-actions ai-assignment-actions">
              <button type="button" onClick={() => setAiAssignmentPopup(null)}>
                확인
              </button>
            </div>
          </section>
        </div>
      )}

      {aiRecommendationNotice && (
        <div className="ai-recommendation-toast" role="status">
          {aiRecommendationNotice}
        </div>
      )}
    </main>
  );
}

function LoginIntroSplash() {
  return (
    <main className="login-intro-splash" aria-label="L-lander 시작 중">
      <div className="login-intro-glow" aria-hidden="true" />
      <img src={introLogo} alt="L-lander" />
    </main>
  );
}

function SensorPopupDialog({ popup, onClose, onExecute }) {
  const assignee = getPopupAssignee(popup.targetUserId);

  return (
    <div className="confirm-backdrop sensor-popup-backdrop" role="presentation">
      <section className="confirm-dialog sensor-popup-dialog" role="dialog" aria-modal="true" aria-labelledby="sensor-popup-title">
        <div className="sensor-popup-head">
          <p>실시간 센서 알림</p>
          {assignee && (
            <div className="sensor-popup-assignee" aria-label={`담당자 ${assignee.name}`}>
              <span className="sensor-popup-assignee-text">
                <small>담당자</small>
                <strong>{assignee.name}</strong>
              </span>
            </div>
          )}
        </div>
        <h2 id="sensor-popup-title">{popup.title}</h2>
        <span>{popup.message}</span>

        <div className="sensor-popup-metrics" aria-label="센서 감지 정보">
          <div>
            <small>{popup.metricLabel || "현재 값"}</small>
            <strong>
              <SensorMetricValue popup={popup} />
            </strong>
          </div>
          <div>
            <small>추천 모드</small>
            <strong>{popup.applianceName} · {popup.mode}</strong>
          </div>
        </div>

        {popup.thresholdLabel && <small className="sensor-popup-updated">기준 {popup.thresholdLabel}</small>}

        <div className={`confirm-actions ${popup.blocked ? "single" : ""}`}>
          {popup.blocked ? (
            <button type="button" onClick={onClose}>
              확인
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose}>
                나중에
              </button>
              <button type="button" onClick={onExecute}>
                실행하기
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function SensorMetricValue({ popup }) {
  if (!Array.isArray(popup.metricParts) || popup.metricParts.length === 0) {
    return popup.metricValue || "-";
  }

  return popup.metricParts.map((part, index) => (
    <span key={`${part.label || "value"}-${index}`}>
      {index > 0 && <span className="sensor-popup-metric-separator"> / </span>}
      {part.label && <span>{part.label} </span>}
      <span className={part.isExceeded ? "sensor-popup-value-exceeded" : ""}>{part.value}</span>
    </span>
  ));
}

function appendUniqueSensorPopups(queue, popups) {
  if (!popups.length) return queue;

  const existingKeys = new Set(queue.map(getPopupKey));
  const nextQueue = [...queue];

  popups.forEach((popup) => {
    const popupKey = getPopupKey(popup);
    if (!existingKeys.has(popupKey)) {
      existingKeys.add(popupKey);
      nextQueue.push(popup);
    }
  });

  return nextQueue;
}

function getPopupAssignee(targetUserId) {
  if (!targetUserId) return null;

  const user = findUserById(targetUserId);
  const memberId = userIdToOwner(targetUserId);
  const member = members.find((item) => item.id === memberId || item.id === targetUserId);
  const name = user?.displayName || user?.name || member?.name || "";

  if (!name) return null;

  return {
    name,
    color: member?.color || USER_COLORS[targetUserId] || "#ff7a21",
    initial: getAssigneeInitial(name),
  };
}

function getAssigneeInitial(name) {
  const text = String(name || "").replace(/님$/, "").trim();
  return [...text][0] || "?";
}

function getRealtimeApplianceTargetUserIds(applianceAssignees = {}, activeCalendarUser, currentUser) {
  const fallbackUserId = activeCalendarUser?.id || currentUser?.id || "";

  return {
    AIR_CONDITIONER:
      resolveOwnerOrUserIdToUserId(
        applianceAssignees["air-living"] ||
          applianceAssignees["air"] ||
          applianceAssignees["air-conditioner"] ||
          applianceAssignees.AIR_CONDITIONER,
      ) || "",
    AIR_PURIFIER:
      resolveOwnerOrUserIdToUserId(applianceAssignees["air-purifier"] || applianceAssignees.AIR_PURIFIER) || fallbackUserId,
  };
}

function filterRealtimePopupsBySchedule(popups = [], tasks = [], now = new Date()) {
  return popups.filter((popup) => {
    if (popup.applianceType === "WASHER") {
      return false;
    }
    if (popup.applianceType !== "AIR_CONDITIONER") return true;
    return canSendAirConditionerAlert(popup, tasks, now);
  });
}

function canSendAirConditionerAlert(popup = {}, tasks = [], now = new Date()) {
  const hasAssignedUser = Boolean(popup.targetUserId);
  if (!hasAssignedUser) {
    return false;
  }

  const today = dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const alertStartMinutes = getAirConditionerAlertStartTime(tasks, popup.targetUserId, today);

  if (!Number.isFinite(alertStartMinutes)) {
    // 고정 일정 없음 → 재택/자유 일정으로 간주하고 기존 센서 임계값 알림 정책을 적용합니다.
    return true;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const canSend = currentMinutes >= alertStartMinutes;

  return canSend;
}

function getAirConditionerAlertStartTime(tasks = [], targetUserId, date) {
  const lastFixedScheduleEndTime = getLastFixedScheduleEndTime(tasks, targetUserId, date);
  return Number.isFinite(lastFixedScheduleEndTime) ? Math.max(0, lastFixedScheduleEndTime - 60) : null;
}

function getLastFixedScheduleEndTime(tasks = [], targetUserId, date) {
  const fixedScheduleEndTimes = tasks
    .filter((task) => isTaskVisibleOnDate(task, date))
    .filter((task) => getTaskUserId(task) === targetUserId)
    .filter(isFixedScheduleTask)
    .map(getFixedScheduleEndMinutes)
    .filter(Number.isFinite);

  return fixedScheduleEndTimes.length > 0 ? Math.max(...fixedScheduleEndTimes) : null;
}

function getFixedScheduleEndMinutes(task = {}) {
  const range = getTaskNotificationRange(task);
  if (!range) return NaN;
  return range.endMinutes < range.startMinutes ? range.endMinutes + 24 * 60 : range.endMinutes;
}

function getDueWasherAlertCandidates(tasks, date, nowMinutes, activeCalendarUser, currentUser) {
  const washerTasks = tasks.filter((task) => isTaskVisibleOnDate(task, date) && isUserWasherScheduleTask(task));

  return washerTasks
    .map((washerTask) => {
      const targetUserId = getTaskUserId(washerTask) || activeCalendarUser?.id || currentUser?.id || "";
      const alertMinutes = getWasherAlertMinutes(tasks, washerTask, targetUserId, date);
      return { washerTask, targetUserId, alertMinutes };
    })
    .filter(({ alertMinutes }) => Number.isFinite(alertMinutes) && nowMinutes >= alertMinutes);
}

function getWasherAlertMinutes(tasks, washerTask, targetUserId, date) {
  const fixedSchedules = tasks
    .filter((task) => isTaskVisibleOnDate(task, date))
    .filter((task) => getTaskUserId(task) === targetUserId)
    .filter(isFixedScheduleTask)
    .map((task) => getTaskNotificationRange(task)?.startMinutes)
    .filter(Number.isFinite)
    .sort((first, second) => first - second);

  if (fixedSchedules.length > 0) {
    return Math.max(0, fixedSchedules[0] - 60);
  }

  return getTaskNotificationRange(washerTask)?.startMinutes;
}

function isWasherScheduleTask(task = {}) {
  const text = `${task.title || ""} ${task.applianceType || ""} ${task.displayType || ""}`;
  if (task.applianceType === "DISHWASHER" || /식기|세척|dishwasher|dish/i.test(text)) return false;
  return task.applianceType === "WASHER" || /세탁|빨래|washer/i.test(text);
}

async function sendDeviceCommandFromNotification(payload = {}) {
  logAnalyticsEvent("device_execute_click", payload);
  logDeviceExecuteEvent(payload, payload);
  await sendDeviceCommand(SENSOR_DEVICE_ID, payload);
}

function buildDeviceCommandPayloadFromTask(task = {}, context = {}) {
  if (!isExecutableApplianceTask(task)) {
    return null;
  }

  const applianceType = resolveExecutableApplianceType(task);

  if (applianceType === "AIR_CONDITIONER") {
    return buildAirConditionerCommandPayload({ ...task, applianceType }, context);
  }

  if (applianceType === "AIR_PURIFIER") {
    return buildAirPurifierCommandPayload({
      ...task,
      applianceType,
      reason: "캘린더 가전 실행 확인 알림에서 공기청정기 실행을 요청했습니다.",
      targetUserId: getTaskUserId(task),
    });
  }

  if (applianceType === "WASHER") {
    return {
      applianceType: "WASHER",
      applianceId: "washer",
      applianceName: "세탁기",
      command: "washer_start",
      mode: task.applianceMode || task.currentMode || "표준",
      reason: "캘린더 세탁 일정 실행 확인 알림에서 세탁기 실행을 요청했습니다.",
      targetUserId: getTaskUserId(task),
    };
  }

  if (applianceType === "DRYER") {
    return {
      applianceType: "DRYER",
      applianceId: "dryer",
      applianceName: "건조기",
      command: "dryer_start",
      mode: task.applianceMode || task.currentMode || "표준",
      reason: "실행 버튼에서 건조기 실행을 요청했습니다.",
      targetUserId: getTaskUserId(task),
    };
  }

  if (applianceType === "ROBOT_CLEANER") {
    return {
      applianceType: "ROBOT_CLEANER",
      applianceId: "robot_cleaner",
      applianceName: "로봇청소기",
      command: "robot_cleaner_start",
      mode: task.applianceMode || task.currentMode || "전체 청소",
      reason: "알림 목록 실행 버튼에서 로봇청소기 실행을 요청했습니다.",
      targetUserId: getTaskUserId(task),
    };
  }

  if (applianceType === "DISHWASHER") {
    return {
      applianceType: "DISHWASHER",
      applianceId: "dishwasher",
      applianceName: "식기세척기",
      command: "dishwasher_start",
      mode: task.applianceMode || task.currentMode || "표준",
      reason: "알림 목록 실행 버튼에서 식기세척기 실행을 요청했습니다.",
      targetUserId: getTaskUserId(task),
    };
  }

  return null;
}

function isExecutableApplianceTask(task = {}) {
  return Boolean(resolveExecutableApplianceType(task));
}

function resolveExecutableApplianceType(task = {}) {
  const explicitType = String(task.applianceType || "").toUpperCase();
  const typeAliases = {
    AIRCON: "AIR_CONDITIONER",
    AIR_CON: "AIR_CONDITIONER",
    AIR_CONDITIONER: "AIR_CONDITIONER",
    AIR_PURIFIER: "AIR_PURIFIER",
    WASHER: "WASHER",
    DRYER: "DRYER",
    DISHWASHER: "DISHWASHER",
    ROBOT_CLEANER: "ROBOT_CLEANER",
  };
  if (typeAliases[explicitType]) return typeAliases[explicitType];

  const explicitId = String(task.applianceId || task.appliance || "").toLowerCase();
  if (/dryer|dry-machine|건조/.test(explicitId)) return "DRYER";
  if (/washer|세탁/.test(explicitId)) return "WASHER";
  if (/dishwasher|dish|식기|세척/.test(explicitId)) return "DISHWASHER";
  if (/robot|robot_cleaner|로봇/.test(explicitId)) return "ROBOT_CLEANER";
  if (/air_purifier|air-purifier|purifier|공기/.test(explicitId)) return "AIR_PURIFIER";
  if (/aircon|air-conditioner|air_conditioner|air-|에어컨/.test(explicitId)) return "AIR_CONDITIONER";

  const text = `${task.title || ""} ${task.place || ""} ${task.applianceName || ""} ${task.displayType || ""}`.toLowerCase();
  if (/건조기|dryer/.test(text)) return "DRYER";
  if (/식기세척|식기\s*세척|설거지|dishwasher|dish/.test(text)) return "DISHWASHER";
  if (/로봇청소|로봇\s*청소|robot/.test(text)) return "ROBOT_CLEANER";
  if (/공기청정|미세먼지|air purifier|purifier/.test(text)) return "AIR_PURIFIER";
  if (/에어컨|냉방|제습|aircon|air conditioner/.test(text)) return "AIR_CONDITIONER";
  if (/세탁기|세탁|빨래|washer/.test(text)) return "WASHER";

  return "";
}

function normalizeDeviceCommandPayload(payload = {}) {
  if (payload.applianceType === "AIR_CONDITIONER") {
    return buildAirConditionerCommandPayload(payload, { requestedBy: payload.requestedBy });
  }

  if (payload.applianceType === "AIR_PURIFIER") {
    return buildAirPurifierCommandPayload(payload);
  }

  return payload;
}

function buildDeviceCommandPayloadFromRealtimePopup(popup = {}) {
  return normalizeDeviceCommandPayload({
    ...popup,
    source: popup.source || "realtime-sensor-popup",
  });
}

function buildAirPurifierCommandPayload(source = {}) {
  return {
    applianceType: "AIR_PURIFIER",
    applianceId: "air_purifier",
    applianceName: source.applianceName || "공기청정기",
    command: "air_purifier_on",
    mode: "자동",
    reason: source.reason || "실시간 센서 임계치 초과로 공기청정기 실행을 요청했습니다.",
    targetUserId: source.targetUserId || "",
    requestedBy: source.requestedBy || "",
  };
}

function buildAirConditionerCommandPayload(source = {}, context = {}) {
  const target = resolveAirConditionerTarget(source);
  const commandMode = resolveAirConditionerCommandMode(source);
  const requestedBy = context.requestedBy || source.requestedBy || "";
  const payload = {
    applianceType: "AIR_CONDITIONER",
    applianceId: target.applianceId,
    applianceName: target.applianceName,
    command: `${target.commandPrefix}_aircon_${commandMode.commandSuffix}`,
    mode: commandMode.mode,
    reason: buildAirConditionerCommandReason(target, commandMode.mode, requestedBy),
    targetUserId: target.targetUserId,
  };

  if (target.targetUserId === "shared" && requestedBy && requestedBy !== "shared") {
    payload.requestedBy = requestedBy;
  }

  return payload;
}

function resolveAirConditionerTarget(source = {}) {
  const text = `${source.applianceId || ""} ${source.applianceName || ""} ${source.title || ""} ${source.place || ""} ${source.userId || ""} ${source.owner || ""} ${source.targetUserId || ""}`.toLowerCase();
  const explicitId = String(source.applianceId || "").toLowerCase();

  if (/shared|living|air-living|거실|공동/.test(text)) {
    return AIR_CONDITIONER_TARGETS.shared;
  }
  if (/aircon_sumin|air-sumin|sumin|수민|theresa/.test(explicitId) || /sumin|수민/.test(text)) {
    return AIR_CONDITIONER_TARGETS.sumin;
  }
  if (/aircon_dada|air-dabin|air-dada|dada|dabin|다빈|minsu/.test(explicitId) || /dada|dabin|다빈/.test(text)) {
    return AIR_CONDITIONER_TARGETS.dada;
  }
  if (/aircon_jea|air-jaehyeok|air-jea|jea|jaehyeok|재혁|\bme\b/.test(explicitId) || /jea|jaehyeok|재혁/.test(text)) {
    return AIR_CONDITIONER_TARGETS.jea;
  }

  return AIR_CONDITIONER_TARGETS.shared;
}

function resolveAirConditionerCommandMode(source = {}) {
  const text = `${source.command || ""} ${source.mode || ""} ${source.applianceMode || ""} ${source.currentMode || ""} ${source.title || ""}`.toLowerCase();
  if (/dry|제습/.test(text)) {
    return { commandSuffix: "dry", mode: "제습" };
  }

  return { commandSuffix: "power_cooling", mode: "파워냉방" };
}

function buildAirConditionerCommandReason(target, mode, requestedBy) {
  const requestedByName = getCommandRequesterName(requestedBy);
  if (target.targetUserId === "shared" && requestedByName) {
    return `${requestedByName}이 공동 에어컨 ${mode} 실행을 요청했습니다.`;
  }

  return `${target.applianceName} ${mode} 실행을 요청했습니다.`;
}

function getCommandRequesterName(userId) {
  if (!userId || userId === "shared") return "";
  const user = findUserById(userId);
  return user?.name?.replace(/^김다빈$/, "다빈").replace(/^한수민$/, "수민").replace(/^최재혁$/, "재혁") || userId;
}

const AIR_CONDITIONER_TARGETS = {
  shared: {
    applianceId: "aircon_shared",
    applianceName: "공동 에어컨",
    commandPrefix: "shared",
    targetUserId: "shared",
  },
  sumin: {
    applianceId: "aircon_sumin",
    applianceName: "수민 에어컨",
    commandPrefix: "sumin",
    targetUserId: "sumin",
  },
  dada: {
    applianceId: "aircon_dada",
    applianceName: "다빈 에어컨",
    commandPrefix: "dada",
    targetUserId: "dada",
  },
  jea: {
    applianceId: "aircon_jea",
    applianceName: "재혁 에어컨",
    commandPrefix: "jea",
    targetUserId: "jea",
  },
};

async function sendWasherStartCommandFromNotification(task = {}) {
  const payload = buildDeviceCommandPayloadFromTask(task);
  if (!payload) return;

  logAnalyticsEvent("device_execute_click", payload);
  logAnalyticsEvent("washer_execute", payload);
  await sendDeviceCommand(SENSOR_DEVICE_ID, payload);
}

function isUserWasherScheduleTask(task = {}) {
  if (!isWasherScheduleTask(task)) return false;
  if (task.firestoreSchedule) return true;

  return (
    task.source === "manual" &&
    task.type !== "ai_task" &&
    task.tag !== "house" &&
    task.displayType !== "appliance" &&
    !task.applianceType
  );
}

function isFixedScheduleTask(task = {}) {
  return task.displayType === "fixed" || task.place === "고정 일정";
}

function resolveOwnerOrUserIdToUserId(value) {
  if (!value) return "";
  if (findUserById(value)) return value;
  return OWNER_TO_USER[value] || "";
}


const mainNavItems = [
  { id: "devices", label: "디바이스", icon: Grid2X2 },
  { id: "schedule", label: "캘린더", icon: CalendarDays },
  { id: "home", label: "홈", icon: House },
  { id: "care", label: "케어", icon: ChartColumnIncreasing },
  { id: "menu", label: "메뉴", icon: Menu },
];

const fixedScheduleColorByTitle = {
  "회사": "#ffb063",
  "필라테스": "#d3b5f3",
  "공업수학": "#95cff5",
  "정역학": "#cbf39d",
  "열역학": "#ffc68f",
  "유체역학": "#fff294",
  "기계제도": "#ffd5d6",
  "재료역학": "#d3b5f3",
  "기계공작법": "#95cff5",
  "기계공학실험": "#ff7976",
  "부트 캠프": "#cbf39d",
  "삼겹살집 알바": "#ffc68f",
  "국어": "#ff7976",
  "수학": "#95cff5",
  "영어": "#d3b5f3",
  "과학": "#cbf39d",
  "사회": "#ffc68f",
  "체육": "#ffb063",
  "음악": "#fff294",
  "미술": "#ffd5d6",
  "창체": "#d3b5f3",
  "기술가정": "#95cff5",
  "동아리": "#cbf39d",
};

function devWarn() {
  // Intentionally silent: avoid exposing user, sensor, or command payload data in the browser console.
}

function getFirestoreScheduleUserIds(currentUser) {
  if (isMasterUser(currentUser)) return USERS.map((user) => user.id).filter(isFirestoreScheduleUser);
  return isFirestoreScheduleUser(currentUser?.id) ? [currentUser.id] : [];
}

function firestoreScheduleToTask(schedule = {}) {
  const userId = schedule.userId || "";
  const startTime = schedule.startTime || "";
  const endTime = schedule.endTime || "";
  const repeat = formatScheduleDisplayRepeat({
    repeat: schedule.repeat,
    type: schedule.type,
    daysOfWeek: schedule.daysOfWeek,
    startTime,
    endTime,
  });

  return {
    id: schedule.scheduleId || schedule.id,
    scheduleId: schedule.scheduleId || schedule.id,
    firestoreSchedule: true,
    date: schedule.date || "",
    title: schedule.title || "개인 일정",
    place: schedule.place || "개인 일정",
    tag: "plan",
    owner: userIdToOwner(userId),
    userId,
    done: Boolean(schedule.done),
    repeat,
    startTime,
    endTime,
    type: schedule.type || "personal",
    daysOfWeek: Array.isArray(schedule.daysOfWeek) ? schedule.daysOfWeek : [],
    source: "manual",
    displayType: schedule.type === "fixed" ? "fixed" : "manual",
    description: schedule.description || "",
    reminder: schedule.reminder || "off",
  };
}

function taskToFirestoreSchedule(task = {}) {
  const repeatValue = normalizeFirestoreRepeat(task.repeat, task.type);
  const timeRange = getTaskNotificationRange(task);

  return {
    title: task.title || "개인 일정",
    date: task.type === "fixed" ? undefined : task.date,
    startTime: task.startTime || timeRange?.startTime || "",
    endTime: task.endTime || timeRange?.endTime || "",
    type: task.type === "fixed" ? "fixed" : "personal",
    repeat: repeatValue,
    daysOfWeek: task.type === "fixed" ? task.daysOfWeek || [] : undefined,
    place: task.place || "",
    description: task.description || "",
    reminder: task.reminder || "off",
    done: Boolean(task.done),
  };
}

function shouldPersistUserSchedule(task = {}) {
  return (
    task.source === "manual" &&
    task.type !== "ai_task" &&
    task.tag !== "house" &&
    task.displayType !== "appliance" &&
    !task.applianceType &&
    isFirestoreScheduleUser(getTaskUserId(task))
  );
}

function normalizeScheduleRepeatLabel(repeat) {
  if (!repeat || repeat === "none") return "없음";
  if (repeat === "daily") return "매일";
  if (repeat === "weekly") return "매주";
  if (repeat === "monthly") return "매월";
  return repeat;
}

function normalizeFirestoreRepeat(repeat, type) {
  if (type === "fixed") return "weekly";
  const text = String(repeat || "").split("·")[0].trim();
  if (isTimeRangeText(text) || isTimeText(text) || text === "하루종일") return "none";
  if (!text || text === "없음") return "none";
  if (text === "매일") return "daily";
  if (text === "매주") return "weekly";
  if (text === "매월") return "monthly";
  if (text === "daily" || text === "weekly" || text === "none") return text;
  return text;
}

function formatScheduleDisplayRepeat({ repeat, type, daysOfWeek, startTime, endTime }) {
  const repeatLabel = type === "fixed" && repeat === "weekly"
    ? `매주 ${formatDaysOfWeek(daysOfWeek)}`
    : normalizeScheduleRepeatLabel(repeat);
  const timeLabel = startTime && endTime ? `${startTime} ~ ${endTime}` : "";

  if (repeat === "none" || !repeat) return timeLabel || "없음";
  return [repeatLabel, timeLabel].filter(Boolean).join(" · ");
}

function isTimeRangeText(text) {
  return /^\d{1,2}:\d{2}\s*(?:~|-)\s*\d{1,2}:\d{2}$/.test(String(text || ""));
}

function isTimeText(text) {
  return /^\d{1,2}:\d{2}$/.test(String(text || ""));
}

function formatDaysOfWeek(daysOfWeek = []) {
  const labels = {
    sun: "일",
    mon: "월",
    tue: "화",
    wed: "수",
    thu: "목",
    fri: "금",
    sat: "토",
  };

  return daysOfWeek.map((day) => labels[day] || day).filter(Boolean).join("/");
}

function logDeviceExecuteEvent(popup = {}, payload = {}) {
  const eventByApplianceType = {
    AIR_PURIFIER: "air_purifier_execute",
    AIR_CONDITIONER: "aircon_execute",
    WASHER: "washer_execute",
  };
  const eventName = eventByApplianceType[popup.applianceType];
  if (eventName) logAnalyticsEvent(eventName, payload);
}

function shouldRequestAiHouseworkTask(task = {}) {
  return task.source === "manual" && task.type !== "ai_task" && task.tag !== "house" && task.displayType !== "appliance";
}

function getPredictionTemperature(weather = {}) {
  const minTemp = toNullableFiniteNumber(weather.minTemp);
  const maxTemp = toNullableFiniteNumber(weather.maxTemp ?? weather.high);
  if (minTemp !== null && maxTemp !== null) return Math.round(((minTemp + maxTemp) / 2) * 10) / 10;
  return maxTemp ?? minTemp;
}

function getAirQualityPm10(result = {}) {
  const items = Array.isArray(result.data) ? result.data : [];
  const item = items.find((candidate) => toNullableFiniteNumber(candidate.pm10Value ?? candidate.pm10) !== null);
  return toNullableFiniteNumber(item?.pm10Value ?? item?.pm10);
}

function toNullableFiniteNumber(value) {
  if (value === null || value === undefined || value === "" || value === "-") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toCalendarApplianceType(appliance) {
  const types = {
    washer: "WASHER",
    dryer: "DRYER",
    dishwasher: "DISHWASHER",
    robot_cleaner: "ROBOT_CLEANER",
    air_purifier: "AIR_PURIFIER",
    air_conditioner: "AIR_CONDITIONER",
  };
  return types[appliance] || "ETC";
}

function getAiTaskApplianceSettingKeys(appliance, requestedByUserId) {
  if (appliance === "air_conditioner") {
    const personalAirConditionerKeys = {
      sumin: "air-sumin",
      dada: "air-dabin",
      jea: "air-jaehyeok",
    };
    const personalKey = personalAirConditionerKeys[requestedByUserId];
    if (personalKey) return [personalKey];
    return ["air-living", "air", "air-conditioner", "AIR_CONDITIONER"];
  }

  const settingKeys = {
    washer: ["washer", "WASHER"],
    dryer: ["dryer", "DRYER"],
    dishwasher: ["dishwasher", "DISHWASHER"],
    robot_cleaner: ["robot", "robot-cleaner", "ROBOT_CLEANER"],
    air_purifier: ["air-purifier", "AIR_PURIFIER"],
  };

  return settingKeys[appliance] || [];
}

function resolveAiTaskAssignment(appliance, requestedByUserId, applianceAssignees = {}) {
  const settingKeys = getAiTaskApplianceSettingKeys(appliance, requestedByUserId);
  const applianceSettingKey = settingKeys.find((key) => applianceAssignees[key]) || settingKeys[0] || "";
  const configuredOwner = applianceSettingKey ? applianceAssignees[applianceSettingKey] : "";
  const userId = resolveOwnerOrUserIdToUserId(configuredOwner) || requestedByUserId || USERS[0].id;

  return {
    applianceSettingKey,
    ownerId: configuredOwner || userIdToOwner(userId),
    userId,
  };
}

function reassignTogetherAiTask(task, applianceAssignees = {}) {
  if (task.source !== "together_ai" || !task.appliance) return task;

  const requestedByUserId = task.requestedByUserId || getTaskUserId(task);
  const assignment = resolveAiTaskAssignment(task.appliance, requestedByUserId, applianceAssignees);
  return normalizeTaskForUser(
    {
      ...task,
      owner: assignment.ownerId,
      userId: assignment.userId,
      applianceSettingKey: assignment.applianceSettingKey,
      requestedByUserId,
      place: getAiTaskPlace(task.applianceType || toCalendarApplianceType(task.appliance), assignment.applianceSettingKey),
    },
    assignment.userId,
  );
}

function getAiTaskPlace(applianceType, applianceSettingKey) {
  const personalAirConditionerPlaces = {
    "air-sumin": "수민 방",
    "air-dabin": "다빈 방",
    "air-jaehyeok": "재혁 방",
  };
  return personalAirConditionerPlaces[applianceSettingKey] || appliancePlaceLabel[applianceType] || "가전 자동화";
}

function getAiTaskApplianceDisplayName(appliance) {
  const labels = {
    washer: "세탁기",
    dryer: "건조기",
    dishwasher: "식기세척기",
    robot_cleaner: "로봇청소기",
    air_purifier: "공기청정기",
    air_conditioner: "에어컨",
  };
  return labels[appliance] || "가전";
}

function createTaskId() {
  return globalThis.crypto?.randomUUID?.() || `ai-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
const fallbackFixedScheduleColors = CALENDAR_SCHEDULE_COLORS;

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
  jaehyeok: ["월", "화", "수", "목", "금"].map((day) => ({
    title: "회사",
    day,
    startTime: "09:00",
    endTime: "18:00",
    color: getFixedScheduleColor("회사"),
  })),
  dabin: [
    ["국어", "월", "09:10", "09:55"],
    ["수학", "월", "10:05", "10:50"],
    ["영어", "월", "11:00", "11:45"],
    ["과학", "월", "11:55", "12:40"],
    ["사회", "월", "13:30", "14:15"],
    ["체육", "월", "14:25", "15:10"],
    ["수학", "화", "09:10", "09:55"],
    ["영어", "화", "10:05", "10:50"],
    ["국어", "화", "11:00", "11:45"],
    ["음악", "화", "11:55", "12:40"],
    ["과학", "화", "13:30", "14:15"],
    ["미술", "화", "14:25", "15:10"],
    ["창체", "화", "15:20", "16:05"],
    ["영어", "수", "09:10", "09:55"],
    ["과학", "수", "10:05", "10:50"],
    ["수학", "수", "11:00", "11:45"],
    ["국어", "수", "11:55", "12:40"],
    ["기술가정", "수", "13:30", "14:15"],
    ["체육", "수", "14:25", "15:10"],
    ["사회", "목", "09:10", "09:55"],
    ["국어", "목", "10:05", "10:50"],
    ["영어", "목", "11:00", "11:45"],
    ["수학", "목", "11:55", "12:40"],
    ["과학", "목", "13:30", "14:15"],
    ["동아리", "목", "14:25", "15:10"],
    ["창체", "목", "15:20", "16:05"],
    ["과학", "금", "09:10", "09:55"],
    ["체육", "금", "10:05", "10:50"],
    ["사회", "금", "11:00", "11:45"],
    ["국어", "금", "11:55", "12:40"],
    ["수학", "금", "13:30", "14:15"],
    ["영어", "금", "14:25", "15:10"],
  ].map(([title, day, startTime, endTime]) => ({ title, day, startTime, endTime, color: getFixedScheduleColor(title) })),
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
  WASHER: "#95cff5",
  DRYER: "#d3b5f3",
  ROBOT_CLEANER: "#ffb063",
  AIR_PURIFIER: "#cbf39d",
  DISHWASHER: "#ffc68f",
  AIR_CONDITIONER: "#95cff5",
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
          title: "식사 시간 공기청정기",
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
          title: "식기세척기",
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
          title: "세탁기",
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
          title: "건조기",
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
        applianceId: `aircon_${fixedTask.userId}`,
        applianceName: `${room.name} 에어컨`,
        applianceMode: "냉방",
        sortOrder: 90 + index,
      });
    });
}

function createApplianceCalendarTask({ id, date, title, place, owner, userId, repeat, applianceType, applianceId, applianceName, applianceMode, sortOrder }) {
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
    applianceId,
    applianceName,
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

function OnboardingPage({ step, userName = "00", onboardingSetup, onSetupChange, onNext, onInfoNext, onFixedNext, onPreview, onApplianceNext, onAssigneeNext, onBack, onComplete, onSkip }) {
  const isIntro = step === "intro";
  const isScheduleInfo = step === "scheduleInfo";
  const isFixedSchedule = step === "fixedSchedule";
  const isGoogleConfirm = step === "googleConfirm";
  const isAppliance = step === "appliance";
  const isAssignee = step === "assignee";
  const isReady = step === "ready";
  const [selectedApplianceTypes, setSelectedApplianceTypes] = useState(() => onboardingSetup?.applianceTypes || []);
  const [applianceAssignees, setApplianceAssignees] = useState(() => onboardingSetup?.applianceAssignees || {});
  const [selectedImportMethod, setSelectedImportMethod] = useState("");
  const [fixedSchedules, setFixedSchedules] = useState(() => onboardingSetup?.fixedSchedules || []);
  const [fixedTitle, setFixedTitle] = useState("");
  const [fixedDay, setFixedDay] = useState("");
  const [fixedStartHour, setFixedStartHour] = useState("");
  const [fixedStartMinute, setFixedStartMinute] = useState("");
  const [fixedEndHour, setFixedEndHour] = useState("");
  const [fixedEndMinute, setFixedEndMinute] = useState("");
  const introMessage = "어서 오세요!\n최적의 가사일 계획을\n자동으로 짜주는\nAI 가사일 플래너\n플래니입니다!";
  const scheduleUserName = String(userName || "00").endsWith("님") ? String(userName || "00").slice(0, -1) : String(userName || "00");
  const scheduleInfoMessage = `AI가 최적의 가사일을\n자동으로 계획하려면\n${scheduleUserName} 님의 일정 정보가 필요해요!`;
  const readyMessage = `${scheduleUserName}님의 일정, 날씨, 온습도\n데이터를 분석해서\n플래니가 최적의 가사일 계획을\n짜고 있어요!`;
  const [introTextLength, setIntroTextLength] = useState(0);
  const [scheduleInfoTextLength, setScheduleInfoTextLength] = useState(0);
  const [readyTextLength, setReadyTextLength] = useState(0);
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
  const assigneeMemberOptions = members.filter((member) => member.id !== "all");
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
  const readyText = readyMessage.slice(0, readyTextLength);
  const isReadyTextComplete = readyTextLength >= readyMessage.length;
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

    setReadyTextLength(0);
    const interval = window.setInterval(() => {
      setReadyTextLength((current) => {
        if (current >= readyMessage.length) {
          window.clearInterval(interval);
          return current;
        }

        return current + 1;
      });
    }, 34);

    return () => window.clearInterval(interval);
  }, [isReady, readyMessage.length]);

  useEffect(() => {
    if (!isReady || !isReadyTextComplete) return undefined;

    const timeout = window.setTimeout(
      () =>
        onComplete({
          applianceTypes: assignedApplianceTypes,
          applianceAssignees,
          fixedSchedules,
        }),
      5000,
    );
    return () => window.clearTimeout(timeout);
  }, [applianceAssignees, assignedApplianceTypes, fixedSchedules, isReady, isReadyTextComplete, onComplete]);

  useEffect(() => {
    onSetupChange?.({
      applianceTypes: selectedApplianceTypes,
      applianceAssignees,
      fixedSchedules,
    });
  }, [applianceAssignees, fixedSchedules, onSetupChange, selectedApplianceTypes]);

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
    <section className={`onboarding-page ${isFixedSchedule ? "onboarding-fixed-page" : ""} ${isGoogleConfirm ? "onboarding-google-page" : ""}`} aria-label="온보딩">
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
        className={`onboarding-character-scene onboarding-visual ${isIntro ? "intro" : ""} ${isScheduleInfo ? "info" : ""} ${isFixedSchedule ? "profile fixed" : ""} ${isGoogleConfirm ? "google-confirm" : ""} ${isAppliance ? "appliance" : ""} ${
          isAssignee ? "assignee" : ""
        } ${isReady ? "ready" : ""}`}
      >
        {isIntro ? (
          <section className="onboarding-intro-panel onboarding-speech-bubble" aria-label="환영 멘트">
            <div className="onboarding-bubble-content">
              <p className="onboarding-intro-type">
                {renderTypedOnboardingText(introText, "플래니")}
                {!isIntroComplete && <i aria-hidden="true" />}
              </p>
              <button className="onboarding-next-button" type="button" onClick={onNext} disabled={!isIntroComplete} aria-label="다음 단계로 이동">
                <span>NEXT</span>
                <ArrowRight size={18} strokeWidth={2.6} />
              </button>
            </div>
          </section>
        ) : isScheduleInfo ? (
          <section className="onboarding-intro-panel onboarding-info-panel onboarding-speech-bubble" aria-label="일정 정보 안내">
            <div className="onboarding-bubble-content">
              <p className="onboarding-intro-type onboarding-info-type">
                {renderTypedOnboardingText(scheduleInfoText, scheduleUserName)}
                {!isScheduleInfoComplete && <i aria-hidden="true" />}
              </p>
              <button className="onboarding-next-button onboarding-info-next-button" type="button" onClick={onInfoNext} disabled={!isScheduleInfoComplete} aria-label="고정 일정 입력으로 이동">
                <span>NEXT</span>
                <ArrowRight size={18} strokeWidth={2.6} />
              </button>
            </div>
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
          <section className="onboarding-intro-panel onboarding-google-confirm onboarding-speech-bubble" aria-label="구글 캘린더 연동 확인">
            <div className="onboarding-bubble-content">
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
                <div className={`onboarding-assignee-row ${applianceAssignees[type] ? "assigned" : ""}`} key={type}>
                  <span className={`onboarding-assignee-icon ${type}`} aria-hidden="true">
                    <i />
                  </span>
                  <strong>{label}</strong>
                  <OnboardingAssigneeSelect
                    value={applianceAssignees[type] || ""}
                    options={assigneeMemberOptions}
                    onChange={(value) => changeApplianceAssignee(type, value)}
                  />
                </div>
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
                <div className={`onboarding-assignee-row ${applianceAssignees[type] ? "assigned" : ""}`} key={type}>
                  <span className={`onboarding-assignee-icon ${type}`} aria-hidden="true">
                    <i />
                  </span>
                  <strong>{label}</strong>
                  <OnboardingAssigneeSelect
                    value={applianceAssignees[type] || ""}
                    options={assigneeMemberOptions}
                    onChange={(value) => changeApplianceAssignee(type, value)}
                  />
                </div>
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
                {renderTypedOnboardingText(readyText, "최적의 가사일 계획")}
                {!isReadyTextComplete && <i aria-hidden="true" />}
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
          <span className="onboarding-character-wrap onboarding-character" aria-hidden="true">
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

function OnboardingAssigneeSelect({ value, options, onChange }) {
  const [isOpen, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.id === value);
  const selectedLabel = selectedOption?.name || "담당자 선택";

  function selectOption(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div
      className={`onboarding-assignee-select ${value ? "assigned" : ""} ${isOpen ? "open" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button type="button" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setOpen((current) => !current)}>
        <span>{selectedLabel}</span>
        <ChevronDown size={12} strokeWidth={2.8} />
      </button>
      {isOpen && (
        <div className="onboarding-assignee-options" role="listbox">
          {options.map((option) => {
            const isSelected = option.id === value;
            return (
              <button
                type="button"
                key={option.id}
                role="option"
                aria-selected={isSelected}
                className={isSelected ? "selected" : ""}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option.id)}
              >
                <span>{option.name}</span>
                {isSelected && <i aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HomePage({ onOpenNotifications }) {
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

      <section className="thinq-smart-routine">
        <h2>스마트 루틴</h2>
      </section>
    </section>
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

function PostponeTimePicker({ label, value, onChange }) {
  const [isOpen, setOpen] = useState(false);
  const [hour, minute] = normalizeEditableTimeValue(value).split(":");
  const hours = Array.from({ length: 18 }, (_, index) => String(index + 6).padStart(2, "0"));
  const minutes = ["00", "10", "20", "30", "40", "50"];

  return (
    <div
      className={["postpone-time-picker", isOpen ? "open" : ""].filter(Boolean).join(" ")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <span>{label}</span>
      <button type="button" className="postpone-time-display" onClick={() => setOpen((current) => !current)} aria-expanded={isOpen}>
        {hour}:{minute}
      </button>
      {isOpen && (
        <div className="postpone-time-scrolls" aria-label={label}>
          <div className="postpone-time-column" role="listbox" aria-label="시">
            {hours.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={hour === option}
                className={hour === option ? "active" : ""}
                onClick={() => onChange(`${option}:${minute}`)}
              >
                {option}시
              </button>
            ))}
          </div>
          <div className="postpone-time-column" role="listbox" aria-label="분">
            {minutes.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={minute === option}
                className={minute === option ? "active" : ""}
                onClick={() => onChange(`${hour}:${option}`)}
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

function PostponeDatePicker({ label, value, onChange }) {
  const [isOpen, setOpen] = useState(false);
  const selected = parsePickerDate(value);
  const [viewDate, setViewDate] = useState(() => new Date(selected.year, selected.month - 1, 1));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
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
    const next = parsePickerDate(value);
    setViewDate(new Date(next.year, next.month - 1, 1));
  }, [value]);

  function moveMonth(offset) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <div
      className={["postpone-date-picker", isOpen ? "open" : ""].filter(Boolean).join(" ")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <span>{label}</span>
      <button type="button" className="postpone-date-display" onClick={() => setOpen((current) => !current)} aria-expanded={isOpen}>
        <strong>{value}</strong>
        <small aria-hidden="true">
          <CalendarDays size={15} strokeWidth={2.5} />
        </small>
      </button>
      {isOpen && (
        <div className="postpone-calendar-panel" aria-label="날짜 선택">
          <div className="postpone-calendar-head">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달">
              {"<"}
            </button>
            <strong>
              {year}년 {String(month).padStart(2, "0")}월
            </strong>
            <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달">
              {">"}
            </button>
          </div>
          <div className="postpone-calendar-weekdays" aria-hidden="true">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="postpone-calendar-grid">
            {cells.map((cell) =>
              cell.date ? (
                <button
                  key={cell.key}
                  type="button"
                  className={cell.date === value ? "active" : ""}
                  onClick={() => {
                    onChange(cell.date);
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

function SimpleTabPage({ icon, title, text }) {
  return (
    <section className="page simple-tab-page">
      <div className="simple-tab-icon">{icon}</div>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

function sortTasks(tasks) {
  return [...tasks].sort(taskSorter);
}

function isTaskVisibleOnDate(task, date) {
  return getTaskDateKeys(task).includes(date);
}

function getTaskDateKeys(task) {
  const startDate = normalizeTaskDateKey(task.date);
  if (!startDate && task.type === "fixed" && Array.isArray(task.daysOfWeek)) {
    return getWeeklyFixedTaskDateKeys(task.daysOfWeek);
  }
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

function getWeeklyFixedTaskDateKeys(daysOfWeek = []) {
  const targetDayIndexes = new Set(daysOfWeek.map((day) => DAY_OF_WEEK_INDEX[day]).filter((dayIndex) => Number.isInteger(dayIndex)));
  if (targetDayIndexes.size === 0) return [];

  const today = new Date(`${getTodayKey()}T00:00:00`);
  const start = new Date(today.getFullYear(), 0, 1);
  const end = new Date(today.getFullYear() + 1, 11, 31);
  const dates = [];

  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    if (targetDayIndexes.has(current.getDay())) {
      dates.push(dateKey(current.getFullYear(), current.getMonth() + 1, current.getDate()));
    }
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

function normalizeCalendarTaskColors(tasks) {
  return tasks.map((task, index) => {
    const nextColor = normalizeCalendarColor(task.color, index);
    return nextColor && nextColor !== task.color ? { ...task, color: nextColor } : task;
  });
}

function normalizeCalendarColor(color, index = 0) {
  if (!color) return "";
  const normalizedColor = String(color).trim().toLowerCase();
  const paletteMatch = CALENDAR_SCHEDULE_COLORS.find((option) => option.toLowerCase() === normalizedColor);
  if (paletteMatch) return paletteMatch;
  return LEGACY_CALENDAR_COLOR_MAP[normalizedColor] || CALENDAR_SCHEDULE_COLORS[index % CALENDAR_SCHEDULE_COLORS.length];
}

function createDefaultOnboardingSetup() {
  return {
    applianceTypes: DEFAULT_ONBOARDING_APPLIANCE_TYPES,
    applianceAssignees: DEFAULT_ONBOARDING_APPLIANCE_ASSIGNEES,
    fixedSchedules: [],
  };
}

function normalizeOnboardingSetup(setup = {}) {
  const fallback = createDefaultOnboardingSetup();
  const applianceTypes = Array.isArray(setup.applianceTypes) ? setup.applianceTypes : fallback.applianceTypes;
  const applianceAssignees =
    setup.applianceAssignees && typeof setup.applianceAssignees === "object" ? { ...fallback.applianceAssignees, ...setup.applianceAssignees } : fallback.applianceAssignees;
  const fixedSchedules = Array.isArray(setup.fixedSchedules) ? setup.fixedSchedules : fallback.fixedSchedules;

  return {
    applianceTypes,
    applianceAssignees,
    fixedSchedules,
  };
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
    titles: ["세탁기", "빨래 시작", "세탁물 정리"],
  },
  air: {
    place: "거실",
    titles: ["에어컨 예약 냉방", "실내 온도 조절", "귀가 전 냉방"],
  },
  fridge: {
    place: "주방",
    titles: ["냉장고 정리", "식재료 확인", "유통기한 체크"],
  },
  dryer: {
    place: "세탁실",
    titles: ["건조기", "건조 필터 확인", "습도 맞춤 건조"],
  },
  dehumidifier: {
    place: "거실",
    titles: ["제습기", "습도 맞춤 제습", "실내 습도 확인"],
  },
  robot: {
    place: "거실",
    titles: ["로봇청소기", "바닥 청소 예약", "청소 구역 확인"],
  },
  dishwasher: {
    place: "주방",
    titles: ["식기세척기", "식기세척기 작동", "그릇 정리"],
  },
  "air-purifier": {
    place: "거실",
    titles: ["공기청정기 작동", "실내 공기 정화", "환기 후 공기청정"],
  },
  "air-living": {
    place: "거실",
    titles: ["거실 에어컨 예약냉방", "거실 냉방 예약", "거실 온도 조절"],
  },
  "air-sumin": {
    place: "수민 방",
    titles: ["수민 에어컨 예약냉방", "수민 방 냉방", "수민 방 온도 조절"],
  },
  "air-dabin": {
    place: "다빈 방",
    titles: ["다빈 에어컨 예약냉방", "다빈 방 냉방", "다빈 방 온도 조절"],
  },
  "air-jaehyeok": {
    place: "재혁 방",
    titles: ["재혁 에어컨 예약냉방", "재혁 방 냉방", "재혁 방 온도 조절"],
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
  DISHWASHER: "주방",
};

function isLaundryTask(task) {
  return /세탁|빨래/.test(`${task?.title || ""} ${task?.place || ""}`) || ["WASHER", "NATURAL_DRY"].includes(task?.applianceType);
}

function isExecutionNotificationTask(task = {}) {
  if (task.displayType === "appliance" || task.applianceType) return true;
  return /세탁기|건조기|에어컨|공기청정기|로봇청소기|식기세척기|제습기/.test(`${task.title || ""} ${task.place || ""}`);
}

function findNextAvailableLaundryDate(task, tasks, calendarWeatherByDate) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = addDays(task.date, offset);
    const weather = calendarWeatherByDate[date] || weatherByDate[date];
    if (!weather || isRainyWeatherLike(weather)) continue;
    if (!getTaskDateRestriction(task, { date }, tasks, calendarWeatherByDate, { ignoreWeather: true })) return date;
  }
  return "";
}

function getTaskDateRestriction(task = {}, updates = {}, tasks = [], calendarWeatherByDate = {}, options = {}) {
  const candidate = { ...task, ...updates };
  const date = candidate.date;
  if (!date) return "변경할 날짜를 선택해 주세요.";

  const weather = calendarWeatherByDate[date] || weatherByDate[date];
  if (!options.ignoreWeather && isLaundryTask(candidate) && isRainyWeatherLike(weather)) {
    return "비가 오는 날에는 세탁물을 말리기 어려워 세탁 일정을 잡을 수 없어요.";
  }

  const candidateRange = getTaskNotificationRange(candidate);
  if (!candidateRange) return "";

  const conflict = tasks.find((other) => {
    if (other.id === task.id || other.done || other.date !== date) return false;
    if (getTaskUserId(other) !== getTaskUserId(candidate)) return false;
    const otherRange = getTaskNotificationRange(other);
    return otherRange && candidateRange.startMinutes < otherRange.endMinutes && candidateRange.endMinutes > otherRange.startMinutes;
  });

  if (conflict) {
    return `같은 시간에 '${conflict.title}' 일정이 있어 변경할 수 없어요.`;
  }

  return "";
}

function isCalendarHouseworkTask(task) {
  return task.displayType === "appliance" || task.tag === "house" || task.source === "auto";
}

function isPersonalScheduleTask(task) {
  return !isCalendarHouseworkTask(task);
}

function collectDailyReportTasks(tasks = [], selectedDate, activeCalendarUserId) {
  const dates = [0, 1, 2].map((offset) => addDays(selectedDate, offset));
  const scoped = tasks.filter((task) => !activeCalendarUserId || getTaskUserId(task) === activeCalendarUserId);
  const events = [];
  const houseworkTasks = [];
  const todos = [];

  dates.forEach((date) => {
    scoped.filter((task) => isTaskVisibleOnDate(task, date)).forEach((task) => {
      const timeRange = getDailyReportTaskTimeRange(task);
      const owner = findUserById(getTaskUserId(task));
      const common = {
        id: String(task.id),
        date,
        title: String(task.title || "").trim(),
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
        memberName: owner?.displayName || owner?.name || "",
        status: task.done ? "completed" : "pending",
      };

      todos.push(common);

      if (isPersonalScheduleTask(task)) {
        events.push(common);
        return;
      }

      houseworkTasks.push({
        ...common,
        appliance: getDailyReportAppliance(task),
        mode: String(task.applianceMode || task.currentMode || "").trim(),
        priority: Number.isFinite(task.sortOrder) ? task.sortOrder : null,
      });
    });
  });

  const completed = todos.filter((task) => task.status === "completed").length;
  return {
    events,
    houseworkTasks,
    todoProgress: {
      total: todos.length,
      completed,
      remaining: todos.length - completed,
    },
  };
}

function readCachedDailyReport(key) {
  try {
    const value = sessionStorage.getItem(`${DAILY_REPORT_CACHE_PREFIX}${key}`);
    if (!value) return null;
    const report = JSON.parse(value);
    return report?.source === "gpt" && report?.title && report?.summary ? report : null;
  } catch {
    return null;
  }
}

function writeCachedDailyReport(key, report) {
  if (report?.source !== "gpt") return;
  try {
    sessionStorage.setItem(`${DAILY_REPORT_CACHE_PREFIX}${key}`, JSON.stringify(report));
  } catch {
    // Storage can be unavailable in private browsing or restricted webviews.
  }
}

function collectDailyReportWeather(selectedDate, weatherByDate = {}, selectedDayDust = null) {
  return [0, 1, 2].map((offset) => {
    const date = addDays(selectedDate, offset);
    const weather = weatherByDate[date] || {};
    const minTemp = toNullableFiniteNumber(weather.minTemp);
    const maxTemp = toNullableFiniteNumber(weather.maxTemp ?? weather.high);
    const dayTemp =
      minTemp !== null && maxTemp !== null
        ? Math.round(((minTemp + maxTemp) / 2) * 10) / 10
        : maxTemp ?? minTemp;
    const condition = [weather.pty, weather.sky, weather.condition, weather.label]
      .map((value) => String(value || "").trim())
      .filter((value, index, list) => value && value !== "정보 없음" && list.indexOf(value) === index)
      .join(" · ");

    return {
      date,
      day_temp: dayTemp,
      day_humidity: toNullableFiniteNumber(weather.humidity),
      day_dust: offset === 0 ? toNullableFiniteNumber(selectedDayDust) : null,
      rainProbability: toNullableFiniteNumber(weather.pop ?? weather.rainProbability),
      condition,
    };
  });
}

function getDailyReportTaskTimeRange(task = {}) {
  const explicitStart = /^\d{1,2}:\d{2}$/.test(String(task.startTime || "")) ? String(task.startTime) : "";
  const explicitEnd = /^\d{1,2}:\d{2}$/.test(String(task.endTime || "")) ? String(task.endTime) : "";
  if (explicitStart || explicitEnd) {
    return { startTime: explicitStart, endTime: explicitEnd };
  }

  const range = getTaskNotificationRange(task);
  return range
    ? { startTime: formatTimeValue(range.startMinutes), endTime: formatTimeValue(range.endMinutes) }
    : { startTime: "", endTime: "" };
}

function getDailyReportAppliance(task = {}) {
  if (task.appliance) return String(task.appliance);

  const typeMap = {
    WASHER: "washer",
    DRYER: "dryer",
    DISHWASHER: "dishwasher",
    ROBOT_CLEANER: "robot_cleaner",
    AIR_PURIFIER: "air_purifier",
    AIR_CONDITIONER: "air_conditioner",
  };
  const normalizedType = String(task.applianceType || "").toUpperCase();
  if (typeMap[normalizedType]) return typeMap[normalizedType];

  const text = `${task.title || ""} ${task.place || ""}`;
  if (/세탁|빨래/i.test(text)) return "washer";
  if (/건조/i.test(text)) return "dryer";
  if (/식기|설거지/i.test(text)) return "dishwasher";
  if (/로봇|청소/i.test(text)) return "robot_cleaner";
  if (/공기청정|미세먼지/i.test(text)) return "air_purifier";
  if (/에어컨|냉방|제습/i.test(text)) return "air_conditioner";
  return String(task.title || "housework").trim();
}

function shouldSuggestAutomation(task) {
  return task.source !== "auto" && /(회식|약속|여행|출근|수업|퇴근|귀가)/.test(`${task.title} ${task.place} ${task.repeat}`);
}

function tasksForNotification(tasks, context = {}) {
  return tasks
    .filter((task) => isTaskVisibleOnDate(task, context.date))
    .filter((task) => !isPersonalScheduleTask(task))
    .sort(taskSorter);
}

function isNotificationTaskCompleted(task, context = {}) {
  if (task.done) return true;
  const range = getTaskNotificationRange(task);
  if (!range) return false;
  return range.endMinutes <= timeValueToMinutes(context.time);
}

function notificationItemSorter(a, b) {
  if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
  const aMinutes = getNotificationTriggerMinutes(a);
  const bMinutes = getNotificationTriggerMinutes(b);
  if (!Number.isFinite(aMinutes)) return 1;
  if (!Number.isFinite(bMinutes)) return -1;
  return a.completed ? bMinutes - aMinutes : aMinutes - bMinutes;
}

function buildConditionalNotifications(tasks, context = {}) {
  const dateTasks = tasks.filter((task) => !task.done && isTaskVisibleOnDate(task, context.date) && !isPersonalScheduleTask(task));
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
  if (!Number.isFinite(triggerMinutes)) return item.completed ? "실행 완료" : "시간 미정";
  return `${formatTimeValue(triggerMinutes)} ${item.completed ? "실행 완료" : "실행 예정"}`;
}

function getNotificationExecuteTitle(item = {}) {
  const title = getNotificationActionName(item);
  return `${title}${getKoreanObjectParticle(title)} 실행하시겠습니까?`;
}

function getNotificationExecuteDescription(item = {}) {
  const range = item.task ? getTaskNotificationRange(item.task) : null;
  if (range) {
    return `${formatTimeValue(range.startMinutes)}부터 ${formatTimeValue(range.endMinutes)}까지 진행 예정입니다.`;
  }

  const triggerMinutes = getNotificationTriggerMinutes(item);
  if (Number.isFinite(triggerMinutes)) {
    return `${formatTimeValue(triggerMinutes)}부터 진행 예정입니다.`;
  }

  return "지금 실행하시겠습니까?";
}

function getNotificationExecuteMeta(item = {}) {
  const date = item.date || item.task?.date || "";
  const place = item.task?.place || item.place || "";
  return [date, place].filter(Boolean).join(" · ");
}

function getNotificationActionName(item = {}) {
  const rawTitle = item.task?.title || item.taskTitle || item.title || "일정";
  return String(rawTitle)
    .replace(/\s*예약\b/g, "")
    .replace(/\s*(진행 중|시작 예정|확인)$/g, "")
    .trim() || "일정";
}

function getKoreanObjectParticle(text = "") {
  const lastChar = [...String(text).trim()].pop();
  if (!lastChar) return "을";
  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "을";
  return (code - 0xac00) % 28 === 0 ? "를" : "을";
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

function getPostponeTargetUsers(users, currentUserId) {
  const filtered = users.filter((user) => user.id !== currentUserId);
  return filtered.length > 0 ? filtered : users;
}

function parsePickerDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
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
  const hour = Math.max(6, Math.min(23, Number(digits.slice(0, 2)) || 6));
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
    const storedValue = localStorage.getItem(CURRENT_USER_STORAGE_KEY) || localStorage.getItem(LEGACY_CURRENT_USER_STORAGE_KEY);
    const savedUser = JSON.parse(storedValue || "null");
    const user = findUserById(savedUser?.id);
    if (user && !localStorage.getItem(CURRENT_USER_STORAGE_KEY)) {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    }
    return user;
  } catch {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_CURRENT_USER_STORAGE_KEY);
    return null;
  }
}

function readStoredAppSession() {
  if (typeof localStorage === "undefined") return null;

  try {
    const storedValue = localStorage.getItem(APP_SESSION_STORAGE_KEY) || localStorage.getItem(LEGACY_APP_SESSION_STORAGE_KEY);
    const session = JSON.parse(storedValue || "null");
    if (!session || typeof session !== "object") return null;
    if (!localStorage.getItem(APP_SESSION_STORAGE_KEY)) {
      localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    return session;
  } catch {
    localStorage.removeItem(APP_SESSION_STORAGE_KEY);
    localStorage.removeItem(LEGACY_APP_SESSION_STORAGE_KEY);
    return null;
  }
}

function getInitialCalendarUser(user, savedCalendarUserId) {
  const savedCalendarUser = USERS.find((candidate) => candidate.id === savedCalendarUserId);
  if (isMasterUser(user)) return savedCalendarUser || USERS[0];
  return USERS.find((candidate) => candidate.id === user?.id) || USERS[0];
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



