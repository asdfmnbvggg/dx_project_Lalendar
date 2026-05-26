import { ChevronRight, CloudSun, Cpu, MapPin, Plus, Wifi } from "lucide-react";
import { appliances, communityTips, rooms, smartRecommendations } from "../data.js";
import TaskItem from "../components/TaskItem.jsx";

export default function TodayPage({ todayTasks, completion, toggleTask, deleteTask, openComposer, onOpenPanel }) {
  return (
    <section className="page">
      <section className="hub-grid">
        <article className="weather-card">
          <div>
            <MapPin size={18} />
            서울 강남구
          </div>
          <strong>빨래하기 좋은 날</strong>
          <p>습도 42% · 강수 10% · 미세먼지 보통</p>
        </article>
        <article className="thinq-card">
          <div>
            <Wifi size={18} />
            ThinQ 자동 연동
          </div>
          <strong>5개 가전 연결됨</strong>
          <p>세탁기, 냉장고, 공기청정기, 로봇청소기 상태 수집 중</p>
        </article>
      </section>

      <section className="recommend-section">
        <div className="section-head">
          <h2>AI 스마트 루틴</h2>
          <button onClick={() => onOpenPanel({ type: "pending" })}>
            <Cpu size={18} />
            자동화 보기
          </button>
        </div>
        <div className="recommend-list">
          {smartRecommendations.map((item) => (
            <button
              className="recommend-card"
              key={item.title}
              onClick={() => onOpenPanel({ type: "recommendation", recommendation: item })}
            >
              <CloudSun size={22} />
              <div>
                <strong>{item.title}</strong>
                <p>{item.reason}</p>
              </div>
              <span>{item.action}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="quick-card stack-card">
        <RowButton title="모든 작업" value="126" onClick={() => onOpenPanel({ type: "allTasks" })} />
        <RowButton title="기록" onClick={() => onOpenPanel({ type: "history" })} />
        <RowButton title="요약" value={`최근 7일 완료율 ${completion}%`} chart onClick={() => onOpenPanel({ type: "summary" })} />
      </section>

      <section className="appliance-section">
        <div className="section-head">
          <h2>가전 사용 캘린더</h2>
          <button onClick={() => onOpenPanel({ type: "appliances" })}>전체 보기</button>
        </div>
        <div className="appliance-row">
          {appliances.map((item) => (
            <button
              className={`appliance-card ${item.accent}`}
              key={item.id}
              onClick={() => onOpenPanel({ type: "appliance", appliance: item })}
            >
              <span>{item.name.slice(0, 1)}</span>
              <strong>{item.name}</strong>
              <p>{item.state}</p>
              <small>{item.signal}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="room-section">
        <div className="section-head">
          <h2>방</h2>
          <button onClick={openComposer}>
            <Plus size={18} />
            추가
          </button>
        </div>
        <div className="room-list">
          {rooms.map((room) => (
            <button className="room-card" key={room.name} onClick={() => onOpenPanel({ type: "room", room: room.name })}>
              <span>{room.icon}</span>
              <strong>{room.name}</strong>
              <small>{room.state}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="community-section">
        <div className="section-head">
          <h2>위치 기반 커뮤니티 팁</h2>
          <button onClick={() => onOpenPanel({ type: "community" })}>더 보기</button>
        </div>
        <div className="community-list">
          {communityTips.map((tip) => (
            <button className="community-card" key={tip.title} onClick={() => onOpenPanel({ type: "tip", tip })}>
              <strong>{tip.title}</strong>
              <p>{tip.source}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="task-sheet">
        <div className="sheet-head">
          <h2>오늘 집안일 {todayTasks.length}개</h2>
          <button onClick={openComposer}>
            <Plus size={18} />
          </button>
        </div>
        {todayTasks.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onOpen={(openedTask) => onOpenPanel({ type: "task", task: openedTask })} />
        ))}
        <button className="wide-create" onClick={openComposer}>
          <Plus size={20} />
          새 작업 만들기
        </button>
      </section>
    </section>
  );
}

function RowButton({ title, value, chart, onClick }) {
  return (
    <button className="row-button" onClick={onClick}>
      <strong>{title}</strong>
      {chart ? (
        <span className="mini-bars">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      ) : (
        <span>{value}</span>
      )}
      <ChevronRight size={18} />
    </button>
  );
}
