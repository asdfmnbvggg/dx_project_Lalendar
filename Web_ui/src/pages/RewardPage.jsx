import { Check, Sparkles } from "lucide-react";
import { presets } from "../data.js";

export default function RewardPage({ tasks, completion, onAddPreset }) {
  const doneCount = tasks.filter((task) => task.done).length;
  return (
    <section className="page">
      <div className="reward-hero">
        <Sparkles size={34} />
        <h1>보상 받기</h1>
        <p>꾸준한 청소에 보상</p>
        <strong>Speedster</strong>
        <span>오늘 {doneCount}개 작업 완료</span>
      </div>

      <section className="stats-card">
        <div>
          <p>작업 완료율</p>
          <h2>{completion}%</h2>
        </div>
        <div className="bar-chart">
          {[38, 66, 94, 42, 78, 63, 88].map((height, index) => (
            <i key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
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
