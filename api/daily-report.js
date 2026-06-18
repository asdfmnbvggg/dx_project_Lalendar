const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const TOGETHER_CHAT_COMPLETIONS_URL = "https://api.together.xyz/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_TOGETHER_MODEL = "Qwen/Qwen3.5-9B";
const PRIORITIES = ["weather", "schedule", "chore", "normal"];

const REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "detail", "weatherTip", "taskTip", "imageTheme", "tags", "priority"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    detail: { type: "string" },
    weatherTip: { type: "string" },
    taskTip: { type: "string" },
    imageTheme: { type: "string" },
    tags: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 3,
    },
    priority: { type: "string", enum: PRIORITIES },
  },
};

export default async function dailyReportHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const input = validateReportInput(await readJsonBody(request));
    devLog("GPT daily report input", input);
    const report = await generateDailyReport(input);
    response.setHeader("Cache-Control", "no-store");
    response.status(200).json({ ...report, source: "gpt" });
  } catch (error) {
    console.error("GPT daily report generation failed", error);
    response.status(502).json({
      code: "DAILY_REPORT_GENERATION_FAILED",
      message: "AI 데일리 리포트를 생성하지 못했어요. 잠시 후 다시 시도해 주세요.",
    });
  }
}

async function generateDailyReport(input) {
  const provider = normalizeSecret(process.env.LLM_PROVIDER).toLowerCase() || "openai";
  if (provider === "together") return requestTogetherReport(input);

  try {
    return await requestOpenAiReport(input);
  } catch (openAiError) {
    if (!normalizeSecret(process.env.TOGETHER_API_KEY)) throw openAiError;
    console.warn("OpenAI Daily Report failed; trying Together provider", openAiError);
    return requestTogetherReport(input);
  }
}

async function requestOpenAiReport(input) {
  const apiKey = normalizeSecret(process.env.OPENAI_API_KEY);
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: normalizeSecret(process.env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL,
      max_output_tokens: 650,
      input: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: JSON.stringify(input) },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "daily_ai_report",
          strict: true,
          schema: REPORT_SCHEMA,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI request failed: ${response.status}`);
  }

  const rawText = extractOpenAiText(payload);
  devLog("GPT daily report raw response", rawText);
  return parseAndValidateReport(rawText);
}

async function requestTogetherReport(input) {
  const apiKey = normalizeSecret(process.env.TOGETHER_API_KEY);
  if (!apiKey) throw new Error("TOGETHER_API_KEY is not configured");

  const response = await fetch(TOGETHER_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: normalizeSecret(process.env.TOGETHER_MODEL) || DEFAULT_TOGETHER_MODEL,
      temperature: 0.25,
      max_tokens: 700,
      reasoning: { enabled: false },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: JSON.stringify(input) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "daily_ai_report",
          schema: REPORT_SCHEMA,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || `Together request failed: ${response.status}`);
  }

  const rawText = extractTogetherText(payload);
  devLog("Together daily report raw response", rawText);
  return parseAndValidateReport(rawText);
}

function buildSystemPrompt() {
  return [
    "너는 가족 캘린더 앱의 모바일용 Daily AI Report 작성자다.",
    "오늘을 포함한 3일치 가족 일정, 가사일, 가전 작업, 날씨, To-do 진행률을 모두 참고해 한국어 보고서를 작성한다.",
    "입력 데이터에 있는 사실만 사용하고, 없는 일정·시간·사람·날씨·수치를 지어내지 않는다.",
    "일정이 있으면 시간대와 구성원 이름을 자연스럽게 반영하고, 가전 작업이 있으면 가전명과 모드를 반영한다.",
    "비·습도·미세먼지·더위·추위 정보가 있으면 실제 데이터에 맞는 생활 팁을 작성한다.",
    "오늘 내용을 우선하고, 내일과 모레 내용은 정말 필요할 때만 한 줄 안에 짧게 포함한다.",
    "title은 일반 제목 대신 summary와 같은 한 줄 핵심 문장으로 작성한다.",
    "summary는 1문장, 45자 이내로 작성한다. 상세 화면 상단 제목에 들어갈 짧은 문장이다.",
    "detail은 1문장, 80자 이내로 아주 짧게 작성한다.",
    "detail에는 고정일정, 반복수업, 학교 시간표, 교과목 전체 나열을 쓰지 않는다.",
    "detail에는 변동 일정, 가사일, 날씨 기반 안내, 남은 할 일만 자연스럽게 작성한다.",
    "반복 일정은 여러 날짜를 풀어 쓰지 말고 '매주 월~금 09:00-18:00 회사'처럼 한 줄 규칙으로만 요약한다.",
    "weatherTip과 taskTip은 해당 근거가 없으면 빈 문자열로 둔다.",
    "imageTheme은 homecare_laundry, homecare_cleaning, homecare_air, homecare_weather, homecare_schedule, homecare_default 중 하나로 작성한다.",
    "tags는 입력에 맞는 짧은 한국어 태그 1~3개로 작성한다.",
    "같은 상투적 문구를 반복하지 말고 입력 데이터의 차이가 문구에 드러나게 한다.",
    "priority는 가장 중요한 내용에 따라 weather, schedule, chore, normal 중 하나를 선택한다.",
    "설명이나 마크다운 없이 지정된 JSON만 반환한다.",
  ].join("\n");
}

function extractOpenAiText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const parts = Array.isArray(payload?.output) ? payload.output : [];
  return parts
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function extractTogetherText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => (typeof part === "string" ? part : part?.text || "")).join("").trim();
}

function parseAndValidateReport(content) {
  if (!content) throw new Error("LLM returned an empty Daily Report");
  const value = JSON.parse(stripJsonFence(content));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("LLM returned an invalid Daily Report");
  }

  const report = {
    title: normalizeTextField(value.title, 60),
    summary: normalizeTextField(value.summary, 80),
    detail: normalizeTextField(value.detail, 100),
    weatherTip: normalizeTextField(value.weatherTip, 220),
    taskTip: normalizeTextField(value.taskTip, 220),
    imageTheme: normalizeTextField(value.imageTheme, 60) || "homecare_default",
    tags: sanitizeTags(value.tags),
    priority: String(value.priority || "").trim(),
  };

  if (!report.title || !report.summary) throw new Error("Daily Report title or summary is empty");
  if (report.tags.length === 0) report.tags = ["오늘의 리포트"];
  if (!PRIORITIES.includes(report.priority)) report.priority = "normal";
  devLog("GPT daily report parsed result", report);
  return report;
}

function normalizeTextField(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 3)).trim()}...`;
}

function validateReportInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be a JSON object");
  }

  return {
    today: String(value.today || value.selectedDate || ""),
    dateRange: sanitizeObject(value.dateRange),
    weather: sanitizeArray(value.weather, 3),
    events: sanitizeArray(value.events || value.schedules, 60),
    houseworkTasks: sanitizeArray(value.houseworkTasks || value.chores, 60),
    todoProgress: sanitizeObject(value.todoProgress),
  };
}

function sanitizeArray(value, limit) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

function sanitizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sanitizeTags(value) {
  return [...new Set(sanitizeArray(value, 3).map((tag) => String(tag || "").trim()).filter(Boolean))];
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body);

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function stripJsonFence(content) {
  return content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function normalizeSecret(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function devLog(label, value) {
  if (process.env.NODE_ENV === "production") return;
  console.log(label, value);
}
