const TOGETHER_CHAT_COMPLETIONS_URL = "https://api.together.xyz/v1/chat/completions";
const DEFAULT_MODEL = "Qwen/Qwen3.5-9B";
const LEGACY_NON_SERVERLESS_MODELS = new Set(["Qwen/Qwen3-8B"]);
const APPLIANCE_MODES = {
  washer: ["표준", "울", "이불", "삶음", "아기옷", "조용조용", "스피드", "기능성", "통살균", "헹굼+탈수"],
  dryer: ["표준", "타월", "셔츠", "울", "이불", "소량급속", "기능성", "선반건조", "패딩케어"],
  air_conditioner: ["냉방", "파워", "제습", "송풍", "취침"],
  dishwasher: ["표준", "강력", "급속", "섬세", "살균", "통살균"],
  air_purifier: ["자동", "터보", "취침", "에코", "펫", "순환"],
  robot_cleaner: ["자동", "구역", "스팟", "물걸레"],
  none: ["none"],
};
const MODE_GUIDANCE = {
  washer: {
    표준: "일상복, 면, 청바지, 양말 등 일반 세탁",
    울: "스웨터, 가디건, 니트, 실크, 란제리 등 손상에 취약한 옷",
    이불: "차렵이불, 담요, 침대커버 등 부피가 큰 침구",
    삶음: "땀, 기름, 찌든 때가 심하거나 수건·행주 등 살균이 필요한 면 소재",
    아기옷: "배냇저고리, 아기 내복, 턱받이 등 영유아 의류의 살균과 오염 제거",
    조용조용: "밤이나 새벽에 소음을 줄여 세탁해야 하는 오염이 심하지 않은 옷",
    스피드: "오염이 적고 급하게 세탁해야 하는 소량의 옷",
    기능성: "등산복, 레깅스, 골프웨어, 바람막이, 고어텍스 등 스포츠·아웃도어 의류",
    통살균: "세탁물 없이 세탁조 내부를 청소하는 월간 관리",
    "헹굼+탈수": "수영복, 비 맞은 옷, 손빨래한 옷처럼 세제 없이 헹구고 탈수할 때",
  },
  dryer: {
    표준: "일상복과 면·마·혼방 의류의 일반 건조",
    타월: "수건을 풍성하게 고온 건조하거나 살균이 필요할 때",
    셔츠: "와이셔츠, 남방, 교복 등 구김을 줄여야 하는 의류",
    울: "울, 니트, 란제리 등 열과 변형에 취약한 소재",
    이불: "이불과 담요 등 부피가 큰 침구",
    소량급속: "1kg 미만의 소량 빨래를 빠르게 건조할 때",
    기능성: "등산복, 고어텍스, 스키복 등 기능성 의류의 발수력 관리",
    선반건조: "운동화, 모자, 니트처럼 회전 건조 시 변형되기 쉬운 물건",
    패딩케어: "숨이 죽은 패딩과 구스다운의 볼륨 회복",
  },
  air_conditioner: {
    냉방: "일상적으로 실내 온도를 24~26도로 낮출 때",
    파워: "귀가 직후처럼 실내 온도를 빠르게 낮춰야 할 때",
    제습: "장마철이나 높은 습도로 실내가 눅눅할 때",
    송풍: "온도와 습도는 적당하지만 공기 순환이 필요할 때",
    취침: "수면 중 약풍으로 시원함을 유지할 때",
  },
  dishwasher: {
    표준: "밥그릇, 국그릇, 접시 등 일반 식기",
    강력: "고기·기름 요리 후 프라이팬, 불판, 냄비 등 오염이 심한 식기",
    급속: "커피잔, 디저트 접시 등 오염이 적은 소량 식기",
    섬세: "와인잔, 얇은 유리컵, 도자기처럼 깨지기 쉬운 식기",
    살균: "아기 젖병, 도마 등 고온 살균이 필요한 식기",
    통살균: "식기 없이 식기세척기 내부를 청소하는 월간 관리",
  },
  air_purifier: {
    자동: "평상시 오염도에 따라 풍량을 자동 조절할 때",
    터보: "청소·환기·외출 후 먼지와 냄새가 많을 때",
    취침: "수면 중 소음을 최소화하며 공기를 관리할 때",
    에코: "공기가 비교적 깨끗하고 절전이 중요할 때",
    펫: "반려동물의 털과 바닥 냄새를 집중 관리할 때",
    순환: "에어컨과 함께 쓰거나 넓은 공간의 공기를 순환할 때",
  },
  robot_cleaner: {
    자동: "외출 중 집 전체를 일반 청소할 때",
    구역: "주방이나 특정 방 등 선택한 공간만 청소할 때",
    스팟: "과자 부스러기, 고양이 모래 등 특정 지점을 집중 청소할 때",
    물걸레: "흡입 없이 바닥의 찌든 때를 닦거나 조용히 청소할 때",
  },
};
const ALLOWED_APPLIANCES = Object.keys(APPLIANCE_MODES);
const ALLOWED_MODES = [...new Set(Object.values(APPLIANCE_MODES).flat())];

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
      enum: ALLOWED_MODES,
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
      console.warn("Together returned an invalid prediction; retrying", {
        finishReason: choice?.finish_reason,
        maxTokens,
        contentLength: content.length,
        reason: error instanceof Error ? error.message : String(error),
        wasTruncated,
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
    "If no housework is needed for the event, return task_appliance \"none\" and task_appliance_mode \"none\".",
    "너는 L-lander 앱의 가사일 추천 모델이다.",
    "입력된 일정과 당일 날씨를 깊이 분석해 가장 상식적이고 필요한 가전 작업 정확히 하나를 추천한다.",
    "가전과 모드는 반드시 아래 목록에서 서로 맞는 조합으로만 선택한다. 목록에 없는 가전이나 모드는 절대 만들지 않는다.",
    ...Object.entries(MODE_GUIDANCE).flatMap(([appliance, modes]) => [
      `[${appliance}]`,
      ...Object.entries(modes).map(([mode, guidance]) => `- ${mode}: ${guidance}`),
    ]),
    "",
    "[일정 유형별 최우선 매칭]",
    "1. 탐방, 서핑, 등산, 산책, 운동회 등 야외 활동: 귀가 후에는 세탁기 기능성 계열을 우선한다. 더위나 습도가 높으면 귀가 전 에어컨 냉방/제습, 외출 중에는 로봇청소기도 고려한다.",
    "2. 손님 방문, 지인 초대, 홈파티: 손님 도착 전 로봇청소기 또는 공기청정기를 우선하고, 식사 종료 후에는 식기세척기 강력/살균을 우선한다.",
    "3. 장보기, 영화, 외식 등 일반 외출: 외출복 관리는 세탁기 또는 건조기를 고려하고, 덥거나 습하면 귀가 전 에어컨 냉방/제습을 우선한다.",
    "",
    "[시간 배치 규칙]",
    "- 사전 준비는 event_start_time 전에 끝낸다.",
    "- 외출 중 청소는 event_start_time과 event_end_time 사이에 배치한다.",
    "- 사후 작업은 event_end_time 이후에 시작한다.",
    "- task_date는 event_date와 같게 하고 시작 시간은 종료 시간보다 빨라야 한다.",
    "- 일정과 날씨에 가장 자연스러운 타이밍 하나를 선택한다.",
    "",
    "날씨 근거를 반드시 판단에 반영한다. 고온이면 에어컨 냉방/파워, 높은 습도면 에어컨 제습 또는 건조기, 미세먼지가 높으면 공기청정기를 우선 고려한다.",
    "Choose a schema appliance value only. Use none only when the event does not need any housework; do not output dehumidifier or other appliance names.",
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
  if (!APPLIANCE_MODES[prediction.task_appliance].includes(prediction.task_appliance_mode)) {
    throw new Error("Together API returned a mode that does not belong to the selected appliance");
  }
  if (!isDateKey(prediction.task_date) || prediction.task_date !== input.event_date) {
    throw new Error("Together API returned a task date different from the event date");
  }
  if (!isTimeValue(prediction.task_start_time) || !isTimeValue(prediction.task_end_time)) {
    throw new Error("Together API returned an invalid task time");
  }
  if (timeToMinutes(prediction.task_start_time) >= timeToMinutes(prediction.task_end_time)) {
    throw new Error("Together API returned a reversed task time range");
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
