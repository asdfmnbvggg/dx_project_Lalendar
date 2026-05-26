import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Gift,
  Home,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import "./styles.css";

const members = [
  { id: "all", name: "우리 집", short: "집", subtitle: "공유 작업 전체" },
  { id: "me", name: "Charlotte", short: "C", subtitle: "이번 주 18개 완료" },
  { id: "minsu", name: "Minsu.kim", short: "M", subtitle: "주방 담당" },
  { id: "theresa", name: "Theresa", short: "T", subtitle: "욕실 로테이션" },
];

const rooms = [
  { name: "거실", icon: "🛋", state: "작업 없음" },
  { name: "주방", icon: "🍽", state: "모두 양호" },
  { name: "욕실", icon: "🛁", state: "오늘 3개" },
  { name: "침실", icon: "🛏", state: "2개 대기" },
];

const presets = ["침대 시트 교체", "방향제 교체", "장식품 청소", "세탁실 정리", "싱크대 청소"];

const initialTasks = [
  { id: 1, date: "2026-05-02", title: "분리수거", place: "현관", tag: "house", owner: "all", done: true, repeat: "매주" },
  { id: 2, date: "2026-05-05", title: "냉장고 정리", place: "주방", tag: "house", owner: "minsu", done: true, repeat: "2주마다" },
  { id: 3, date: "2026-05-08", title: "여행 계획", place: "공유", tag: "plan", owner: "me", done: false, repeat: "없음" },
  { id: 4, date: "2026-05-10", title: "욕실 청소", place: "욕실", tag: "house", owner: "theresa", done: true, repeat: "매주" },
  { id: 5, date: "2026-05-13", title: "침구 교체", place: "침실", tag: "house", owner: "me", done: true, repeat: "2주마다" },
  { id: 6, date: "2026-05-16", title: "장보기", place: "주방", tag: "share", owner: "minsu", done: false, repeat: "매주" },
  { id: 7, date: "2026-05-18", title: "싱크대 청소", place: "주방", tag: "house", owner: "me", done: true, repeat: "매주" },
  { id: 8, date: "2026-05-21", title: "거실 바닥 닦기", place: "거실", tag: "house", owner: "all", done: false, repeat: "매주" },
  { id: 9, date: "2026-05-22", title: "필라테스", place: "운동", tag: "routine", owner: "me", done: true, repeat: "월수금" },
  { id: 10, date: "2026-05-24", title: "책상 정리", place: "작업방", tag: "plan", owner: "theresa", done: false, repeat: "없음" },
  { id: 11, date: "2026-05-26", title: "오늘 집안일 확인", place: "전체", tag: "share", owner: "all", done: true, repeat: "매일" },
  { id: 12, date: "2026-05-26", title: "싱크대 청소", place: "주방", tag: "house", owner: "me", done: true, repeat: "매주" },
  { id: 13, date: "2026-05-26", title: "거울 얼룩 닦기", place: "욕실", tag: "house", owner: "minsu", done: false, repeat: "매주" },
  { id: 14, date: "2026-05-26", title: "빨래 개기", place: "세탁실", tag: "house", owner: "theresa", done: false, repeat: "3일마다" },
  { id: 15, date: "2026-05-28", title: "보상 스탬프 받기", place: "보상", tag: "reward", owner: "me", done: false, repeat: "주간" },
  { id: 16, date: "2026-05-30", title: "월말 대청소", place: "전체", tag: "house", owner: "all", done: false, repeat: "월말" },
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
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState("2026-05-26");
  const [selectedMember, setSelectedMember] = useState("all");
  const [query, setQuery] = useState("");

  const scopedTasks = tasks.filter((task) => selectedMember === "all" || task.owner === selectedMember);
  const todayTasks = scopedTasks.filter((task) => task.date === "2026-05-26");
  const selectedTasks = scopedTasks
    .filter((task) => task.date === selectedDate)
    .filter((task) => `${task.title} ${task.place} ${tagLabel[task.tag]}`.includes(query));
  const completed = scopedTasks.filter((task) => task.done).length;
  const completion = Math.round((completed / scopedTasks.length) * 100);
  const month = useMemo(() => Array.from({ length: 31 }, (_, index) => dateKey(index + 1)), []);
  const tasksByDate = useMemo(() => {
    return scopedTasks.reduce((map, task) => {
      map[task.date] = [...(map[task.date] || []), task];
      return map;
    }, {});
  }, [scopedTasks]);

  function toggleTask(id) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  function addTask() {
    setTasks((current) => [
      {
        id: Date.now(),
        date: selectedDate,
        title: "새 작업",
        place: "우리 집",
        tag: "house",
        owner: selectedMember === "all" ? "me" : selectedMember,
        done: false,
        repeat: "오늘",
      },
      ...current,
    ]);
  }

  const pageProps = {
    tasks,
    scopedTasks,
    todayTasks,
    selectedTasks,
    selectedDate,
    selectedMember,
    setSelectedDate,
    setSelectedMember,
    query,
    setQuery,
    month,
    tasksByDate,
    completion,
    toggleTask,
    addTask,
  };

  return (
    <main className="app-shell">
      <section className="app-frame">
        <header className="topbar">
          <div className="brand">
            <span>L</span>
            <div>
              <strong>Lalendar</strong>
              <small>집안일을 한눈에</small>
            </div>
          </div>
          <button className="icon-button" aria-label="메뉴">
            <Menu size={22} />
          </button>
        </header>

        {activeTab === "today" && <TodayPage {...pageProps} />}
        {activeTab === "calendar" && <CalendarPage {...pageProps} />}
        {activeTab === "crew" && <CrewPage {...pageProps} />}
        {activeTab === "reward" && <RewardPage {...pageProps} />}

        <nav className="tabbar" aria-label="하단 탭">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => setActiveTab(id)}
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

function TodayPage({ todayTasks, completion, toggleTask }) {
  return (
    <section className="page">
      <div className="hero-title">
        <p>오늘의 할 일</p>
        <h1>청소를 한눈에</h1>
        <span>계획. 공유. 간편하게.</span>
      </div>

      <section className="quick-card stack-card">
        <RowButton title="모든 작업" value="126" />
        <RowButton title="기록" />
        <RowButton title="요약" value={`최근 7일 완료율 ${completion}%`} chart />
      </section>

      <section className="room-section">
        <div className="section-head">
          <h2>방</h2>
          <button>
            <Plus size={18} />
            추가
          </button>
        </div>
        <div className="room-list">
          {rooms.map((room) => (
            <article className="room-card" key={room.name}>
              <span>{room.icon}</span>
              <strong>{room.name}</strong>
              <small>{room.state}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="task-sheet">
        <div className="sheet-head">
          <h2>오늘 집안일 {todayTasks.length}개</h2>
          <button>
            <Plus size={18} />
          </button>
        </div>
        {todayTasks.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={toggleTask} />
        ))}
        <button className="wide-create">
          <Plus size={20} />
          새 작업 만들기
        </button>
      </section>
    </section>
  );
}

function CalendarPage({
  month,
  tasksByDate,
  selectedDate,
  setSelectedDate,
  selectedMember,
  setSelectedMember,
  selectedTasks,
  query,
  setQuery,
  toggleTask,
  addTask,
}) {
  return (
    <section className="page calendar-page">
      <div className="profile-strip">
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
      </div>

      <section className="calendar-profile">
        <div className="profile-avatar">C</div>
        <div>
          <h1>Charlotte</h1>
          <p>each task shapes who we become.</p>
        </div>
      </section>

      <section className="calendar-board">
        <div className="calendar-header">
          <h2>2026. 05</h2>
          <button onClick={addTask}>
            <Plus size={18} />
          </button>
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
            const tasks = tasksByDate[key] || [];
            const day = Number(key.slice(-2));
            return (
              <button
                key={key}
                className={`date-cell ${selectedDate === key ? "selected" : ""}`}
                onClick={() => setSelectedDate(key)}
              >
                <strong>{day}</strong>
                <div>
                  {tasks.slice(0, 3).map((task) => (
                    <i className={task.tag} key={task.id}>
                      {task.title}
                    </i>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="task-sheet compact">
        <div className="sheet-head">
          <h2>{Number(selectedDate.slice(-2))}일 작업</h2>
          <label className="search-field">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색" />
          </label>
        </div>
        {selectedTasks.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={toggleTask} />
        ))}
        {selectedTasks.length === 0 && <EmptyState text="선택한 날짜에 작업이 없습니다." />}
      </section>
    </section>
  );
}

function CrewPage({ scopedTasks, selectedMember, setSelectedMember, toggleTask }) {
  return (
    <section className="page">
      <div className="hero-title">
        <p>함께 나눠요</p>
        <h1>가족에게 집안일 분담</h1>
        <span>담당자와 로테이션을 바로 확인하세요.</span>
      </div>

      <div className="crew-grid">
        {members.slice(1).map((member) => {
          const memberTasks = scopedTasks.filter((task) => task.owner === member.id || selectedMember === member.id);
          return (
            <article className="crew-card" key={member.id}>
              <button className="crew-head" onClick={() => setSelectedMember(member.id)}>
                <span>{member.short}</span>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.subtitle}</small>
                </div>
                <ChevronRight size={18} />
              </button>
              {memberTasks.slice(0, 2).map((task) => (
                <TaskItem key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </article>
          );
        })}
      </div>

      <section className="rotation-card">
        <h2>로테이션</h2>
        <p>나, Anna 외 3명 로테이션</p>
        <div className="avatar-stack">
          <span>TW</span>
          <span>A</span>
          <span>+1</span>
        </div>
      </section>
    </section>
  );
}

function RewardPage({ tasks, completion }) {
  const doneCount = tasks.filter((task) => task.done).length;
  return (
    <section className="page">
      <div className="reward-hero">
        <Sparkles size={34} />
        <h1>보상 받기</h1>
        <p>꾸준한 청소에 보상</p>
        <strong>Speedster</strong>
        <span>오늘 {doneCount}개 작업 완료</span>
      </div>

      <section className="stats-card">
        <div>
          <p>작업 완료율</p>
          <h2>{completion}%</h2>
        </div>
        <div className="bar-chart">
          {[38, 66, 94, 42, 78, 63, 88].map((height, index) => (
            <i key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </section>

      <section className="preset-card">
        <h2>청소 프리셋</h2>
        {presets.map((preset, index) => (
          <div className="preset-row" key={preset}>
            <Check size={16} />
            <span>{preset}</span>
            <small>{index + 1}주 후</small>
          </div>
        ))}
      </section>
    </section>
  );
}

function RowButton({ title, value, chart }) {
  return (
    <button className="row-button">
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

function TaskItem({ task, onToggle }) {
  return (
    <article className={`task-item ${task.done ? "done" : ""}`}>
      <button className="check-button" onClick={() => onToggle(task.id)} aria-label="완료 전환">
        {task.done && <Check size={16} />}
      </button>
      <div>
        <strong>{task.title}</strong>
        <p>{task.place} · {task.repeat}</p>
      </div>
      <button className="more-button" aria-label="더 보기">
        <MoreHorizontal size={18} />
      </button>
    </article>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <ClipboardList size={24} />
      <p>{text}</p>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
