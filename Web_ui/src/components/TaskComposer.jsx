import { Plus, X } from "lucide-react";
import { useState } from "react";

export default function TaskComposer({ selectedDate, selectedMember, onAdd, onClose }) {
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("주방");
  const [date, setDate] = useState(selectedDate);
  const [repeat, setRepeat] = useState("오늘");

  function submit(event) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onAdd({
      date,
      title: trimmedTitle,
      place,
      tag: "house",
      owner: selectedMember === "all" ? "me" : selectedMember,
      done: false,
      repeat,
    });
  }

  return (
    <div className="composer-backdrop" role="presentation">
      <form className="composer" onSubmit={submit}>
        <div className="composer-head">
          <div>
            <p>새 작업</p>
            <h2>할 일 추가</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        <label>
          작업 이름
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 싱크대 청소" autoFocus />
        </label>
        <div className="composer-grid">
          <label>
            위치
            <select value={place} onChange={(event) => setPlace(event.target.value)}>
              <option>주방</option>
              <option>거실</option>
              <option>욕실</option>
              <option>침실</option>
              <option>세탁실</option>
            </select>
          </label>
          <label>
            날짜
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
        <label>
          반복
          <select value={repeat} onChange={(event) => setRepeat(event.target.value)}>
            <option>오늘</option>
            <option>매일</option>
            <option>매주</option>
            <option>2주마다</option>
            <option>월말</option>
          </select>
        </label>
        <button className="composer-submit" type="submit">
          <Plus size={19} />
          추가하기
        </button>
      </form>
    </div>
  );
}
