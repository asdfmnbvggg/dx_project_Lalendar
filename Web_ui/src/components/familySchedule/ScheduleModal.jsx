import { Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DAYS,
  EMPTY_SCHEDULE,
  PLACE_PRESETS,
  REMINDER_OPTIONS,
  REMINDER_TARGETS,
  REPEAT_OPTIONS,
} from "./scheduleConstants.js";

const AI_CATEGORY_HINTS = {
  weather: {
    reminder: "30m",
    memo: "날씨 예보와 실내 상태를 확인해 준비 시간을 추천합니다.",
  },
  appliance: {
    reminder: "10m",
    memo: "세탁기, 건조기, 공기청정기 상태와 사용 패턴을 함께 확인하세요.",
  },
  routine: {
    reminder: "30m",
    memo: "가족의 등교, 출근, 귀가 루틴에 맞춰 미리 알림을 추천합니다.",
  },
  housework: {
    reminder: "1h",
    memo: "반복되는 생활 패턴을 기준으로 집안일 일정을 정리합니다.",
  },
};

export default function ScheduleModal({ mode, initialSchedule, members, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => normalizeSchedule(initialSchedule));
  const [keepAdding, setKeepAdding] = useState(false);
  const [error, setError] = useState("");
  const assignableMembers = useMemo(() => members.filter((member) => member.id !== "all"), [members]);

  useEffect(() => {
    setForm(normalizeSchedule(initialSchedule));
    setError("");
  }, [initialSchedule]);

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "category" && current.color === CATEGORY_COLORS[current.category]) {
        next.color = CATEGORY_COLORS[value] || CATEGORY_COLORS.custom;
      }
      if (field === "category" && AI_CATEGORY_HINTS[value]) {
        const hint = AI_CATEGORY_HINTS[value];
        if (!current.memo.trim()) next.memo = hint.memo;
        if (current.reminder === "off") next.reminder = hint.reminder;
        if (current.reminderTarget === "assignees") next.reminderTarget = "family";
      }
      if (field === "repeat" && value !== "custom" && value !== "weekly") {
        next.days = [];
      }
      return next;
    });
  }

  function toggleDay(day) {
    setForm((current) => {
      const days = current.days.includes(day) ? current.days.filter((item) => item !== day) : [...current.days, day];
      return { ...current, days, day: days[0] || current.day, repeat: current.repeat === "none" ? "custom" : current.repeat };
    });
  }

  function toggleMember(memberId) {
    setForm((current) => {
      if (memberId === "all") {
        return { ...current, members: ["all"], member: "all" };
      }
      const withoutAll = current.members.filter((item) => item !== "all");
      const members = withoutAll.includes(memberId) ? withoutAll.filter((item) => item !== memberId) : [...withoutAll, memberId];
      const nextMembers = members.length ? members : ["all"];
      return { ...current, members: nextMembers, member: nextMembers[0] };
    });
  }

  function submit(event, shouldContinue = keepAdding) {
    event.preventDefault();
    const title = form.title.trim();
    const location = form.placePreset === "직접 입력" ? form.location.trim() : form.placePreset;
    const requiresDays = form.repeat === "weekly" || form.repeat === "custom";

    if (!title) return setError("일정명을 입력해 주세요.");
    if (!form.date && form.repeat === "none") return setError("반복이 없는 일정은 날짜를 선택해 주세요.");
    if (requiresDays && form.days.length === 0) return setError("반복 요일을 하나 이상 선택해 주세요.");
    if (!form.startTime || !form.endTime) return setError("시작 시간과 종료 시간을 입력해 주세요.");
    if (form.endTime <= form.startTime) return setError("종료 시간은 시작 시간보다 늦어야 합니다.");
    if (!form.members.length) return setError("대상자를 선택해 주세요.");

    const nextSchedule = {
      ...form,
      title,
      location: location || "우리 집",
      member: form.members[0],
      day: form.days[0] || dayFromDate(form.date) || form.day,
      repeatWeekly: form.repeat === "weekly" || form.repeat === "custom",
      memo: form.memo.trim(),
    };

    onSave(nextSchedule, shouldContinue);
    if (shouldContinue) {
      setForm((current) => ({
        ...EMPTY_SCHEDULE,
        date: current.date,
        members: current.members,
        member: current.member,
        placePreset: current.placePreset,
        location: current.location,
        color: current.color,
        category: current.category,
      }));
    }
  }

  const modal = (
    <div className="composer-backdrop" role="presentation">
      <form className="composer schedule-modal" onSubmit={submit}>
        <div className="composer-head">
          <div>
            <p>통합 일정</p>
            <h2>{mode === "edit" ? "일정 수정" : "일정 추가"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <label>
          일정명
          <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="등교, 학원, 집안일" autoFocus />
        </label>

        <div className="composer-grid">
          <label>
            날짜
            <input type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} />
          </label>
          <label>
            반복 설정
            <select value={form.repeat} onChange={(event) => updateField("repeat", event.target.value)}>
              {REPEAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="composer-grid">
          <label>
            시작 시간
            <input type="time" value={form.startTime} min="07:00" max="22:00" onChange={(event) => updateField("startTime", event.target.value)} />
          </label>
          <label>
            종료 시간
            <input type="time" value={form.endTime} min="07:00" max="22:00" onChange={(event) => updateField("endTime", event.target.value)} />
          </label>
        </div>

        <label>
          대상자
          <div className="schedule-chip-row">
            {[members.find((member) => member.id === "all"), ...assignableMembers].filter(Boolean).map((member) => (
              <button key={member.id} type="button" className={form.members.includes(member.id) ? "active" : ""} onClick={() => toggleMember(member.id)}>
                {member.id === "all" ? "전체" : member.name}
              </button>
            ))}
          </div>
        </label>

        <label>
          요일 선택
          <div className="schedule-day-buttons multi">
            {DAYS.map((day) => (
              <button key={day} type="button" className={form.days.includes(day) ? "active" : ""} onClick={() => toggleDay(day)}>
                {day}
              </button>
            ))}
          </div>
        </label>

        <label>
          장소
          <div className="schedule-chip-row">
            {PLACE_PRESETS.map((place) => (
              <button key={place} type="button" className={form.placePreset === place ? "active" : ""} onClick={() => updateField("placePreset", place)}>
                {place}
              </button>
            ))}
          </div>
          {form.placePreset === "직접 입력" && (
            <input value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="장소를 입력해 주세요." />
          )}
        </label>

        <div className="composer-grid">
          <label>
            카테고리
            <select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            알림
            <select value={form.reminder} onChange={(event) => updateField("reminder", event.target.value)}>
              {REMINDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {AI_CATEGORY_HINTS[form.category] && (
          <div className="ai-suggestion-note">
            <strong>AI 추천 일정</strong>
            <span>{AI_CATEGORY_HINTS[form.category].memo}</span>
          </div>
        )}

        {form.reminder !== "off" && (
          <label>
            알림 받을 사람
            <div className="schedule-chip-row">
              {REMINDER_TARGETS.map((target) => (
                <button key={target.value} type="button" className={form.reminderTarget === target.value ? "active" : ""} onClick={() => updateField("reminderTarget", target.value)}>
                  {target.label}
                </button>
              ))}
            </div>
          </label>
        )}

        <label>
          메모
          <textarea value={form.memo} onChange={(event) => updateField("memo", event.target.value)} placeholder="준비물, 설명, 가족에게 남길 말을 적어 주세요." />
        </label>

        <label>
          일정 색상
          <div className="schedule-color-row">
            {Object.values(CATEGORY_COLORS).map((color) => (
              <button
                key={color}
                type="button"
                className={form.color === color ? "active" : ""}
                style={{ background: color }}
                onClick={() => updateField("color", color)}
                aria-label={`${color} 선택`}
              />
            ))}
            <input type="color" value={form.color} onChange={(event) => updateField("color", event.target.value)} aria-label="직접 색상 선택" />
          </div>
        </label>

        {mode !== "edit" && (
          <div className="schedule-options">
            <label>
              <input type="checkbox" checked={keepAdding} onChange={(event) => setKeepAdding(event.target.checked)} />
              저장 후 계속 추가
            </label>
          </div>
        )}

        {error && <p className="schedule-error">{error}</p>}

        <div className="schedule-modal-actions">
          {mode === "edit" && (
            <button type="button" className="schedule-delete-action" onClick={onDelete}>
              <Trash2 size={17} />
              삭제
            </button>
          )}
          {mode !== "edit" && (
            <button type="button" className="schedule-secondary-action" onClick={(event) => submit(event, true)}>
              <Plus size={17} />
              계속 입력
            </button>
          )}
          <button className="composer-submit" type="submit">
            <Save size={18} />
            저장
          </button>
        </div>
      </form>
    </div>
  );

  return createPortal(modal, document.body);
}

function normalizeSchedule(schedule = {}) {
  const members = schedule.members?.length ? schedule.members : [schedule.member || EMPTY_SCHEDULE.member];
  const days = schedule.days?.length ? schedule.days : [schedule.day || dayFromDate(schedule.date) || EMPTY_SCHEDULE.day].filter(Boolean);
  const repeat = schedule.repeat || (schedule.repeatWeekly ? "weekly" : "none");
  const location = schedule.location || EMPTY_SCHEDULE.location;
  const placePreset = PLACE_PRESETS.includes(location) ? location : schedule.placePreset || "직접 입력";

  return {
    ...EMPTY_SCHEDULE,
    ...schedule,
    members,
    member: members[0],
    days,
    day: days[0] || EMPTY_SCHEDULE.day,
    repeat,
    repeatWeekly: repeat === "weekly" || repeat === "custom",
    location,
    placePreset,
    reminder: schedule.reminder || EMPTY_SCHEDULE.reminder,
    reminderTarget: schedule.reminderTarget || EMPTY_SCHEDULE.reminderTarget,
    memo: schedule.memo || "",
  };
}

function dayFromDate(date) {
  if (!date) return "";
  const dateDay = new Date(`${date}T00:00:00`).getDay();
  return DAYS[dateDay === 0 ? 6 : dateDay - 1];
}
