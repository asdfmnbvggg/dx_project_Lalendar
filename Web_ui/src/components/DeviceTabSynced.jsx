import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  History,
  Moon,
  Settings,
  Sparkles,
  WashingMachine,
  Zap,
} from "lucide-react";
import robotImage from "../assets/appliances/로봇청소기.png";
import dishwasherImage from "../assets/appliances/식기세척기.png";
import purifierImage from "../assets/appliances/공청기.png";
import { airConditionerImage, applianceModeCatalog, applianceTypeLabel, washerImage } from "../pages/calendarPage/calendarConstants.js";
import "./DeviceTab.css";

const connectedAppliances = [
  { id: "washer", type: "WASHER", image: washerImage, place: "세탁실", defaultOwner: "한수민" },
  { id: "robot_cleaner", type: "ROBOT_CLEANER", image: robotImage, place: "거실", defaultOwner: "김다빈" },
  { id: "dishwasher", type: "DISHWASHER", image: dishwasherImage, place: "주방", defaultOwner: "최재혁" },
  { id: "air_purifier", type: "AIR_PURIFIER", image: purifierImage, place: "거실", defaultOwner: "공용" },
  { id: "air-living", type: "AIR_CONDITIONER", name: "거실 에어컨", image: airConditionerImage, place: "거실", defaultOwner: "공용" },
  { id: "air-sumin", type: "AIR_CONDITIONER", name: "수민 에어컨", image: airConditionerImage, place: "수민 방", defaultOwner: "한수민" },
  { id: "air-dabin", type: "AIR_CONDITIONER", name: "다빈 에어컨", image: airConditionerImage, place: "다빈 방", defaultOwner: "김다빈" },
  { id: "air-jaehyeok", type: "AIR_CONDITIONER", name: "재혁 에어컨", image: airConditionerImage, place: "재혁 방", defaultOwner: "최재혁" },
];

const automationSettings = [
  { id: "aiRecommendation", label: "AI 추천 포함", icon: Sparkles, enabled: true },
  { id: "confirmBeforeRun", label: "실행 전 확인", icon: Bell, enabled: true },
  { id: "nightCleaningLimit", label: "야간 청소 제한", icon: Moon, enabled: true },
];

const postponeOptions = [
  { label: "30분 뒤", minutes: 30 },
  { label: "1시간 뒤", minutes: 60 },
  { label: "오늘 밤", minutes: 180 },
];

const ownerNameMap = {
  sumin: "한수민",
  theresa: "한수민",
  dada: "김다빈",
  minsu: "김다빈",
  jea: "최재혁",
  me: "최재혁",
  all: "공용",
};

