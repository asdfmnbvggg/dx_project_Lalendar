import { RotateCw, Sparkles } from "lucide-react";
import { members } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";
import FamilySchedulePage from "../components/familySchedule/FamilySchedulePage.jsx";

const text = {
  statusTitle: "\uC624\uB298 \uB2F4\uB2F9\uC790 \uD604\uD669",
  detailTitle: "\uC624\uB298 \uB2F4\uB2F9\uC790 \uC0C1\uC138",
  doneRate: "\uC644\uB8CC\uC728",
  todaySchedule: "\uC624\uB298 \uC77C\uC815",
  empty: "\uC774 \uB0A0\uC9DC\uC5D0 \uB2F4\uB2F9 \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  month: "\uC6D4",
  day: "\uC77C",
  schedule: "\uC77C\uC815",
  done: "\uC644\uB8CC",
  pending: "\uB0A8\uC74C",
  count: "\uAC1C",
};

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
  onOpenPanel,
}) {
  const selected = members.find((member) => member.id === selectedMember && member.id !== "all") || members[1];
  const selectedTasks = scopedTasks
    .filter((task) => task.owner === selected.id && task.date === selectedDate)
    .sort((a, b) => Number(a.done) - Number(b.done) || b.id - a.id);
  const doneCount = selectedTasks.filter((task) => task.done).length;
  const completion = Math.round((doneCount / Math.max(selectedTasks.length, 1)) * 100);
  const selectedDateLabel = `${Number(selectedDate.slice(5, 7))}${text.month} ${Number(selectedDate.slice(8, 10))}${text.day}`;

  return (
    <section className="page crew-page">
      <section className="crew-switcher">
        <div className="crew-switcher-title">
          <p>{text.statusTitle}</p>
          <small className="crew-date">{selectedDateLabel}</small>
        </div>
        {members.slice(1).map((member) => {
          const memberTasks = scopedTasks.filter((task) => task.owner === member.id && task.date === selectedDate);
          const memberDone = memberTasks.filter((task) => task.done).length;
          const memberPending = memberTasks.length - memberDone;
          return (
            <button
              key={member.id}
              className={selected.id === member.id ? "active" : ""}
              onClick={() => setSelectedMember(member.id)}
              style={{ "--member-color": memberColors[member.id] }}
            >
              <span className="member-avatar" style={{ background: memberColors[member.id] }}>
                {member.short}
              </span>
              <div>
                <strong>{member.name}</strong>
                <small>
                  {memberDone}
                  {text.count} {text.done} / {memberPending}
                  {text.count} {text.pending}
                </small>
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
            <p>{text.detailTitle}</p>
            <h1>{selected.name}</h1>
            <span>
              {selectedDateLabel} {text.schedule} {selectedTasks.length}
              {text.count} · {text.done} {doneCount}
              {text.count}
            </span>
          </div>
        </div>

        <div className="member-summary-row">
          <article>
            <Sparkles size={18} />
            <strong>{completion}%</strong>
            <span>{text.doneRate}</span>
          </article>
          <article>
            <RotateCw size={18} />
            <strong>
              {selectedTasks.length}
              {text.count}
            </strong>
            <span>{text.todaySchedule}</span>
          </article>
        </div>

        <div className="member-task-list">
          <div className="member-task-list-head">
            <h2>
              {selected.name} {text.todaySchedule}
            </h2>
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
          {selectedTasks.length === 0 && <p className="panel-empty">{text.empty}</p>}
        </div>
      </section>

      <FamilySchedulePage tasks={tasks} selectedDate={selectedDate} members={members} selectedMember={selectedMember} />
    </section>
  );
}
