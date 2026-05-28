import { Check, ClipboardList, Cpu, Refrigerator, Settings, Sparkles, X } from "lucide-react";
import { appliances, communityTips, members, tagLabel } from "../data.js";

export default function DetailPanel({
  panel,
  tasks,
  notifications,
  completion,
  onClose,
  onToggle,
  onDelete,
  onOwnerChange,
  onPostpone,
  onExecuteNotification,
  onPostponeNotification,
  onAddTask,
  selectedDate,
  selectedMember,
  onOpenComposer,
}) {
  if (!panel) return null;

  const doneTasks = tasks.filter((task) => task.done);
  const pendingTasks = tasks.filter((task) => !task.done);
  const panelTasks = getPanelTasks(panel, tasks, doneTasks, pendingTasks).sort(taskSorter);

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
            {notifications.map((item) => (
              <article className="notice-row actionable" key={item.id}>
                <ClipboardList size={18} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <div className="notice-actions">
                    <button type="button" onClick={() => onPostponeNotification(item)}>
                      미루기
                    </button>
                    <button type="button" onClick={() => onExecuteNotification(item)}>
                      실행하기
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {notifications.length === 0 && <p className="panel-empty">표시할 알림이 없습니다.</p>}
          </section>
        )}

        {panel.type === "recommendation" && (
          <section className="insight-card">
            <Sparkles size={28} />
            <h3>{panel.recommendation.title}</h3>
            <p>{panel.recommendation.reason}</p>
            <button
              className="composer-submit"
              onClick={() =>
                onAddTask({
                  date: selectedDate,
                  title: panel.recommendation.task,
                  place: "LG HUB",
                  tag: "house",
                  owner: selectedMember === "all" ? "me" : selectedMember,
                  done: false,
                  repeat: "AI 추천",
                  source: "auto",
                })
              }
            >
              {panel.recommendation.action}
            </button>
          </section>
        )}

        {panel.type === "appliance" && (
          <section className="insight-card">
            <Refrigerator size={28} />
            <h3>{panel.appliance.name}</h3>
            <p>{panel.appliance.state}</p>
            <strong>{panel.appliance.signal}</strong>
          </section>
        )}

        {panel.type === "appliances" && (
          <section className="detail-list">
            {appliances.map((item) => (
              <article className="notice-row" key={item.id}>
                <Cpu size={18} />
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.state} · {item.signal}</p>
                </div>
              </article>
            ))}
          </section>
        )}

        {panel.type === "community" && (
          <section className="detail-list">
            {communityTips.map((tip) => (
              <article className="notice-row" key={tip.title}>
                <ClipboardList size={18} />
                <div>
                  <strong>{tip.title}</strong>
                  <p>{tip.source}</p>
                </div>
              </article>
            ))}
          </section>
        )}

        {panel.type === "tip" && (
          <section className="insight-card">
            <ClipboardList size={28} />
            <h3>{panel.tip.title}</h3>
            <p>{panel.tip.source}</p>
          </section>
        )}

        {panel.type === "member" && (
          <section className="insight-card">
            <Sparkles size={28} />
            <h3>{panel.member.name}</h3>
            <p>{panel.member.subtitle}</p>
            <strong>담당 작업과 로테이션을 멤버 탭에서 바로 확인할 수 있어요.</strong>
          </section>
        )}

        {panel.type === "rotation" && (
          <section className="detail-list">
            {["Charlotte", "Minsu.kim", "Theresa", "Anna"].map((name, index) => (
              <article className="notice-row" key={name}>
                <Cpu size={18} />
                <div>
                  <strong>{index + 1}. {name}</strong>
                  <p>{index === 0 ? "오늘 담당" : `${index + 1}번째 순서`}</p>
                </div>
              </article>
            ))}
          </section>
        )}

        {![
          "summary",
          "settings",
          "notifications",
          "recommendation",
          "appliance",
          "appliances",
          "community",
          "tip",
          "member",
          "rotation",
        ].includes(panel.type) && (
          <section className="detail-list">
            {panelTasks.map((task) => (
              <article className="detail-task" key={task.id}>
                <button onClick={() => onToggle(task.id)} className={task.done ? "checked" : ""}>
                  {task.done && <Check size={15} />}
                </button>
                <div>
                  <strong>{task.title}</strong>
                  <p>
                    {task.place} · {task.repeat} · {tagLabel[task.tag]}
                    <span className="owner-badge">{getOwnerName(task.owner)}</span>
                    <span className={`source-badge ${task.source === "auto" ? "auto" : "manual"}`}>
                      {task.source === "auto" ? "자동추가" : "수동"}
                    </span>
                  </p>
                </div>
                <select
                  className="owner-select detail-owner-select"
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
                <button className="detail-delete" onClick={() => onDelete(task.id)}>
                  삭제
                </button>
                <button className="detail-postpone" onClick={() => onPostpone?.(task.id)}>
                  미루기
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
  if (panel.type === "appliances" || panel.type === "community") return [];
  return tasks;
}

function taskSorter(a, b) {
  if (a.done !== b.done) return Number(a.done) - Number(b.done);
  return b.id - a.id;
}

function getOwnerName(ownerId) {
  return members.find((member) => member.id === ownerId)?.name || "미정";
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
    recommendation: "AI 추천",
    appliance: "가전 상태",
    appliances: "가전 캘린더",
    community: "커뮤니티",
    tip: "생활 팁",
    member: "멤버 상세",
    rotation: "로테이션",
  };
  return labels[panel.type] || "상세";
}

function getPanelTitle(panel) {
  if (panel.type === "room") return panel.room;
  if (panel.type === "task") return panel.task.title;
  if (panel.type === "notifications") return "청소 전 알려드려요";
  if (panel.type === "settings") return "앱 메뉴";
  if (panel.type === "pending") return "아직 남은 일";
  if (panel.type === "recommendation") return "스마트 루틴";
  if (panel.type === "appliance") return panel.appliance.name;
  if (panel.type === "community") return "우리 동네 집안일 팁";
  if (panel.type === "tip") return "커뮤니티 추천";
  if (panel.type === "appliances") return "LG ThinQ 연동 가전";
  if (panel.type === "member") return panel.member.name;
  if (panel.type === "rotation") return "담당 순서";
  return getPanelKicker(panel);
}
