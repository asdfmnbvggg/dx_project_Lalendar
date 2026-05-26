import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gift,
  Home,
  Menu,
  MoreHorizontal,
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
  { id: "all", name: "전체", short: "All" },
  { id: "me", name: "Charlotte", short: "C" },
  { id: "minsu", name: "Minsu", short: "M" },
  { id: "theresa", name: "Theresa", short: "T" },
];

const initialTasks = [
  { id: 1, date: "2026-05-02", title: "분리수거", place: "현관", tag: "house", owner: "all", done: true, point: 8 },
  { id: 2, date: "2026-05-05", title: "냉장고 정리", place: "주방", tag: "house", owner: "minsu", done: true, point: 16 },
  { id: 3, date: "2026-05-08", title: "여행 계획", place: "공유", tag: "plan", owner: "me", done: false, point: 10 },
  { id: 4, date: "2026-05-10", title: "욕실 청소", place: "욕실", tag: "house", owner: "theresa", done: true, point: 14 },
  { id: 5, date: "2026-05-13", title: "침구 교체", place: "침실", tag: "house", owner: "me", done: true, point: 13 },
  { id: 6, date: "2026-05-16", title: "장보기", place: "주방", tag: "share", owner: "minsu", done: false, point: 9 },
  { id: 7, date: "2026-05-18", title: "싱크대 청소", place: "주방", tag: "house", owner: "me", done: true, point: 12 },
  { id: 8, date: "2026-05-21", title: "거실 바닥 닦기", place: "거실", tag: "house", owner: "all", done: false, point: 11 },
  { id: 9, date: "2026-05-22", title: "필라테스", place: "운동", tag: "routine", owner: "me", done: true, point: 8 },
  { id: 10, date: "2026-05-24", title: "책상 정리", place: "작업방", tag: "plan", owner: "theresa", done: false, point: 7 },
  { id: 11, date: "2026-05-26", title: "오늘 집안일 확인", place: "전체", tag: "share", owner: "all", done: true, point: 5 },
  { id: 12, date: "2026-05-26", title: "싱크대 청소", place: "주방", tag: "house", owner: "me", done: true, point: 12 },
  { id: 13, date: "2026-05-26", title: "거울 얼룩 닦기", place: "욕실", tag: "house", owner: "minsu", done: false, point: 9 },
  { id: 14, date: "2026-05-26", title: "빨래 개기", place: "세탁실", tag: "house", owner: "theresa", done: false, point: 10 },
  { id: 15, date: "2026-05-28", title: "보상 스탬프 받기", place: "보상", tag: "reward", owner: "me", done: false, point: 20 },
  { id: 16, date: "2026-05-30", title: "월말 대청소", place: "전체", tag: "house", owner: "all", done: false, point: 30 },
];

const navItems = [
  { id: "today", label: "오늘", icon: Home },
  { id: "calendar", label: "캘린더", icon: CalendarDays },
  { id: "crew", label: "멤버", icon: UsersRound },
  { id: "reward", label: "보상", icon: Trophy },
];

const tagLabel = {
  house: "집안일",
  plan: "계획",
  routine: "루틴",
  share: "공유",
  reward: "보상",
};

function dateKey(day) {
  return `2026-05-${String(day).padStart(2, "0")}`;
}

