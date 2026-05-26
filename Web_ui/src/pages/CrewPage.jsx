import { ChevronRight, RotateCw, Sparkles, UserPlus } from "lucide-react";
import { members } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";

export default function CrewPage({
  scopedTasks,
  selectedMember,
  setSelectedMember,
  toggleTask,
  deleteTask,
  onOpenPanel,
}) {
  const selected = members.find((member) => member.id === selectedMember && member.id !== "all") || members[1];
  const selectedTasks = scopedTasks.filter((task) => task.owner === selected.id);
  const doneCount = selectedTasks.filter((task) => task.done).length;
  const completion = Math.round((doneCount / Math.max(selectedTasks.length, 1)) * 100);

  return (
    <section className="page crew-page">
      <section className="crew-switcher">
        {members.slice(1).map((member) => {
          const count = scopedTasks.filter((task) => task.owner === member.id).length;
          return (
            <button
              key={member.id}
              className={selected.id === member.id ? "active" : ""}
              onClick={() => setSelectedMember(member.id)}
            >
              <span>{member.short}</span>
              <div>
                <strong>{member.name}</strong>
                <small>{count}개 담당</small>
              </div>
            </button>
          );
        })}
      </section>

      <section className="member-focus">
        <div className="member-orb">{selected.short}</div>
        <div>
          <p>오늘의 담당자</p>
          <h1>{selected.name}</h1>
          <span>{selected.subtitle}</span>
        </div>
        <button onClick={() => onOpenPanel({ type: "member", member: selected })} aria-label={`${selected.name} 상세 보기`}>
          <ChevronRight size={22} />
        </button>
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
        <button onClick={() => onOpenPanel({ type: "rotation", member: selected })}>
          <UserPlus size={20} />
          <strong>로테이션</strong>
          <span>순서 보기</span>
        </button>
      </section>

      <section className="task-sheet crew-task-sheet">
        <div className="sheet-head">
          <h2>{selected.name}의 작업</h2>
          <button onClick={() => onOpenPanel({ type: "member", member: selected })}>상세</button>
        </div>
        {selectedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onOpen={(openedTask) => onOpenPanel({ type: "task", task: openedTask })}
          />
        ))}
        {selectedTasks.length === 0 && <p className="panel-empty">아직 담당 작업이 없습니다.</p>}
      </section>
    </section>
  );
}
