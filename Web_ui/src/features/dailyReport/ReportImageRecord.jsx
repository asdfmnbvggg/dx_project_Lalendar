export default function ReportImageRecord({ records = [] }) {
  return (
    <section className="daily-report-section daily-report-album" aria-labelledby="daily-report-album-title">
      <div className="daily-report-section-head">
        <div>
          <span>AI IMAGE RECORD</span>
          <h2 id="daily-report-album-title">AI 이미지 기록</h2>
        </div>
        <small>같은 날짜의 리포트와 자동 연결</small>
      </div>
      <div className="daily-report-records">
        {records.map((record) => (
          <article key={record.id} className={record.isToday ? "today" : ""}>
            <div>
              <img src={record.imageUrl} alt={`${record.date} ${record.title}`} />
              {record.isToday && <span>NEW</span>}
            </div>
            <strong>{record.date}</strong>
            <p>{record.title}</p>
          </article>
        ))}
      </div>
      <p className="daily-report-saved-note">오늘의 한 장이 AI 이미지 기록에 자동으로 저장되었어요.</p>
    </section>
  );
}
