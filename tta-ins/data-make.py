import pandas as pd
import numpy as np
from datetime import datetime, timedelta, time, timezone
from pathlib import Path
import zipfile

rng = np.random.default_rng(42)
KST = timezone(timedelta(hours=9))

OUT_DIR = Path("/mnt/data")
train_path = OUT_DIR / "appliance_usage_train_1year.csv"
test_path = OUT_DIR / "appliance_usage_test_changed_routine.csv"
schema_path = OUT_DIR / "appliance_usage_dummy_schema.md"
zip_path = OUT_DIR / "appliance_usage_dummy_dataset.zip"

USER_ID = "U001"
FAMILY_ID = "F001"

APPLIANCES = {
    "robot_cleaner": {
        "appliance_id": "RC001",
        "device_name": "거실 로봇청소기",
        "modes": ["auto_clean", "edge_clean", "quiet_clean"],
        "duration_mean": 55,
        "duration_sd": 8,
        "energy_mean": 0.18,
        "energy_sd": 0.03,
    },
    "dishwasher": {
        "appliance_id": "DW001",
        "device_name": "주방 식기세척기",
        "modes": ["standard", "quick", "intensive"],
        "duration_mean": 78,
        "duration_sd": 10,
        "energy_mean": 0.95,
        "energy_sd": 0.12,
    },
    "washer": {
        "appliance_id": "WM001",
        "device_name": "세탁기",
        "modes": ["cotton", "quick_wash", "bedding", "delicate"],
        "duration_mean": 65,
        "duration_sd": 9,
        "energy_mean": 0.55,
        "energy_sd": 0.08,
    },
    "dryer": {
        "appliance_id": "DR001",
        "device_name": "건조기",
        "modes": ["normal_dry", "speed_dry", "bedding_dry"],
        "duration_mean": 85,
        "duration_sd": 12,
        "energy_mean": 1.25,
        "energy_sd": 0.18,
    },
}

def date_range(start: str, end: str):
    start_dt = datetime.fromisoformat(start).date()
    end_dt = datetime.fromisoformat(end).date()
    cur = start_dt
    while cur <= end_dt:
        yield cur
        cur += timedelta(days=1)

def make_dt(d, hour, minute):
    return datetime.combine(d, time(hour, minute), tzinfo=KST)

def jitter_minutes(base_dt, max_abs_minutes=18):
    return base_dt + timedelta(minutes=int(rng.integers(-max_abs_minutes, max_abs_minutes + 1)))

def positive_normal(mean, sd, min_value, digits=2):
    return round(max(min_value, rng.normal(mean, sd)), digits)

def choose_mode(appliance_type):
    return rng.choice(APPLIANCES[appliance_type]["modes"]).item()

def add_usage(rows, log_prefix, idx, appliance_type, start_dt, period_label, dataset_split):
    meta = APPLIANCES[appliance_type]
    duration = int(max(10, round(rng.normal(meta["duration_mean"], meta["duration_sd"]))))
    energy = positive_normal(meta["energy_mean"], meta["energy_sd"], 0.01, 3)
    ended_at = start_dt + timedelta(minutes=duration)

    rows.append({
        "log_id": f"{log_prefix}_{idx:06d}",
        "user_id": USER_ID,
        "family_id": FAMILY_ID,
        "appliance_id": meta["appliance_id"],
        "appliance_type": appliance_type,
        "device_name": meta["device_name"],
        "event_type": "usage",
        "action_type": "start",
        "operation_state": "completed",
        "mode": choose_mode(appliance_type),
        "started_at": start_dt.isoformat(),
        "ended_at": ended_at.isoformat(),
        "usage_date": start_dt.date().isoformat(),
        "duration_minutes": duration,
        "energy_kwh": energy,
        "error_code": "",
        "source": "dummy_thinq_like_log",
        "dataset_split": dataset_split,
        "period_label": period_label,
        "created_at": ended_at.isoformat(),
    })
    return idx + 1

def generate_train():
    rows = []
    idx = 1

    all_days = list(date_range("2025-01-01", "2025-12-31"))

    # 로봇청소기: Train 1일 주기
    for d in all_days:
        start = jitter_minutes(make_dt(d, 10, 0), 20)
        idx = add_usage(rows, "TRAIN", idx, "robot_cleaner", start, "base_routine", "train")

    # 식기세척기: Train 1일 1회
    for d in all_days:
        start = jitter_minutes(make_dt(d, 21, 10), 25)
        idx = add_usage(rows, "TRAIN", idx, "dishwasher", start, "base_routine", "train")

    # 세탁기/건조기: Train 3일 주기
    base_days = all_days[::3]
    for d in base_days:
        washer_start = jitter_minutes(make_dt(d, 19, 0), 30)
        idx = add_usage(rows, "TRAIN", idx, "washer", washer_start, "base_routine", "train")

        dryer_start = washer_start + timedelta(hours=1, minutes=50) + timedelta(minutes=int(rng.integers(0, 30)))
        idx = add_usage(rows, "TRAIN", idx, "dryer", dryer_start, "base_routine", "train")

    return pd.DataFrame(rows)

