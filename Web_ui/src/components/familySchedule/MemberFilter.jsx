export default function MemberFilter({ value, onChange, members }) {
  return (
    <div className="family-member-filter" aria-label="가족 구성원 필터">
      {members.map((member) => (
        <button key={member.id} type="button" className={value === member.id ? "active" : ""} onClick={() => onChange(member.id)}>
          {member.name}
        </button>
      ))}
    </div>
  );
}