export default function DeviceTabSynced({ onOpenNotifications, onExecuteApplianceCommand, tasksByDate = {}, selectedDate = "", currentUser, activeCalendarUser }) {
  const [localStatuses, setLocalStatuses] = useState({});
  const [settings, setSettings] = useState(automationSettings);
  const [manualLogs, setManualLogs] = useState([]);
  const [toast, setToast] = useState("");
  const [postponeTarget, setPostponeTarget] = useState(null);
  const [detailDevice, setDetailDevice] = useState(null);

  const calendarTasks = useMemo(() => collectRelevantCalendarTasks(tasksByDate, selectedDate), [tasksByDate, selectedDate]);
  const calendarTasksByType = useMemo(() => groupTasksByApplianceType(calendarTasks), [calendarTasks]);

  const devices = useMemo(
    () =>
      connectedAppliances.map((appliance) => {
        const matchedTasks = getTasksForAppliance(appliance, calendarTasksByType[appliance.type] || []);
        return buildDeviceFromCalendar(appliance, matchedTasks, selectedDate, localStatuses[appliance.id], activeCalendarUser || currentUser);
      }),
    [activeCalendarUser, calendarTasksByType, currentUser, localStatuses, selectedDate],
  );

  const operationLogs = useMemo(() => {
    const calendarLogs = calendarTasks
      .filter((task) => normalizeApplianceType(task))
      .map((task) => ({
        id: `calendar-${task.id}-${task.date}`,
        time: formatTaskTime(task),
        deviceName: applianceTypeLabel[normalizeApplianceType(task)] || "가전",
        action: getTaskDisplayTitle(task),
        status: task.done ? "완료" : task.date === selectedDate ? "예정" : formatRelativeDate(task.date, selectedDate),
      }));

    return [...manualLogs, ...calendarLogs].slice(0, 6);
  }, [calendarTasks, manualLogs, selectedDate]);

  const summary = useMemo(
    () => [
      { label: "연결 가전", value: devices.length, icon: WashingMachine },
      { label: "작동 중", value: devices.filter((device) => device.statusType === "running").length, icon: Zap },
      { label: "오늘 대기", value: devices.filter((device) => ["waiting", "available", "reserved"].includes(device.statusType)).length, icon: Clock3 },
      { label: "확인 필요", value: devices.filter((device) => device.statusType === "needsCheck").length, icon: AlertTriangle },
    ],
    [devices],
  );

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(""), 2400);
  }

  function addOperationLog(deviceName, action, status) {
    setManualLogs((current) => [
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
        deviceName,
        action,
        status,
      },
      ...current,
    ]);
  }

  function updateLocalStatus(deviceId, statusType) {
    setLocalStatuses((current) => ({ ...current, [deviceId]: statusType }));
  }

  async function handleRunDevice(device) {
    updateLocalStatus(device.id, "running");
    addOperationLog(device.name, device.logAction, "실행 요청");

    try {
      await onExecuteApplianceCommand?.(deviceToCommandTask(device));
      showToast(`${device.name} 실행 요청이 완료됐어요.`);
    } catch {
      updateLocalStatus(device.id, "needsCheck");
      addOperationLog(device.name, device.logAction, "전송 실패");
      showToast(`${device.name} 실행 명령을 보내지 못했어요.`);
    }
  }

  function handleReserveDevice(device) {
    updateLocalStatus(device.id, "reserved");
    addOperationLog(device.name, device.logAction, "예약됨");
    showToast(`${device.name} 예약이 캘린더 일정 기준으로 반영됐어요.`);
  }

  function handlePostponeDevice(device, option) {
    updateLocalStatus(device.id, "reserved");
    addOperationLog(device.name, `${device.logAction} ${option.label}`, "미룸");
    setPostponeTarget(null);
    showToast(`${device.name} 실행을 ${option.label}로 미뤘어요.`);
  }

  function handleToggleAutomation(settingId) {
    let nextLabel = "";
    let nextEnabled = false;

    setSettings((current) =>
      current.map((setting) => {
        if (setting.id !== settingId) return setting;
        nextLabel = setting.label;
        nextEnabled = !setting.enabled;
        return { ...setting, enabled: nextEnabled };
      }),
    );

    showToast(`${nextLabel} 설정을 ${nextEnabled ? "켰어요" : "껐어요"}.`);
  }

  function handleSecondaryAction(device) {
    if (device.secondaryAction === "미루기") {
      setPostponeTarget(device);
      return;
    }

    if (device.secondaryAction === "상세 보기") {
      setDetailDevice(device);
      return;
    }

    handleReserveDevice(device);
  }

  return (
    <section className="device-tab-page" aria-label="디바이스">
      <header className="device-tab-header">
        <div>
          <h1>디바이스</h1>
          <p>{formatSelectedDateLabel(selectedDate)} 캘린더 일정과 연결된 가전을 확인해보세요</p>
        </div>
        <div className="device-tab-header-actions">
          <button type="button" aria-label="알림" onClick={onOpenNotifications}>
            <Bell size={22} />
            <i aria-hidden="true" />
          </button>
          <button type="button" aria-label="설정">
            <Settings size={22} />
          </button>
        </div>
      </header>

      <section className="device-tab-summary" aria-label="우리 집 가전 요약">
        <div className="device-tab-summary-head">
          <strong>우리 집 가전 요약</strong>
          <span aria-hidden="true" />
        </div>
        <div className="device-tab-summary-grid">
          {summary.map(({ label, value, icon: Icon }) => (
            <article key={label}>
              <Icon size={18} />
              <small>{label}</small>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      </section>

      <div className="device-tab-list" aria-label="가전 목록">
        {devices.map((device) => (
          <article className="device-tab-card" key={device.id}>
            <div className="device-tab-device-art">
              <img src={device.image} alt="" />
            </div>
            <div className="device-tab-device-body">
              <div className="device-tab-device-title">
                <h2>{device.name}</h2>
                <span className={`device-tab-status ${device.statusType}`}>{device.status}</span>
              </div>
              <p>{device.recommendation}</p>
              <small>
                <span aria-hidden="true">👤</span>
                담당자: {device.owner}
              </small>
            </div>
            <div className="device-tab-device-actions">
              <button type="button" onClick={() => handleRunDevice(device)}>
                {device.primaryAction}
              </button>
              <button type="button" onClick={() => handleSecondaryAction(device)}>
                {device.secondaryAction}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="device-tab-bottom-grid">
        <section className="device-tab-panel" aria-label="자동화 설정">
          <h2>
            <Sparkles size={17} />
            자동화 설정
          </h2>
          {settings.map(({ id, label, icon: Icon, enabled }) => (
            <button className="device-tab-setting-row" type="button" key={id} onClick={() => handleToggleAutomation(id)} aria-pressed={enabled}>
              <span>
                <Icon size={15} />
                {label}
              </span>
              <i className={enabled ? "on" : ""} aria-hidden="true" />
            </button>
          ))}
        </section>

        <section className="device-tab-panel" aria-label="최근 작동 기록">
          <h2>
            <History size={17} />
            캘린더 연동 기록
            <ChevronRight size={17} />
          </h2>
          <div className="device-tab-log-list">
            {operationLogs.length > 0 ? (
              operationLogs.slice(0, 4).map((log) => (
                <article key={log.id}>
                  {log.status === "예정" || log.status === "미룸" || log.status === "예약됨" ? <Clock3 size={16} /> : <CheckCircle2 size={16} />}
                  <time>{log.time}</time>
                  <span>
                    {log.deviceName} · {log.action} · {log.status}
                  </span>
                </article>
              ))
            ) : (
              <article>
                <Clock3 size={16} />
                <time>-</time>
                <span>캘린더에 연결된 가전 일정이 없어요</span>
              </article>
            )}
          </div>
        </section>
      </div>

      {toast && (
        <div className="device-tab-toast" role="status">
          {toast}
        </div>
      )}

      {postponeTarget && (
        <div className="device-tab-sheet-backdrop" role="presentation" onClick={() => setPostponeTarget(null)}>
          <section className="device-tab-sheet" role="dialog" aria-modal="true" aria-label={`${postponeTarget.name} 실행 미루기`} onClick={(event) => event.stopPropagation()}>
            <h2>{postponeTarget.name} 실행을 미룰까요?</h2>
            <div>
              {postponeOptions.map((option) => (
                <button type="button" key={option.minutes} onClick={() => handlePostponeDevice(postponeTarget, option)}>
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {detailDevice && (
        <div className="device-tab-sheet-backdrop" role="presentation" onClick={() => setDetailDevice(null)}>
          <section className="device-tab-sheet" role="dialog" aria-modal="true" aria-label={`${detailDevice.name} 상세 정보`} onClick={(event) => event.stopPropagation()}>
            <h2>{detailDevice.name}</h2>
            <p>{detailDevice.recommendation}</p>
            <button type="button" onClick={() => setDetailDevice(null)}>
              확인
            </button>
          </section>
        </div>
      )}
    </section>
  );
}

function collectRelevantCalendarTasks(tasksByDate, selectedDate) {
  const dates = [selectedDate, addDays(selectedDate, 1), addDays(selectedDate, 2)].filter(Boolean);
  const seen = new Set();
  return dates
    .flatMap((date) => tasksByDate[date] || [])
    .filter((task) => {
      const key = `${task.id}-${task.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((task) => normalizeApplianceType(task));
}

function groupTasksByApplianceType(tasks) {
  return tasks.reduce((map, task) => {
    const type = normalizeApplianceType(task);
    if (!type) return map;
    map[type] = [...(map[type] || []), task].sort(taskSorter);
    return map;
  }, {});
}

function getTasksForAppliance(appliance, tasks) {
  if (appliance.type !== "AIR_CONDITIONER") return tasks;

  const exactTasks = tasks.filter((task) => getTaskApplianceId(task) === appliance.id);
  if (exactTasks.length > 0) return exactTasks;

  if (appliance.id === "air-living") {
    return tasks.filter((task) => !getTaskApplianceId(task) || ["air", "air-conditioner", "air_conditioner", "aircon", "aircon_shared"].includes(getTaskApplianceId(task)));
  }

  return [];
}

function buildDeviceFromCalendar(appliance, tasks, selectedDate, localStatus, activeUser) {
  const todayTasks = tasks.filter((task) => task.date === selectedDate);
  const nextTask = todayTasks.find((task) => !task.done) || tasks.find((task) => !task.done) || tasks[0];
  const name = appliance.name || applianceTypeLabel[appliance.type] || "가전";
  const modeLabel = nextTask ? getTaskModeLabel(nextTask) : getDefaultMode(appliance.type);
  const owner = nextTask ? getOwnerName(nextTask) : getOwnerName({ owner: activeUser?.id, userId: activeUser?.id }) || appliance.defaultOwner;
  const localStatusType = localStatus || "";

  if (localStatusType === "running") {
    return createDevice(appliance, name, "작동 중", "running", `${modeLabel} 모드로 실행 중이에요.`, owner, "실행 중", "상세 보기", modeLabel);
  }

  if (localStatusType === "reserved") {
    return createDevice(appliance, name, "예약됨", "reserved", nextTask ? `${formatTaskDateTime(nextTask, selectedDate)} 일정에 맞춰 예약됐어요.` : "캘린더 일정 기준으로 예약됐어요.", owner, "실행하기", "미루기", modeLabel);
  }

  if (nextTask) {
    const isToday = nextTask.date === selectedDate;
    const status = nextTask.done ? "완료" : isToday ? "실행 대기" : "예약됨";
    const statusType = nextTask.done ? "available" : isToday ? "waiting" : "reserved";
    const recommendation = nextTask.done
      ? `${getTaskDisplayTitle(nextTask)} 일정이 완료됐어요.`
      : `${formatTaskDateTime(nextTask, selectedDate)} · ${getTaskDisplayTitle(nextTask)} 일정과 연결되어 있어요.`;
    return createDevice(appliance, name, status, statusType, recommendation, owner, isToday && !nextTask.done ? "실행하기" : "상세 보기", nextTask.done ? "상세 보기" : "미루기", modeLabel);
  }

  return createDevice(appliance, name, "연결됨", "available", `${appliance.place}에 연결되어 있어요. 캘린더에 일정이 생기면 여기서 바로 확인할 수 있어요.`, owner || appliance.defaultOwner, "바로 실행", "상세 보기", modeLabel);
}

function createDevice(appliance, name, status, statusType, recommendation, owner, primaryAction, secondaryAction, logAction) {
  return {
    id: appliance.id,
    type: appliance.type,
    name,
    status,
    statusType,
    recommendation,
    owner,
    image: appliance.image,
    primaryAction,
    secondaryAction,
    logAction,
  };
}

function deviceToCommandTask(device = {}) {
  return {
    id: `device-tab-${device.id}`,
    title: device.name,
    place: device.name,
    applianceType: device.type,
    applianceId: device.id,
    applianceName: device.name,
    applianceMode: device.logAction,
    currentMode: device.logAction,
    userId: device.targetUserId || "",
    owner: device.targetUserId || "",
  };
}

function normalizeApplianceType(task = {}) {
  const explicitType = String(task.applianceType || "").toUpperCase();
  if (applianceTypeLabel[explicitType]) return explicitType;

  const text = `${task.appliance || ""} ${task.applianceId || ""} ${task.title || ""} ${task.place || ""}`.toLowerCase();
  if (/세탁|빨래|washer/.test(text)) return "WASHER";
  if (/식기|설거지|dishwasher|dish/.test(text)) return "DISHWASHER";
  if (/로봇|청소|robot/.test(text)) return "ROBOT_CLEANER";
  if (/공기청정|미세먼지|purifier/.test(text)) return "AIR_PURIFIER";
  if (/에어컨|냉방|제습|aircon|air-conditioner|air_conditioner/.test(text)) return "AIR_CONDITIONER";
  return "";
}

function getTaskApplianceId(task = {}) {
  return String(task.applianceId || task.appliance || task.deviceId || "").trim();
}

function getTaskDisplayTitle(task = {}) {
  return String(task.title || applianceTypeLabel[normalizeApplianceType(task)] || "가전 일정").trim();
}

function getTaskModeLabel(task = {}) {
  return String(task.mode || task.operationMode || task.deviceMode || task.applianceMode || task.currentMode || getDefaultMode(normalizeApplianceType(task))).trim();
}

function getDefaultMode(type) {
  const firstMode = applianceModeCatalog[type]?.modes?.[0]?.label;
  return firstMode || "자동";
}

function getOwnerName(task = {}) {
  return task.memberName || ownerNameMap[task.userId] || ownerNameMap[task.owner] || task.ownerName || "";
}

function formatSelectedDateLabel(date) {
  if (!date) return "오늘";
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return "오늘";
  return `${value.getMonth() + 1}월 ${value.getDate()}일`;
}

function formatTaskDateTime(task, selectedDate) {
  const dateLabel = task.date === selectedDate ? "오늘" : formatSelectedDateLabel(task.date);
  const time = formatTaskTime(task);
  return time === "-" ? dateLabel : `${dateLabel} ${time}`;
}

function formatTaskTime(task = {}) {
  const timeText = String(task.repeat || task.startTime || "").trim();
  const rangeMatch = timeText.match(/(\d{1,2}:\d{2})\s*(?:~|-|to)?\s*(\d{1,2}:\d{2})?/i);
  if (rangeMatch) return rangeMatch[1];
  if (/오전|오후|\d{1,2}시/.test(timeText)) return timeText;
  return "-";
}

function formatRelativeDate(date, selectedDate) {
  if (!date || !selectedDate) return "예정";
  const diff = Math.round((new Date(`${date}T00:00:00`) - new Date(`${selectedDate}T00:00:00`)) / 86400000);
  if (diff === 1) return "내일";
  if (diff === 2) return "모레";
  if (diff > 0) return `${diff}일 뒤`;
  return "예정";
}

function addDays(date, offset) {
  if (!date) return "";
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return "";
  value.setDate(value.getDate() + offset);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function taskSorter(a, b) {
  return formatTaskTime(a).localeCompare(formatTaskTime(b), "ko-KR") || String(a.title || "").localeCompare(String(b.title || ""), "ko-KR");
}