def generate_test():
    rows = []
    idx = 1

    all_days = list(date_range("2026-01-01", "2026-03-31"))

    # 로봇청소기: Test 2일 주기
    for d in all_days[::2]:
        start = jitter_minutes(make_dt(d, 10, 20), 20)
        idx = add_usage(rows, "TEST", idx, "robot_cleaner", start, "changed_routine", "test")

    # 식기세척기: Test 1일 2회
    for d in all_days:
        lunch_start = jitter_minutes(make_dt(d, 13, 10), 20)
        dinner_start = jitter_minutes(make_dt(d, 21, 20), 25)
        idx = add_usage(rows, "TEST", idx, "dishwasher", lunch_start, "changed_routine", "test")
        idx = add_usage(rows, "TEST", idx, "dishwasher", dinner_start, "changed_routine", "test")

    # 세탁기/건조기: Test 4일 주기
    changed_days = all_days[::4]
    for d in changed_days:
        washer_start = jitter_minutes(make_dt(d, 19, 15), 30)
        idx = add_usage(rows, "TEST", idx, "washer", washer_start, "changed_routine", "test")

        dryer_start = washer_start + timedelta(hours=1, minutes=55) + timedelta(minutes=int(rng.integers(0, 35)))
        idx = add_usage(rows, "TEST", idx, "dryer", dryer_start, "changed_routine", "test")

    return pd.DataFrame(rows)

train_df = generate_train().sort_values(["started_at", "appliance_id"]).reset_index(drop=True)
test_df = generate_test().sort_values(["started_at", "appliance_id"]).reset_index(drop=True)

train_df.to_csv(train_path, index=False, encoding="utf-8-sig")
test_df.to_csv(test_path, index=False, encoding="utf-8-sig")

schema = f"""# Appliance Usage Dummy Dataset

## 목적
가전 사용 로그 기반 기본 주기 예측 모델과 TTA-inspired adaptive cycle recalibration 로직 검증용 더미 데이터셋이다.

## 파일
- `appliance_usage_train_1year.csv`: 2025-01-01 ~ 2025-12-31, 기본 루틴 학습용 1년치 로그
- `appliance_usage_test_changed_routine.csv`: 2026-01-01 ~ 2026-03-31, 학습 이후 유입되는 주기 변화 로그

## 주기 설계
| appliance_type | Train 주기 | Test 주기 |
|---|---:|---:|
| robot_cleaner | 1일 1회 | 2일 1회 |
| dishwasher | 1일 1회 | 1일 2회 |
| washer | 3일 1회 | 4일 1회 |
| dryer | 3일 1회 | 4일 1회 |

## 컬럼 설명
| column | description |
|---|---|
| log_id | 로그 고유 ID |
| user_id | 더미 사용자 ID |
| family_id | 더미 가족 ID |
| appliance_id | 가전 ID |
| appliance_type | 가전 종류: robot_cleaner, dishwasher, washer, dryer |
| device_name | 가전 표시명 |
| event_type | usage 고정 |
| action_type | start 고정. 기존 TTA-inspired 코드에서 start 로그만 필터링할 수 있게 둠 |
| operation_state | completed 고정 |
| mode | 사용 모드/코스 |
| started_at | 사용 시작 시각, ISO 8601 +09:00 |
| ended_at | 사용 종료 시각, ISO 8601 +09:00 |
| usage_date | 사용 날짜, yyyy-mm-dd |
| duration_minutes | 사용 시간 |
| energy_kwh | 더미 소비 전력량 |
| error_code | 오류 코드. 정상 로그는 빈 값 |
| source | dummy_thinq_like_log 고정 |
| dataset_split | train 또는 test |
| period_label | base_routine 또는 changed_routine |
| created_at | 로그 생성 시각 |

## 생성 건수
- Train rows: {len(train_df):,}
- Test rows: {len(test_df):,}
"""

schema_path.write_text(schema, encoding="utf-8")

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(train_path, arcname=train_path.name)
    zf.write(test_path, arcname=test_path.name)
    zf.write(schema_path, arcname=schema_path.name)

summary = pd.DataFrame([
    ["train", "robot_cleaner", len(train_df[train_df.appliance_type=="robot_cleaner"]), "1일"],
    ["train", "dishwasher", len(train_df[train_df.appliance_type=="dishwasher"]), "1일 1회"],
    ["train", "washer", len(train_df[train_df.appliance_type=="washer"]), "3일"],
    ["train", "dryer", len(train_df[train_df.appliance_type=="dryer"]), "3일"],
    ["test", "robot_cleaner", len(test_df[test_df.appliance_type=="robot_cleaner"]), "2일"],
    ["test", "dishwasher", len(test_df[test_df.appliance_type=="dishwasher"]), "1일 2회"],
    ["test", "washer", len(test_df[test_df.appliance_type=="washer"]), "4일"],
    ["test", "dryer", len(test_df[test_df.appliance_type=="dryer"]), "4일"],
], columns=["split", "appliance_type", "rows", "designed_pattern"])

summary
