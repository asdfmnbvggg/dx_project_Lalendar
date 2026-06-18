import { ChevronRight, Sparkles } from "lucide-react";

export default function DailyReportCard({ report, loading = false, onOpen }) {
  return (
    <button className="calendar-ai-report daily-report-preview" type="button" aria-label="AI 데일리 리포트 상세 보기" onClick={onOpen}>
      <h3>Daily AI Report</h3>
      <div className="daily-report-preview-body">
        <div className="daily-report-preview-copy">
          <span className="daily-report-preview-kicker"><Sparkles size={13} /> 오늘의 한 장 · {report.date}</span>
          <strong>{report.title}</strong>
          <p aria-busy={loading}>{report.subtitle || report.summary}</p>
          <div className="calendar-ai-report-tags" aria-hidden="true">
            {report.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>
        <img src={report.heroImageUrl} alt={`${report.date} 오늘의 한 장`} />
        <ChevronRight className="daily-report-preview-arrow" size={18} aria-hidden="true" />
      </div>
    </button>
  );
}
