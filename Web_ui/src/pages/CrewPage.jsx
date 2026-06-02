import { members } from "../data.js";
import FamilySchedulePage from "../components/familySchedule/FamilySchedulePage.jsx";

const text = {
  statusTitle: "오늘 담당자 현황",
  month: "월",
  day: "일",
  count: "개",
};

export default function CrewPage({
  tasks,
  scopedTasks,
  selectedDate,
  selectedMember,
  memberColors,
  setSelectedMember,
}) {
  const selected = members.find((member) => member.id === selectedMember && member.id !== "all") || members[1];
  const selectedDateLabel = `${Number(selectedDate.slice(5, 7))}${text.month} ${Number(selectedDate.slice(8, 10))}${text.day}`;

  return (
    <section className="page crew-page">
      <section className="crew-switcher">
        <div className="crew-switcher-title">
          <p>{text.statusTitle}</p>
          <small className="crew-date">{selectedDateLabel}</small>
        </div>
        {members.slice(1).map((member) => {
          const memberTasks = scopedTasks.filter((task) => task.owner === member.id && task.date === selectedDate);

          return (
            <button
              key={member.id}
              className={selected.id === member.id ? "active" : ""}
              onClick={() => setSelectedMember(member.id)}
              style={{ "--member-color": memberColors[member.id] }}
            >
              <span className="member-avatar" style={{ background: memberColors[member.id] }}>
                {member.short}
              </span>
              <div>
                <strong>{member.name}</strong>
                <small>
                  {selectedDateLabel} · {memberTasks.length}
                  {text.count}
                </small>
              </div>
            </button>
          );
        })}
      </section>

      <FamilySchedulePage
        tasks={tasks}
        selectedDate={selectedDate}
        members={members}
        selectedMember={selected.id}
        onSelectedMemberChange={setSelectedMember}
      />
    </section>
  );
}
