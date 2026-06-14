import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ClipboardList, Cpu, Refrigerator, Save, Settings, Sparkles, UserRound, X } from "lucide-react";
import { appliances, communityTips, members, tagLabel } from "../data.js";

export default function DetailPanel({
  panel,
  tasks,
  notifications,
  completion,
  onClose,
  onToggle,
  onDelete,
  onOwnerChange,
  onPostpone,
  onExecuteNotification,
  onPostponeNotification,
  onAddTask,
  selectedDate,
  selectedMember,
  currentUser,
  onboardingSetup,
  onOnboardingSetupChange,
  onOpenComposer,
  onLogout,
}) {
  const [settingsView, setSettingsView] = useState("menu");
  const [draftOnboardingSetup, setDraftOnboardingSetup] = useState(() => normalizeSettingsOnboardingSetup(onboardingSetup));

  useEffect(() => {
    setDraftOnboardingSetup(normalizeSettingsOnboardingSetup(onboardingSetup));
  }, [onboardingSetup]);

  if (!panel) return null;

  const doneTasks = tasks.filter((task) => task.done);
  const pendingTasks = tasks.filter((task) => !task.done);
  const panelTasks = getPanelTasks(panel, tasks, doneTasks, pendingTasks).sort(taskSorter);

  return (
    <div className="detail-backdrop" role="presentation">
      <aside className={["detail-panel", panel.type === "settings" ? "settings-panel" : ""].filter(Boolean).join(" ")}>
        <div className="detail-head">
          <div>
            <p>{getPanelKicker(panel)}</p>
            <h2>{getPanelTitle(panel)}</h2>
          </div>
          <button onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        {panel.type === "summary" && (
          <section className="detail-summary">
            <strong>{completion}%</strong>
            <span>이번 주 완료율</span>
            <div className="detail-bars">
              {[42, 62, 88, 54, 76].map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
          </section>
        )}

        {panel.type === "settings" && (
          <SettingsPanelContent
            view={settingsView}
            setView={setSettingsView}
            onboardingSetup={draftOnboardingSetup}
            setOnboardingSetup={setDraftOnboardingSetup}
            onSaveSetup={(nextSetup) => onOnboardingSetupChange?.(normalizeSettingsOnboardingSetup(nextSetup))}
            currentUser={currentUser}
            onLogout={onLogout}
          />
        )}

        {panel.type === "notifications" && (
          <section className="detail-list">
            {notifications.map((item) => (
              <article className="notice-row actionable" key={item.id}>
                <ClipboardList size={18} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <div className="notice-actions">
                    <button type="button" onClick={() => onPostponeNotification(item)}>
                      미루기
                    </button>
                    <button type="button" onClick={() => onExecuteNotification(item)}>
                      실행하기
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {notifications.length === 0 && <p className="panel-empty">표시할 알림이 없습니다.</p>}
          </section>
        )}

        {panel.type === "recommendation" && (
          <section className="insight-card">
            <Sparkles size={28} />
            <h3>{panel.recommendation.title}</h3>
            <p>{panel.recommendation.reason}</p>
            <button
              className="composer-submit"
              onClick={() =>
                onAddTask({
                  date: selectedDate,
                  title: panel.recommendation.task,
                  place: "LG HUB",
                  tag: "house",
                  owner: selectedMember === "all" ? "me" : selectedMember,
                  done: false,
                  repeat: "AI 추천",
                  source: "auto",
                })
              }
            >
              {panel.recommendation.action}
            </button>
          </section>
        )}

        {panel.type === "appliance" && (
          <section className="insight-card">
            <Refrigerator size={28} />
            <h3>{panel.appliance.name}</h3>
            <p>{panel.appliance.state}</p>
            <strong>{panel.appliance.signal}</strong>
          </section>
        )}

        {panel.type === "appliances" && (
          <section className="detail-list">
            {appliances.map((item) => (
              <article className="notice-row" key={item.id}>
                <Cpu size={18} />
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.state} · {item.signal}
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}
        {panel.type === "community" && (
          <section className="detail-list">
            {communityTips.map((tip) => (
              <article className="notice-row" key={tip.title}>
                <ClipboardList size={18} />
                <div>
                  <strong>{tip.title}</strong>
                  <p>{tip.source}</p>
                </div>
              </article>
            ))}
          </section>
        )}

        {panel.type === "tip" && (
          <section className="insight-card">
            <ClipboardList size={28} />
            <h3>{panel.tip.title}</h3>
            <p>{panel.tip.source}</p>
          </section>
        )}

        {panel.type === "member" && (
          <section className="insight-card">
            <Sparkles size={28} />
            <h3>{panel.member.name}</h3>
            <p>{panel.member.subtitle}</p>
            <strong>담당 작업과 로테이션을 멤버 탭에서 바로 확인할 수 있어요.</strong>
          </section>
        )}

        {panel.type === "rotation" && (
          <section className="detail-list">
            {["최재혁", "김다빈", "한수민"].map((name, index) => (
              <article className="notice-row" key={name}>
                <Cpu size={18} />
                <div>
                  <strong>
                    {index + 1}. {name}
                  </strong>
                  <p>{index === 0 ? "오늘 담당" : `${index + 1}번째 순서`}</p>
                </div>
              </article>
            ))}
          </section>
        )}

        {!["summary", "settings", "notifications", "recommendation", "appliance", "appliances", "community", "tip", "member", "rotation"].includes(panel.type) && (
          <section className="detail-list">
            {panelTasks.map((task) => (
              <article className="detail-task" key={task.id}>
                <button onClick={() => onToggle(task.id)} className={task.done ? "checked" : ""}>
                  {task.done && <Check size={15} />}
                </button>
                <div>
                  <strong>{task.title}</strong>
                  <p>
                    {task.place} · {task.repeat} · {tagLabel[task.tag]}
                    <span className="owner-badge">{getOwnerName(task.owner)}</span>
                    <span className={`source-badge ${task.source === "auto" ? "auto" : "manual"}`}>{task.source === "auto" ? "자동추가" : "수동"}</span>
                  </p>
                </div>
                <select
                  className="owner-select detail-owner-select"
                  value={task.owner}
                  aria-label={`${task.title} 담당자 변경`}
                  onChange={(event) => onOwnerChange?.(task.id, event.target.value)}
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <button className="detail-delete" onClick={() => onDelete(task.id)}>
                  삭제
                </button>
                <button className="detail-postpone" onClick={() => onPostpone?.(task.id)}>
                  미루기
                </button>
              </article>
            ))}
            {panelTasks.length === 0 && <p className="panel-empty">표시할 작업이 없습니다.</p>}
          </section>
        )}

        {panel.type !== "settings" && (
          <button className="composer-submit" onClick={onOpenComposer}>
            작업 추가
          </button>
        )}
      </aside>
    </div>
  );
}

const settingsAutomationOptions = [
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
const settingsAssigneeOptions = members.filter((member) => member.id !== "all");
const defaultSettingsOnboardingSetup = {
  applianceTypes: [],
  applianceAssignees: {},
  fixedSchedules: [],
};

function SettingsPanelContent({ view, setView, onboardingSetup, setOnboardingSetup, onSaveSetup, currentUser, onLogout }) {
  const currentUserName = currentUser?.displayName || currentUser?.name || "사용자";
  const currentUserRole = currentUser?.id ? "현재 로그인 중" : "일정 담당자";
  const selectedApplianceTypes = onboardingSetup.applianceTypes || [];
  const activeAssigneeTypes = settingsAutomationOptions.filter(([, type]) => selectedApplianceTypes.includes(type));

  function saveAndReturn() {
    onSaveSetup?.(onboardingSetup);
    setView("menu");
  }

  if (view === "automation") {
    return (
      <section className="settings-popup-body">
        <div className="settings-subhead">
          <button type="button" aria-label="설정으로 돌아가기" onClick={() => setView("menu")}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <strong>자동화 가전 변경</strong>
            <span>ThinQ가 자동 작동시킬 가전을 선택해 주세요.</span>
          </div>
        </div>
        <div className="settings-appliance-grid" aria-label="자동화 가전 선택">
          {settingsAutomationOptions.map(([name, type]) => {
            const isActive = selectedApplianceTypes.includes(type);
            return (
              <button
                type="button"
                key={type}
                className={isActive ? "active" : ""}
                onClick={() =>
                  setOnboardingSetup((current) => {
                    const currentTypes = current.applianceTypes || [];
                    const nextTypes = currentTypes.includes(type) ? currentTypes.filter((item) => item !== type) : [...currentTypes, type];
                    const nextAssignees = { ...(current.applianceAssignees || {}) };
                    if (!nextTypes.includes(type)) delete nextAssignees[type];
                    return { ...current, applianceTypes: nextTypes, applianceAssignees: nextAssignees };
                  })
                }
              >
                <span>
                  <Cpu size={18} />
                </span>
                <strong>{name}</strong>
                {isActive && <Check className="settings-appliance-check" size={14} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
        <button type="button" className="settings-save-button" onClick={saveAndReturn}>
          <Save size={15} />
          저장
        </button>
      </section>
    );
  }

  if (view === "assignee") {
    return (
      <section className="settings-popup-body">
        <div className="settings-subhead">
          <button type="button" aria-label="설정으로 돌아가기" onClick={() => setView("menu")}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <strong>가전별 담당자 변경</strong>
            <span>알림을 보낼 담당자를 지정해 주세요.</span>
          </div>
        </div>
        <div className="settings-assignee-list" aria-label="가전별 담당자">
          {activeAssigneeTypes.map(([name, type]) => (
            <label key={type}>
              <span>
                <Cpu size={15} />
                {name}
              </span>
              <select
                value={onboardingSetup.applianceAssignees?.[type] || ""}
                onChange={(event) =>
                  setOnboardingSetup((current) => ({
                    ...current,
                    applianceAssignees: { ...(current.applianceAssignees || {}), [type]: event.target.value },
                  }))
                }
              >
                <option value="" disabled>
                  담당자 선택
                </option>
                {settingsAssigneeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {activeAssigneeTypes.length === 0 && <p>온보딩에서 선택한 자동화 가전이 없습니다.</p>}
        </div>
        <button type="button" className="settings-save-button" onClick={saveAndReturn}>
          <Save size={15} />
          저장
        </button>
      </section>
    );
  }

  if (view === "fixed") {
    return (
      <section className="settings-popup-body">
        <div className="settings-subhead">
          <button type="button" aria-label="설정으로 돌아가기" onClick={() => setView("menu")}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <strong>고정 일정 변경</strong>
            <span>온보딩에서 입력한 반복 일정을 확인해 주세요.</span>
          </div>
        </div>
        <div className="settings-fixed-list" aria-label="고정 일정 목록">
          {(onboardingSetup.fixedSchedules || []).map((schedule) => (
            <article key={schedule.id || `${schedule.day}-${schedule.title}-${schedule.startTime}`}>
              <span>{schedule.day}</span>
              <div>
                <strong>{schedule.title}</strong>
                <small>
                  {schedule.startTime} - {schedule.endTime}
                </small>
              </div>
            </article>
          ))}
          {(onboardingSetup.fixedSchedules || []).length === 0 && <p>온보딩에서 등록한 고정 일정이 없습니다.</p>}
        </div>
        <button type="button" className="settings-save-button" onClick={saveAndReturn}>
          <Save size={15} />
          저장
        </button>
      </section>
    );
  }

  return (
    <section className="settings-popup-body">
      <article className="settings-user-card">
        <div>
          <strong>{currentUserName}</strong>
          <span>{currentUserRole}</span>
        </div>
        <UserRound size={24} />
      </article>
      <div className="settings-menu-list">
        <button type="button" onClick={() => setView("automation")}>
          <span>
            <Settings size={16} />
            자동화 가전 변경
          </span>
          <ChevronRight size={17} />
        </button>
        <button type="button" onClick={() => setView("assignee")}>
          <span>
            <UserRound size={16} />
            가전별 담당자 변경
          </span>
          <ChevronRight size={17} />
        </button>
        <button type="button" onClick={() => setView("fixed")}>
          <span>
            <ClipboardList size={16} />
            고정 일정 변경
          </span>
          <ChevronRight size={17} />
        </button>
        <button type="button" onClick={onLogout}>
          <span>
            <X size={16} />
            로그아웃
          </span>
          <ChevronRight size={17} />
        </button>
      </div>
    </section>
  );
}

function normalizeSettingsOnboardingSetup(setup = {}) {
  const applianceTypes = Array.isArray(setup.applianceTypes) ? setup.applianceTypes : defaultSettingsOnboardingSetup.applianceTypes;
  const applianceAssignees =
    setup.applianceAssignees && typeof setup.applianceAssignees === "object"
      ? { ...defaultSettingsOnboardingSetup.applianceAssignees, ...setup.applianceAssignees }
      : defaultSettingsOnboardingSetup.applianceAssignees;
  const fixedSchedules = Array.isArray(setup.fixedSchedules) ? setup.fixedSchedules : defaultSettingsOnboardingSetup.fixedSchedules;

  return {
    applianceTypes,
    applianceAssignees,
    fixedSchedules,
  };
}

function getPanelTasks(panel, tasks, doneTasks, pendingTasks) {
  if (panel.type === "allTasks") return tasks;
  if (panel.type === "history") return doneTasks;
  if (panel.type === "room") return tasks.filter((task) => task.place === panel.room);
  if (panel.type === "task") return tasks.filter((task) => task.id === panel.task.id);
  if (panel.type === "pending") return pendingTasks;
  if (panel.type === "appliances" || panel.type === "community") return [];
  return tasks;
}

function taskSorter(a, b) {
  if (a.done !== b.done) return Number(a.done) - Number(b.done);
  return b.id - a.id;
}

function getOwnerName(ownerId) {
  return members.find((member) => member.id === ownerId)?.name || "미정";
}

function getPanelKicker(panel) {
  const labels = {
    allTasks: "모든 작업",
    history: "기록",
    summary: "요약",
    room: "방별 작업",
    task: "작업 상세",
    notifications: "알림",
    settings: "설정",
    pending: "대기 작업",
    recommendation: "AI 추천",
    appliance: "가전 상태",
    appliances: "가전 캘린더",
    community: "커뮤니티",
    tip: "생활 팁",
    member: "멤버 상세",
    rotation: "로테이션",
  };
  return labels[panel.type] || "상세";
}

function getPanelTitle(panel) {
  if (panel.type === "room") return panel.room;
  if (panel.type === "task") return panel.task.title;
  if (panel.type === "notifications") return "청소 전 알려드려요";
  if (panel.type === "settings") return "앱 메뉴";
  if (panel.type === "pending") return "아직 남은 일";
  if (panel.type === "recommendation") return "스마트 루틴";
  if (panel.type === "appliance") return panel.appliance.name;
  if (panel.type === "community") return "우리 동네 집안일 팁";
  if (panel.type === "tip") return "커뮤니티 추천";
  if (panel.type === "appliances") return "LG ThinQ 연동 가전";
  if (panel.type === "member") return panel.member.name;
  if (panel.type === "rotation") return "담당 순서";
  return getPanelKicker(panel);
}
