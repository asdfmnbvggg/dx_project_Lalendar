import { useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Home,
  MoreVertical,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wind,
} from "lucide-react";
import robotImage from "../assets/appliances/로봇청소기.png";
import purifierImage from "../assets/appliances/공청기.png";
import "./CareTab.css";

const careCalendar = [
  { date: "11", day: "일", items: [{ id: "care-1", title: "필터 청소", subtitle: "공기청정기", category: "appliance" }] },
  { date: "12", day: "월", items: [{ id: "care-2", title: "욕실 환기", subtitle: "체크", category: "home" }] },
  { date: "13", day: "화", items: [{ id: "care-3", title: "세탁기", subtitle: "통세척", category: "appliance" }] },
  {
    date: "14",
    day: "수",
    isToday: true,
    items: [
      { id: "care-4", title: "로봇청소기", subtitle: "브러시 점검", category: "appliance" },
      { id: "care-5", title: "가족 부담", subtitle: "리뷰", category: "family" },
    ],
  },
  { date: "15", day: "목", items: [{ id: "care-6", title: "침구 관리", subtitle: "세탁 추천", category: "home" }] },
  { date: "16", day: "금", items: [{ id: "care-7", title: "식기세척기", subtitle: "세척 관리", category: "appliance" }] },
  {
    date: "17",
    day: "토",
    items: [
      { id: "care-8", title: "가족 휴식", subtitle: "일정 케어", category: "family" },
      { id: "care-9", title: "필터 교체", subtitle: "예정", category: "postponed" },
    ],
  },
];

const initialTodayTasks = [
  {
    id: "task-1",
    title: "로봇청소기 브러시 점검",
    category: "가전 케어",
    categoryType: "appliance",
    time: "오전 10:00",
    description: "브러시에 먼지가 쌓여 있어요. 점검 후 깨끗하게 관리해요.",
    actionLabel: "시작하기",
    status: "pending",
    image: robotImage,
  },
  {
    id: "task-2",
    title: "거실 환기 및 공기 관리",
    category: "집안 케어",
    categoryType: "home",
    time: "오후 2:00",
    description: "실내 공기가 탁해졌어요. 10분 환기로 쾌적함을 유지해요.",
    actionLabel: "완료하기",
    status: "pending",
  },
  {
    id: "task-3",
    title: "가사 부담 리뷰",
    category: "가족 케어",
    categoryType: "family",
    time: "오후 8:00",
    description: "이번 주 가사 부담 균형을 확인하고 필요하면 조정해요.",
    actionLabel: "확인하기",
    status: "pending",
  },
];

const upcomingCareTasks = [
  {
    id: "upcoming-1",
    date: "5/17",
    day: "토",
    title: "공기청정기 필터 교체",
    description: "필터 교체 시기가 다가오고 있어요.",
    status: "예정",
    dueText: "2일 후",
  },
  {
    id: "upcoming-2",
    date: "5/18",
    day: "일",
    title: "침구 세탁 추천",
    description: "습도가 높아 침구 관리가 필요해요.",
    status: "추천",
    dueText: "3일 후",
  },
  {
    id: "upcoming-3",
    date: "5/20",
    day: "화",
    title: "세탁기 통세척",
    description: "최근 사용량 기준으로 통세척을 권장해요.",
    status: "관리 필요",
    dueText: "5일 후",
  },
];

const familyCareStatus = {
  score: 82,
  message: "잘하고 있어요!",
  change: "+8점",
  description: "지난 주보다 케어 균형이 올라갔어요",
  familyTasks: [
    { name: "수민", count: 7 },
    { name: "재혁", count: 3 },
    { name: "다빈", count: 2 },
  ],
};

const categoryIcon = {
  appliance: ShieldCheck,
  home: Wind,
  family: Users,
};

const postponeOptions = ["오늘 밤", "이번 주말", "다음 주"];

