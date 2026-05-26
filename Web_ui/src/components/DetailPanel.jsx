import { Check, ClipboardList, Settings, X } from "lucide-react";
import { tagLabel } from "../data.js";

export default function DetailPanel({ panel, tasks, completion, onClose, onToggle, onDelete, onOpenComposer }) {
  if (!panel) return null;

  const doneTasks = tasks.filter((task) => task.done);
  const pendingTasks = tasks.filter((task) => !task.done);
  const panelTasks = getPanelTasks(panel, tasks, doneTasks, pendingTasks);

  return (
    <div className="detail-backdrop" role="presentation">
      <aside className="detail-panel">
        <div className="detail-head">
          <div>
            <p>{getPanelKicker(panel)}</p>
            <h2>{getPanelTitle(panel)}</h2>
          </div>
          <button onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        {panel.type === "summary" && (
          <section className="detail-summary">
            <strong>{completion}%</strong>
            <span>이번 주 완료율</span>
            <div className="detail-bars">
              {[42, 62, 88, 54, 76].map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
          </section>
        )}

        {panel.type === "settings" && (
          <section className="detail-list">
            {["가족 초대", "알림 설정", "테마 설정", "데이터 내보내기"].map((item) => (
              <button className="setting-row" key={item}>
                <Settings size={18} />
                {item}
              </button>
            ))}
          </section>
        )}

        {panel.type === "notifications" && (
          <section className="detail-list">
            {pendingTasks.slice(0, 4).map((task) => (
              <article className="notice-row" key={task.id}>
                <ClipboardList size={18} />
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.date} · {task.place}</p>
                </div>
              </article>
            ))}
          </section>
        )}

        {!["summary", "settings", "notifications"].includes(panel.type) && (
          <section className="detail-list">
            {panelTasks.map((task) => (
              <article className="detail-task" key={task.id}>
                <button onClick={() => onToggle(task.id)} className={task.done ? "checked" : ""}>
                  {task.done && <Check size={15} />}
                </button>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.place} · {task.repeat} · {tagLabel[task.tag]}</p>
                </div>
                <button className="detail-delete" onClick={() => onDelete(task.id)}>
                  삭제
                </button>
              </article>
            ))}
            {panelTasks.length === 0 && <p className="panel-empty">표시할 작업이 없습니다.</p>}
          </section>
        )}

        <button className="composer-submit" onClick={onOpenComposer}>
          작업 추가
        </button>
      </aside>
    </div>
  );
}

function getPanelTasks(panel, tasks, doneTasks, pendingTasks) {
  if (panel.type === "allTasks") return tasks;
  if (panel.type === "history") return doneTasks;
  if (panel.type === "room") return tasks.filter((task) => task.place === panel.room);
  if (panel.type === "task") return tasks.filter((task) => task.id === panel.task.id);
  if (panel.type === "pending") return pendingTasks;
  return tasks;
}

function getPanelKicker(panel) {
  const labels = {
    allTasks: "모든 작업",
    history: "기록",
    summary: "요약",
    room: "방별 작업",
    task: "작업 상세",
    notifications: "알림",
    settings: "설정",
    pending: "대기 작업",
  };
  return labels[panel.type] || "상세";
}

function getPanelTitle(panel) {
  if (panel.type === "room") return panel.room;
  if (panel.type === "task") return panel.task.title;
  if (panel.type === "notifications") return "청소 전 알려드려요";
  if (panel.type === "settings") return "앱 메뉴";
  if (panel.type === "pending") return "아직 남은 일";
  return getPanelKicker(panel);
}
