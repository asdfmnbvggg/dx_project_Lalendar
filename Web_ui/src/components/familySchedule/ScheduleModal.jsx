import { Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CATEGORY_COLORS, CATEGORY_LABELS, DAYS, EMPTY_SCHEDULE } from "./scheduleConstants.js";

export default function ScheduleModal({ mode, initialSchedule, members, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_SCHEDULE, ...initialSchedule }));
  const [keepAdding, setKeepAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({ ...EMPTY_SCHEDULE, ...initialSchedule });
    setError("");
  }, [initialSchedule]);

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "category" && current.color === CATEGORY_COLORS[current.category]) {
        next.color = CATEGORY_COLORS[value] || CATEGORY_COLORS.custom;
      }
      return next;
    });
  }

  function submit(event, shouldContinue = keepAdding) {
    event.preventDefault();
    if (!form.title.trim()) return setError("일정명을 입력해 주세요.");
    if (!form.day) return setError("요일을 선택해 주세요.");
    if (!form.startTime || !form.endTime) return setError("시작 시간과 종료 시간을 입력해 주세요.");
    if (form.endTime <= form.startTime) return setError("종료 시간은 시작 시간보다 늦어야 합니다.");

    onSave({ ...form, title: form.title.trim(), location: form.location.trim() }, shouldContinue);
    if (shouldContinue) {
      setForm((current) => ({ ...EMPTY_SCHEDULE, member: current.member, day: current.day, color: current.color, category: current.category }));
    }
  }

  return (
    <div className="composer-backdrop" role="presentation">
      <form className="composer schedule-modal" onSubmit={submit}>
        <div className="composer-head">
          <div>
            <p>가족 시간표</p>
            <h2>{mode === "edit" ? "일정 수정" : "일정 추가"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <div className="composer-grid">
          <label>
            대상자
            <select value={form.member} onChange={(event) => updateField("member", event.target.value)}>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            일정명
            <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="국어, 픽업, 출근" autoFocus />
          </label>
        </div>

        <label>
          요일 선택
          <div className="schedule-day-buttons">
            {DAYS.map((day) => (
              <button key={day} type="button" className={form.day === day ? "active" : ""} onClick={() => updateField("day", day)}>
                {day}
              </button>
            ))}
          </div>
        </label>

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

        <div className="composer-grid">
          <label>
            장소
            <input value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="1-3반, 회사, 학원" />
          </label>
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
        </div>

        <div className="schedule-options">
          <label>
            <input type="checkbox" checked={form.repeatWeekly} onChange={(event) => updateField("repeatWeekly", event.target.checked)} />
            매주 반복
          </label>
          {mode !== "edit" && (
            <label>
              <input type="checkbox" checked={keepAdding} onChange={(event) => setKeepAdding(event.target.checked)} />
              저장 후 계속 추가
            </label>
          )}
        </div>

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
              더 입력
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
}
