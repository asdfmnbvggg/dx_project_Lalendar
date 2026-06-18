import csv
import json
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from statistics import mean, median, pstdev

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
RESULT_DIR = BASE_DIR / "results"
CONFIG_PATH = BASE_DIR / "routine_cycle_config.json"

TRAIN_PATH = DATA_DIR / "train.csv"
VALIDATION_PATH = DATA_DIR / "validation.csv"
TEST_PATH = DATA_DIR / "test.csv"

MODEL_PATH = RESULT_DIR / "routine_cycle_model.json"
VALIDATION_PREDICTIONS_PATH = RESULT_DIR / "validation_predictions.csv"
TEST_PREDICTIONS_PATH = RESULT_DIR / "test_predictions.csv"
METRICS_PATH = RESULT_DIR / "metrics.json"

EXPECTED_TEST_PATTERNS = {
    "robot_cleaner": {"actual_cycle_days": 2, "actual_daily_frequency": 1, "actual_changed": True, "expected_change_type": "interval_change"},
    "dishwasher": {"actual_cycle_days": 1, "actual_daily_frequency": 2, "actual_changed": True, "expected_change_type": "frequency_change"},
    "washer": {"actual_cycle_days": 4, "actual_daily_frequency": 1, "actual_changed": True, "expected_change_type": "interval_change"},
    "dryer": {"actual_cycle_days": 4, "actual_daily_frequency": 1, "actual_changed": True, "expected_change_type": "interval_change"},
}

EXPECTED_VALIDATION_PATTERNS = {
    "robot_cleaner": {"actual_cycle_days": 1, "actual_daily_frequency": 1, "actual_changed": False, "expected_change_type": "none"},
    "dishwasher": {"actual_cycle_days": 1, "actual_daily_frequency": 1, "actual_changed": False, "expected_change_type": "none"},
    "washer": {"actual_cycle_days": 3, "actual_daily_frequency": 1, "actual_changed": False, "expected_change_type": "none"},
    "dryer": {"actual_cycle_days": 3, "actual_daily_frequency": 1, "actual_changed": False, "expected_change_type": "none"},
}


def load_config(profile="default"):
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    return config[profile]


CONFIG = load_config("default")
MIN_RECENT_COUNT = CONFIG["minRecentCount"]
RECENT_WINDOW_SIZE = CONFIG["recentWindowSize"]
DIFF_THRESHOLD_DAYS = CONFIG["diffThresholdDays"]
MAX_RECENT_STD = CONFIG["maxRecentStd"]
FREQUENCY_DIFF_THRESHOLD = CONFIG["frequencyDiffThreshold"]
FREQUENCY_RECENT_WINDOW_DAYS = CONFIG["frequencyRecentWindowDays"]
ALPHA = CONFIG["alpha"]


def apply_config(config):
    global MIN_RECENT_COUNT, RECENT_WINDOW_SIZE, DIFF_THRESHOLD_DAYS
    global MAX_RECENT_STD, FREQUENCY_DIFF_THRESHOLD, FREQUENCY_RECENT_WINDOW_DAYS, ALPHA

    MIN_RECENT_COUNT = config["minRecentCount"]
    RECENT_WINDOW_SIZE = config.get("recentWindowSize", max(3, config["minRecentCount"]))
    DIFF_THRESHOLD_DAYS = config["diffThresholdDays"]
    MAX_RECENT_STD = config["maxRecentStd"]
    FREQUENCY_DIFF_THRESHOLD = config["frequencyDiffThreshold"]
    FREQUENCY_RECENT_WINDOW_DAYS = config["frequencyRecentWindowDays"]
    ALPHA = config["alpha"]


def active_config():
    return {
        "minRecentCount": MIN_RECENT_COUNT,
        "recentWindowSize": RECENT_WINDOW_SIZE,
        "diffThresholdDays": DIFF_THRESHOLD_DAYS,
        "maxRecentStd": MAX_RECENT_STD,
        "alpha": ALPHA,
        "frequencyDiffThreshold": FREQUENCY_DIFF_THRESHOLD,
        "frequencyRecentWindowDays": FREQUENCY_RECENT_WINDOW_DAYS,
    }


