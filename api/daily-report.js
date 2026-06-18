const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const TOGETHER_CHAT_COMPLETIONS_URL = "https://api.together.xyz/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_TOGETHER_MODEL = "Qwen/Qwen3.5-9B";
const FALLBACK_CARD_TEXT = "오늘의 일정과 가사일을 확인했어요. 남은 가사일을 차례대로 진행해보세요.";
const PRIORITIES = ["weather", "schedule", "chore", "normal"];

const REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["cardText", "weatherNotice", "choreNotice", "priority"],
  properties: {
    cardText: { type: "string" },
    weatherNotice: { type: "string" },
    choreNotice: { type: "string" },
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
    const report = await generateDailyReport(input);
    response.setHeader("Cache-Control", "no-store");
    response.status(200).json(report);
  } catch (error) {
    console.error("Daily AI Report generation failed", error);
    response.status(502).json({
      code: "DAILY_REPORT_GENERATION_FAILED",
      message: FALLBACK_CARD_TEXT,
    });
  }
}

async function generateDailyReport(input) {
  const provider = normalizeSecret(process.env.LLM_PROVIDER).toLowerCase() || "openai";

  if (provider === "together") {
    return requestTogetherReport(input);
  }

  try {
    return await requestOpenAiReport(input);
  } catch (openAiError) {
    console.warn("OpenAI Daily Report failed; falling back to Together", openAiError);
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
      max_output_tokens: 350,
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

  return parseAndValidateReport(extractOpenAiText(payload));
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
      temperature: 0.2,
      max_tokens: 450,
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

  return parseAndValidateReport(extractTogetherText(payload));
}

function buildSystemPrompt() {
  return [
    "너는 가족 캘린더 앱의 Daily AI Report 작성자다.",
    "선택 날짜부터 3일 동안의 일정, 가사일, 날씨 데이터만 사용해 한국어 보고서를 작성한다.",
    "말투는 다정하지만 과하지 않게 하고, 모바일 카드에 자연스럽게 들어가도록 cardText를 짧은 1~2문장으로 작성한다.",
    "우산, 미세먼지, 습도, 남은 가사일 개수, 다음 가사일 시간 중 실제 데이터에서 가장 중요한 내용만 언급한다.",
    "입력에 없는 일정, 시간, 날씨, 가사일, 수치, 인물은 절대 지어내지 않는다.",
    "값이 null이거나 빈 문자열이면 그 정보는 언급하지 않는다.",
    "weatherNotice와 choreNotice도 입력 데이터에 근거한 짧은 문장으로 작성하고, 해당 정보가 없으면 빈 문자열로 둔다.",
    "priority는 가장 중요한 내용에 따라 weather, schedule, chore, normal 중 하나만 선택한다.",
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
    cardText: normalizeCardText(value.cardText),
    weatherNotice: String(value.weatherNotice || "").trim(),
    choreNotice: String(value.choreNotice || "").trim(),
    priority: String(value.priority || "").trim(),
  };

  if (!report.cardText) throw new Error("Daily Report cardText is empty");
  if (!PRIORITIES.includes(report.priority)) report.priority = "normal";
  return report;
}

function normalizeCardText(value) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = (text.match(/[^.!?。！？]+[.!?。！？]?/g) || []).map((sentence) => sentence.trim());
  const limited = sentences.slice(0, 2).join(" ").trim() || text;
  return limited.length <= 180 ? limited : `${limited.slice(0, 177).trim()}…`;
}

function validateReportInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be a JSON object");
  }

  return {
    selectedDate: String(value.selectedDate || ""),
    schedules: sanitizeArray(value.schedules, 60),
    chores: sanitizeArray(value.chores, 60),
    weather: sanitizeArray(value.weather, 3),
  };
}

function sanitizeArray(value, limit) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
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
