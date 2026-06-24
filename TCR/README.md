# TTA-inspired Adaptive Cycle Recalibration

This folder implements a TTA-inspired cycle adaptation layer for appliance usage prediction.

It borrows the Test-Time Adaptation idea of adapting to service-time input distribution shifts, but it is not full model retraining and it is not deep learning TTA. The implementation only recalibrates an adaptive cycle parameter from unlabeled appliance usage logs.

## Flow

1. Estimate or receive `base_cycle_days` from the existing model or rule logic.
2. Calculate `recent_intervals` from newly observed service-time usage logs.
3. Use the median of those intervals as `recent_cycle_days`.
4. Detect a cycle shift when `recent_cycle_days` differs enough from `base_cycle_days`.
5. If a shift is detected, blend base and recent cycles into `adapted_cycle_days`.
6. Recalculate `next_expected_usage_date` from the latest usage date.

## Usage

```js
import { ttaInspiredAdaptiveCycleRecalibration } from "./adaptive-cycle-recalibration.js";

const result = ttaInspiredAdaptiveCycleRecalibration({
  usageLogs: ["2026-06-01", "2026-06-08", "2026-06-12", "2026-06-16"],
  baseCycleDays: 7,
});
```

Run the example:

```bash
node TCR/example.js
```

Run tests:

```bash
node --test TCR/adaptive-cycle-recalibration.test.js
```