def read_logs(path):
    if not path.exists():
        raise FileNotFoundError(f"Missing data file: {path}")

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def date_key(log):
    raw = log.get("started_at") or log.get("usage_date") or ""
    return raw[:10] if len(raw) >= 10 else ""


def group_by_appliance(logs):
    grouped = defaultdict(list)
    for log in logs:
        if log.get("action_type") != "start":
            continue
        key = (log.get("appliance_id") or "unknown", log.get("appliance_type") or "unknown")
        grouped[key].append(log)
    return grouped


def usage_dates(logs):
    return sorted({date_key(log) for log in logs if date_key(log)})


def calculate_intervals(dates):
    parsed_dates = [date.fromisoformat(item) for item in sorted(set(dates))]
    return [
        (current - previous).days
        for previous, current in zip(parsed_dates, parsed_dates[1:])
        if (current - previous).days > 0
    ]


def daily_usage_counts(logs):
    counts = defaultdict(int)
    for log in logs:
        key = date_key(log)
        if key:
            counts[key] += 1
    return [{"date": key, "count": counts[key]} for key in sorted(counts)]


def count_values(counts):
    return [item["count"] for item in counts]


def split_recent_frequency_counts(counts):
    if not counts:
        return [], []
    last_date = date.fromisoformat(counts[-1]["date"])
    start_date = last_date - timedelta(days=FREQUENCY_RECENT_WINDOW_DAYS - 1)
    base_counts = [item for item in counts if date.fromisoformat(item["date"]) < start_date]
    recent_counts = [item for item in counts if date.fromisoformat(item["date"]) >= start_date]
    return base_counts, recent_counts


def safe_median(values):
    numeric = [value for value in values if value is not None]
    if not numeric:
        return None
    return round(float(median(numeric)), 2)


def safe_mean(values):
    numeric = [value for value in values if value is not None]
    if not numeric:
        return None
    return round(float(mean(numeric)), 2)


def safe_std(values):
    numeric = [value for value in values if value is not None]
    if not numeric:
        return None
    return round(float(pstdev(numeric)), 2)


def add_days(date_text, days):
    if not date_text or days is None:
        return None
    return (date.fromisoformat(date_text) + timedelta(days=round(days))).isoformat()


def build_base_model(train_logs):
    model = {}
    for (appliance_id, appliance_type), logs in group_by_appliance(train_logs).items():
        dates = usage_dates(logs)
        intervals = calculate_intervals(dates)
        frequencies = daily_usage_counts(logs)
        model[appliance_id] = {
            "appliance_id": appliance_id,
            "appliance_type": appliance_type,
            "base_cycle_days": safe_median(intervals),
            "base_daily_frequency": safe_mean(count_values(frequencies)),
            "train_log_count": len(logs),
            "train_active_days": len(dates),
        }
    return model


def change_type(interval_changed, frequency_changed):
    if interval_changed and frequency_changed:
        return "interval_and_frequency_change"
    if interval_changed:
        return "interval_change"
    if frequency_changed:
        return "frequency_change"
    return "none"


def reason_for(result):
    if result["change_type"] == "interval_change":
        return (
            f"최근 사용 주기가 바뀐 것 같아요. 기존에는 약 {result['base_cycle_days']}일마다 "
            f"사용했지만, 최근에는 약 {result['recent_cycle_days']}일 간격으로 사용되고 있어요."
        )
    if result["change_type"] == "frequency_change":
        return (
            f"최근 하루 사용 횟수가 늘어난 것 같아요. 기존에는 하루 {result['base_daily_frequency']}회 "
            f"사용했지만, 최근에는 하루 {result['recent_daily_frequency']}회 사용하는 패턴이 보여요."
        )
    if result["change_type"] == "interval_and_frequency_change":
        return "최근 사용 간격과 하루 사용 횟수가 모두 바뀐 것 같아요."
    return "최근 사용 패턴은 기존 루틴과 크게 다르지 않아요."


