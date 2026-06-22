import csv
import random
import zipfile
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

RNG = random.Random(42)
KST = timezone(timedelta(hours=9))

BASE_DIR = Path(__file__).resolve().parent
OUT_DIR = BASE_DIR / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

TRAIN_PATH = OUT_DIR / "train.csv"
VALIDATION_PATH = OUT_DIR / "validation.csv"
TEST_PATH = OUT_DIR / "test.csv"
TRAIN_1YEAR_PATH = OUT_DIR / "appliance_usage_train_1year.csv"
CHANGED_TEST_PATH = OUT_DIR / "appliance_usage_test_changed_routine.csv"
SCHEMA_PATH = OUT_DIR / "schema.md"
ZIP_PATH = OUT_DIR / "appliance_usage_dummy_dataset.zip"

USER_ID = "U001"
FAMILY_ID = "F001"

APPLIANCES = {
    "robot_cleaner": {
        "appliance_id": "RC001",
        "device_name": "living_room_robot_cleaner",
        "modes": ["auto_clean", "edge_clean", "quiet_clean"],
        "duration_mean": 55,
        "duration_sd": 8,
        "energy_mean": 0.18,
        "energy_sd": 0.03,
    },
    "dishwasher": {
        "appliance_id": "DW001",
        "device_name": "kitchen_dishwasher",
        "modes": ["standard", "quick", "intensive"],
        "duration_mean": 78,
        "duration_sd": 10,
        "energy_mean": 0.95,
        "energy_sd": 0.12,
    },
    "washer": {
        "appliance_id": "WM001",
        "device_name": "washer",
        "modes": ["cotton", "quick_wash", "bedding", "delicate"],
        "duration_mean": 65,
        "duration_sd": 9,
        "energy_mean": 0.55,
        "energy_sd": 0.08,
    },
    "dryer": {
        "appliance_id": "DR001",
        "device_name": "dryer",
        "modes": ["normal_dry", "speed_dry", "bedding_dry"],
        "duration_mean": 85,
        "duration_sd": 12,
        "energy_mean": 1.25,
        "energy_sd": 0.18,
    },
}

FIELDNAMES = [
    "log_id",
    "user_id",
    "family_id",
    "appliance_id",
    "appliance_type",
    "device_name",
    "event_type",
    "action_type",
    "operation_state",
    "mode",
    "started_at",
    "ended_at",
    "usage_date",
    "duration_minutes",
    "energy_kwh",
    "error_code",
    "source",
    "dataset_split",
    "period_label",
    "created_at",
]


def date_range(start: str, end: str):
    current = date.fromisoformat(start)
    last = date.fromisoformat(end)
    while current <= last:
        yield current
        current += timedelta(days=1)


def jittered_datetime(day: date, hour: int, minute: int, max_abs_minutes: int = 20):
    base = datetime.combine(day, time(hour, minute), tzinfo=KST)
    return base + timedelta(minutes=RNG.randint(-max_abs_minutes, max_abs_minutes))


def positive_gauss(mean: float, sd: float, min_value: float, digits: int = 3):
    return round(max(min_value, RNG.gauss(mean, sd)), digits)


def add_usage(rows, prefix, idx, appliance_type, started_at, period_label, dataset_split):
    meta = APPLIANCES[appliance_type]
    duration = max(10, round(RNG.gauss(meta["duration_mean"], meta["duration_sd"])))
    ended_at = started_at + timedelta(minutes=duration)

    rows.append(
        {
            "log_id": f"{prefix}_{idx:06d}",
            "user_id": USER_ID,
            "family_id": FAMILY_ID,
            "appliance_id": meta["appliance_id"],
            "appliance_type": appliance_type,
            "device_name": meta["device_name"],
            "event_type": "usage",
            "action_type": "start",
            "operation_state": "completed",
            "mode": RNG.choice(meta["modes"]),
            "started_at": started_at.isoformat(),
            "ended_at": ended_at.isoformat(),
            "usage_date": started_at.date().isoformat(),
            "duration_minutes": duration,
            "energy_kwh": positive_gauss(meta["energy_mean"], meta["energy_sd"], 0.01),
            "error_code": "",
            "source": "dummy_thinq_like_log",
            "dataset_split": dataset_split,
            "period_label": period_label,
            "created_at": ended_at.isoformat(),
        }
    )
    return idx + 1


