import { Plus, X } from "lucide-react";
import { useState } from "react";
import { members } from "../data.js";

const places = ["우리 집", "회사", "학교", "학원", "마트", "병원", "직접 입력"];
const repeatOptions = ["없음", "매일", "매주", "매월", "사용자 지정"];
const reminderOptions = ["OFF", "정시", "10분 전", "30분 전", "1시간 전", "하루 전"];

export default function TaskComposer({ selectedDate, selectedMember, lockedOwner, onAdd, onClose }) {
  const initialOwner = lockedOwner || (selectedMember === "all" ? "me" : selectedMember);
  const [title, setTitle] = useState("");
  const [placePreset, setPlacePreset] = useState("우리 집");
  const [customPlace, setCustomPlace] = useState("");
  const [date, setDate] = useState(selectedDate);
  const [repeat, setRepeat] = useState("없음");
  const [owners, setOwners] = useState([initialOwner]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [reminder, setReminder] = useState("OFF");
  const [memo, setMemo] = useState("");

  function toggleOwner(ownerId) {
    if (lockedOwner) return;

    if (ownerId === "all") {
      setOwners(["all"]);
      return;
    }
    setOwners((current) => {
      const withoutAll = current.filter((item) => item !== "all");
      const next = withoutAll.includes(ownerId) ? withoutAll.filter((item) => item !== ownerId) : [...withoutAll, ownerId];
      return next.length ? next : [initialOwner];
    });
  }

  function submit(event) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const place = placePreset === "직접 입력" ? customPlace.trim() || "우리 집" : placePreset;
    const targets = lockedOwner ? [lockedOwner] : owners.includes("all") ? ["all"] : owners;
    targets.forEach((owner, index) => {
      onAdd({
        date,
        title: trimmedTitle,
        place,
        tag: "house",
        owner,
        done: false,
        repeat: `${repeat}${startTime && endTime ? ` · ${startTime}-${endTime}` : ""}`,
        source: "manual",
        description: memo.trim(),
        reminder: reminder === "OFF" ? "off" : reminder,
        groupId: targets.length > 1 ? `manual-${Date.now()}` : undefined,
        copyIndex: index,
      });
    });
  }

  return (
    <div className="composer-backdrop" role="presentation">
      <form className="composer" onSubmit={submit}>
        <div className="composer-head">
          <div>
            <p>통합 일정</p>
            <h2>일정 추가</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <label>
          일정명
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="싱크대 청소, 병원, 출근" autoFocus />
        </label>

        <div className="composer-grid">
          <label>
            날짜
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            반복
            <select value={repeat} onChange={(event) => setRepeat(event.target.value)}>
              {repeatOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="composer-grid">
          <label>
            시작 시간
            <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label>
            종료 시간
            <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </label>
        </div>

        <label>
          대상자
          <div className="schedule-chip-row">
            {members.map((member) => (
              <button key={member.id} type="button" className={owners.includes(member.id) ? "active" : ""} onClick={() => toggleOwner(member.id)} disabled={Boolean(lockedOwner && member.id !== lockedOwner)}>
                {member.id === "all" ? "전체" : member.name}
              </button>
            ))}
          </div>
        </label>

        <label>
          장소
          <div className="schedule-chip-row">
            {places.map((place) => (
              <button key={place} type="button" className={placePreset === place ? "active" : ""} onClick={() => setPlacePreset(place)}>
                {place}
              </button>
            ))}
          </div>
          {placePreset === "직접 입력" && <input value={customPlace} onChange={(event) => setCustomPlace(event.target.value)} placeholder="장소 입력" />}
        </label>

        <label>
          알림
          <select value={reminder} onChange={(event) => setReminder(event.target.value)}>
            {reminderOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>

        <label>
          메모
          <textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="준비물이나 가족에게 남길 말을 적어 주세요" />
        </label>

        <button className="composer-submit" type="submit">
          <Plus size={19} />
          저장
        </button>
      </form>
    </div>
  );
}
