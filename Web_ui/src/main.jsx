import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Flame,
  Gift,
  Home,
  Menu,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import "./styles.css";

const members = [
  { id: "me", name: "Charlotte", short: "C", color: "hot" },
  { id: "minsu", name: "Minsu.kim", short: "M", color: "berry" },
  { id: "theresa", name: "Theresa", short: "T", color: "plum" },
  { id: "home", name: "우리 집", short: "집", color: "dark" },
];

const seedTasks = [
  { id: 1, date: "2026-05-02", title: "분리수거", room: "현관", category: "집안일", assignee: "home", done: true, repeat: "매주", points: 12 },
  { id: 2, date: "2026-05-05", title: "냉장고 정리", room: "주방", category: "집안일", assignee: "minsu", done: true, repeat: "2주마다", points: 18 },
  { id: 3, date: "2026-05-08", title: "여행 계획", room: "공유", category: "개인", assignee: "me", done: false, repeat: "없음", points: 8 },
  { id: 4, date: "2026-05-10", title: "욕실 청소", room: "욕실", category: "집안일", assignee: "theresa", done: true, repeat: "매주", points: 15 },
  { id: 5, date: "2026-05-13", title: "침구 교체", room: "침실", category: "집안일", assignee: "me", done: true, repeat: "2주마다", points: 14 },
  { id: 6, date: "2026-05-16", title: "장보기", room: "주방", category: "공유", assignee: "minsu", done: false, repeat: "매주", points: 10 },
  { id: 7, date: "2026-05-18", title: "싱크대 청소", room: "주방", category: "집안일", assignee: "me", done: true, repeat: "매주", points: 13 },
  { id: 8, date: "2026-05-21", title: "거실 바닥 닦기", room: "거실", category: "집안일", assignee: "home", done: false, repeat: "매주", points: 11 },
  { id: 9, date: "2026-05-22", title: "필라테스", room: "운동", category: "루틴", assignee: "me", done: true, repeat: "월수금", points: 9 },
  { id: 10, date: "2026-05-24", title: "책상 정리", room: "작업방", category: "개인", assignee: "theresa", done: false, repeat: "없음", points: 7 },
  { id: 11, date: "2026-05-26", title: "오늘 집안일 확인", room: "전체", category: "공유", assignee: "home", done: true, repeat: "매일", points: 5 },
  { id: 12, date: "2026-05-26", title: "싱크대 청소", room: "주방", category: "집안일", assignee: "me", done: true, repeat: "매주", points: 13 },
  { id: 13, date: "2026-05-26", title: "거울 얼룩 닦기", room: "욕실", category: "집안일", assignee: "minsu", done: false, repeat: "매주", points: 9 },
  { id: 14, date: "2026-05-26", title: "빨래 개기", room: "세탁실", category: "집안일", assignee: "theresa", done: false, repeat: "3일마다", points: 10 },
  { id: 15, date: "2026-05-28", title: "보상 스탬프 받기", room: "보상", category: "보상", assignee: "me", done: false, repeat: "주간", points: 20 },
  { id: 16, date: "2026-05-30", title: "대청소", room: "전체", category: "집안일", assignee: "home", done: false, repeat: "월말", points: 30 },
];

const navItems = [
  { id: "home", label: "홈", icon: Home },
  { id: "calendar", label: "캘린더", icon: CalendarDays },
  { id: "alert", label: "알림", icon: Bell },
  { id: "reward", label: "보상", icon: Gift },
  { id: "profile", label: "내 정보", icon: UserRound },
];

const categoryTone = {
  집안일: "rose",
  개인: "violet",
  공유: "dark",
  루틴: "orange",
  보상: "gold",
};

function toKey(day) {
  return `2026-05-${String(day).padStart(2, "0")}`;
}

function buildMonthDays() {
  const days = [];
  for (let day = 1; day <= 31; day += 1) {
    days.push({ day, key: toKey(day), muted: false });
  }
  return days;
}

