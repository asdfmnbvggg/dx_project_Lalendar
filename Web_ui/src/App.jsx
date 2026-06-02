import { useEffect, useMemo, useState } from "react";
import { Bell, Cpu, Menu } from "lucide-react";
import { automationAlerts, dateKey, initialTasks, isRainyDate, members, navItems, tagLabel } from "./data.js";
import CalendarPage from "./pages/CalendarPage.jsx";
import CrewPage from "./pages/CrewPage.jsx";
import TaskComposer from "./components/TaskComposer.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
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

export default function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [memberColors, setMemberColors] = useState(() => Object.fromEntries(members.map((member) => [member.id, member.color])));
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = window.localStorage.getItem("lalendar-active-tab");
    return navItems.some((item) => item.id === savedTab) ? savedTab : "calendar";
  });
  const [selectedDate, setSelectedDate] = useState(getTodayKey);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  });
  const [selectedMember, setSelectedMember] = useState("all");
  const [query, setQuery] = useState("");
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [pendingPostpone, setPendingPostpone] = useState(null);
  const [postponePicker, setPostponePicker] = useState(null);
  const [automationPrompt, setAutomationPrompt] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [panel, setPanel] = useState(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [calendarWeatherByDate, setCalendarWeatherByDate] = useState({});
  const [thinQDevices, setThinQDevices] = useState([]);
  const [thinQDeviceStates, setThinQDeviceStates] = useState({});
  const [thinQDeviceAux, setThinQDeviceAux] = useState({});
  const [thinQError, setThinQError] = useState("");
  const [isThinQLoading, setThinQLoading] = useState(false);
  const [pendingThinQControl, setPendingThinQControl] = useState(null);

  useEffect(() => {
    window.localStorage.setItem("lalendar-active-tab", activeTab);
  }, [activeTab]);

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

  const scopedTasks = tasks.filter((task) => selectedMember === "all" || task.owner === selectedMember);
  const selectedTasks = sortTasks(
    scopedTasks
      .filter((task) => task.date === selectedDate)
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
    return scopedTasks.reduce((map, task) => {
      map[task.date] = sortTasks([...(map[task.date] || []), task]);
      return map;
    }, {});
  }, [scopedTasks]);
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

  function toggleTask(id) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function changeTaskOwner(id, owner) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, owner } : task)));
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
    const nextTask = { id: task.id || Date.now() + (task.copyIndex || 0), source: "manual", ...task };
    setTasks((current) => [nextTask, ...current]);
    if (shouldSuggestAutomation(nextTask)) {
      setAutomationPrompt(nextTask);
    }
  }

  function addWeatherRecommendationTask(date, recommendation) {
    const startTime = recommendation.recommendedStartTime || recommendation.startTime || "19:00";
    const endTime = recommendation.recommendedEndTime || recommendation.endTime || "20:00";

    addTask({
      date,
      title: recommendation.title,
      place: appliancePlaceLabel[recommendation.applianceType] || "우리 집",
      tag: "routine",
      owner: selectedMember === "all" ? "me" : selectedMember,
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
    setTasks((current) => [
      {
        id: Date.now(),
        date,
        title: item.taskTitle,
        place: item.place,
        tag: "house",
        owner: selectedMember === "all" ? "all" : selectedMember,
        done: false,
        repeat: "자동화",
        source: "auto",
      },
      ...current,
    ]);
    setSelectedDate(date);
  }

  function applyScheduleAutomation(task) {
    const owner = selectedMember === "all" ? "all" : selectedMember;
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
    setTasks((current) => [...generated, ...current]);
    setAutomationPrompt(null);
  }

  const pageProps = {
    tasks,
    scopedTasks,
    selectedTasks,
    selectedDate,
    selectedMember,
    memberColors,
    changeMemberColor,
    setSelectedDate,
    setSelectedMember,
    query,
    setQuery,
    month,
    monthLabel,
    monthLeadingBlanks,
    weatherByDate: calendarWeatherByDate,
    routineRecommendations,
    onPrevMonth: () => changeVisibleMonth(-1),
    onNextMonth: () => changeVisibleMonth(1),
    tasksByDate,
    completion,
    toggleTask,
    deleteTask,
    changeTaskOwner,
    postponeTask,
    onAddWeatherRecommendation: addWeatherRecommendationTask,
    openComposer: () => setComposerOpen(true),
    onOpenPanel: setPanel,
  };

  return (
    <main className="app-shell">
      <section className="app-frame">
        <header className="topbar">
          <div className="brand">
            <span>L</span>
            <div>
              <strong>Lalendar</strong>
              <small>housework calendar</small>
            </div>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="알림" onClick={() => setPanel({ type: "notifications" })}>
              <Bell size={20} />
            </button>
            <div className="menu-popover-wrap">
              <button className="icon-button" aria-label="메뉴" onClick={() => setMenuOpen((current) => !current)} aria-expanded={isMenuOpen}>
                <Menu size={22} />
              </button>
              {isMenuOpen && (
                <div className="menu-popover" role="menu">
                  <button type="button" onClick={() => setMenuOpen(false)}>가족 초대</button>
                  <button type="button" onClick={() => { setPanel({ type: "notifications" }); setMenuOpen(false); }}>알림 설정</button>
                  <button type="button" onClick={() => { setPanel({ type: "settings" }); setMenuOpen(false); }}>테마 설정</button>
                  <button type="button" onClick={() => setMenuOpen(false)}>데이터 내보내기</button>
                  <button type="button" onClick={() => { setComposerOpen(true); setMenuOpen(false); }}>작업 추가</button>
                </div>
              )}
            </div>
            <button className="icon-button" aria-label="LG ThinQ" onClick={() => setPanel({ type: "thinq" })}>
              <Cpu size={20} />
            </button>
          </div>
        </header>

        {activeTab === "calendar" && <CalendarPage {...pageProps} />}
        {activeTab === "crew" && <CrewPage {...pageProps} />}

        <nav className="tabbar" aria-label="하단 탭">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}>
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
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

function sortTasks(tasks) {
  return [...tasks].sort(taskSorter);
}

function taskSorter(a, b) {
  if (a.done !== b.done) return Number(a.done) - Number(b.done);
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

function normalizeThinQDevices(result) {
  const devices = result?.devices || result?.items || result?.response?.devices || result?.result?.devices || result;
  if (!Array.isArray(devices)) return [];

  return devices.map((device) => ({
    ...device,
    id: device.deviceId || device.id || device.device_id,
    name: device.alias || device.name || device.deviceName || device.modelName || device.deviceId || device.id,
    type: device.deviceType || device.type || device.category || "ThinQ",
  }));
}

function shouldSuggestAutomation(task) {
  return task.source !== "auto" && /(회식|약속|여행|출근|수업|퇴근|귀가)/.test(`${task.title} ${task.place} ${task.repeat}`);
}

function pendingTasksForNotification(tasks) {
  return tasks
    .filter((task) => !task.done)
    .sort(taskSorter)
    .slice(0, 4);
}
