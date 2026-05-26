import { Check, MoreHorizontal, Trash2 } from "lucide-react";

export default function TaskItem({ task, onToggle, onDelete, onOpen }) {
  return (
    <article className={`task-item ${task.done ? "done" : ""}`}>
      <button className="check-button" onClick={() => onToggle(task.id)} aria-label="완료 전환">
        {task.done && <Check size={16} />}
      </button>
      <button className="task-copy-button" onClick={() => onOpen(task)} aria-label={`${task.title} 상세 보기`}>
        <strong>{task.title}</strong>
        <p>
          {task.place} · {task.repeat}
        </p>
      </button>
      <div className="task-actions">
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
