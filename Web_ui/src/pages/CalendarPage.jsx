import { ClipboardList, Plus, Search } from "lucide-react";
import { members } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";

export default function CalendarPage({
  month,
  tasksByDate,
  selectedDate,
  setSelectedDate,
  selectedMember,
  setSelectedMember,
  selectedTasks,
  query,
  setQuery,
  toggleTask,
  deleteTask,
  changeTaskOwner,
  openComposer,
  onOpenPanel,
}) {
  const selectedMemberName = members.find((member) => member.id === selectedMember)?.name || "우리 집";
  const selectedDay = Number(selectedDate.slice(-2));

  return (
    <section className="page calendar-page">
      <div className="profile-strip">
        {members.map((member) => (
          <button key={member.id} className={selectedMember === member.id ? "active" : ""} onClick={() => setSelectedMember(member.id)}>
            <span>{member.short}</span>
            {member.name}
          </button>
        ))}
      </div>

      <section className="calendar-profile">
        <div className="profile-avatar">{selectedMember === "all" ? "집" : selectedMemberName[0]}</div>
        <div>
          <h1>{selectedMemberName}</h1>
          <p>가전 루틴과 집안일을 한눈에 관리해요.</p>
        </div>
      </section>

      <section className="calendar-board">
        <div className="calendar-header">
          <h2>2026. 05</h2>
          <button onClick={openComposer} aria-label="할 일 추가">
            <Plus size={18} />
          </button>
        </div>
        <div className="weekdays">
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="month-grid">
          {Array.from({ length: 5 }).map((_, index) => (
            <span className="blank-day" key={index} />
          ))}
          {month.map((key) => {
            const tasks = tasksByDate[key] || [];
            const day = Number(key.slice(-2));
            return (
              <button key={key} className={`date-cell ${selectedDate === key ? "selected" : ""}`} onClick={() => setSelectedDate(key)}>
                <strong>{day}</strong>
                <div>
                  {tasks.slice(0, 3).map((task) => (
                    <i className={task.tag} key={task.id}>
                      {task.title}
                    </i>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="task-sheet compact">
        <div className="sheet-head">
          <h2>{selectedDay}일 작업</h2>
          <label className="search-field">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색" />
          </label>
        </div>
        {selectedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onOwnerChange={changeTaskOwner}
            onOpen={(openedTask) => onOpenPanel({ type: "task", task: openedTask })}
          />
        ))}
        {selectedTasks.length === 0 && (
          <div className="empty-state">
            <ClipboardList size={24} />
            <p>선택한 날짜에 작업이 없어요.</p>
          </div>
        )}
      </section>
    </section>
  );
}