function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedDate, setSelectedDate] = useState("2026-05-26");
  const [selectedMember, setSelectedMember] = useState("all");
  const [activeNav, setActiveNav] = useState("calendar");
  const [query, setQuery] = useState("");

  const month = useMemo(() => Array.from({ length: 31 }, (_, index) => dateKey(index + 1)), []);
  const visibleTasks = tasks.filter((task) => selectedMember === "all" || task.owner === selectedMember);
  const selectedTasks = visibleTasks
    .filter((task) => task.date === selectedDate)
    .filter((task) => `${task.title} ${task.place} ${tagLabel[task.tag]}`.includes(query));
  const completedCount = visibleTasks.filter((task) => task.done).length;
  const completion = Math.round((completedCount / visibleTasks.length) * 100);
  const pointSum = tasks.filter((task) => task.done).reduce((sum, task) => sum + task.point, 0);
  const selectedDay = Number(selectedDate.slice(-2));

  const taskMap = useMemo(() => {
    return visibleTasks.reduce((map, task) => {
      map[task.date] = [...(map[task.date] || []), task];
      return map;
    }, {});
  }, [visibleTasks]);

  function toggleTask(id) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  function addTask() {
    const owner = selectedMember === "all" ? "me" : selectedMember;
    setTasks((current) => [
      {
        id: Date.now(),
        date: selectedDate,
        title: "새 작업",
        place: "우리 집",
        tag: "house",
        owner,
        done: false,
        point: 6,
      },
      ...current,
    ]);
  }

  function changeNav(id) {
    setActiveNav(id);
    if (id === "today") {
      setSelectedDate("2026-05-26");
    }
  }

  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">L</span>
          <div>
            <strong>Lalendar</strong>
            <small>shared routine calendar</small>
          </div>
        </div>

        <nav className="side-nav" aria-label="앱 메뉴">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={activeNav === id ? "active" : ""}
              onClick={() => changeNav(id)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>

        <section className="mini-card">
          <span className="mini-kicker">이번 주</span>
          <strong>{completion}%</strong>
          <p>완료율</p>
          <div className="progress-track">
            <i style={{ width: `${completion}%` }} />
          </div>
        </section>
      </aside>

      <section className="main-view">
        <header className="app-header">
          <div>
            <span className="eyebrow">2026 May</span>
            <h1>캘린더에서 오늘 할 일을 바로 관리하세요</h1>
          </div>
          <div className="header-actions">
            <label className="search-field">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="작업 검색"
              />
            </label>
            <button className="icon-button" aria-label="알림">
              <Bell size={19} />
            </button>
            <button className="icon-button mobile-menu" aria-label="메뉴">
              <Menu size={20} />
            </button>
          </div>
        </header>

        <section className="summary-grid">
          <SummaryCard icon={Flame} label="오늘 작업" value={`${selectedTasks.length}개`} caption={`${selectedDay}일 기준`} />
          <SummaryCard icon={Check} label="완료" value={`${selectedTasks.filter((task) => task.done).length}개`} caption="체크한 작업" />
          <SummaryCard icon={Gift} label="포인트" value={pointSum} caption="누적 보상" />
        </section>

        <section className="member-row" aria-label="멤버 필터">
          {members.map((member) => (
            <button
              key={member.id}
              className={selectedMember === member.id ? "active" : ""}
              onClick={() => setSelectedMember(member.id)}
            >
              <span>{member.short}</span>
              {member.name}
            </button>
          ))}
        </section>

        <section className="content-grid">
          <section className="calendar-card">
            <div className="card-head">
              <div>
                <span>월간 캘린더</span>
                <h2>2026. 05</h2>
              </div>
              <div className="month-actions">
                <button aria-label="이전 달">
                  <ChevronLeft size={18} />
                </button>
                <button aria-label="다음 달">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="weekdays">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="month-grid">
              {Array.from({ length: 5 }).map((_, index) => (
                <span className="blank-day" key={index} />
              ))}
              {month.map((key) => {
                const dayTasks = taskMap[key] || [];
                const done = dayTasks.filter((task) => task.done).length;
                const day = Number(key.slice(-2));
                return (
                  <button
                    key={key}
                    className={`date-cell ${selectedDate === key ? "selected" : ""} ${key === "2026-05-26" ? "today" : ""}`}
                    onClick={() => setSelectedDate(key)}
                  >
                    <span className="date-number">{day}</span>
                    <div className="date-events">
                      {dayTasks.slice(0, 2).map((task) => (
                        <i className={task.tag} key={task.id}>
                          {task.title}
                        </i>
                      ))}
                    </div>
                    {dayTasks.length > 0 && (
                      <small>
                        {done}/{dayTasks.length}
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="agenda-card">
            <div className="card-head">
              <div>
                <span>{selectedDay}일 일정</span>
                <h2>{selectedTasks.length}개 작업</h2>
              </div>
              <button className="add-button" onClick={addTask}>
                <Plus size={19} />
                추가
              </button>
            </div>

            <div className="agenda-list">
              {selectedTasks.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={toggleTask} />
              ))}
              {selectedTasks.length === 0 && (
                <div className="empty-state">
                  <Sparkles size={24} />
                  <strong>이 날은 비어 있어요</strong>
                  <p>오른쪽 위 추가 버튼으로 작업을 만들 수 있어요.</p>
                </div>
              )}
            </div>
          </aside>
        </section>
      </section>

      <nav className="mobile-tabbar" aria-label="모바일 하단 메뉴">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={activeNav === id ? "active" : ""}
            onClick={() => changeNav(id)}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

function SummaryCard({ icon: Icon, label, value, caption }) {
  return (
    <article className="summary-card">
      <span>
        <Icon size={18} />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </article>
  );
}

function TaskItem({ task, onToggle }) {
  const owner = members.find((member) => member.id === task.owner) || members[0];

  return (
    <article className={`task-item ${task.done ? "done" : ""}`}>
      <button className="check-button" onClick={() => onToggle(task.id)} aria-label="완료 전환">
        {task.done && <Check size={16} />}
      </button>
      <div className="task-copy">
        <div>
          <h3>{task.title}</h3>
          <span className={`tag ${task.tag}`}>{tagLabel[task.tag]}</span>
        </div>
        <p>{task.place} · 담당 {owner.name}</p>
      </div>
      <button className="more-button" aria-label="더 보기">
        <MoreHorizontal size={18} />
      </button>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