def generate_daily_rows(rows, prefix, idx, appliance_type, days, starts, period_label, split):
    for day in days:
        # Small missing-log rate keeps the dataset realistic without breaking the app.
        if RNG.random() < 0.02:
            continue
        for hour, minute in starts:
            if RNG.random() < 0.03:
                continue
            idx = add_usage(
                rows,
                prefix,
                idx,
                appliance_type,
                jittered_datetime(day, hour, minute),
                period_label,
                split,
            )
    return idx


def generate_interval_rows(rows, prefix, idx, appliance_type, days, cycle_days, hour, minute, period_label, split):
    cursor = 0
    while cursor < len(days):
        day = days[cursor]
        if RNG.random() >= 0.05:
            idx = add_usage(
                rows,
                prefix,
                idx,
                appliance_type,
                jittered_datetime(day, hour, minute, 30),
                period_label,
                split,
            )
        # Allow roughly one day of natural variation around the designed cycle.
        cursor += max(1, cycle_days + RNG.choice([-1, 0, 0, 0, 1]))
    return idx


def generate_split(start, end, split, period_label, prefix, changed=False):
    rows = []
    idx = 1
    days = list(date_range(start, end))

    robot_cycle = 2 if changed else 1
    washer_cycle = 4 if changed else 3
    dryer_cycle = 4 if changed else 3
    dishwasher_starts = [(13, 10), (21, 20)] if changed else [(21, 10)]

    idx = generate_interval_rows(
        rows, prefix, idx, "robot_cleaner", days, robot_cycle, 10, 0, period_label, split
    )
    idx = generate_daily_rows(
        rows, prefix, idx, "dishwasher", days, dishwasher_starts, period_label, split
    )
    idx = generate_interval_rows(
        rows, prefix, idx, "washer", days, washer_cycle, 19, 0, period_label, split
    )
    idx = generate_interval_rows(
        rows, prefix, idx, "dryer", days, dryer_cycle, 21, 0, period_label, split
    )

    return sorted(rows, key=lambda row: (row["started_at"], row["appliance_id"]))


def write_csv(path, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def write_schema(train_rows, validation_rows, test_rows):
    schema = f"""# Appliance Usage Dummy Dataset

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

- train rows: {len(train_rows):,}
- validation rows: {len(validation_rows):,}
- changed routine test rows: {len(test_rows):,}
"""
    SCHEMA_PATH.write_text(schema, encoding="utf-8")


def main():
    train_rows = generate_split(
        "2025-01-01",
        "2025-10-31",
        "train",
        "base_routine",
        "TRAIN",
        changed=False,
    )
    validation_rows = generate_split(
        "2025-11-01",
        "2025-12-31",
        "validation",
        "base_routine",
        "VALID",
        changed=False,
    )
    test_rows = generate_split(
        "2026-01-01",
        "2026-03-31",
        "test",
        "changed_routine",
        "TEST",
        changed=True,
    )

    write_csv(TRAIN_PATH, train_rows)
    write_csv(VALIDATION_PATH, validation_rows)
    write_csv(TEST_PATH, test_rows)
    write_csv(TRAIN_1YEAR_PATH, sorted(train_rows + validation_rows, key=lambda row: (row["started_at"], row["appliance_id"])))
    write_csv(CHANGED_TEST_PATH, test_rows)
    write_schema(train_rows, validation_rows, test_rows)

    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in (TRAIN_PATH, VALIDATION_PATH, TEST_PATH, TRAIN_1YEAR_PATH, CHANGED_TEST_PATH, SCHEMA_PATH):
            archive.write(path, arcname=path.name)

    print(
        {
            "train_rows": len(train_rows),
            "validation_rows": len(validation_rows),
            "test_rows": len(test_rows),
            "out_dir": str(OUT_DIR),
        }
    )


if __name__ == "__main__":
    main()
