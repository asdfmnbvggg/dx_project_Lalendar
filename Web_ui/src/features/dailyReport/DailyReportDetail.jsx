import { ArrowLeft, CalendarDays, CheckCircle2, CloudSun, Plus, Sparkles, WashingMachine, X } from "lucide-react";
import { useState } from "react";
import ReportImageRecord from "./ReportImageRecord.jsx";

export default function DailyReportDetail({ report, onBack, onAddTodo, onUpdateTodo }) {
  const [isTodoOpen, setTodoOpen] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoTime, setTodoTime] = useState("09:00");
  const completedRatio = report.totalTodoCount > 0 ? `${report.completedCount}/${report.totalTodoCount}` : "0/0";

  function startNewTodo() {
    setEditingTodoId(null);
    setTodoTitle("");
    setTodoTime("09:00");
  }

  function startEditTodo(todo) {
    setEditingTodoId(todo.id);
    setTodoTitle(todo.title);
    setTodoTime(todo.time === "시간 미정" ? "09:00" : todo.time);
  }

  function saveTodo(event) {
    event.preventDefault();
    const title = todoTitle.trim();
    if (!title) return;

    if (editingTodoId) {
      onUpdateTodo?.(editingTodoId, { title, time: todoTime });
    } else {
      onAddTodo?.({ title, time: todoTime });
    }
    startNewTodo();
  }

  return (
    <section className="daily-report-detail-page">
      <header className="daily-report-detail-header">
        <button type="button" onClick={onBack} aria-label="데일리 리포트 닫기"><ArrowLeft size={22} /></button>
        <div>
          <span>HOMECARE STORY</span>
          <h1>Daily <em>AI</em> Report</h1>
          <p>{report.date} {report.dayLabel}</p>
        </div>
      </header>

      <main className="daily-report-detail-content">
        <section className="daily-report-hero">
          <div className="daily-report-hero-copy">
            <span><Sparkles size={15} /> 오늘의 한 장</span>
            <h2>{report.title}</h2>
            <p>{report.subtitle}</p>
            <small>{report.summary}</small>
            <div>{report.tags.map((tag) => <b key={tag}>{tag}</b>)}</div>
          </div>
          <div className="daily-report-hero-image">
            <img src={report.heroImageUrl} alt={`${report.date} 오늘의 한 장`} />
          </div>
        </section>

        <section className="daily-report-character-note">
          <img src={report.characterImageUrl} alt="리포트를 안내하는 플래니 캐릭터" />
          <div>
            <span>Planie’s note</span>
            <p>오늘 일정과 가사일을 바탕으로 리포트를 정리했어요.</p>
          </div>
        </section>

        <div className="daily-report-summary-grid">
          <ReportListCard icon={<CalendarDays />} title="오늘 일정 요약" items={report.scheduleItems} emptyText="등록된 개인 일정이 없어요." />
          <ReportListCard icon={<WashingMachine />} title="가사일 · 가전 일정" items={report.applianceItems} emptyText="예정된 가전 작업이 없어요." />
          <article className="daily-report-info-card weather">
            <CloudSun />
            <div><span>날씨 기반 안내</span><p>{report.weatherNote}</p></div>
          </article>
          <button
            type="button"
            className="daily-report-info-card progress daily-report-todo-trigger"
            onClick={() => setTodoOpen(true)}
            aria-label="To-do 추가 또는 수정"
          >
            <CheckCircle2 />
            <div>
              <span>To-do 진행 상황</span>
              <strong>{completedRatio} 완료</strong>
              <p>{report.totalTodoCount ? `오늘 할 일 ${report.totalTodoCount}개 중 ${report.completedCount}개를 완료했어요.` : "오늘 등록된 To-do가 없어요."}</p>
            </div>
          </button>
        </div>

        <ReportImageRecord records={report.imageRecords} />

      </main>

      {isTodoOpen && (
        <div className="daily-report-todo-backdrop" role="presentation" onClick={() => setTodoOpen(false)}>
          <section className="daily-report-todo-sheet" role="dialog" aria-modal="true" aria-labelledby="daily-report-todo-title" onClick={(event) => event.stopPropagation()}>
            <div className="daily-report-todo-head">
              <div>
                <span>TO-DO MANAGER</span>
                <h2 id="daily-report-todo-title">오늘의 To-do</h2>
              </div>
              <button type="button" aria-label="닫기" onClick={() => setTodoOpen(false)}><X size={20} /></button>
            </div>

            <div className="daily-report-todo-list">
              {report.todoItems.map((todo) => (
                <article key={todo.id} className={todo.done ? "done" : ""}>
                  <button
                    type="button"
                    className="daily-report-todo-check"
                    aria-label={todo.done ? "미완료로 변경" : "완료로 변경"}
                    onClick={() => onUpdateTodo?.(todo.id, { done: !todo.done })}
                  >
                    {todo.done && <CheckCircle2 size={18} />}
                  </button>
                  <button type="button" className="daily-report-todo-copy" onClick={() => startEditTodo(todo)}>
                    <strong>{todo.title}</strong>
                    <span>{todo.time}</span>
                  </button>
                </article>
              ))}
              {report.todoItems.length === 0 && <p className="daily-report-todo-empty">아직 등록된 To-do가 없어요.</p>}
            </div>

            <form className="daily-report-todo-form" onSubmit={saveTodo}>
              <div>
                <label>
                  할 일
                  <input value={todoTitle} onChange={(event) => setTodoTitle(event.target.value)} placeholder="새로운 할 일을 입력해 주세요." />
                </label>
                <label>
                  시간
                  <input type="time" value={todoTime} onChange={(event) => setTodoTime(event.target.value)} />
                </label>
              </div>
              <div className="daily-report-todo-form-actions">
                {editingTodoId && <button type="button" onClick={startNewTodo}>새 항목</button>}
                <button type="submit"><Plus size={17} />{editingTodoId ? "수정하기" : "추가하기"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function ReportListCard({ icon, title, items, emptyText }) {
  return (
    <article className="daily-report-list-card">
      <div className="daily-report-list-title">{icon}<h2>{title}</h2></div>
      {items.length > 0 ? (
        <ul>
          {items.slice(0, 4).map((item) => (
            <li key={item.id}>
              <time>{item.time}</time>
              <span>{item.title}</span>
              {item.done && <CheckCircle2 size={16} aria-label="완료" />}
            </li>
          ))}
        </ul>
      ) : <p className="daily-report-empty">{emptyText}</p>}
    </article>
  );
}
