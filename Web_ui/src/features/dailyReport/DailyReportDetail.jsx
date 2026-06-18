import { ArrowLeft, CalendarDays, CheckCircle2, CloudSun, Image, ListTodo, Sparkles, WashingMachine } from "lucide-react";
import { useRef } from "react";
import ReportImageRecord from "./ReportImageRecord.jsx";

export default function DailyReportDetail({ report, onBack, onOpenSchedule, onOpenTodo }) {
  const albumRef = useRef(null);
  const completedRatio = report.totalTodoCount > 0 ? `${report.completedCount}/${report.totalTodoCount}` : "0/0";

  return (
    <section className="daily-report-detail-page">
      <header className="daily-report-detail-header">
        <button type="button" onClick={onBack} aria-label="데일리 리포트 닫기"><ArrowLeft size={22} /></button>
        <div>
          <span>HOMECARE STORY</span>
          <h1>Daily <em>AI</em> Report</h1>
          <p>{report.date} {report.dayLabel}</p>
        </div>
      </header>

      <main className="daily-report-detail-content">
        <section className="daily-report-hero">
          <div className="daily-report-hero-copy">
            <span><Sparkles size={15} /> 오늘의 한 장</span>
            <h2>{report.title}</h2>
            <p>{report.subtitle}</p>
            <small>{report.summary}</small>
            <div>{report.tags.map((tag) => <b key={tag}>{tag}</b>)}</div>
          </div>
          <div className="daily-report-hero-image">
            <img src={report.heroImageUrl} alt={`${report.date} 오늘의 한 장`} />
          </div>
        </section>

        <section className="daily-report-character-note">
          <img src={report.characterImageUrl} alt="리포트를 안내하는 플래니 캐릭터" />
          <div>
            <span>Planie’s note</span>
            <p>오늘 일정과 가사일을 바탕으로 리포트를 정리했어요.</p>
          </div>
        </section>

        <div className="daily-report-summary-grid">
          <ReportListCard icon={<CalendarDays />} title="오늘 일정 요약" items={report.scheduleItems} emptyText="등록된 개인 일정이 없어요." />
          <ReportListCard icon={<WashingMachine />} title="가사일 · 가전 일정" items={report.applianceItems} emptyText="예정된 가전 작업이 없어요." />
          <article className="daily-report-info-card weather">
            <CloudSun />
            <div><span>날씨 기반 안내</span><p>{report.weatherNote}</p></div>
          </article>
          <article className="daily-report-info-card progress">
            <CheckCircle2 />
            <div>
              <span>To-do 진행 상황</span>
              <strong>{completedRatio} 완료</strong>
              <p>{report.totalTodoCount ? `오늘 할 일 ${report.totalTodoCount}개 중 ${report.completedCount}개를 완료했어요.` : "오늘 등록된 To-do가 없어요."}</p>
            </div>
          </article>
        </div>

        <ReportImageRecord records={report.imageRecords} sectionRef={albumRef} />

        <section className="daily-report-bottom-actions" aria-label="리포트 바로가기">
          <button type="button" onClick={() => albumRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><Image size={18} />앨범에서 보기</button>
          <button type="button" onClick={onOpenSchedule}><CalendarDays size={18} />일정 확인하기</button>
          <button type="button" onClick={onOpenTodo}><ListTodo size={18} />To-do 보기</button>
        </section>
      </main>
    </section>
  );
}

function ReportListCard({ icon, title, items, emptyText }) {
  return (
    <article className="daily-report-list-card">
      <div className="daily-report-list-title">{icon}<h2>{title}</h2></div>
      {items.length > 0 ? (
        <ul>
          {items.slice(0, 4).map((item) => (
            <li key={item.id}>
              <time>{item.time}</time>
              <span>{item.title}</span>
              {item.done && <CheckCircle2 size={16} aria-label="완료" />}
            </li>
          ))}
        </ul>
      ) : <p className="daily-report-empty">{emptyText}</p>}
    </article>
  );
}