function App() {
  const [tasks, setTasks] = useState(seedTasks);
  const [selectedDate, setSelectedDate] = useState("2026-05-26");
  const [selectedMember, setSelectedMember] = useState("home");
  const [activeTab, setActiveTab] = useState("calendar");
  const [query, setQuery] = useState("");

  const monthDays = useMemo(buildMonthDays, []);
  const tasksByDate = useMemo(() => {
    return tasks.reduce((acc, task) => {
      acc[task.date] = [...(acc[task.date] || []), task];
      return acc;
    }, {});
  }, [tasks]);

  const scopedTasks = useMemo(() => {
    return tasks.filter((task) => selectedMember === "home" || task.assignee === selectedMember);
  }, [tasks, selectedMember]);

  const selectedTasks = scopedTasks
    .filter((task) => task.date === selectedDate)
    .filter((task) => task.title.includes(query) || task.room.includes(query) || task.category.includes(query));

  const completed = scopedTasks.filter((task) => task.done).length;
  const completion = Math.round((completed / scopedTasks.length) * 100);
  const selectedDay = Number(selectedDate.slice(-2));
  const totalPoints = tasks.filter((task) => task.done).reduce((sum, task) => sum + task.points, 0);

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  function addQuickTask() {
    const nextTask = {
      id: Date.now(),
      date: selectedDate,
      title: "새 집안일",
      room: "우리 집",
      category: "집안일",
      assignee: selectedMember === "home" ? "me" : selectedMember,
      done: false,
      repeat: "오늘",
      points: 6,
    };
    setTasks((current) => [nextTask, ...current]);
  }

  return (
    <main className="shell">
      <section className="phone" aria-label="Lalendar 앱">
        <div className="dynamic-island" />
        <div className="app">
          <header className="topbar">
            <div>
              <p className="kicker">LALENDAR</p>
              <h1>우리 집 캘린더</h1>
            </div>
            <div className="top-actions">
              <button className="glass-button" aria-label="검색">
                <Search size={19} />
              </button>
              <button className="glass-button" aria-label="메뉴">
                <Menu size={20} />
              </button>
            </div>
          </header>

          <section className="hero-panel">
            <div>
              <span className="live-badge">
                <Flame size={14} />
                {completion}% 완료
              </span>
              <h2>오늘은 {selectedDay}일, 같이 끝내면 더 빨라요.</h2>
            </div>
            <div className="score-orbit">
              <Sparkles size={20} />
              <strong>{totalPoints}</strong>
              <span>pt</span>
            </div>
          </section>

          <nav className="member-strip" aria-label="멤버 필터">
            {members.map((member) => (
              <button
                key={member.id}
                className={`member-chip ${selectedMember === member.id ? "active" : ""}`}
                onClick={() => setSelectedMember(member.id)}
              >
                <span className={`member-avatar ${member.color}`}>{member.short}</span>
                {member.name}
              </button>
            ))}
          </nav>

          {activeTab === "calendar" && (
            <>
              <section className="calendar-panel">
                <div className="section-head">
                  <div>
                    <span>월간 일정</span>
                    <h3>
                      2026. 05 <ChevronDown size={18} />
                    </h3>
                  </div>
                  <button className="primary-icon" onClick={addQuickTask} aria-label="새 작업 추가">
                    <Plus size={22} />
                  </button>
                </div>

                <div className="weekdays" aria-hidden="true">
                  {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="calendar-grid">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div className="empty-day" key={`empty-${index}`} />
                  ))}
                  {monthDays.map(({ day, key }) => {
                    const dayTasks = tasksByDate[key] || [];
                    const visibleTasks = dayTasks.filter(
                      (task) => selectedMember === "home" || task.assignee === selectedMember,
                    );
                    return (
                      <button
                        key={key}
                        className={`day-cell ${selectedDate === key ? "selected" : ""} ${key === "2026-05-26" ? "today" : ""}`}
                        onClick={() => setSelectedDate(key)}
                      >
                        <span>{day}</span>
                        <div className="day-dots">
                          {visibleTasks.slice(0, 3).map((task) => (
                            <i className={categoryTone[task.category]} key={task.id} />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="task-panel">
                <div className="section-head compact">
                  <div>
                    <span>{selectedDay}일 할 일</span>
                    <h3>{selectedTasks.length}개 작업</h3>
                  </div>
                  <button className="filter-button" aria-label="필터">
                    <Settings2 size={17} />
                    정렬
                  </button>
                </div>

                <label className="search-box">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="작업, 방, 카테고리 검색"
                  />
                </label>

                <div className="task-list">
                  {selectedTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onToggle={toggleTask} />
                  ))}
                  {selectedTasks.length === 0 && (
                    <div className="empty-state">
                      <Sparkles size={24} />
                      <strong>이 날은 비어 있어요</strong>
                      <span>새 작업을 추가해서 루틴을 만들어보세요.</span>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {activeTab !== "calendar" && (
            <FeatureView tab={activeTab} completion={completion} totalPoints={totalPoints} />
          )}
        </div>

        <nav className="bottom-nav" aria-label="하단 탭">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-button ${activeTab === id ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
              aria-label={label}
            >
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}

function TaskCard({ task, onToggle }) {
  const assignee = members.find((member) => member.id === task.assignee) || members[0];

  return (
    <article className={`task-card ${task.done ? "done" : ""}`}>
      <button className="task-check" onClick={() => onToggle(task.id)} aria-label={`${task.title} 완료 전환`}>
        {task.done && <Check size={17} />}
      </button>
      <div className="task-body">
        <div className="task-title-row">
          <h4>{task.title}</h4>
          <span className={`category ${categoryTone[task.category]}`}>{task.category}</span>
        </div>
        <p>
          {task.room} · {task.repeat}
        </p>
      </div>
      <div className="task-meta">
        <span className={`mini-avatar ${assignee.color}`}>{assignee.short}</span>
        <b>+{task.points}</b>
      </div>
    </article>
  );
}

function FeatureView({ tab, completion, totalPoints }) {
  const copy = {
    home: {
      icon: Home,
      title: "오늘의 흐름",
      text: "캘린더에서 오늘 작업을 고르고, 진행률과 포인트를 바로 확인하세요.",
      stat: `${completion}%`,
      label: "완료율",
    },
    alert: {
      icon: Bell,
      title: "딱 맞는 알림",
      text: "청소 전, 마감 전, 가족 미완료 작업을 상황별로 알려주는 알림 화면입니다.",
      stat: "3",
      label: "예정 알림",
    },
    reward: {
      icon: Trophy,
      title: "꾸준함 보상",
      text: "완료한 작업은 포인트로 쌓이고 주간 보상 카드로 이어집니다.",
      stat: totalPoints,
      label: "누적 포인트",
    },
    profile: {
      icon: UsersRound,
      title: "함께 쓰는 집",
      text: "가족, 룸메이트, 반려 루틴까지 멤버별 책임과 기여도를 나눠서 봅니다.",
      stat: "4",
      label: "멤버",
    },
  }[tab];

  const Icon = copy.icon;

  return (
    <section className="feature-view">
      <div className="feature-icon">
        <Icon size={30} />
      </div>
      <h2>{copy.title}</h2>
      <p>{copy.text}</p>
      <div className="feature-card">
        <span>{copy.label}</span>
        <strong>{copy.stat}</strong>
        <div className="feature-bars">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <button className="wide-action">
        <Clock3 size={18} />
        오늘 캘린더로 돌아가기
      </button>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
