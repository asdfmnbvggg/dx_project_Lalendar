export const DAILY_REPORT_FALLBACK_TEXT =
  "AI 데일리 리포트를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.";

export function createDailyReportFallback() {
  return {
    title: "리포트를 준비하지 못했어요",
    summary: DAILY_REPORT_FALLBACK_TEXT,
    detail: "",
    weatherTip: "",
    taskTip: "",
    imageTheme: "homecare_default",
    tags: ["다시 시도"],
    priority: "normal",
    source: "fallback",
  };
}

export async function fetchDailyReport(input, options = {}) {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DAILY_REPORT_API !== "true") {
    const error = new Error("Daily Report API is disabled in local development");
    error.code = "DAILY_REPORT_DEV_DISABLED";
    throw error;
  }

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

  if (!payload?.title || !payload?.summary) {
    throw new Error("Daily Report response is missing title or summary");
  }

  return payload;
}
