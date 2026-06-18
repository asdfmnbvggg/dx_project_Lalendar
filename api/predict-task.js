const TOGETHER_CHAT_COMPLETIONS_URL = "https://api.together.xyz/v1/chat/completions";
const DEFAULT_MODEL = "Qwen/Qwen3.5-9B";
const LEGACY_NON_SERVERLESS_MODELS = new Set(["Qwen/Qwen3-8B"]);
const ALLOWED_APPLIANCES = [
  "washer",
  "dryer",
  "dishwasher",
  "robot_cleaner",
  "air_purifier",
  "dehumidifier",
  "air_conditioner",
  "none",
];

const INPUT_FIELDS = [
  "event_title",
  "event_date",
  "event_start_time",
  "event_end_time",
  "day_temp",
  "day_humidity",
  "day_dust",
];

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["task_appliance", "task_appliance_mode", "task_date", "task_start_time", "task_end_time"],
  properties: {
    task_appliance: {
      type: "string",
      enum: ALLOWED_APPLIANCES,
    },
    task_appliance_mode: {
      type: "string",
    },
    task_date: {
      type: "string",
      pattern: "^\\d{4}-\\d{2}-\\d{2}$",
    },
    task_start_time: {
      type: "string",
      pattern: "^([01]\\d|2[0-3]):[0-5]\\d$",
    },
    task_end_time: {
      type: "string",
      pattern: "^([01]\\d|2[0-3]):[0-5]\\d$",
    },
  },
};

export default async function predictTaskHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ message: "Method not allowed" });
    return;
  }

  const apiKey = normalizeSecret(process.env.TOGETHER_API_KEY);
  if (!apiKey) {
    response.status(500).json({
      code: "TOGETHER_API_KEY_MISSING",
      message: "TOGETHER_API_KEY is not configured",
    });
    return;
  }

  try {
    const input = validatePredictionInput(await readJsonBody(request));
    const configuredModel = normalizeSecret(process.env.TOGETHER_MODEL);
    const model = !configuredModel || LEGACY_NON_SERVERLESS_MODELS.has(configuredModel) ? DEFAULT_MODEL : configuredModel;
    const prediction = await requestTogetherPrediction({ apiKey, model, input });
    response.setHeader("Cache-Control", "no-store");
    response.status(200).json(prediction);
  } catch (error) {
    console.error("Together task prediction failed", error);
    const status = error instanceof InputValidationError ? 400 : 502;
    response.status(status).json({
      code: status === 400 ? "INVALID_PREDICTION_INPUT" : "TOGETHER_REQUEST_FAILED",
      message: status === 400 ? error.message : "AI 가사일 추천을 생성하지 못했어요.",
    });
  }
}

async function requestTogetherPrediction({ apiKey, model, input }) {
  const tokenBudgets = [800, 1600];
  let lastError;

  for (const maxTokens of tokenBudgets) {
    const togetherResponse = await fetch(TOGETHER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: maxTokens,
        reasoning: { enabled: false },
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "l_lander_housework_task",
            schema: OUTPUT_SCHEMA,
          },
        },
      }),
    });

    const payload = await togetherResponse.json().catch(() => null);
    if (!togetherResponse.ok) {
      const reason = payload?.error?.message || payload?.message || `Together API request failed: ${togetherResponse.status}`;
      throw new Error(reason);
    }

    const choice = payload?.choices?.[0];
    const content = extractMessageContent(choice?.message?.content);
    if (!content) {
      lastError = new Error("Together API returned an empty completion");
      continue;
    }

    try {
      return validatePredictionOutput(JSON.parse(stripJsonFence(content)), input);
    } catch (error) {
      lastError = error;
      const wasTruncated = choice?.finish_reason === "length" || isLikelyTruncatedJson(content, error);
      if (!wasTruncated) throw error;
      console.warn("Together JSON response was truncated; retrying with a larger token budget", {
        finishReason: choice?.finish_reason,
        maxTokens,
        contentLength: content.length,
      });
    }
  }

  throw lastError || new Error("Together API did not return valid JSON");
}

