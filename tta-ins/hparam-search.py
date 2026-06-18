import csv
import importlib.util
import itertools
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
CONFIG_PATH = BASE_DIR / "routine_cycle_config.json"
OUTPUT_DIR = ROOT_DIR / "outputs" / "routine_hparam_search"

RESULTS_PATH = OUTPUT_DIR / "hyperparameter_search_results.csv"
BY_APPLIANCE_PATH = OUTPUT_DIR / "hyperparameter_search_results_by_appliance.csv"
BEST_PATH = OUTPUT_DIR / "best_hyperparameters.json"
BEST_BY_APPLIANCE_PATH = OUTPUT_DIR / "best_hyperparameters_by_appliance.json"
REPORT_PATH = OUTPUT_DIR / "hyperparameter_search_report.md"


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


def safe(value, fallback=0):
    return fallback if value is None else value


def binary_metrics(rows, predicate):
    true_positive = sum(predicate(row) and row["expected_change_type"] == row["change_type"] for row in rows)
    false_positive = sum(predicate(row) and row["expected_change_type"] != row["change_type"] for row in rows)
    false_negative = sum((not predicate(row)) and predicate({"change_type": row["expected_change_type"]}) for row in rows)
    precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0
    recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    return precision, recall, f1


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


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    train_module = load_train_module()
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    default_config = config["default"]
    search_space = config["hyperparameterSearchSpace"]
    train_logs = train_module.read_logs(train_module.TRAIN_PATH)
    test_logs = train_module.read_logs(train_module.TEST_PATH)
    model = train_module.build_base_model(train_logs)

    result_rows = []
    appliance_rows = []

    for index, params in enumerate(product_dict(search_space), start=1):
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
      _, _, interval_f1 = binary_metrics(
          predictions,
          lambda row: "interval" in row["change_type"],
      )
      _, _, frequency_f1 = binary_metrics(
          predictions,
          lambda row: "frequency" in row["change_type"],
      )
      params_id = f"params_{index:04d}"
      score = score_result(metrics, change_type_accuracy)
      result_rows.append(
          {
              "params_id": params_id,
              **flatten_params(params),
              "change_type_accuracy": round(change_type_accuracy, 4),
              "overall_change_precision": safe(metrics["change_detection_precision"]),
              "overall_change_recall": safe(metrics["change_detection_recall"]),
              "overall_change_f1": safe(metrics["change_detection_f1"]),
              "interval_change_f1": round(interval_f1, 4),
              "frequency_change_f1": round(frequency_f1, 4),
              "cycle_mae": safe(metrics["cycle_mae"]),
              "daily_frequency_mae": safe(metrics["daily_frequency_mae"]),
              "score": score,
          }
      )
      for prediction in predictions:
          appliance_rows.append(
              {
                  "params_id": params_id,
                  **flatten_params(params),
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
    appliance_rows.sort(key=lambda row: (row["appliance_type"], row["params_id"]))
    best = result_rows[0] if result_rows else None
    best_by_appliance = {}
    for appliance_type in sorted({row["appliance_type"] for row in appliance_rows}):
        candidates = [
            row for row in appliance_rows
            if row["appliance_type"] == appliance_type and row["pass_change_type"]
        ]
        if not candidates:
            candidates = [row for row in appliance_rows if row["appliance_type"] == appliance_type]
        scored = {
            row["params_id"]: next(result for result in result_rows if result["params_id"] == row["params_id"])
            for row in candidates
        }
        best_params_id = max(scored, key=lambda params_id: scored[params_id]["score"])
        best_by_appliance[appliance_type] = {
            "params_id": best_params_id,
            "params": {
                key: scored[best_params_id][key]
                for key in (
                    "minRecentCount",
                    "diffThresholdDays",
                    "maxRecentStd",
                    "alpha",
                    "frequencyDiffThreshold",
                    "frequencyRecentWindowDays",
                )
            },
            "score": scored[best_params_id]["score"],
        }

    write_csv(RESULTS_PATH, result_rows)
    write_csv(BY_APPLIANCE_PATH, appliance_rows)
    BEST_PATH.write_text(json.dumps(best, ensure_ascii=False, indent=2), encoding="utf-8")
    BEST_BY_APPLIANCE_PATH.write_text(
        json.dumps(best_by_appliance, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    REPORT_PATH.write_text(build_report(best, best_by_appliance), encoding="utf-8")
    print("Saved hyperparameter search outputs:", OUTPUT_DIR)
    print(json.dumps({"best": best, "best_by_appliance": best_by_appliance}, ensure_ascii=False, indent=2))


def write_csv(path, rows):
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def build_report(best, best_by_appliance):
    lines = [
        "# Routine Hyperparameter Search Report",
        "",
        "## Best Overall",
        "",
        "```json",
        json.dumps(best, ensure_ascii=False, indent=2),
        "```",
        "",
        "## Best By Appliance",
        "",
        "```json",
        json.dumps(best_by_appliance, ensure_ascii=False, indent=2),
        "```",
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    main()
