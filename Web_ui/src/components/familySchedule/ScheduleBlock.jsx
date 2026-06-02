export default function ScheduleBlock({ schedule, layout, onClick }) {
  return (
    <button
      type="button"
      className={`schedule-block ${schedule.source === "task" ? "task-derived" : ""}`}
      style={{
        "--schedule-color": schedule.color,
        top: `${layout.top}px`,
        height: `${layout.height}px`,
        left: `${layout.left}%`,
        width: `${layout.width}%`,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick(schedule);
      }}
      title={`${schedule.title} / ${schedule.member} / ${schedule.location}`}
    >
      <strong>{schedule.title}</strong>
      <span>{schedule.member}</span>
      <small>{schedule.location || "장소 없음"}</small>
    </button>
  );
}