export default function CareTab({ onOpenNotifications }) {
  const [todayTasks, setTodayTasks] = useState(initialTodayTasks);
  const [score, setScore] = useState(familyCareStatus.score);
  const [toast, setToast] = useState("");
  const [familyReviewOpen, setFamilyReviewOpen] = useState(false);
  const [postponeTarget, setPostponeTarget] = useState(null);
  const [upcomingDetail, setUpcomingDetail] = useState(null);

  const remainingCount = useMemo(() => todayTasks.filter((task) => task.status !== "done").length, [todayTasks]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(""), 2400);
  }

  function handleStartCareTask(taskId) {
    const task = todayTasks.find((item) => item.id === taskId);
    setTodayTasks((current) => current.map((item) => (item.id === taskId ? { ...item, status: item.status === "doing" ? "done" : "doing", actionLabel: "완료하기" } : item)));
    showToast(`${task?.title || "케어 일정"}을 시작했어요.`);
  }

  function handleCompleteCareTask(taskId) {
    const task = todayTasks.find((item) => item.id === taskId);
    setTodayTasks((current) => current.map((item) => (item.id === taskId ? { ...item, status: "done", actionLabel: "완료됨" } : item)));
    setScore((current) => Math.min(100, current + 2));
    showToast(`${task?.title || "오늘의 케어 일정"}을 완료했어요.`);
  }

  function handleOpenFamilyCareReview() {
    setFamilyReviewOpen(true);
  }

  function handlePostponeCareTask(task, option) {
    setPostponeTarget(null);
    showToast(`${task.title} 일정을 ${option}로 미뤘어요.`);
  }

  function handleOpenCareCalendar() {
    showToast("전체 케어 캘린더는 곧 연결됩니다.");
  }

  function handleOpenUpcomingCareTask(task) {
    setUpcomingDetail(task);
  }

  function handleTaskAction(task) {
    if (task.categoryType === "family") {
      handleOpenFamilyCareReview();
      return;
    }

    if (task.status === "doing" || task.actionLabel.includes("완료")) {
      handleCompleteCareTask(task.id);
      return;
    }

    handleStartCareTask(task.id);
  }

  return (
    <section className="care-tab-page" aria-label="케어">
      <header className="care-tab-header">
        <div>
          <h1>케어</h1>
          <p>가족과 집이 더 편안하도록 오늘의 케어 일정을 확인해요</p>
        </div>
        <div className="care-tab-header-actions">
          <button type="button" aria-label="알림" onClick={onOpenNotifications}>
            <Bell size={22} />
            <i aria-hidden="true" />
          </button>
          <button type="button" aria-label="설정">
            <Settings size={22} />
          </button>
        </div>
      </header>

      <section className="care-week-card" aria-label="이번 주 케어 캘린더">
        <div className="care-section-head">
          <h2>
            <CalendarDays size={16} />
            이번 주 케어 캘린더
          </h2>
          <div className="care-week-legend" aria-label="카테고리">
            <span className="appliance">가전 케어</span>
            <span className="home">집안 케어</span>
            <span className="family">가족 케어</span>
            <span className="postponed">미루기</span>
          </div>
        </div>

        <div className="care-week-grid">
          {careCalendar.map((day) => (
            <article className={day.isToday ? "today" : ""} key={day.date}>
              <small>{day.day}</small>
              <strong>{day.date}</strong>
              <div>
                {day.items.map((item) => (
                  <span className={item.category} key={item.id}>
                    <b>{item.title}</b>
                    <em>{item.subtitle}</em>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <button className="care-week-more" type="button" onClick={handleOpenCareCalendar} aria-label="이번 주 전체 보기">
          <ChevronDown size={18} />
        </button>
      </section>

      <section className="care-today-section" aria-label="오늘의 케어 일정">
        <div className="care-section-title-row">
          <h2>
            오늘의 케어 일정 <span>{remainingCount}</span>
          </h2>
          <button type="button" onClick={handleOpenCareCalendar}>
            모두 보기 <ChevronRight size={15} />
          </button>
        </div>

        <div className="care-task-list">
          {todayTasks.map((task) => {
            const Icon = categoryIcon[task.categoryType] || ClipboardCheck;
            return (
              <article className={`care-task-card ${task.categoryType} ${task.status === "done" ? "done" : ""}`} key={task.id}>
                <span className="care-task-icon" aria-hidden="true">
                  {task.image ? <img src={task.image} alt="" /> : <Icon size={28} />}
                </span>
                <div className="care-task-body">
                  <div>
                    <h3>{task.title}</h3>
                    <span>{task.category}</span>
                  </div>
                  <p>{task.description}</p>
                </div>
                <div className="care-task-actions">
                  <time>{task.time}</time>
                  <button type="button" onClick={() => handleTaskAction(task)} disabled={task.status === "done"}>
                    {task.status === "done" ? "완료됨" : task.actionLabel}
                  </button>
                  <button type="button" aria-label={`${task.title} 더보기`} onClick={() => setPostponeTarget(task)}>
                    <MoreVertical size={17} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <button className="care-score-card" type="button" onClick={handleOpenFamilyCareReview} aria-label="가족 케어 점수 자세히 보기">
        <div>
          <small>이번 주 우리 가족 케어 점수</small>
          <strong>{score}<span>점</span></strong>
        </div>
        <p>
          {familyCareStatus.message}
          <b>{familyCareStatus.change}</b>
          <span>{familyCareStatus.description}</span>
        </p>
        <span className="care-score-house" aria-hidden="true">
          <Home size={36} />
          <i />
        </span>
      </button>

      <section className="care-upcoming-section" aria-label="다가오는 케어 일정">
        <div className="care-section-title-row">
          <h2>
            다가오는 케어 일정 <span>{upcomingCareTasks.length}개</span>
          </h2>
          <button type="button" onClick={handleOpenCareCalendar}>
            전체 캘린더 보기 <ChevronRight size={15} />
          </button>
        </div>

        <div className="care-upcoming-list">
          {upcomingCareTasks.map((task, index) => (
            <button type="button" key={task.id} onClick={() => handleOpenUpcomingCareTask(task)}>
              <time>
                {task.date}
                <small>{task.day}</small>
              </time>
              <span className={`care-upcoming-icon icon-${index}`} aria-hidden="true">
                {index === 0 ? <img src={purifierImage} alt="" /> : index === 1 ? <Sparkles size={24} /> : <ShieldCheck size={24} />}
              </span>
              <span>
                <strong>{task.title}</strong>
                <em>{task.description}</em>
              </span>
              <small>{task.dueText}</small>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </section>

      {toast && (
        <div className="care-tab-toast" role="status">
          {toast}
        </div>
      )}

      {familyReviewOpen && (
        <div className="care-sheet-backdrop" role="presentation" onClick={() => setFamilyReviewOpen(false)}>
          <section className="care-sheet" role="dialog" aria-modal="true" aria-label="가족 케어 부담 리뷰" onClick={(event) => event.stopPropagation()}>
            <h2>이번 주 가족 가사 부담</h2>
            <p>가족 일정이 한 사람에게 몰려 있는지 확인해보세요.</p>
            <div className="care-family-bars">
              {familyCareStatus.familyTasks.map((member) => (
                <span key={member.name}>
                  <b>{member.name}</b>
                  <i style={{ "--care-bar": `${member.count * 12}%` }} />
                  <em>{member.count}개</em>
                </span>
              ))}
            </div>
            <button type="button" onClick={() => showToast("가족 케어 일정 재배정 화면은 곧 연결됩니다.")}>
              재배정하기
            </button>
            <button type="button" onClick={() => setFamilyReviewOpen(false)}>
              닫기
            </button>
          </section>
        </div>
      )}

      {postponeTarget && (
        <div className="care-sheet-backdrop" role="presentation" onClick={() => setPostponeTarget(null)}>
          <section className="care-sheet" role="dialog" aria-modal="true" aria-label={`${postponeTarget.title} 미루기`} onClick={(event) => event.stopPropagation()}>
            <h2>{postponeTarget.title}</h2>
            <p>일정을 언제로 미룰까요?</p>
            <div className="care-option-grid">
              {postponeOptions.map((option) => (
                <button type="button" key={option} onClick={() => handlePostponeCareTask(postponeTarget, option)}>
                  {option}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {upcomingDetail && (
        <div className="care-sheet-backdrop" role="presentation" onClick={() => setUpcomingDetail(null)}>
          <section className="care-sheet" role="dialog" aria-modal="true" aria-label={`${upcomingDetail.title} 상세`} onClick={(event) => event.stopPropagation()}>
            <h2>{upcomingDetail.title}</h2>
            <p>{upcomingDetail.description}</p>
            <button type="button" onClick={() => setUpcomingDetail(null)}>
              확인
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
