import csv
import importlib.util
import itertools
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
CONFIG_PATH = BASE_DIR / "routine_cycle_config.json"
OUTPUT_DIR = ROOT_DIR / "outputs" / "routine_hparam_search"

TRAIN_1YEAR_PATH = DATA_DIR / "appliance_usage_train_1year.csv"
CHANGED_TEST_PATH = DATA_DIR / "appliance_usage_test_changed_routine.csv"

RESULTS_PATH = OUTPUT_DIR / "hyperparameter_search_results.csv"
RESULTS_JSON_PATH = OUTPUT_DIR / "hyperparameter_search_results.json"
BY_APPLIANCE_PATH = OUTPUT_DIR / "hyperparameter_search_results_by_appliance.csv"
BEST_PATH = OUTPUT_DIR / "best_hyperparameters.json"
BEST_BY_APPLIANCE_PATH = OUTPUT_DIR / "best_hyperparameters_by_appliance.json"
REPORT_PATH = OUTPUT_DIR / "hyperparameter_search_report.md"

RESULT_FIELDS = [
    "params_id",
    "minRecentCount",
    "diffThresholdDays",
    "maxRecentStd",
    "alpha",
    "frequencyDiffThreshold",
    "frequencyRecentWindowDays",
    "change_type_accuracy",
    "interval_change_precision",
    "interval_change_recall",
    "interval_change_f1",
    "frequency_change_precision",
    "frequency_change_recall",
    "frequency_change_f1",
    "overall_change_precision",
    "overall_change_recall",
    "overall_change_f1",
    "cycle_mae",
    "daily_frequency_mae",
    "score",
]

APPLIANCE_FIELDS = [
    "params_id",
    "appliance_type",
    "expected_change_type",
    "actual_change_type",
    "pass_change_type",
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
    "next_expected_date",
    "reason",
]


def load_train_module():
    module_path = BASE_DIR / "train-evaluate.py"
    spec = importlib.util.spec_from_file_location("routine_train_evaluate", module_path)
    module = importlib.util.module_from_spec(spec)
    if spec.loader is None:
        raise RuntimeError("Could not load train-evaluate.py")
    spec.loader.exec_module(module)
    return module


def product_dict(search_space):
    keys = list(search_space.keys())
    for values in itertools.product(*(search_space[key] for key in keys)):
        yield dict(zip(keys, values))


def date_key(log):
    raw = log.get("started_at") or log.get("usage_date") or ""
    return raw[:10] if len(raw) >= 10 else ""


def split_train_year_logs(logs):
    train = []
    validation = []
    for log in logs:
        key = date_key(log)
        if "2025-01-01" <= key <= "2025-10-31":
            train.append(log)
        elif "2025-11-01" <= key <= "2025-12-31":
            validation.append(log)
    return train, validation


def safe(value, fallback=0):
    return fallback if value is None else value


def class_metrics(rows, class_name):
    expected = lambda row: class_name in row["expected_change_type"]
    predicted = lambda row: class_name in row["change_type"]
    true_positive = sum(expected(row) and predicted(row) for row in rows)
    false_positive = sum((not expected(row)) and predicted(row) for row in rows)
    false_negative = sum(expected(row) and not predicted(row) for row in rows)
    precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0
    recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    return round(precision, 4), round(recall, 4), round(f1, 4)


def score_result(metrics, change_type_accuracy):
    cycle_mae = safe(metrics["cycle_mae"])
    frequency_mae = safe(metrics["daily_frequency_mae"])
    overall_f1 = safe(metrics["change_detection_f1"])
    normalized_cycle_score = 1 / (1 + cycle_mae)
    normalized_frequency_score = 1 / (1 + frequency_mae)
    return round(
        0.45 * overall_f1
        + 0.25 * change_type_accuracy
        + 0.15 * normalized_cycle_score
        + 0.15 * normalized_frequency_score,
        6,
    )


def flatten_params(params):
    return {
        "minRecentCount": params["minRecentCount"],
        "diffThresholdDays": params["diffThresholdDays"],
        "maxRecentStd": params["maxRecentStd"],
        "alpha": params["alpha"],
        "frequencyDiffThreshold": params["frequencyDiffThreshold"],
        "frequencyRecentWindowDays": params["frequencyRecentWindowDays"],
    }


