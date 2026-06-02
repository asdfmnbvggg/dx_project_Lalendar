import { Plus, RotateCw, Sparkles } from "lucide-react";
import { members } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";
import FamilySchedulePage from "../components/familySchedule/FamilySchedulePage.jsx";

export default function CrewPage({
  tasks,
  scopedTasks,
  selectedDate,
  selectedMember,
  memberColors,
  setSelectedMember,
  toggleTask,
  deleteTask,
  changeTaskOwner,
  postponeTask,
  openComposer,
  onOpenPanel,
}) {
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

      <section className="member-dashboard" style={{ "--member-color": memberColors[selected.id] }}>
        <div className="member-dashboard-head">
          <div className="member-orb" style={{ background: memberColors[selected.id] }}>
            {selected.short}
          </div>
          <div className="member-dashboard-title">
            <p>오늘 담당자</p>
            <h1>{selected.name}</h1>
            <span>
              {selectedDateLabel} 할 일 {selectedTasks.length}개 · 완료 {doneCount}개
            </span>
          </div>
          <button className="member-add-button" onClick={openComposer} aria-label="작업 추가">
            <Plus size={18} />
            추가
          </button>
        </div>

        <div className="member-summary-row">
          <article>
            <Sparkles size={18} />
            <strong>{completion}%</strong>
            <span>완료율</span>
          </article>
          <article>
            <RotateCw size={18} />
            <strong>{selectedTasks.length}개</strong>
            <span>오늘 할 일</span>
          </article>
        </div>

        <div className="member-task-list">
          <div className="member-task-list-head">
            <h2>{selected.name}의 할 일</h2>
            <small>{selectedDateLabel}</small>
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
        </div>
      </section>

      <FamilySchedulePage tasks={tasks} selectedDate={selectedDate} members={members} selectedMember={selectedMember} />
    </section>
  );
}
