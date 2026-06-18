# Multi-family Appliance Usage Synthetic Dataset

## Overview

- Total rows: 106786
- Family count: 110
- Appliance count: 440
- Periods: train 2025-01-01~2025-10-31, validation 2025-11-01~2025-12-31, test 2026-01-01~2026-03-31

## Split row counts
- test: 23708
- train: 69166
- validation: 13912

## Appliance row counts
- dishwasher: 40865
- dryer: 15922
- robot_cleaner: 34115
- washer: 15884

## Expected change type family counts
- frequency_change: 66
- interval_and_frequency_change: 22
- interval_change: 77
- none: 22

## Expected change type row counts
- frequency_change: 26201
- interval_and_frequency_change: 14861
- interval_change: 44680
- none: 21044

## Noise settings

- day_jitter=+-1; time_jitter=30~90min; missing=3~7%; duplicate=1~3%; weekend_boost=5~18%; family-specific duration/energy/time