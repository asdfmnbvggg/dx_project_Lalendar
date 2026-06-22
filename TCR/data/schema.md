# Appliance Usage Dummy Dataset

This dataset mimics ThinQ-like appliance usage logs for routine cycle prediction and
TTA-inspired adaptive cycle recalibration.

## Time-based split

- `train.csv`: 2025-01-01 ~ 2025-10-31, base routine
- `validation.csv`: 2025-11-01 ~ 2025-12-31, base routine validation
- `test.csv`: 2026-01-01 and later, changed routine test

## Designed patterns

| appliance_type | train/validation pattern | changed routine test pattern |
|---|---:|---:|
| robot_cleaner | every 1 day | every 2 days |
| dishwasher | 1 use per day | 2 uses per day |
| washer | every 3 days | every 4 days |
| dryer | every 3 days | every 4 days |

The generator adds small usage-day jitter and a few missing logs so downstream code
must remain null-safe and robust instead of assuming perfectly regular intervals.

## Row counts

- train rows: 715
- validation rows: 142
- changed routine test rows: 259
