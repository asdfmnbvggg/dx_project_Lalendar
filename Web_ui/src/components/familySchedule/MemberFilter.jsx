export default function MemberFilter({ value, onChange, members }) {
  const visibleMembers = members.filter((member) => member.id !== "all");

  return (
    <div className="family-member-filter-wrap">
      <p>일정 보기 필터</p>
      <div className="family-member-filter" aria-label="일정 보기 필터">
        {visibleMembers.map((member) => (
          <button key={member.id} type="button" className={value === member.id ? "active" : ""} onClick={() => onChange(member.id)}>
            {member.name}
          </button>
        ))}
      </div>
    </div>
  );
}
