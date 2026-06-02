import { MEMBER_FILTERS } from "./scheduleConstants.js";

export default function MemberFilter({ value, onChange }) {
  return (
    <div className="family-member-filter" aria-label="가족 구성원 필터">
      {MEMBER_FILTERS.map((member) => (
        <button key={member} type="button" className={value === member ? "active" : ""} onClick={() => onChange(member)}>
          {member}
        </button>
      ))}
    </div>
  );
}