def confidence(value):
    return round(max(0, min(1, value)), 4)


def predict_with_model(model_entry, logs):
    dates = usage_dates(logs)
    intervals = calculate_intervals(dates)
    recent_intervals = intervals[-RECENT_WINDOW_SIZE:]
    frequency_counts = daily_usage_counts(logs)
    base_frequency_counts, recent_frequency_counts = split_recent_frequency_counts(frequency_counts)

    base_cycle = model_entry.get("base_cycle_days")
    base_frequency = model_entry.get("base_daily_frequency")
    recent_cycle = safe_median(recent_intervals)
    recent_interval_std = safe_std(recent_intervals)
    recent_frequency = safe_mean(count_values(recent_frequency_counts))

    interval_changed = (
        base_cycle is not None
        and recent_cycle is not None
        and len(recent_intervals) >= MIN_RECENT_COUNT
        and abs(recent_cycle - base_cycle) >= DIFF_THRESHOLD_DAYS
        and recent_interval_std is not None
        and recent_interval_std <= MAX_RECENT_STD
    )
    frequency_changed = (
        base_frequency is not None
        and recent_frequency is not None
        and len(recent_frequency_counts) >= MIN_RECENT_COUNT
        and abs(recent_frequency - base_frequency) >= FREQUENCY_DIFF_THRESHOLD
    )

    adapted_cycle = round(ALPHA * recent_cycle + (1 - ALPHA) * base_cycle, 2) if interval_changed else base_cycle
    adapted_frequency = (
        round(ALPHA * recent_frequency + (1 - ALPHA) * base_frequency, 2)
        if frequency_changed
        else base_frequency
    )
    interval_confidence = (
        confidence(0.55 * min(abs(recent_cycle - base_cycle) / max(DIFF_THRESHOLD_DAYS * 2, 1), 1)
                   + 0.45 * max(0, 1 - recent_interval_std / max(MAX_RECENT_STD, 0.1)))
        if interval_changed
        else 0
    )
    frequency_confidence = (
        confidence(abs(recent_frequency - base_frequency) / max(FREQUENCY_DIFF_THRESHOLD * 2, 1))
        if frequency_changed
        else 0
    )
    result = {
        "appliance_id": model_entry["appliance_id"],
        "appliance_type": model_entry["appliance_type"],
        "base_cycle_days": base_cycle,
        "recent_cycle_days": recent_cycle,
        "adapted_cycle_days": adapted_cycle,
        "cycle_changed": interval_changed,
        "base_daily_frequency": base_frequency,
        "recent_daily_frequency": recent_frequency,
        "adapted_daily_frequency": adapted_frequency,
        "frequency_changed": frequency_changed,
        "change_type": change_type(interval_changed, frequency_changed),
        "change_confidence": max(interval_confidence, frequency_confidence),
        "last_usage_date": dates[-1] if dates else None,
        "next_expected_date": add_days(dates[-1], adapted_cycle) if dates else None,
        "recent_interval_std": recent_interval_std,
        "log_count": len(logs),
        "active_days": len(dates),
    }
    result["reason"] = reason_for(result)
    return result


def predict_split(model, split_logs, expected_patterns):
    predictions = []
    grouped = group_by_appliance(split_logs)
    for appliance_id, model_entry in model.items():
        key = (appliance_id, model_entry["appliance_type"])
        result = predict_with_model(model_entry, grouped.get(key, []))
        expected = expected_patterns.get(model_entry["appliance_type"], {})
        result.update(
            {
                "actual_cycle_days": expected.get("actual_cycle_days"),
                "actual_daily_frequency": expected.get("actual_daily_frequency"),
                "actual_changed": expected.get("actual_changed"),
                "expected_change_type": expected.get("expected_change_type"),
            }
        )
        predictions.append(result)
    return sorted(predictions, key=lambda item: item["appliance_type"])


