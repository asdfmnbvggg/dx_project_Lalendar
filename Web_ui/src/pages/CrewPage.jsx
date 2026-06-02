import { ChevronRight, RotateCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { members } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";

export default function CrewPage({
  scopedTasks,
  selectedDate,
  selectedMember,
  memberColors,
  changeMemberColor,
  setSelectedMember,
  toggleTask,
  deleteTask,
  changeTaskOwner,
  postponeTask,
  openComposer,
  onOpenPanel,
}) {
  const [isMemberDetailOpen, setMemberDetailOpen] = useState(false);
  const selected = members.find((member) => member.id === selectedMember && member.id !== "all") || members[1];
  const selectedTasks = scopedTasks
    .filter((task) => task.owner === selected.id && task.date === selectedDate)
    .sort((a, b) => Number(a.done) - Number(b.done) || b.id - a.id);
  const doneCount = selectedTasks.filter((task) => task.done).length;
  const completion = Math.round((doneCount / Math.max(selectedTasks.length, 1)) * 100);
  const selectedDateLabel = `${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8, 10))}일`;

  return (
    <section className="page crew-page">
      <section className="crew-switcher">
        {members.slice(1).map((member) => {
          const count = scopedTasks.filter((task) => task.owner === member.id && task.date === selectedDate).length;
          return (
            <button
              key={member.id}
              className={selected.id === member.id ? "active" : ""}
              onClick={() => setSelectedMember(member.id)}
              style={{ "--member-color": memberColors[member.id] }}
            >
              <span style={{ background: memberColors[member.id] }}>{member.short}</span>
              <div>
                <strong>{member.name}</strong>
                <small>{selectedDateLabel} · {count}개</small>
              </div>
            </button>
          );
        })}
      </section>

      <section className="member-focus" style={{ "--member-color": memberColors[selected.id] }}>
        <div className="member-orb" style={{ background: memberColors[selected.id] }}>{selected.short}</div>
        <div>
          <p>오늘 담당자</p>
          <h1>{selected.name}</h1>
          <span>{selected.subtitle}</span>
        </div>
        <button
          className={isMemberDetailOpen ? "active" : ""}
          onClick={() => setMemberDetailOpen((current) => !current)}
          aria-label={`${selected.name} 상세 펼치기`}
        >
          <ChevronRight size={22} />
        </button>
      </section>

      {isMemberDetailOpen && (
        <section className="member-detail-stack">
          <section className="member-color-card">
            <div>
              <h2>멤버 색상</h2>
              <p>캘린더 할 일 표시 색으로 사용돼요.</p>
            </div>
            <div className="member-color-list">
              {members.slice(1).map((member) => (
                <label key={member.id}>
                  <span style={{ background: memberColors[member.id] }}>{member.short}</span>
                  <strong>{member.name}</strong>
                  <input
                    type="color"
                    value={memberColors[member.id]}
                    aria-label={`${member.name} 색상 선택`}
                    onChange={(event) => changeMemberColor(member.id, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="crew-stat-grid">
            <article>
              <Sparkles size={20} />
              <strong>{completion}%</strong>
              <span>완료율</span>
            </article>
            <article>
              <RotateCw size={20} />
              <strong>{selectedTasks.length}개</strong>
              <span>담당 작업</span>
            </article>
          </section>
        </section>
      )}

      <section className="task-sheet crew-task-sheet">
        <div className="sheet-head">
          <h2>{selected.name}의 {selectedDateLabel} 할 일 {selectedTasks.length}개</h2>
          <button onClick={openComposer} aria-label="작업 추가">추가</button>
        </div>
        {selectedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onOwnerChange={changeTaskOwner}
            onPostpone={postponeTask}
            onOpen={(openedTask) => onOpenPanel({ type: "task", task: openedTask })}
          />
        ))}
        {selectedTasks.length === 0 && <p className="panel-empty">이 날짜에 담당 할 일이 없습니다.</p>}
      </section>
    </section>
  );
}
