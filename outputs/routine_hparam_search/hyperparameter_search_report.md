# Routine Hyperparameter Search Report

## 실험 목적

가전 사용 로그 기반 사용 주기 예측과 TTA-inspired Adaptive Cycle Recalibration의 interval/frequency 변화 감지 성능을 하이퍼파라미터 조합별로 비교한다.

## 데이터 split 설명

- 2025-01-01 ~ 2025-10-31: train
- 2025-11-01 ~ 2025-12-31: validation
- 2026-01-01 이후: changed routine test

## train/test 데이터 의미

`appliance_usage_train_1year.csv`는 2025년 기본 루틴 데이터이며, `appliance_usage_test_changed_routine.csv`는 학습 이후 새롭게 유입되는 changed routine test 데이터다. test는 validation이 아니라 TTA-inspired adaptation 성능 확인용이다.

## 탐색한 하이퍼파라미터 후보

```json
{
  "minRecentCount": [
    2,
    3,
    4,
    5
  ],
  "diffThresholdDays": [
    0.5,
    0.75,
    1.0,
    1.5,
    2.0
  ],
  "maxRecentStd": [
    0.5,
    1.0,
    1.2,
    1.5,
    2.0
  ],
  "alpha": [
    0.3,
    0.5,
    0.6,
    0.7,
    0.9
  ],
  "frequencyDiffThreshold": [
    0.3,
    0.5,
    0.7,
    1.0
  ],
  "frequencyRecentWindowDays": [
    7,
    14,
    21,
    30
  ]
}
```

## score 계산식

`score = 0.45 * overall_change_f1 + 0.25 * change_type_accuracy + 0.15 * normalized_cycle_score + 0.15 * normalized_frequency_score`

`normalized_cycle_score = 1 / (1 + cycle_mae)`

`normalized_frequency_score = 1 / (1 + daily_frequency_mae)`

## best hyperparameters

```json
{
  "params_id": "params_0386",
  "minRecentCount": 2,
  "diffThresholdDays": 0.5,
  "maxRecentStd": 2.0,
  "alpha": 0.9,
  "frequencyDiffThreshold": 0.3,
  "frequencyRecentWindowDays": 14,
  "change_type_accuracy": 1.0,
  "interval_change_precision": 1.0,
  "interval_change_recall": 1.0,
  "interval_change_f1": 1.0,
  "frequency_change_precision": 1.0,
  "frequency_change_recall": 1.0,
  "frequency_change_f1": 1.0,
  "overall_change_precision": 1.0,
  "overall_change_recall": 1.0,
  "overall_change_f1": 1.0,
  "cycle_mae": 0.08,
  "daily_frequency_mae": 0.04,
  "score": 0.98312
}
```

## 상위 10개 조합

| params_id | score | change_type_accuracy | overall_change_f1 | cycle_mae | daily_frequency_mae |
| --- | --- | --- | --- | --- | --- |
| params_0386 | 0.98312 | 1.0 | 1.0 | 0.08 | 0.04 |
| params_0390 | 0.98312 | 1.0 | 1.0 | 0.08 | 0.04 |
| params_0394 | 0.98312 | 1.0 | 1.0 | 0.08 | 0.04 |
| params_0786 | 0.98312 | 1.0 | 1.0 | 0.08 | 0.04 |
| params_0790 | 0.98312 | 1.0 | 1.0 | 0.08 | 0.04 |
| params_0794 | 0.98312 | 1.0 | 1.0 | 0.08 | 0.04 |
| params_1186 | 0.98312 | 1.0 | 1.0 | 0.08 | 0.04 |
| params_1190 | 0.98312 | 1.0 | 1.0 | 0.08 | 0.04 |
| params_1194 | 0.98312 | 1.0 | 1.0 | 0.08 | 0.04 |
| params_2386 | 0.98312 | 1.0 | 1.0 | 0.08 | 0.04 |

## 가전별 best params

```json
{
  "dishwasher": {
    "params_id": "params_0386",
    "expected_change_type": "frequency_change",
    "actual_change_type": "frequency_change",
    "score": 0.98312,
    "params": {
      "minRecentCount": 2,
      "diffThresholdDays": 0.5,
      "maxRecentStd": 2.0,
      "alpha": 0.9,
      "frequencyDiffThreshold": 0.3,
      "frequencyRecentWindowDays": 14
    }
  },
  "dryer": {
    "params_id": "params_0386",
    "expected_change_type": "interval_change",
    "actual_change_type": "interval_change",
    "score": 0.98312,
    "params": {
      "minRecentCount": 2,
      "diffThresholdDays": 0.5,
      "maxRecentStd": 2.0,
      "alpha": 0.9,
      "frequencyDiffThreshold": 0.3,
      "frequencyRecentWindowDays": 14
    }
  },
  "robot_cleaner": {
    "params_id": "params_0386",
    "expected_change_type": "interval_change",
    "actual_change_type": "interval_change",
    "score": 0.98312,
    "params": {
      "minRecentCount": 2,
      "diffThresholdDays": 0.5,
      "maxRecentStd": 2.0,
      "alpha": 0.9,
      "frequencyDiffThreshold": 0.3,
      "frequencyRecentWindowDays": 14
    }
  },
  "washer": {
    "params_id": "params_0386",
    "expected_change_type": "interval_change",
    "actual_change_type": "interval_change",
    "score": 0.98312,
    "params": {
      "minRecentCount": 2,
      "diffThresholdDays": 0.5,
      "maxRecentStd": 2.0,
      "alpha": 0.9,
      "frequencyDiffThreshold": 0.3,
      "frequencyRecentWindowDays": 14
    }
  }
}
```

## 가전별 expected vs actual change_type

| appliance_type | expected_change_type | change_type | base_cycle_days | recent_cycle_days | base_daily_frequency | recent_daily_frequency |
| --- | --- | --- | --- | --- | --- | --- |
| dishwasher | frequency_change | frequency_change | 1.0 | 1.0 | 1.0 | 1.93 |
| dryer | interval_change | interval_change | 3.0 | 4.0 | 1.0 | 1.0 |
| robot_cleaner | interval_change | interval_change | 1.0 | 2.0 | 1.0 | 1.0 |
| washer | interval_change | interval_change | 3.0 | 4.0 | 1.0 | 1.0 |

## dishwasher frequency_change 확인

dishwasher는 interval_days가 1일로 유지되므로 daily_usage_count 기반 frequency 변화가 핵심이다.
최적 조합에서 dishwasher actual change_type은 `frequency_change`이며, frequency_change 감지는 정상이다.

## 최종 해석

현재 최적 조합은 로봇청소기, 식기세척기, 세탁기, 건조기의 기대 변화 유형을 모두 맞추며, full retraining 없이 최근 로그의 interval/frequency 분포 변화만 반영한다.