def date_error_days(predicted_date, actual_date):
    if not predicted_date or not actual_date:
        return None
    return abs((date.fromisoformat(predicted_date) - date.fromisoformat(actual_date)).days)


def evaluate(predictions):
    cycle_errors = [
        abs(row["adapted_cycle_days"] - row["actual_cycle_days"])
        for row in predictions
        if row.get("adapted_cycle_days") is not None and row.get("actual_cycle_days") is not None
    ]
    frequency_errors = [
        abs(row["adapted_daily_frequency"] - row["actual_daily_frequency"])
        for row in predictions
        if row.get("adapted_daily_frequency") is not None
        and row.get("actual_daily_frequency") is not None
    ]
    next_date_errors = []
    for row in predictions:
        actual_cycle = row.get("actual_cycle_days")
        if row.get("last_usage_date") and actual_cycle is not None:
            actual_next_date = add_days(row["last_usage_date"], actual_cycle)
            error = date_error_days(row.get("next_expected_date"), actual_next_date)
            if error is not None:
                next_date_errors.append(error)

    true_positive = sum(row["change_type"] != "none" and bool(row.get("actual_changed")) for row in predictions)
    false_positive = sum(row["change_type"] != "none" and not bool(row.get("actual_changed")) for row in predictions)
    false_negative = sum(row["change_type"] == "none" and bool(row.get("actual_changed")) for row in predictions)
    precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else None
    recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else None
    f1 = 2 * precision * recall / (precision + recall) if precision is not None and recall is not None and precision + recall else None

    return {
        "cycle_mae": safe_mean(cycle_errors),
        "daily_frequency_mae": safe_mean(frequency_errors),
        "next_expected_date_error_days": safe_mean(next_date_errors),
        "change_detection_precision": round(precision, 4) if precision is not None else None,
        "change_detection_recall": round(recall, 4) if recall is not None else None,
        "change_detection_f1": round(f1, 4) if f1 is not None else None,
    }


def write_predictions(path, rows):
    fieldnames = [
        "appliance_id",
        "appliance_type",
        "base_cycle_days",
        "recent_cycle_days",
        "adapted_cycle_days",
        "cycle_changed",
        "base_daily_frequency",
        "recent_daily_frequency",
        "adapted_daily_frequency",
        "frequency_changed",
        "change_type",
        "change_confidence",
        "last_usage_date",
        "next_expected_date",
        "actual_cycle_days",
        "actual_daily_frequency",
        "actual_changed",
        "expected_change_type",
        "recent_interval_std",
        "log_count",
        "active_days",
        "reason",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def run_training_evaluation():
    train_logs = read_logs(TRAIN_PATH)
    validation_logs = read_logs(VALIDATION_PATH)
    test_logs = read_logs(TEST_PATH)
    model = build_base_model(train_logs)
    validation_predictions = predict_split(model, validation_logs, EXPECTED_VALIDATION_PATTERNS)
    test_predictions = predict_split(model, test_logs, EXPECTED_TEST_PATTERNS)
    metrics = {
        "validation": evaluate(validation_predictions),
        "changed_routine_test": evaluate(test_predictions),
        "config": active_config(),
    }
    return model, validation_predictions, test_predictions, metrics


def main():
    RESULT_DIR.mkdir(parents=True, exist_ok=True)
    model, validation_predictions, test_predictions, metrics = run_training_evaluation()
    MODEL_PATH.write_text(json.dumps(model, ensure_ascii=False, indent=2), encoding="utf-8")
    write_predictions(VALIDATION_PREDICTIONS_PATH, validation_predictions)
    write_predictions(TEST_PREDICTIONS_PATH, test_predictions)
    METRICS_PATH.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")

    print("Saved model:", MODEL_PATH)
    print("Saved validation predictions:", VALIDATION_PREDICTIONS_PATH)
    print("Saved test predictions:", TEST_PREDICTIONS_PATH)
    print("Saved metrics:", METRICS_PATH)
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
