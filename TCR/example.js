import { ttaInspiredAdaptiveCycleRecalibration } from "./adaptive-cycle-recalibration.js";

const washerUsageLogs = [
  "2026-05-01",
  "2026-05-08",
  "2026-05-15",
  "2026-05-22",
  "2026-05-29",
  "2026-06-02",
  "2026-06-06",
  "2026-06-10",
  "2026-06-14",
];

const result = ttaInspiredAdaptiveCycleRecalibration({
  usageLogs: washerUsageLogs,
  baseCycleDays: 7,
  config: {
    recentWindowSize: 5,
    shiftRatioThreshold: 0.25,
    adaptationWeight: 0.4,
  },
});

console.log(JSON.stringify(result, null, 2));
