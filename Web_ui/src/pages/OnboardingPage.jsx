import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { members } from "../data.js";
import lgCharacter from "../assets/lg-character.png";

export default function OnboardingPage({ step, onNext, onPreview, onApplianceNext, onAssigneeNext, onBack, onComplete, onSkip }) {
  const isIntro = step === "intro";
  const isProfile = step === "profile";
  const isAppliance = step === "appliance";
  const isAssignee = step === "assignee";
  const isReady = step === "ready";
  const [selectedApplianceTypes, setSelectedApplianceTypes] = useState([]);
  const [applianceAssignees, setApplianceAssignees] = useState({});
  const [selectedImportMethod, setSelectedImportMethod] = useState("");
  const introMessage = "어서오세요!\n당신을 위한 최적의 가사일 계획을\n자동으로 짜주는 AI 가사일 플래너\n현우입니다.";
  const [introTextLength, setIntroTextLength] = useState(0);
  const onboardingApplianceOptions = [
    ["세탁기", "washer"],
    ["에어컨", "air"],
    ["냉장고", "fridge"],
    ["건조기", "dryer"],
    ["제습기", "dehumidifier"],
    ["로봇청소기", "robot"],
  ];
  const selectedAppliances = isAppliance || isAssignee ? onboardingApplianceOptions : onboardingApplianceOptions.filter(([, type]) => selectedApplianceTypes.includes(type));
  const assignedApplianceTypes = useMemo(
    () => onboardingApplianceOptions.map(([, type]) => type).filter((type) => Boolean(applianceAssignees[type])),
    [applianceAssignees],
  );
  const hasAssignedAppliance = selectedAppliances.length > 0 && selectedAppliances.every(([, type]) => Boolean(applianceAssignees[type]));
  const introText = introMessage.slice(0, introTextLength);
  const isIntroComplete = introTextLength >= introMessage.length;

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
    if (!isReady) return undefined;

    const timeout = window.setTimeout(
      () =>
        onComplete({
          applianceTypes: assignedApplianceTypes,
          applianceAssignees,
        }),
      2800,
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

  function importGoogleCalendar() {
    setSelectedImportMethod("google");
    window.setTimeout(onPreview, 180);
  }

  return (
    <section className="onboarding-page" aria-label="온보딩">
      {!isIntro && !isReady && <button className="onboarding-back-zone" type="button" onClick={onBack} aria-label="이전 단계로 이동" />}
      {!isIntro && !isReady && (
        <div className="onboarding-progress" aria-hidden="true">
          {["intro", "profile", "appliance", "ready"].map((item) => (
            <span key={item} className={step === item ? "active" : ""} />
          ))}
        </div>
      )}

      <div
        className={`onboarding-character-scene ${isIntro ? "intro" : ""} ${isProfile ? "profile" : ""} ${isAppliance ? "appliance" : ""} ${
          isAssignee ? "assignee" : ""
        } ${isReady ? "ready" : ""}`}
      >
        {isIntro ? (
          <section className="onboarding-intro-panel" aria-label="환영 멘트">
            <p className="onboarding-intro-type">
              {introText.split("\n").map((line, index) => (
                <span key={index}>
                  {line}
                  {index < introText.split("\n").length - 1 && <br />}
                </span>
              ))}
              {!isIntroComplete && <i aria-hidden="true" />}
            </p>
            <button className="onboarding-next-button" type="button" onClick={onNext} disabled={!isIntroComplete} aria-label="다음 단계로 이동">
              <span>NEXT</span>
              <ArrowRight size={18} strokeWidth={2.6} />
            </button>
            <button className="onboarding-skip-button" type="button" onClick={onSkip}>
              온보딩 건너뛰기
            </button>
          </section>
        ) : isProfile ? (
          <div className="onboarding-card onboarding-method-card">
            <div>
              <p className="onboarding-kicker">고정 일정</p>
              <h1>고정 일정을 알려주세요.</h1>
            </div>

            <div className="onboarding-method-list">
              <button className="onboarding-method-button direct" type="button" disabled aria-disabled="true">
                <span className="onboarding-method-icon direct" aria-hidden="true" />
                직접 입력하기
              </button>
              <button
                className={`onboarding-method-button google ${selectedImportMethod === "google" ? "active" : ""}`}
                type="button"
                onClick={importGoogleCalendar}
              >
                <span className="onboarding-method-icon google" aria-hidden="true" />
                구글 캘린더 불러오기
              </button>
            </div>
          </div>
        ) : isAppliance ? (
          <div className="onboarding-card onboarding-appliance-card onboarding-combined-appliance-card">
            <div>
              <h1>자동화할 가전을 알려주세요.</h1>
              <p>ThinQ가 자동 작동시킬 가전을 선택해 주세요.</p>
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
              완료
            </button>
          </div>
        ) : isAssignee ? (
          <div className="onboarding-card onboarding-assignee-card">
            <div>
              <h1>가전별 담당자를 지정해주세요.</h1>
              <p>담당자에게 가전 작동 알림이 가요.</p>
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
              완료
            </button>
          </div>
        ) : (
          <div className="onboarding-ai-wait" role="status" aria-live="polite">
            <section className="onboarding-ai-wait-card">
              <span className="onboarding-ai-spinner" aria-hidden="true" />
              <p>
                00님의 일정, 날씨, 온습도
                <br />
                데이터를 분석해서
                <br />
                현우가 최적의 가사일 계획을
                <br />
                짜고 있어요!
              </p>
              <img src={lgCharacter} alt="" />
            </section>
          </div>
        )}
        {!isReady && <img className="onboarding-character-image" src={lgCharacter} alt="" />}
      </div>
    </section>
  );
}
