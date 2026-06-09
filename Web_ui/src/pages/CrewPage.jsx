import { members } from "../data.js";
import FamilySchedulePage from "../components/familySchedule/FamilySchedulePage.jsx";

export default function CrewPage({
  tasks,
  scopedTasks,
  selectedDate,
  setSelectedDate,
  selectedMember,
  memberColors,
  setSelectedMember,
}) {
  const selectedDateLabel = formatDateLabel(selectedDate);

  return (
    <section className="page crew-page">
      <section className="crew-switcher" aria-label="멤버 선택">
        <div className="crew-switcher-title">
          <div className="crew-switcher-heading">
            <p>오늘 담당 현황</p>
            <small className="crew-date">{selectedDateLabel}</small>
        </div>
        <div className="crew-chip-list">
          {members.slice(1).map((member) => {
              const memberTasks = tasks.filter((task) => task.owner === member.id && task.date === selectedDate);

              return (
                <button
                  key={member.id}
                  type="button"
                  className="status-only"
                  style={{ "--member-color": memberColors[member.id] }}
                  aria-label={`${member.name} 담당 현황`}
                >
                  <span className="member-avatar" style={{ background: memberColors[member.id] }}>
                    {member.short}
                  </span>
                  <div>
                    <strong>{member.name}</strong>
                    <small>
                      {selectedDateLabel} · {memberTasks.length}개
                    </small>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <FamilySchedulePage
        tasks={tasks}
        selectedDate={selectedDate}
        members={members}
        memberColors={memberColors}
        selectedMember={selectedMember}
        onSelectedDateChange={setSelectedDate}
        onSelectedMemberChange={setSelectedMember}
      />
    </section>
  );
}

function formatDateLabel(date) {
  return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
}