function extractMessageContent(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (typeof part === "string" ? part : part?.text || ""))
    .join("")
    .trim();
}

function stripJsonFence(content) {
  return content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function isLikelyTruncatedJson(content, error) {
  if (!(error instanceof SyntaxError)) return false;
  const trimmed = content.trim();
  return !trimmed.endsWith("}") || /unexpected end/i.test(error.message);
}

function buildSystemPrompt() {
  return [
    "너는 L-lander 앱의 가사일 추천 모델이다.",
    "사용자의 일정과 날씨 정보를 보고 적절한 가전 작업 하나를 추천한다.",
    "task_start_time과 task_end_time은 사용자의 일정이 끝난 뒤 수행 가능한 시간으로 정한다.",
    "task_date는 기본적으로 event_date와 같게 한다.",
    `task_appliance는 다음 값 중 하나만 사용한다: ${ALLOWED_APPLIANCES.join(", ")}.`,
    "추천할 작업이 적절하지 않으면 task_appliance를 none으로 설정한다.",
    "출력은 반드시 JSON만 반환하고 설명이나 마크다운을 포함하지 않는다.",
    `반드시 다음 JSON Schema를 따른다: ${JSON.stringify(OUTPUT_SCHEMA)}`,
  ].join("\n");
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body);

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function validatePredictionInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputValidationError("Request body must be a JSON object");
  }

  const missingField = INPUT_FIELDS.find((field) => !(field in value));
  if (missingField) {
    throw new InputValidationError(`${missingField} is required`);
  }

  const input = {
    event_title: String(value.event_title || "").trim(),
    event_date: String(value.event_date || ""),
    event_start_time: String(value.event_start_time || ""),
    event_end_time: String(value.event_end_time || ""),
    day_temp: toNullableNumber(value.day_temp),
    day_humidity: toNullableNumber(value.day_humidity),
    day_dust: toNullableNumber(value.day_dust),
  };

  if (!input.event_title) throw new InputValidationError("event_title is required");
  if (!isDateKey(input.event_date)) throw new InputValidationError("event_date must use YYYY-MM-DD");
  if (!isTimeValue(input.event_start_time) || !isTimeValue(input.event_end_time)) {
    throw new InputValidationError("event times must use HH:mm");
  }

  return input;
}

function validatePredictionOutput(value, input) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Together API returned invalid JSON");
  }

  const prediction = {
    task_appliance: String(value.task_appliance || "").trim().toLowerCase(),
    task_appliance_mode: String(value.task_appliance_mode || "").trim(),
    task_date: String(value.task_date || ""),
    task_start_time: String(value.task_start_time || ""),
    task_end_time: String(value.task_end_time || ""),
  };

  if (!ALLOWED_APPLIANCES.includes(prediction.task_appliance)) {
    throw new Error("Together API returned an unsupported appliance");
  }
  if (!prediction.task_appliance_mode) {
    prediction.task_appliance_mode = prediction.task_appliance === "none" ? "추천 없음" : "자동";
  }
  if (!isDateKey(prediction.task_date)) prediction.task_date = input.event_date;
  if (!isTimeValue(prediction.task_start_time) || !isTimeValue(prediction.task_end_time)) {
    throw new Error("Together API returned an invalid task time");
  }
  if (timeToMinutes(prediction.task_start_time) >= timeToMinutes(prediction.task_end_time)) {
    throw new Error("Together API returned a reversed task time range");
  }
  if (prediction.task_date < input.event_date) {
    throw new Error("Together API returned a task date before the event");
  }
  if (prediction.task_date === input.event_date && timeToMinutes(prediction.task_start_time) < timeToMinutes(input.event_end_time)) {
    throw new Error("Together API returned a task time before the event ends");
  }

  return prediction;
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeValue(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new InputValidationError("Weather values must be numbers or null");
  return number;
}

function normalizeSecret(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

class InputValidationError extends Error {}
