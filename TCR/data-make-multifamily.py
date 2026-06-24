import csv
import random
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

RNG = random.Random(20260618)
KST = timezone(timedelta(hours=9))
ROOT_DIR = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT_DIR / "outputs" / "dummy_appliance_dataset"
OUT_DIR.mkdir(parents=True, exist_ok=True)

TRAIN_PATH = OUT_DIR / "appliance_usage_train.csv"
VALIDATION_PATH = OUT_DIR / "appliance_usage_validation.csv"
TEST_PATH = OUT_DIR / "appliance_usage_test_changed_routine.csv"
ALL_PATH = OUT_DIR / "appliance_usage_all.csv"
SUMMARY_PATH = OUT_DIR / "appliance_usage_dataset_summary.csv"
REPORT_PATH = OUT_DIR / "appliance_usage_generation_report.md"

FAMILY_COUNT = 110
APPLIANCE_TYPES = ("robot_cleaner", "dishwasher", "washer", "dryer")
CHANGE_GROUPS = (
    ("standard_change", 0.60),
    ("none", 0.20),
    ("interval_and_frequency_change", 0.10),
    ("irregular", 0.10),
)

NOISE = {
    "day_jitter_choices": [-1, 0, 0, 0, 1],
    "time_jitter_minutes": [30, 90],
    "missing_log_rate": [0.03, 0.07],
    "duplicate_usage_rate": [0.01, 0.03],
    "weekend_usage_boost": [0.05, 0.18],
}

