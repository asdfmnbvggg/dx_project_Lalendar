import { useEffect, useMemo, useState } from "react";
import { Bell, Menu } from "lucide-react";
import { dateKey, initialTasks, isRainyDate, navItems, tagLabel } from "./data.js";
import TodayPage from "./pages/TodayPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import CrewPage from "./pages/CrewPage.jsx";
import RewardPage from "./pages/RewardPage.jsx";
import TaskComposer from "./components/TaskComposer.jsx";
import DetailPanel from "./components/DetailPanel.jsx";

export default function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState("2026-05-26");
  const [visibleMonth, setVisibleMonth] = useState({ year: 2026, month: 5 });
  const [selectedMember, setSelectedMember] = useState("all");
  const [query, setQuery] = useState("");
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [pendingPostpone, setPendingPostpone] = useState(null);
  const [panel, setPanel] = useState(null);

  useEffect(() => {
    const selectors = [
      "#vercel-toolbar",
      "#vercel-live-feedback",
      "[data-vercel-toolbar]",
      "[data-vercel-live-feedback]",
      'iframe[src*="vercel.live"]',
      'iframe[src*="vercel-toolbar"]',
    ];
    const removeToolbar = () => document.querySelectorAll(selectors.join(",")).forEach((node) => node.remove());
    removeToolbar();
    const observer = new MutationObserver(removeToolbar);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const scopedTasks = tasks.filter((task) => selectedMember === "all" || task.owner === selectedMember);
  const todayTasks = sortTasks(scopedTasks.filter((task) => task.date === "2026-05-26"));
  const selectedTasks = sortTasks(
    scopedTasks
      .filter((task) => task.date === selectedDate)
      .filter((task) => `${task.title} ${task.place} ${tagLabel[task.tag]}`.includes(query)),
  );
  const completed = scopedTasks.filter((task) => task.done).length;
  const completion = Math.round((completed / Math.max(scopedTasks.length, 1)) * 100);
  const rewardPoints = completed * 10;
  const month = useMemo(() => {
    const totalDays = new Date(visibleMonth.year, visibleMonth.month, 0).getDate();
    return Array.from({ length: totalDays }, (_, index) => dateKey(visibleMonth.year, visibleMonth.month, index + 1));
  }, [visibleMonth]);
  const monthLeadingBlanks = useMemo(() => new Date(visibleMonth.year, visibleMonth.month - 1, 1).getDay(), [visibleMonth]);
  const monthLabel = `${visibleMonth.year}. ${String(visibleMonth.month).padStart(2, "0")}`;
  const tasksByDate = useMemo(() => {
    return scopedTasks.reduce((map, task) => {
      map[task.date] = sortTasks([...(map[task.date] || []), task]);
      return map;
    }, {});
  }, [scopedTasks]);

  function changeVisibleMonth(offset) {
    setVisibleMonth((current) => {
      const next = new Date(current.year, current.month - 1 + offset, 1);
      const year = next.getFullYear();
      const month = next.getMonth() + 1;
      setSelectedDate(dateKey(year, month, 1));
      return { year, month };
    });
  }

  function toggleTask(id) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function changeTaskOwner(id, owner) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, owner } : task)));
  }

  function postponeTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    const nextDate = addDays(task.date, 1);
    if (isLaundryTask(task) && isRainyDate(nextDate)) {
      setPendingPostpone({ task, nextDate });
      return;
    }

    moveTaskDate(id, nextDate);
  }

  function moveTaskDate(id, date) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, date, repeat: `${task.repeat} · 미룸` } : task)));
    setSelectedDate(date);
  }

  function addTask(task) {
    setTasks((current) => [{ id: Date.now(), source: "manual", ...task }, ...current]);
  }

  function addPreset(title) {
    addTask({
      date: selectedDate,
      title,
      place: "우리 집",
      tag: "house",
      owner: selectedMember === "all" ? "me" : selectedMember,
      done: false,
      repeat: "프리셋",
      source: "auto",
    });
    setActiveTab("calendar");
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
    monthLabel,
    monthLeadingBlanks,
    onPrevMonth: () => changeVisibleMonth(-1),
    onNextMonth: () => changeVisibleMonth(1),
    tasksByDate,
    completion,
    rewardPoints,
    toggleTask,
    deleteTask,
    changeTaskOwner,
    postponeTask,
    openComposer: () => setComposerOpen(true),
    onOpenPanel: setPanel,
  };

  return (
    <main className="app-shell">
      <section className="app-frame">
        <header className="topbar">
          <div className="brand">
            <span>L</span>
            <div>
              <strong>Lalendar</strong>
              <small>housework calendar</small>
            </div>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="알림" onClick={() => setPanel({ type: "notifications" })}>
              <Bell size={20} />
            </button>
            <button className="icon-button" aria-label="메뉴" onClick={() => setPanel({ type: "settings" })}>
              <Menu size={22} />
            </button>
          </div>
        </header>

        {activeTab === "today" && <TodayPage {...pageProps} />}
        {activeTab === "calendar" && <CalendarPage {...pageProps} />}
        {activeTab === "crew" && <CrewPage {...pageProps} />}
        {activeTab === "reward" && <RewardPage {...pageProps} onAddPreset={addPreset} />}

        <nav className="tabbar" aria-label="하단 탭">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}>
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>

      {isComposerOpen && (
        <TaskComposer
          selectedDate={selectedDate}
          selectedMember={selectedMember}
          onClose={() => setComposerOpen(false)}
          onAdd={(task) => {
            addTask(task);
            setComposerOpen(false);
          }}
        />
      )}

      <DetailPanel
        panel={panel}
        tasks={tasks}
        completion={completion}
        onClose={() => setPanel(null)}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onOwnerChange={changeTaskOwner}
        onPostpone={postponeTask}
        onAddTask={(task) => addTask(task)}
        selectedDate={selectedDate}
        selectedMember={selectedMember}
        onOpenComposer={() => setComposerOpen(true)}
      />

      {pendingPostpone && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="postpone-title">
            <p>비 예보 확인</p>
            <h2 id="postpone-title">정말 다음날로 미룰까요?</h2>
            <span>
              {pendingPostpone.task.title}을 {pendingPostpone.nextDate}로 미루면 비 오는 날과 겹쳐요.
            </span>
            <div className="confirm-actions">
              <button type="button" onClick={() => setPendingPostpone(null)}>
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  moveTaskDate(pendingPostpone.task.id, pendingPostpone.nextDate);
                  setPendingPostpone(null);
                }}
              >
                그래도 미루기
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function sortTasks(tasks) {
  return [...tasks].sort(taskSorter);
}

function taskSorter(a, b) {
  if (a.done !== b.done) return Number(a.done) - Number(b.done);
  return b.id - a.id;
}

function addDays(date, amount) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + amount);
  return dateKey(next.getFullYear(), next.getMonth() + 1, next.getDate());
}

function isLaundryTask(task) {
  return /세탁|빨래/.test(task.title);
}
