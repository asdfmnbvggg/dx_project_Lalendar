import { useEffect, useMemo, useState } from "react";
import { Bell, Menu } from "lucide-react";
import { dateKey, initialTasks, navItems, tagLabel } from "./data.js";
import TodayPage from "./pages/TodayPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import CrewPage from "./pages/CrewPage.jsx";
import RewardPage from "./pages/RewardPage.jsx";
import TaskComposer from "./components/TaskComposer.jsx";
import DetailPanel from "./components/DetailPanel.jsx";

export default function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState("2026-05-26");
  const [selectedMember, setSelectedMember] = useState("all");
  const [query, setQuery] = useState("");
  const [isComposerOpen, setComposerOpen] = useState(false);
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
  const todayTasks = scopedTasks.filter((task) => task.date === "2026-05-26");
  const selectedTasks = scopedTasks
    .filter((task) => task.date === selectedDate)
    .filter((task) => `${task.title} ${task.place} ${tagLabel[task.tag]}`.includes(query));
  const completed = scopedTasks.filter((task) => task.done).length;
  const completion = Math.round((completed / Math.max(scopedTasks.length, 1)) * 100);
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

  function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function addTask(task) {
    setTasks((current) => [{ id: Date.now(), ...task }, ...current]);
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
    tasksByDate,
    completion,
    toggleTask,
    deleteTask,
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
        onOpenComposer={() => setComposerOpen(true)}
      />
    </main>
  );
}
