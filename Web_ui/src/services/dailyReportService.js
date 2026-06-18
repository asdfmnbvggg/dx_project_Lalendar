export const DAILY_REPORT_FALLBACK_TEXT =
  "오늘의 일정과 가사일을 확인했어요. 남은 가사일을 차례대로 진행해보세요.";

export async function fetchDailyReport(input, options = {}) {
  const response = await fetch("/api/daily-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    signal: options.signal,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || `Daily Report request failed: ${response.status}`);
    error.code = payload?.code || "DAILY_REPORT_REQUEST_FAILED";
    throw error;
  }

  if (!payload?.cardText) {
    throw new Error("Daily Report response is missing cardText");
  }

  return payload;
}
