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

function createDishwasherLog(index: number, date: string, hour: string): ApplianceUsageLog {
  return {
    id: `mock-dishwasher-${index}`,
    appliance_id: "DW001",
    appliance_type: "dishwasher",
    action_type: "start",
    started_at: `${date}T${hour}:00:00+09:00`,
    ended_at: `${date}T${hour}:45:00+09:00`,
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

  return prediction;
}

export function runDailyFrequencyPredictionMock() {
  const baseDates = ["2026-02-01", "2026-02-02", "2026-02-03", "2026-02-04"];
  const recentDates = ["2026-02-05", "2026-02-06", "2026-02-07"];
  const dishwasherLogs = [
    ...baseDates.map((date, index) => createDishwasherLog(index, date, "20")),
    ...recentDates.flatMap((date, index) => [
      createDishwasherLog(100 + index * 2, date, "13"),
      createDishwasherLog(101 + index * 2, date, "21"),
    ]),
  ];
  const prediction = predictRoutineCycle(dishwasherLogs);

  return prediction;
}