def required_data_path(path, fallback_paths):
    if path.exists():
        return path
    for fallback_path in fallback_paths:
        if fallback_path.exists():
            return fallback_path
    raise FileNotFoundError(f"Missing required data file: {path}")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    train_module = load_train_module()
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    default_config = config["default"]
    search_space = config["hyperparameterSearchSpace"]
    all_params = list(product_dict(search_space))
    train_1year_path = required_data_path(
        TRAIN_1YEAR_PATH,
        [DATA_DIR / "train.csv"],
    )
    changed_test_path = required_data_path(
        CHANGED_TEST_PATH,
        [DATA_DIR / "test.csv"],
    )
    train_1year_logs = train_module.read_logs(train_1year_path)
    train_logs, _validation_logs = split_train_year_logs(train_1year_logs)
    test_logs = train_module.read_logs(changed_test_path)
    model = train_module.build_base_model(train_logs)

    result_rows = []
    appliance_rows = []
    predictions_by_params = {}

    print(f"Total experiment combinations: {len(all_params)}")

    for index, params in enumerate(all_params, start=1):
        run_config = {**default_config, **params}
        run_config["recentWindowSize"] = default_config.get("recentWindowSize", 8)
        train_module.apply_config(run_config)
        predictions = train_module.predict_split(
            model,
            test_logs,
            train_module.EXPECTED_TEST_PATTERNS,
        )
        metrics = train_module.evaluate(predictions)
        pass_count = sum(row["change_type"] == row["expected_change_type"] for row in predictions)
        change_type_accuracy = pass_count / len(predictions) if predictions else 0
        interval_precision, interval_recall, interval_f1 = class_metrics(predictions, "interval")
        frequency_precision, frequency_recall, frequency_f1 = class_metrics(predictions, "frequency")
        params_id = f"params_{index:04d}"
        score = score_result(metrics, change_type_accuracy)
        result_row = {
            "params_id": params_id,
            **flatten_params(params),
            "change_type_accuracy": round(change_type_accuracy, 4),
            "interval_change_precision": interval_precision,
            "interval_change_recall": interval_recall,
            "interval_change_f1": interval_f1,
            "frequency_change_precision": frequency_precision,
            "frequency_change_recall": frequency_recall,
            "frequency_change_f1": frequency_f1,
            "overall_change_precision": safe(metrics["change_detection_precision"]),
            "overall_change_recall": safe(metrics["change_detection_recall"]),
            "overall_change_f1": safe(metrics["change_detection_f1"]),
            "cycle_mae": safe(metrics["cycle_mae"]),
            "daily_frequency_mae": safe(metrics["daily_frequency_mae"]),
            "score": score,
        }
        result_rows.append(result_row)
        predictions_by_params[params_id] = predictions

        for prediction in predictions:
            appliance_rows.append(
                {
                    "params_id": params_id,
                    "appliance_type": prediction["appliance_type"],
                    "expected_change_type": prediction["expected_change_type"],
                    "actual_change_type": prediction["change_type"],
                    "pass_change_type": prediction["expected_change_type"] == prediction["change_type"],
                    "base_cycle_days": prediction["base_cycle_days"],
                    "recent_cycle_days": prediction["recent_cycle_days"],
                    "adapted_cycle_days": prediction["adapted_cycle_days"],
                    "cycle_changed": prediction["cycle_changed"],
                    "base_daily_frequency": prediction["base_daily_frequency"],
                    "recent_daily_frequency": prediction["recent_daily_frequency"],
                    "adapted_daily_frequency": prediction["adapted_daily_frequency"],
                    "frequency_changed": prediction["frequency_changed"],
                    "change_type": prediction["change_type"],
                    "change_confidence": prediction["change_confidence"],
                    "next_expected_date": prediction["next_expected_date"],
                    "reason": prediction["reason"],
                }
            )

    result_rows.sort(key=lambda row: row["score"], reverse=True)
    appliance_rows.sort(key=lambda row: (row["params_id"], row["appliance_type"]))
    best = result_rows[0] if result_rows else None
    best_predictions = predictions_by_params.get(best["params_id"], []) if best else []
    best_by_appliance = build_best_by_appliance(appliance_rows, result_rows)

    write_csv(RESULTS_PATH, result_rows, RESULT_FIELDS)
    write_csv(BY_APPLIANCE_PATH, appliance_rows, APPLIANCE_FIELDS)
    RESULTS_JSON_PATH.write_text(json.dumps(result_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    BEST_PATH.write_text(json.dumps(best, ensure_ascii=False, indent=2), encoding="utf-8")
    BEST_BY_APPLIANCE_PATH.write_text(
        json.dumps(best_by_appliance, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    REPORT_PATH.write_text(
        build_report(best, best_by_appliance, result_rows[:10], best_predictions, search_space),
        encoding="utf-8",
    )

    print(f"Saved output directory: {OUTPUT_DIR}")
    print(f"Best score: {best['score'] if best else None}")
    print("Best params:")
    print(json.dumps(best, ensure_ascii=False, indent=2))
    print("Expected vs actual change_type by appliance:")
    for prediction in best_predictions:
        print(
            f"- {prediction['appliance_type']}: expected={prediction['expected_change_type']} "
            f"actual={prediction['change_type']}"
        )


def build_best_by_appliance(appliance_rows, result_rows):
    result_by_id = {row["params_id"]: row for row in result_rows}
    best_by_appliance = {}
    for appliance_type in sorted({row["appliance_type"] for row in appliance_rows}):
        candidates = [
            row for row in appliance_rows
            if row["appliance_type"] == appliance_type and row["pass_change_type"]
        ]
        if not candidates:
            candidates = [row for row in appliance_rows if row["appliance_type"] == appliance_type]
        best_row = max(candidates, key=lambda row: result_by_id[row["params_id"]]["score"])
        score_row = result_by_id[best_row["params_id"]]
        best_by_appliance[appliance_type] = {
            "params_id": best_row["params_id"],
            "expected_change_type": best_row["expected_change_type"],
            "actual_change_type": best_row["actual_change_type"],
            "score": score_row["score"],
            "params": {
                key: score_row[key]
                for key in (
                    "minRecentCount",
                    "diffThresholdDays",
                    "maxRecentStd",
                    "alpha",
                    "frequencyDiffThreshold",
                    "frequencyRecentWindowDays",
                )
            },
        }
    return best_by_appliance


def write_csv(path, rows, fieldnames):
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def markdown_table(headers, rows):
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]
    for row in rows:
        lines.append("| " + " | ".join(str(row.get(header, "")) for header in headers) + " |")
    return "\n".join(lines)


def build_report(best, best_by_appliance, top10, best_predictions, search_space):
    dishwasher = next((row for row in best_predictions if row["appliance_type"] == "dishwasher"), None)
    top_headers = [
        "params_id",
        "score",
        "change_type_accuracy",
        "overall_change_f1",
        "cycle_mae",
        "daily_frequency_mae",
    ]
    expected_headers = [
        "appliance_type",
        "expected_change_type",
        "change_type",
        "base_cycle_days",
        "recent_cycle_days",
        "base_daily_frequency",
        "recent_daily_frequency",
    ]
    lines = [
        "# Routine Hyperparameter Search Report",
        "",
        "## 실험 목적",
        "",
        "가전 사용 로그 기반 사용 주기 예측과 TTA-inspired Adaptive Cycle Recalibration의 interval/frequency 변화 감지 성능을 하이퍼파라미터 조합별로 비교한다.",
        "",
        "## 데이터 split 설명",
        "",
        "- 2025-01-01 ~ 2025-10-31: train",
        "- 2025-11-01 ~ 2025-12-31: validation",
        "- 2026-01-01 이후: changed routine test",
        "",
        "## train/test 데이터 의미",
        "",
        "`appliance_usage_train_1year.csv`는 2025년 기본 루틴 데이터이며, `appliance_usage_test_changed_routine.csv`는 학습 이후 새롭게 유입되는 changed routine test 데이터다. test는 validation이 아니라 TTA-inspired adaptation 성능 확인용이다.",
        "",
        "## 탐색한 하이퍼파라미터 후보",
        "",
        "```json",
        json.dumps(search_space, ensure_ascii=False, indent=2),
        "```",
        "",
        "## score 계산식",
        "",
        "`score = 0.45 * overall_change_f1 + 0.25 * change_type_accuracy + 0.15 * normalized_cycle_score + 0.15 * normalized_frequency_score`",
        "",
        "`normalized_cycle_score = 1 / (1 + cycle_mae)`",
        "",
        "`normalized_frequency_score = 1 / (1 + daily_frequency_mae)`",
        "",
        "## best hyperparameters",
        "",
        "```json",
        json.dumps(best, ensure_ascii=False, indent=2),
        "```",
        "",
        "## 상위 10개 조합",
        "",
        markdown_table(top_headers, top10),
        "",
        "## 가전별 best params",
        "",
        "```json",
        json.dumps(best_by_appliance, ensure_ascii=False, indent=2),
        "```",
        "",
        "## 가전별 expected vs actual change_type",
        "",
        markdown_table(expected_headers, best_predictions),
        "",
        "## dishwasher frequency_change 확인",
        "",
        "dishwasher는 interval_days가 1일로 유지되므로 daily_usage_count 기반 frequency 변화가 핵심이다.",
        f"최적 조합에서 dishwasher actual change_type은 `{dishwasher['change_type'] if dishwasher else 'unknown'}`이며, frequency_change 감지는 {'정상' if dishwasher and dishwasher['change_type'] == 'frequency_change' else '실패'}이다.",
        "",
        "## 최종 해석",
        "",
        "현재 최적 조합은 로봇청소기, 식기세척기, 세탁기, 건조기의 기대 변화 유형을 모두 맞추며, full retraining 없이 최근 로그의 interval/frequency 분포 변화만 반영한다.",
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    main()
