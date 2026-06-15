import { members } from "../../data.js";

export function getPanelTasks(panel, tasks, doneTasks, pendingTasks) {
  if (panel.type === "allTasks") return tasks;
  if (panel.type === "history") return doneTasks;
  if (panel.type === "room") return tasks.filter((task) => task.place === panel.room);
  if (panel.type === "task") return tasks.filter((task) => task.id === panel.task.id);
  if (panel.type === "pending") return pendingTasks;
  if (panel.type === "appliances" || panel.type === "community") return [];
  return tasks;
}

export function taskSorter(a, b) {
  if (a.done !== b.done) return Number(a.done) - Number(b.done);
  return b.id - a.id;
}

export function getOwnerName(ownerId) {
  return members.find((member) => member.id === ownerId)?.name || "미정";
}

export function getPanelKicker(panel) {
  const labels = {
    allTasks: "모든 작업",
    history: "기록",
    summary: "요약",
    room: "방별 작업",
    task: "작업 상세",
    notifications: "알림",
    settings: "설정",
    pending: "대기 작업",
    recommendation: "AI 추천",
    appliance: "가전 상태",
    appliances: "가전 캘린더",
    community: "커뮤니티",
    tip: "생활 팁",
    member: "멤버 상세",
    rotation: "로테이션",
  };
  return labels[panel.type] || "상세";
}

export function getPanelTitle(panel) {
  if (panel.type === "room") return panel.room;
  if (panel.type === "task") return panel.task.title;
  if (panel.type === "notifications") return "청소 전 알려드려요";
  if (panel.type === "settings") return "앱 메뉴";
  if (panel.type === "pending") return "아직 남은 일";
  if (panel.type === "recommendation") return "스마트 루틴";
  if (panel.type === "appliance") return panel.appliance.name;
  if (panel.type === "community") return "우리 동네 집안일 팁";
  if (panel.type === "tip") return "커뮤니티 추천";
  if (panel.type === "appliances") return "LG ThinQ 연동 가전";
  if (panel.type === "member") return panel.member.name;
  if (panel.type === "rotation") return "담당 순서";
  return getPanelKicker(panel);
}

