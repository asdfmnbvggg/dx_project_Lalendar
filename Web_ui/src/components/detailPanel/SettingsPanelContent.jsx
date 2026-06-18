import { Check, ChevronLeft, ChevronRight, ClipboardList, Cpu, Save, Settings, UserRound, X } from "lucide-react";
import { members } from "../../data.js";
import { memberImages } from "../../pages/calendarPage/calendarConstants.js";
import { useState } from "react";

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
const settingsFixedDays = ["일", "월", "화", "수", "목", "금", "토"];
const defaultFixedScheduleDraft = {
  id: "",
  title: "",
  day: "월",
  startTime: "09:00",
  endTime: "18:00",
};

export default function SettingsPanelContent({ view, setView, onboardingSetup, setOnboardingSetup, onSaveSetup, currentUser, onLogout }) {
  const [fixedScheduleDraft, setFixedScheduleDraft] = useState(null);
  const currentUserName = currentUser?.displayName || currentUser?.name || "사용자";
  const currentUserRole = currentUser?.id ? "현재 로그인 중" : "일정 담당자";
  const currentUserImage = currentUser?.id ? memberImages[currentUser.id] : null;
  const selectedApplianceTypes = onboardingSetup.applianceTypes || [];
  const activeAssigneeTypes = settingsAutomationOptions.filter(([, type]) => selectedApplianceTypes.includes(type));
  const fixedSchedules = onboardingSetup.fixedSchedules || [];

  function saveAndReturn() {
    onSaveSetup?.(onboardingSetup);
    setView("menu");
  }

  function updateFixedScheduleDraft(field, value) {
    setFixedScheduleDraft((current) => ({ ...(current || defaultFixedScheduleDraft), [field]: value }));
  }

  function startAddFixedSchedule() {
    setFixedScheduleDraft({ ...defaultFixedScheduleDraft, id: "" });
  }

  function startEditFixedSchedule(schedule) {
    const scheduleKey = schedule.id || `${schedule.day}-${schedule.title}-${schedule.startTime}`;
    setFixedScheduleDraft({
      id: scheduleKey,
      title: schedule.title || "",
      day: schedule.day || "월",
      startTime: schedule.startTime || "09:00",
      endTime: schedule.endTime || "18:00",
      color: schedule.color,
    });
  }

  function saveFixedSchedule(event) {
    event.preventDefault();
    const title = fixedScheduleDraft?.title?.trim();
    if (!title || !fixedScheduleDraft?.day || !fixedScheduleDraft?.startTime || !fixedScheduleDraft?.endTime) return;

    const nextSchedule = {
      ...fixedScheduleDraft,
      id: fixedScheduleDraft.id || `settings-fixed-${Date.now()}`,
      title,
    };

    setOnboardingSetup((current) => {
      const currentSchedules = current.fixedSchedules || [];
      const exists = currentSchedules.some((schedule) => (schedule.id || `${schedule.day}-${schedule.title}-${schedule.startTime}`) === nextSchedule.id);
      return {
        ...current,
        fixedSchedules: exists
          ? currentSchedules.map((schedule) => ((schedule.id || `${schedule.day}-${schedule.title}-${schedule.startTime}`) === nextSchedule.id ? { ...schedule, ...nextSchedule } : schedule))
          : [...currentSchedules, nextSchedule],
      };
    });
    setFixedScheduleDraft(null);
  }

  function deleteFixedSchedule(schedule) {
    const scheduleKey = schedule.id || `${schedule.day}-${schedule.title}-${schedule.startTime}`;
    setOnboardingSetup((current) => ({
      ...current,
      fixedSchedules: (current.fixedSchedules || []).filter((item) => (item.id || `${item.day}-${item.title}-${item.startTime}`) !== scheduleKey),
    }));
    setFixedScheduleDraft((current) => (current?.id && current.id === schedule.id ? null : current));
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
          <button type="button" className="settings-inline-add-button" onClick={startAddFixedSchedule}>
            추가
          </button>
        </div>
        {fixedScheduleDraft && (
          <form className="settings-fixed-editor" onSubmit={saveFixedSchedule}>
            <label>
              <span>일정명</span>
              <input value={fixedScheduleDraft.title} onChange={(event) => updateFixedScheduleDraft("title", event.target.value)} placeholder="일정명을 입력해 주세요" />
            </label>
            <div className="settings-fixed-day-picker" aria-label="요일 선택">
              {settingsFixedDays.map((day) => (
                <button type="button" className={fixedScheduleDraft.day === day ? "active" : ""} key={day} onClick={() => updateFixedScheduleDraft("day", day)}>
                  {day}
                </button>
              ))}
            </div>
            <div className="settings-fixed-time-row">
              <label>
                <span>시작</span>
                <input type="time" value={fixedScheduleDraft.startTime} onChange={(event) => updateFixedScheduleDraft("startTime", event.target.value)} />
              </label>
              <label>
                <span>종료</span>
                <input type="time" value={fixedScheduleDraft.endTime} onChange={(event) => updateFixedScheduleDraft("endTime", event.target.value)} />
              </label>
            </div>
            <div className="settings-fixed-editor-actions">
              <button type="button" onClick={() => setFixedScheduleDraft(null)}>
                취소
              </button>
              <button type="submit">
                <Save size={14} />
                일정 저장
              </button>
            </div>
          </form>
        )}
        <div className="settings-fixed-list" aria-label="고정 일정 목록">
          {fixedSchedules.map((schedule) => (
            <article key={schedule.id || `${schedule.day}-${schedule.title}-${schedule.startTime}`}>
              <span>{schedule.day}</span>
              <div>
                <strong>{schedule.title}</strong>
                <small>
                  {schedule.startTime} - {schedule.endTime}
                </small>
              </div>
              <div className="settings-fixed-actions">
                <button type="button" onClick={() => startEditFixedSchedule(schedule)}>
                  수정
                </button>
                <button type="button" onClick={() => deleteFixedSchedule(schedule)}>
                  삭제
                </button>
              </div>
            </article>
          ))}
          {fixedSchedules.length === 0 && <p>온보딩에서 등록한 고정 일정이 없습니다.</p>}
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
        {currentUserImage ? <img className="settings-user-avatar" src={currentUserImage} alt="" aria-hidden="true" /> : <UserRound size={24} />}
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

