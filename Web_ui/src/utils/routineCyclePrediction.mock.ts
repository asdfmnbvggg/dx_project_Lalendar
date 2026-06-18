import {
  type ApplianceUsageLog,
  predictRoutineCycle,
} from "./routineCyclePrediction.js";

function createWasherLog(index: number, date: string): ApplianceUsageLog {
  return {
    id: `mock-washer-${index}`,
    appliance_id: "WM001",
    appliance_type: "washer",
    action_type: "start",
    started_at: `${date}T19:00:00+09:00`,
    ended_at: `${date}T20:00:00+09:00`,
    mode: "standard",
  };
}

export function runRoutineCyclePredictionMock() {
  const washerDates = [
    "2026-01-01",
    "2026-01-04",
    "2026-01-07",
    "2026-01-10",
    "2026-01-13",
    "2026-01-18",
    "2026-01-23",
    "2026-01-28",
  ];
  const washerLogs = washerDates.map((date, index) => createWasherLog(index, date));
  const prediction = predictRoutineCycle(washerLogs);

  console.log("washer routine cycle prediction mock", prediction);
  console.log("cycle_changed should be true:", prediction.cycle_changed);

  return prediction;
}
