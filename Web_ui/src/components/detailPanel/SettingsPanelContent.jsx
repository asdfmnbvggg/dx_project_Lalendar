import { Check, ChevronLeft, ChevronRight, ClipboardList, Cpu, Save, Settings, UserRound, X } from "lucide-react";
import { members } from "../../data.js";

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

export default function SettingsPanelContent({ view, setView, onboardingSetup, setOnboardingSetup, onSaveSetup, currentUser, onLogout }) {
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

export function normalizeSettingsOnboardingSetup(setup = {}) {
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


