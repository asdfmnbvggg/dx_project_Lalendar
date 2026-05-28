import { useState } from "react";
import { CloudSun, Cpu, MapPin, Plus, Wifi } from "lucide-react";
import { applianceLogs, appliances, communityTips, personalScheduleRules, rooms, smartRecommendations, weatherIndicators } from "../data.js";

const todayModes = [
  { id: "smart", label: "AI 루틴" },
  { id: "appliances", label: "가전" },
  { id: "community", label: "팁" },
];

export default function TodayPage({ openComposer, onOpenPanel }) {
  const [mode, setMode] = useState("smart");

  return (
    <section className="page today-page">
      <section className="today-overview">
        <article className="weather-card">
          <div>
            <MapPin size={18} />
            서울 강남구
          </div>
          <strong>실내 목표 {weatherIndicators.indoorTarget}</strong>
          <p>
            기온 {weatherIndicators.temperature} · 일교차 {weatherIndicators.dailyRange} · 습도 {weatherIndicators.humidity} · {weatherIndicators.rain}
          </p>
        </article>
        <article className="thinq-card">
          <div>
            <Wifi size={18} />
            ThinQ 자동 연동
          </div>
          <strong>5개 가전 연결됨</strong>
          <p>세탁기, 냉장고, 공기청정기 상태 수집 중</p>
        </article>
      </section>

      <nav className="today-tabs" aria-label="오늘 화면 보기">
        {todayModes.map((item) => (
          <button key={item.id} className={mode === item.id ? "active" : ""} onClick={() => setMode(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>

      {mode === "smart" && (
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
              <button className="recommend-card" key={item.title} onClick={() => onOpenPanel({ type: "recommendation", recommendation: item })}>
                <CloudSun size={22} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.reason}</p>
                </div>
                <span>{item.action}</span>
              </button>
            ))}
          </div>
          <div className="metric-grid">
            {personalScheduleRules.map((item) => (
              <article className="metric-card" key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.repeat}</span>
                <small>{item.returnHome}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      {mode === "appliances" && (
        <>
          <section className="appliance-section">
            <div className="section-head">
              <h2>가전 사용 캘린더</h2>
              <button onClick={() => onOpenPanel({ type: "appliances" })}>전체 보기</button>
            </div>
            <div className="appliance-row">
              {appliances.map((item) => (
                <button className={`appliance-card ${item.accent}`} key={item.id} onClick={() => onOpenPanel({ type: "appliance", appliance: item })}>
                  <span>{item.name.slice(0, 1)}</span>
                  <strong>{item.name}</strong>
                  <p>{item.state}</p>
                  <small>{item.signal}</small>
                </button>
              ))}
            </div>
            <div className="metric-grid appliance-log-grid">
              {applianceLogs.map((item) => (
                <article className="metric-card" key={item.id}>
                  <strong>{item.label}</strong>
                  <span>일간 {item.dailyRuntime}</span>
                  <small>주간 {item.weeklyRuns}회</small>
                </article>
              ))}
            </div>
          </section>

          <section className="room-section">
            <div className="section-head">
              <h2>방별 상태</h2>
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
        </>
      )}

      {mode === "community" && (
        <section className="community-section">
          <div className="section-head">
            <h2>위치 기반 집안일 팁</h2>
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
      )}
    </section>
  );
}
