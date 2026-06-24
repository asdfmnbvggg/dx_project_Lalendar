import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateIntervals,
  estimateBaseCycleDays,
  ttaInspiredAdaptiveCycleRecalibration,
} from "./adaptive-cycle-recalibration.js";

test("calculates usage intervals in days", () => {
  assert.deepEqual(calculateIntervals(["2026-06-01", "2026-06-04", "2026-06-09"]), [
    3,
    5,
  ]);
});

test("estimates base_cycle_days from historical log median", () => {
  assert.equal(
    estimateBaseCycleDays(["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-23"]),
    7
  );
});

test("keeps base cycle when recent intervals are not meaningfully different", () => {
  const result = ttaInspiredAdaptiveCycleRecalibration({
    usageLogs: ["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22"],
    baseCycleDays: 7,
  });

  assert.equal(result.cycle_shift_detected, false);
  assert.equal(result.adapted_cycle_days, 7);
  assert.equal(result.next_expected_usage_date, "2026-06-29");
});

test("applies TTA-inspired adaptive cycle recalibration after a detected shift", () => {
  const result = ttaInspiredAdaptiveCycleRecalibration({
    usageLogs: [
      "2026-05-01",
      "2026-05-08",
      "2026-05-15",
      "2026-05-22",
      "2026-05-29",
      "2026-06-02",
      "2026-06-06",
      "2026-06-10",
    ],
    baseCycleDays: 7,
    config: {
      recentWindowSize: 5,
      shiftRatioThreshold: 0.25,
      adaptationWeight: 0.5,
    },
  });

  assert.equal(result.cycle_shift_detected, true);
  assert.equal(result.recent_cycle_days, 4);
  assert.equal(result.adapted_cycle_days, 5.5);
  assert.equal(result.next_expected_usage_date, "2026-06-16");
});
