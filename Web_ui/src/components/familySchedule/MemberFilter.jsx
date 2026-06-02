export default function MemberFilter({ value, onChange, members }) {
  return (
    <div className="family-member-filter-wrap">
      <p>일정 보기 필터</p>
      <div className="family-member-filter" aria-label="일정 보기 필터">
        {members.map((member) => (
          <button key={member.id} type="button" className={value === member.id ? "active" : ""} onClick={() => onChange(member.id)}>
            {member.id === "all" ? "전체" : member.name}
          </button>
        ))}
      </div>
    </div>
  );
}
