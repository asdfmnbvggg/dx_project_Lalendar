import { ChevronRight } from "lucide-react";
import { members } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";

export default function CrewPage({ scopedTasks, selectedMember, setSelectedMember, toggleTask, deleteTask, onOpenPanel }) {
  return (
    <section className="page">
      <div className="hero-panel slim">
        <div>
          <p>함께 나눠요</p>
          <h1>가족에게 집안일 분담</h1>
          <span>담당자와 로테이션을 바로 확인하세요.</span>
        </div>
      </div>

      <div className="crew-grid">
        {members.slice(1).map((member) => {
          const memberTasks = scopedTasks.filter((task) => task.owner === member.id || selectedMember === member.id);
          return (
            <article className="crew-card" key={member.id}>
              <button className="crew-head" onClick={() => setSelectedMember(member.id)}>
                <span>{member.short}</span>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.subtitle}</small>
                </div>
                <ChevronRight size={18} />
              </button>
              {memberTasks.slice(0, 2).map((task) => (
                <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onOpen={(openedTask) => onOpenPanel({ type: "task", task: openedTask })} />
              ))}
            </article>
          );
        })}
      </div>
    </section>
  );
}
