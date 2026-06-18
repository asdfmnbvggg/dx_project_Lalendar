const AI_APPLIANCE_MODES = {
  washer: ["표준", "울", "이불", "삶음", "아기옷", "조용조용", "스피드", "기능성", "통살균", "헹굼+탈수"],
  dryer: ["표준", "타월", "셔츠", "울", "이불", "소량급속", "기능성", "선반건조", "패딩케어"],
  air_conditioner: ["냉방", "파워", "제습", "송풍", "취침"],
  dishwasher: ["표준", "강력", "급속", "섬세", "살균", "통살균"],
  air_purifier: ["자동", "터보", "취침", "에코", "펫", "순환"],
  robot_cleaner: ["자동", "구역", "스팟", "물걸레"],
};

export async function predictHouseworkTask(input) {
  const response = await fetch("/api/predict-task", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || `AI task prediction failed: ${response.status}`);
    error.code = payload?.code || "AI_TASK_PREDICTION_FAILED";
    throw error;
  }

  return validatePrediction(payload);
}

function validatePrediction(prediction) {
  const appliance = String(prediction?.task_appliance || "").trim().toLowerCase();
  const mode = String(prediction?.task_appliance_mode || "").trim();
  const allowedModes = AI_APPLIANCE_MODES[appliance];

  if (!allowedModes) {
    throw createInvalidPredictionError(`허용되지 않은 가전 응답: ${appliance || "(없음)"}`);
  }
  if (!allowedModes.includes(mode)) {
    throw createInvalidPredictionError(`가전과 맞지 않는 모드 응답: ${appliance}/${mode || "(없음)"}`);
  }

  return {
    ...prediction,
    task_appliance: appliance,
    task_appliance_mode: mode,
  };
}

function createInvalidPredictionError(message) {
  const error = new Error(message);
  error.code = "INVALID_AI_TASK_PREDICTION";
  return error;
}
