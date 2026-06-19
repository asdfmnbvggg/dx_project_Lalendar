import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  History,
  Loader2,
  Moon,
  Settings,
  Sparkles,
  ToggleLeft,
  WashingMachine,
  Zap,
} from "lucide-react";
import washerImage from "../assets/appliances/세탁기.png";
import robotImage from "../assets/appliances/로봇청소기.png";
import dishwasherImage from "../assets/appliances/식기세척기.png";
import purifierImage from "../assets/appliances/공청기.png";
import "./DeviceTab.css";

const initialDevices = [
  {
    id: "washer",
    name: "세탁기",
    status: "대기 중",
    statusType: "waiting",
    recommendation: "오늘 저녁 7시에 세탁하기 좋아요",
    owner: "수민",
    image: washerImage,
    primaryAction: "실행하기",
    secondaryAction: "예약하기",
    logAction: "표준 세탁",
  },
  {
    id: "robot_vacuum",
    name: "로봇청소기",
    status: "충전 중",
    statusType: "charging",
    recommendation: "가족 외출 시간에 맞춰 청소를 예약할 수 있어요",
    owner: "다빈",
    image: robotImage,
    primaryAction: "바로 청소",
    secondaryAction: "예약",
    logAction: "거실 청소",
  },
  {
    id: "dishwasher",
    name: "식기세척기",
    status: "실행 가능",
    statusType: "available",
    recommendation: "저녁 식사 후 20:30 실행을 추천해요",
    owner: "재혁",
    image: dishwasherImage,
    primaryAction: "실행",
    secondaryAction: "미루기",
    logAction: "강력 세척",
  },
  {
    id: "air_purifier",
    name: "공기청정기",
    status: "자동 추천",
    statusType: "recommended",
    recommendation: "미세먼지가 높아 자동 운전을 추천해요",
    owner: "공용 가전",
    image: purifierImage,
    primaryAction: "자동 실행",
    secondaryAction: "상세 보기",
    logAction: "자동 운전",
  },
];

const initialAutomationSettings = [
  { id: "aiRecommendation", label: "AI 추천 포함", icon: Sparkles, enabled: true },
  { id: "confirmBeforeRun", label: "실행 전 확인", icon: Bell, enabled: true },
  { id: "nightCleaningLimit", label: "야간 청소 제한", icon: Moon, enabled: true },
];

const initialLogs = [
  { id: 1, time: "08:10", deviceName: "로봇청소기", action: "거실 청소", status: "완료" },
  { id: 2, time: "19:00", deviceName: "세탁기", action: "표준 세탁", status: "예약됨" },
  { id: 3, time: "어제 21:30", deviceName: "식기세척기", action: "강력 세척", status: "완료" },
];

const statusLabels = {
  waiting: "대기 중",
  charging: "충전 중",
  available: "실행 가능",
  recommended: "자동 추천",
  running: "작동 중",
  reserved: "예약됨",
  needsCheck: "확인 필요",
};

const postponeOptions = [
  { label: "30분 뒤", minutes: 30 },
  { label: "1시간 뒤", minutes: 60 },
  { label: "오늘 밤", minutes: 180 },
];

export default function DeviceTab({ onOpenNotifications }) {
  const [devices, setDevices] = useState(initialDevices);
  const [automationSettings, setAutomationSettings] = useState(initialAutomationSettings);
  const [operationLogs, setOperationLogs] = useState(initialLogs);
  const [toast, setToast] = useState("");
  const [postponeTarget, setPostponeTarget] = useState(null);
  const [detailDevice, setDetailDevice] = useState(null);

  const summary = useMemo(
    () => [
      { label: "등록 가전", value: devices.length, icon: WashingMachine },
      { label: "작동 중", value: devices.filter((device) => device.statusType === "running").length || 1, icon: Zap },
      { label: "실행 대기", value: devices.filter((device) => ["waiting", "available", "reserved"].includes(device.statusType)).length, icon: Clock3 },
      { label: "확인 필요", value: devices.filter((device) => device.statusType === "needsCheck").length || 1, icon: AlertTriangle },
    ],
    [devices],
  );

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(""), 2400);
  }

  function addOperationLog(deviceName, action, status) {
    setOperationLogs((current) => [
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

  function updateDeviceStatus(deviceId, statusType) {
    setDevices((current) =>
      current.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              statusType,
              status: statusLabels[statusType] || device.status,
            }
          : device,
      ),
    );
  }

  function handleRunDevice(device) {
    updateDeviceStatus(device.id, "running");
    addOperationLog(device.name, device.logAction, "실행 요청");
    showToast(`${device.name} 실행 요청이 완료되었어요.`);
  }

  function handleReserveDevice(device) {
    updateDeviceStatus(device.id, "reserved");
    addOperationLog(device.name, device.logAction, "예약됨");
    showToast(`${device.name} 예약을 추가했어요.`);
  }

  function handlePostponeDevice(device, option) {
    updateDeviceStatus(device.id, "reserved");
    addOperationLog(device.name, `${device.logAction} ${option.label}`, "미룸");
    setPostponeTarget(null);
    showToast(`${device.name} 실행을 ${option.label}로 미뤘어요.`);
  }

  function handleToggleAutomation(settingId) {
    let nextLabel = "";
    let nextEnabled = false;

    setAutomationSettings((current) =>
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
    if (device.secondaryAction.includes("미루")) {
      setPostponeTarget(device);
      return;
    }

    if (device.secondaryAction.includes("상세")) {
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
          <p>오늘 일정에 맞춰 실행 가능한 가전을 확인해보세요</p>
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
          {automationSettings.map(({ id, label, icon: Icon, enabled }) => (
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
            최근 작동 기록
            <ChevronRight size={17} />
          </h2>
          <div className="device-tab-log-list">
            {operationLogs.slice(0, 4).map((log) => (
              <article key={log.id}>
                {log.status === "예약됨" || log.status === "미룸" ? <Clock3 size={16} /> : <CheckCircle2 size={16} />}
                <time>{log.time}</time>
                <span>
                  {log.deviceName} · {log.action} · {log.status}
                </span>
              </article>
            ))}
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
