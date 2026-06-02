export default function ScheduleBlock({ schedule, layout, memberName, onClick }) {
  return (
    <button
      type="button"
      className={`schedule-block ${schedule.source === "task" ? "task-derived" : ""}`}
      style={{
        "--schedule-color": schedule.color,
        "--schedule-bg": hexToRgba(schedule.color, 0.13),
        "--schedule-top": `${layout.top}px`,
        "--schedule-height": `${layout.height}px`,
        left: `${layout.left}%`,
        width: `${layout.width}%`,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick(schedule);
      }}
      title={`${schedule.title} / ${memberName} / ${schedule.location || "장소 없음"}`}
    >
      <strong>{schedule.title}</strong>
      <span>{memberName}</span>
      <small>{schedule.location || "장소 없음"}</small>
      {schedule.reminder && schedule.reminder !== "off" && <em>알림</em>}
    </button>
  );
}

function hexToRgba(hex, alpha) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return "rgba(225, 29, 72, 0.13)";
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
