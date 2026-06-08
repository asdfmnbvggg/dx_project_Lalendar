import { useEffect, useMemo, useState } from "react";
import {
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
import { automationAlerts, dateKey, initialTasks, isRainyDate, members, tagLabel } from "./data.js";
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
  const [activeTab, setActiveTab] = useState("home");
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
    onSelectCalendarDate: selectCalendarDate,
    tasksByDate,
    completion,
    toggleTask,
    deleteTask,
    changeTaskOwner,
    postponeTask,
    onAddWeatherRecommendation: addWeatherRecommendationTask,
    openComposer: () => setComposerOpen(true),
    onOpenPanel: setPanel,
    calendarView,
    setCalendarView,
  };

  return (
    <main className="app-shell">
      <section className={`app-frame ${activeTab === "home" ? "thinq-home-frame" : ""}`}>
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
        {activeTab === "schedule" && <CalendarPage {...pageProps} />}
        {activeTab === "devices" && <SimpleTabPage icon={<Grid2X2 size={28} />} title="디바이스" text="자주 쓰는 제품을 홈 화면에 배치해 바로 사용할 수 있어요." />}
        {activeTab === "care" && <SimpleTabPage icon={<ChartColumnIncreasing size={28} />} title="케어" text="제품 상태와 사용 리포트를 한눈에 볼 수 있게 준비 중이에요." />}
        {activeTab === "menu" && <CrewPage {...pageProps} />}

        <nav className="tabbar thinq-main-tabbar" aria-label="하단 탭">
          {mainNavItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}>
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

const mainNavItems = [
  { id: "devices", label: "디바이스", icon: Grid2X2 },
  { id: "schedule", label: "일정", icon: CalendarDays },
  { id: "home", label: "홈", icon: House },
  { id: "care", label: "케어", icon: ChartColumnIncreasing },
  { id: "menu", label: "메뉴", icon: Menu },
];

function HomePage({ onOpenNotifications, onOpenThinQ }) {
  return (
    <section className="thinq-home-page" aria-label="홈">
      <header className="thinq-statusbar" aria-label="상태 표시줄">
        <strong>6:21</strong>
        <span>⌁ 5G ▮▮ 63</span>
      </header>

      <div className="thinq-home-top">
        <button className="thinq-home-selector" type="button">
          <strong>엘린이의 홈</strong>
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

      <button className="thinq-play-banner" type="button" onClick={onOpenThinQ}>
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
