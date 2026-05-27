import { Check, MoreHorizontal, Trash2 } from "lucide-react";
import { members } from "../data.js";

export default function TaskItem({ task, onToggle, onDelete, onOpen, onOwnerChange }) {
  const owner = members.find((member) => member.id === task.owner) || members[0];

  return (
    <article className={`task-item ${task.done ? "done" : ""}`}>
      <button className="check-button" onClick={() => onToggle(task.id)} aria-label="완료 전환">
        {task.done && <Check size={16} />}
      </button>

      <button className="task-copy-button" onClick={() => onOpen(task)} aria-label={`${task.title} 상세 보기`}>
        <strong>{task.title}</strong>
        <p>
          {task.place} · {task.repeat}
          <span className="owner-badge">{owner.name}</span>
          <span className={`source-badge ${task.source === "auto" ? "auto" : "manual"}`}>
            {task.source === "auto" ? "자동추가" : "수동"}
          </span>
        </p>
      </button>

      <div className="task-actions">
        <select
          className="owner-select"
          value={task.owner}
          aria-label={`${task.title} 담당자 변경`}
          onChange={(event) => onOwnerChange?.(task.id, event.target.value)}
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <button className="delete-button" onClick={() => onDelete(task.id)} aria-label="작업 삭제">
          <Trash2 size={17} />
        </button>
        <button className="more-button" onClick={() => onOpen(task)} aria-label="더 보기">
          <MoreHorizontal size={18} />
        </button>
      </div>
    </article>
  );
}
