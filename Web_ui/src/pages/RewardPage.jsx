import { Check, TrendingUp } from "lucide-react";
import { presets } from "../data.js";

const weekDays = [
  { key: "2026-05-20", label: "수" },
  { key: "2026-05-21", label: "목" },
  { key: "2026-05-22", label: "금" },
  { key: "2026-05-23", label: "토" },
  { key: "2026-05-24", label: "일" },
  { key: "2026-05-25", label: "월" },
  { key: "2026-05-26", label: "오늘" },
];

export default function RewardPage({ tasks, completion, rewardPoints, onAddPreset }) {
  const doneCount = tasks.filter((task) => task.done).length;
  const pendingCount = tasks.length - doneCount;
  const chartRows = weekDays.map((day) => {
    const dayTasks = tasks.filter((task) => task.date === day.key);
    const done = dayTasks.filter((task) => task.done).length;
    const pending = dayTasks.length - done;
    const total = Math.max(dayTasks.length, 1);
    return {
      ...day,
      done,
      pending,
      total,
      doneHeight: Math.max(8, Math.round((done / total) * 100)),
      pendingHeight: Math.max(8, Math.round((pending / total) * 100)),
    };
  });

  return (
    <section className="page">
      <section className="stats-card live-stats-card">
        <div>
          <p>자동 보상 기록</p>
          <h2>{completion}%</h2>
          <span>완료 {doneCount}개 · 대기 {pendingCount}개 · {rewardPoints}P 적립</span>
        </div>
        <div className="live-chart" aria-label="최근 7일 작업 완료 기록">
          {chartRows.map((row) => (
            <div className="live-chart-day" key={row.key}>
              <div className="stacked-bar" title={`${row.label}: 완료 ${row.done}개, 대기 ${row.pending}개`}>
                <i className="pending" style={{ height: `${row.pendingHeight}%` }} />
                <i className="done" style={{ height: `${row.doneHeight}%` }} />
              </div>
              <strong>{row.done}/{row.total}</strong>
              <span>{row.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="reward-summary-grid">
        <article>
          <TrendingUp size={20} />
          <strong>{rewardPoints}P</strong>
          <span>자동 적립 포인트</span>
        </article>
        <article>
          <Check size={20} />
          <strong>+10P</strong>
          <span>작업 1개 완료 보상</span>
        </article>
      </section>

      <section className="preset-card">
        <h2>청소 프리셋</h2>
        {presets.map((preset, index) => (
          <button className="preset-row" key={preset} onClick={() => onAddPreset(preset)}>
            <Check size={16} />
            <span>{preset}</span>
            <small>{index + 1}주 후</small>
          </button>
        ))}
      </section>
    </section>
  );
}
