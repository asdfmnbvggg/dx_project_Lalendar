export default function DailyReportCard({ report, loading = false, onOpen }) {
  return (
    <button className="calendar-ai-report daily-report-preview" type="button" aria-label="AI 데일리 리포트 상세 보기" onClick={onOpen}>
      <h3>Daily AI Report</h3>
      <div>
        <p aria-busy={loading}>{report.cardText}</p>
        <img src={report.heroImageUrl} alt="" aria-hidden="true" />
        <div className="calendar-ai-report-tags" aria-hidden="true">
          {report.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>
    </button>
  );
}
