import { ChevronRight, Plus, Sparkles } from "lucide-react";
import { rooms } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";

export default function TodayPage({ todayTasks, completion, toggleTask, deleteTask, openComposer, onOpenPanel }) {
  return (
    <section className="page">
      <div className="hero-panel">
        <div>
          <p>오늘의 할 일 앱</p>
          <h1>청소를 한눈에</h1>
          <span>계획. 공유. 간편하게.</span>
        </div>
        <button className="hero-badge" onClick={() => onOpenPanel({ type: "summary" })}>
          <Sparkles size={22} />
          <strong>{completion}%</strong>
        </button>
      </div>

      <section className="quick-card stack-card">
        <RowButton title="모든 작업" value="126" onClick={() => onOpenPanel({ type: "allTasks" })} />
        <RowButton title="기록" onClick={() => onOpenPanel({ type: "history" })} />
        <RowButton title="요약" value={`최근 7일 완료율 ${completion}%`} chart onClick={() => onOpenPanel({ type: "summary" })} />
      </section>

      <section className="room-section">
        <div className="section-head">
          <h2>방</h2>
          <button onClick={openComposer}>
            <Plus size={18} />
            추가
          </button>
        </div>
        <div className="room-list">
          {rooms.map((room) => (
            <button className="room-card" key={room.name} onClick={() => onOpenPanel({ type: "room", room: room.name })}>
              <span>{room.icon}</span>
              <strong>{room.name}</strong>
              <small>{room.state}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="task-sheet">
        <div className="sheet-head">
          <h2>오늘 집안일 {todayTasks.length}개</h2>
          <button onClick={openComposer}>
            <Plus size={18} />
          </button>
        </div>
        {todayTasks.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onOpen={(openedTask) => onOpenPanel({ type: "task", task: openedTask })} />
        ))}
        <button className="wide-create" onClick={openComposer}>
          <Plus size={20} />
          새 작업 만들기
        </button>
      </section>
    </section>
  );
}

function RowButton({ title, value, chart, onClick }) {
  return (
    <button className="row-button" onClick={onClick}>
      <strong>{title}</strong>
      {chart ? (
        <span className="mini-bars">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      ) : (
        <span>{value}</span>
      )}
      <ChevronRight size={18} />
    </button>
  );
}