APPLIANCE_META = {
    "robot_cleaner": {
        "base_cycle": 1,
        "changed_cycle": 2,
        "base_frequency": 1,
        "changed_frequency": 1,
        "duration": 55,
        "energy": 0.18,
        "modes": ["auto_clean", "edge_clean", "quiet_clean"],
        "base_hour": 10,
    },
    "dishwasher": {
        "base_cycle": 1,
        "changed_cycle": 1,
        "base_frequency": 1,
        "changed_frequency": 2,
        "duration": 78,
        "energy": 0.95,
        "modes": ["standard", "quick", "intensive"],
        "base_hour": 21,
    },
    "washer": {
        "base_cycle": 3,
        "changed_cycle": 4,
        "base_frequency": 1,
        "changed_frequency": 1,
        "duration": 65,
        "energy": 0.55,
        "modes": ["cotton", "quick_wash", "bedding", "delicate"],
        "base_hour": 19,
    },
    "dryer": {
        "base_cycle": 3,
        "changed_cycle": 4,
        "base_frequency": 1,
        "changed_frequency": 1,
        "duration": 85,
        "energy": 1.25,
        "modes": ["normal_dry", "speed_dry", "bedding_dry"],
        "base_hour": 21,
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
    "expected_base_cycle_days",
    "expected_changed_cycle_days",
    "expected_base_daily_frequency",
    "expected_changed_daily_frequency",
    "expected_change_type",
    "created_at",
]


def date_range(start, end):
    current = date.fromisoformat(start)
    last = date.fromisoformat(end)
    while current <= last:
        yield current
        current += timedelta(days=1)


def choose_change_group(index):
    # Deterministic distribution close to 60 / 20 / 10 / 10.
    ratio_index = index / FAMILY_COUNT
    cumulative = 0
    for name, ratio in CHANGE_GROUPS:
        cumulative += ratio
        if ratio_index < cumulative:
            return name
    return CHANGE_GROUPS[-1][0]


def expected_change_type(change_group, appliance_type):
    if change_group == "none":
        return "none"
    if change_group == "interval_and_frequency_change":
        return "interval_and_frequency_change"
    if change_group == "irregular":
        return "interval_and_frequency_change" if appliance_type == "dishwasher" else "interval_change"
    if appliance_type == "dishwasher":
        return "frequency_change"
    return "interval_change"


def changed_cycle(change_group, appliance_type):
    meta = APPLIANCE_META[appliance_type]
    if change_group == "none":
        return meta["base_cycle"]
    if change_group == "interval_and_frequency_change":
        return max(1, meta["changed_cycle"])
    if change_group == "irregular":
        return max(1, meta["changed_cycle"] + RNG.choice([-1, 0, 1]))
    return meta["changed_cycle"]


def changed_frequency(change_group, appliance_type):
    meta = APPLIANCE_META[appliance_type]
    if change_group == "none":
        return meta["base_frequency"]
    if change_group == "interval_and_frequency_change":
        return 2 if meta["base_frequency"] == 1 else meta["base_frequency"] + 1
    if appliance_type == "dishwasher":
        return meta["changed_frequency"]
    return meta["base_frequency"]


def family_profile(family_index):
    family_id = f"F{family_index:03d}"
    return {
        "family_id": family_id,
        "user_id": f"U{family_index:03d}",
        "change_group": choose_change_group(family_index - 1),
        "preferred_hour_shift": RNG.randint(-2, 2),
        "time_jitter": RNG.randint(*NOISE["time_jitter_minutes"]),
        "missing_rate": RNG.uniform(*NOISE["missing_log_rate"]),
        "duplicate_rate": RNG.uniform(*NOISE["duplicate_usage_rate"]),
        "weekend_boost": RNG.uniform(*NOISE["weekend_usage_boost"]),
        "duration_scale": RNG.uniform(0.85, 1.2),
        "energy_scale": RNG.uniform(0.8, 1.25),
    }


def planned_days(days, cycle, profile, irregular=False):
    selected = []
    cursor = RNG.randint(0, max(0, cycle - 1))
    while cursor < len(days):
        day = days[cursor]
        jitter = RNG.choice(NOISE["day_jitter_choices"])
        jittered_index = min(max(cursor + jitter, 0), len(days) - 1)
        candidate = days[jittered_index]
        if candidate not in selected:
            selected.append(candidate)
        extra_weekend = day.weekday() >= 5 and RNG.random() < profile["weekend_boost"]
        if extra_weekend and day not in selected:
            selected.append(day)
        step = cycle
        if irregular:
            step = max(1, cycle + RNG.choice([-2, -1, 0, 1, 2]))
        cursor += step
    return sorted(set(selected))


def usage_times(day, appliance_type, daily_frequency, profile):
    meta = APPLIANCE_META[appliance_type]
    if appliance_type == "dishwasher" and daily_frequency >= 2:
        base_hours = [13, 21]
    else:
        base_hours = [meta["base_hour"]]
    while len(base_hours) < daily_frequency:
        base_hours.append(min(23, base_hours[-1] + 3))
    times = []
    for hour in base_hours[:daily_frequency]:
        start = datetime.combine(
            day,
            time(min(max(hour + profile["preferred_hour_shift"], 5), 23), RNG.choice([0, 10, 20, 30, 40, 50])),
            tzinfo=KST,
        )
        start += timedelta(minutes=RNG.randint(-profile["time_jitter"], profile["time_jitter"]))
        times.append(start)
    return times


def build_row(log_index, profile, appliance_type, started_at, split, period_label, expected):
    meta = APPLIANCE_META[appliance_type]
    duration = max(10, round(RNG.gauss(meta["duration"] * profile["duration_scale"], meta["duration"] * 0.12)))
    energy = round(max(0.01, RNG.gauss(meta["energy"] * profile["energy_scale"], meta["energy"] * 0.12)), 3)
    ended_at = started_at + timedelta(minutes=duration)
    family_id = profile["family_id"]
    appliance_id = f"{family_id}_{appliance_type.upper()}"
    return {
        "log_id": f"{split.upper()}_{log_index:09d}",
        "user_id": profile["user_id"],
        "family_id": family_id,
        "appliance_id": appliance_id,
        "appliance_type": appliance_type,
        "device_name": f"{family_id}_{appliance_type}",
        "event_type": "usage",
        "action_type": "start",
        "operation_state": "completed",
        "mode": RNG.choice(meta["modes"]),
        "started_at": started_at.isoformat(),
        "ended_at": ended_at.isoformat(),
        "usage_date": started_at.date().isoformat(),
        "duration_minutes": duration,
        "energy_kwh": energy,
        "error_code": "",
        "source": "multi_family_synthetic_thinq_like_log",
        "dataset_split": split,
        "period_label": period_label,
        "expected_base_cycle_days": expected["base_cycle"],
        "expected_changed_cycle_days": expected["changed_cycle"],
        "expected_base_daily_frequency": expected["base_frequency"],
        "expected_changed_daily_frequency": expected["changed_frequency"],
        "expected_change_type": expected["change_type"],
        "created_at": ended_at.isoformat(),
    }


def generate_split_rows(split, start, end, changed):
    rows = []
    days = list(date_range(start, end))
    log_index = 1
    for family_index in range(1, FAMILY_COUNT + 1):
        profile = family_profile(family_index)
        for appliance_type in APPLIANCE_TYPES:
            meta = APPLIANCE_META[appliance_type]
            expected = {
                "base_cycle": meta["base_cycle"],
                "changed_cycle": changed_cycle(profile["change_group"], appliance_type),
                "base_frequency": meta["base_frequency"],
                "changed_frequency": changed_frequency(profile["change_group"], appliance_type),
                "change_type": expected_change_type(profile["change_group"], appliance_type),
            }
            cycle = expected["changed_cycle"] if changed else expected["base_cycle"]
            frequency = expected["changed_frequency"] if changed else expected["base_frequency"]
            irregular = profile["change_group"] == "irregular"
            active_days = planned_days(days, cycle, profile, irregular)
            for day in active_days:
                if RNG.random() < profile["missing_rate"]:
                    continue
                starts = usage_times(day, appliance_type, int(frequency), profile)
                if RNG.random() < profile["duplicate_rate"]:
                    starts.append(starts[-1] + timedelta(minutes=RNG.randint(35, 120)))
                for started_at in starts:
                    rows.append(build_row(log_index, profile, appliance_type, started_at, split, "changed_routine" if changed else "base_routine", expected))
                    log_index += 1
    return sorted(rows, key=lambda row: (row["started_at"], row["family_id"], row["appliance_type"]))


def write_csv(path, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def summarize(train_rows, validation_rows, test_rows):
    all_rows = train_rows + validation_rows + test_rows
    split_counts = Counter(row["dataset_split"] for row in all_rows)
    appliance_counts = Counter(row["appliance_type"] for row in all_rows)
    change_row_counts = Counter(row["expected_change_type"] for row in all_rows)
    family_change_types = {}
    for row in all_rows:
        family_change_types.setdefault((row["family_id"], row["expected_change_type"]), True)
    change_family_counts = Counter(change_type for _, change_type in family_change_types)
    summary_rows = []
    for key, value in {
        "total_rows": len(all_rows),
        "train_rows": len(train_rows),
        "validation_rows": len(validation_rows),
        "test_rows": len(test_rows),
        "family_count": len({row["family_id"] for row in all_rows}),
        "appliance_count": len({row["appliance_id"] for row in all_rows}),
        "period_train": "2025-01-01~2025-10-31",
        "period_validation": "2025-11-01~2025-12-31",
        "period_test": "2026-01-01~2026-03-31",
        "noise": json_like_noise(),
    }.items():
        summary_rows.append({"metric": key, "value": value})
    for key, value in split_counts.items():
        summary_rows.append({"metric": f"split_rows.{key}", "value": value})
    for key, value in appliance_counts.items():
        summary_rows.append({"metric": f"appliance_rows.{key}", "value": value})
    for key, value in change_family_counts.items():
        summary_rows.append({"metric": f"change_type_family_count.{key}", "value": value})
    for key, value in change_row_counts.items():
        summary_rows.append({"metric": f"change_type_row_count.{key}", "value": value})
    return summary_rows, split_counts, appliance_counts, change_family_counts, change_row_counts


def json_like_noise():
    return (
        "day_jitter=+-1; time_jitter=30~90min; missing=3~7%; "
        "duplicate=1~3%; weekend_boost=5~18%; family-specific duration/energy/time"
    )


def write_summary(path, summary_rows):
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["metric", "value"])
        writer.writeheader()
        writer.writerows(summary_rows)


def write_report(summary_rows, split_counts, appliance_counts, change_family_counts, change_row_counts):
    value_by_metric = {row["metric"]: row["value"] for row in summary_rows}
    lines = [
        "# Multi-family Appliance Usage Synthetic Dataset",
        "",
        "## Overview",
        "",
        f"- Total rows: {value_by_metric['total_rows']}",
        f"- Family count: {value_by_metric['family_count']}",
        f"- Appliance count: {value_by_metric['appliance_count']}",
        "- Periods: train 2025-01-01~2025-10-31, validation 2025-11-01~2025-12-31, test 2026-01-01~2026-03-31",
        "",
        "## Split row counts",
        *[f"- {key}: {value}" for key, value in sorted(split_counts.items())],
        "",
        "## Appliance row counts",
        *[f"- {key}: {value}" for key, value in sorted(appliance_counts.items())],
        "",
        "## Expected change type family counts",
        *[f"- {key}: {value}" for key, value in sorted(change_family_counts.items())],
        "",
        "## Expected change type row counts",
        *[f"- {key}: {value}" for key, value in sorted(change_row_counts.items())],
        "",
        "## Noise settings",
        "",
        f"- {json_like_noise()}",
    ]
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


def main():
    train_rows = generate_split_rows("train", "2025-01-01", "2025-10-31", changed=False)
    validation_rows = generate_split_rows("validation", "2025-11-01", "2025-12-31", changed=False)
    test_rows = generate_split_rows("test", "2026-01-01", "2026-03-31", changed=True)
    all_rows = sorted(train_rows + validation_rows + test_rows, key=lambda row: (row["started_at"], row["family_id"], row["appliance_type"]))
    write_csv(TRAIN_PATH, train_rows)
    write_csv(VALIDATION_PATH, validation_rows)
    write_csv(TEST_PATH, test_rows)
    write_csv(ALL_PATH, all_rows)
    summary_rows, split_counts, appliance_counts, change_family_counts, change_row_counts = summarize(train_rows, validation_rows, test_rows)
    write_summary(SUMMARY_PATH, summary_rows)
    write_report(summary_rows, split_counts, appliance_counts, change_family_counts, change_row_counts)

    print(f"train row count: {len(train_rows)}")
    print(f"validation row count: {len(validation_rows)}")
    print(f"test row count: {len(test_rows)}")
    print(f"total row count: {len(all_rows)}")
    print(f"family count: {len({row['family_id'] for row in all_rows})}")
    print(f"appliance count: {len({row['appliance_id'] for row in all_rows})}")
    print("expected_change_type distribution:")
    for key, value in sorted(change_row_counts.items()):
        print(f"- {key}: {value}")
    if len(all_rows) < 50000:
        raise RuntimeError(f"Generated row count is too small: {len(all_rows)}")


if __name__ == "__main__":
    main()
