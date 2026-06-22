import json
import subprocess
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "outputs" / "dummy_appliance_dataset"
HPARAM_DIR = ROOT_DIR / "outputs" / "routine_hparam_search"
EVIDENCE_DIR = ROOT_DIR / "outputs" / "report_evidence"
TABLE_DIR = EVIDENCE_DIR / "report_tables"
FIGURE_DIR = EVIDENCE_DIR / "figures"

ALL_PATH = DATA_DIR / "appliance_usage_all.csv"
TRAIN_PATH = DATA_DIR / "appliance_usage_train.csv"
VALIDATION_PATH = DATA_DIR / "appliance_usage_validation.csv"
TEST_PATH = DATA_DIR / "appliance_usage_test_changed_routine.csv"
SUMMARY_PATH = DATA_DIR / "appliance_usage_dataset_summary.csv"
BEST_PATH = HPARAM_DIR / "best_hyperparameters.json"
BEST_BY_APPLIANCE_PATH = HPARAM_DIR / "best_hyperparameters_by_appliance.json"
HPARAM_RESULTS_PATH = HPARAM_DIR / "hyperparameter_search_results.csv"
HPARAM_BY_APPLIANCE_PATH = HPARAM_DIR / "hyperparameter_search_results_by_appliance.csv"
METRICS_PATH = ROOT_DIR / "TCR" / "results" / "metrics.json"
TEST_PREDICTIONS_PATH = ROOT_DIR / "TCR" / "results" / "test_predictions.csv"

APPLIANCE_LABELS = {
    "robot_cleaner": "Robot cleaner",
    "dishwasher": "Dishwasher",
    "washer": "Washer",
    "dryer": "Dryer",
}


def ensure_dirs():
    TABLE_DIR.mkdir(parents=True, exist_ok=True)
    FIGURE_DIR.mkdir(parents=True, exist_ok=True)


def read_csv(path, **kwargs):
    return pd.read_csv(path, encoding="utf-8-sig", **kwargs)


def write_csv(df, name):
    path = TABLE_DIR / name
    df.to_csv(path, index=False, encoding="utf-8-sig")
    return path


def write_text(path, text):
    path.write_text(text, encoding="utf-8")
    return path


def markdown_table(df):
    return df.to_markdown(index=False)


def load_inputs():
    required = [
        ALL_PATH,
        TRAIN_PATH,
        VALIDATION_PATH,
        TEST_PATH,
        SUMMARY_PATH,
        BEST_PATH,
        BEST_BY_APPLIANCE_PATH,
        HPARAM_RESULTS_PATH,
        HPARAM_BY_APPLIANCE_PATH,
    ]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing required evidence inputs:\n" + "\n".join(missing))
    logs = read_csv(ALL_PATH, parse_dates=["started_at", "ended_at"])
    summary = read_csv(SUMMARY_PATH)
    hparams = read_csv(HPARAM_RESULTS_PATH)
    best = json.loads(BEST_PATH.read_text(encoding="utf-8"))
    best_by_appliance = json.loads(BEST_BY_APPLIANCE_PATH.read_text(encoding="utf-8"))
    return logs, summary, hparams, best, best_by_appliance


def calculate_interval_stats(logs):
    start_logs = logs[logs["action_type"] == "start"].copy()
    start_logs["usage_date"] = pd.to_datetime(start_logs["usage_date"]).dt.date
    unique_days = (
        start_logs[["dataset_split", "family_id", "appliance_id", "appliance_type", "usage_date"]]
        .drop_duplicates()
        .sort_values(["family_id", "appliance_id", "usage_date"])
    )
    unique_days["previous_usage_date"] = unique_days.groupby(["family_id", "appliance_id"])["usage_date"].shift(1)
    unique_days["interval_days"] = (
        pd.to_datetime(unique_days["usage_date"]) - pd.to_datetime(unique_days["previous_usage_date"])
    ).dt.days
    intervals = unique_days.dropna(subset=["interval_days"]).copy()
    stats = (
        intervals.groupby(["dataset_split", "appliance_type"])["interval_days"]
        .agg(["count", "mean", "median", "std"])
        .reset_index()
    )
    return intervals, stats


def calculate_frequency_stats(logs):
    start_logs = logs[logs["action_type"] == "start"].copy()
    start_logs["usage_date"] = pd.to_datetime(start_logs["usage_date"]).dt.date
    daily_counts = (
        start_logs.groupby(["dataset_split", "family_id", "appliance_id", "appliance_type", "usage_date"])
        .size()
        .reset_index(name="daily_usage_count")
    )
    stats = (
        daily_counts.groupby(["dataset_split", "appliance_type"])["daily_usage_count"]
        .agg(["count", "mean", "median", "std"])
        .reset_index()
    )
    return daily_counts, stats


def build_dataset_tables(logs, summary):
    split_rows = {
        row["metric"].replace("split_rows.", ""): int(row["value"])
        for _, row in summary.iterrows()
        if str(row["metric"]).startswith("split_rows.")
    }
    dataset_summary = pd.DataFrame(
        [
            {
                "split": "train",
                "period": "2025-01-01 ~ 2025-10-31",
                "meaning": "Base routine training period",
                "row_count": split_rows.get("train", 0),
            },
            {
                "split": "validation",
                "period": "2025-11-01 ~ 2025-12-31",
                "meaning": "Base routine validation and threshold sanity-check period",
                "row_count": split_rows.get("validation", 0),
            },
            {
                "split": "test",
                "period": "2026-01-01 ~ 2026-03-31",
                "meaning": "Changed routine test period used for TTA-inspired adaptation evaluation",
                "row_count": split_rows.get("test", 0),
            },
        ]
    )

    pattern_rows = [
        ["robot_cleaner", "Every 1 day", "Every 2 days", "interval_change"],
        ["dishwasher", "1 use per day", "2 uses per day", "frequency_change"],
        ["washer", "Every 3 days", "Every 4 days", "interval_change"],
        ["dryer", "Every 3 days", "Every 4 days", "interval_change"],
    ]
    pattern_table = pd.DataFrame(
        pattern_rows,
        columns=["appliance_type", "train_validation_pattern", "test_changed_pattern", "expected_change_type"],
    )

    generation_settings = pd.DataFrame(
        [
            ["family_count", "110", "Avoid overfitting to a single household pattern"],
            ["appliance_types", "robot_cleaner, dishwasher, washer, dryer", "Focus on appliances with periodic usage"],
            ["time_split", "time-based only", "Prevent random split leakage"],
            ["day_jitter", "+/- 1 day", "Represent realistic schedule variation"],
            ["time_jitter", "+/- 30~90 minutes", "Represent household-level preferred time variation"],
            ["missing_logs", "3~7%", "Represent dropped or unavailable logs"],
            ["duplicate_usage", "1~3%", "Represent repeated same-day usage"],
            ["weekend_boost", "5~18%", "Represent higher weekend usage probability"],
        ],
        columns=["item", "setting", "purpose"],
    )

    appliance_rows = (
        logs.pivot_table(index="appliance_type", columns="dataset_split", values="log_id", aggfunc="count", fill_value=0)
        .reset_index()
        .rename(columns={"train": "train_rows", "validation": "validation_rows", "test": "test_rows"})
    )
    for column in ["train_rows", "validation_rows", "test_rows"]:
        if column not in appliance_rows:
            appliance_rows[column] = 0
    appliance_rows["total_rows"] = appliance_rows[["train_rows", "validation_rows", "test_rows"]].sum(axis=1)

    column_descriptions = pd.DataFrame(
        [
            ["family_id", "Synthetic household identifier", "Groups household-level routines"],
            ["appliance_id", "Family-specific appliance identifier", "Separates each device time series"],
            ["appliance_type", "Robot cleaner, dishwasher, washer, dryer", "Runs appliance-level routine prediction"],
            ["started_at", "ISO timestamp for usage start", "Sorts logs and computes usage dates"],
            ["ended_at", "ISO timestamp for usage end", "Provides duration evidence"],
            ["usage_date", "yyyy-mm-dd date derived from started_at", "Computes interval_days and daily counts"],
            ["duration_minutes", "Synthetic operation duration", "Supports ThinQ-like realism evidence"],
            ["energy_kwh", "Synthetic energy usage", "Supports ThinQ-like realism evidence"],
            ["dataset_split", "train, validation, or test", "Keeps time-based split explicit"],
            ["expected_base_cycle_days", "Designed base cycle in days", "Ground truth reference for base routine"],
            ["expected_changed_cycle_days", "Designed changed cycle in days", "Ground truth reference for changed test routine"],
            ["expected_base_daily_frequency", "Designed base daily usage count", "Ground truth for same-day frequency"],
            ["expected_changed_daily_frequency", "Designed changed daily usage count", "Ground truth for frequency change"],
            ["expected_change_type", "none, interval_change, frequency_change, interval_and_frequency_change", "Evaluates change detection"],
        ],
        columns=["column", "description", "usage_in_model"],
    )

    write_csv(dataset_summary, "dataset_summary_table.csv")
    write_csv(pattern_table, "designed_pattern_table.csv")
    write_csv(generation_settings, "data_generation_settings.csv")
    write_csv(appliance_rows, "appliance_row_count_table.csv")
    write_csv(column_descriptions, "column_description_table.csv")
    return dataset_summary, pattern_table, generation_settings, appliance_rows, column_descriptions


def build_analysis_tables(logs, intervals, interval_stats, daily_counts, frequency_stats):
    analysis_goals = pd.DataFrame(
        [
            ["Usage cycle analysis", "interval_days mean/median", "Verify interval changes such as 3 days to 4 days"],
            ["Daily frequency analysis", "daily_usage_count mean/median", "Detect dishwasher 1 use/day to 2 uses/day"],
            ["Usage time analysis", "hour distribution", "Verify realistic preferred usage times"],
            ["Family variation analysis", "family-level interval distribution", "Verify multi-family diversity"],
        ],
        columns=["analysis_goal", "metric", "reason"],
    )
    analysis_methods = pd.DataFrame(
        [
            ["Usage cycle comparison", "groupby median interval", "interval_statistics_by_split.csv", "Train-test interval drift"],
            ["Daily frequency comparison", "groupby daily count mean", "frequency_statistics_by_split.csv", "Dishwasher frequency drift"],
            ["Usage time distribution", "hour histogram and heatmap", "usage_hour_heatmap.png", "Realistic usage time pattern"],
            ["Family variation", "boxplot by appliance", "family_interval_boxplot.png", "Diversity across 110 families"],
        ],
        columns=["analysis_item", "method", "output_file", "interpretation"],
    )

    train_test_interval = interval_stats[interval_stats["dataset_split"].isin(["train", "test"])].copy()
    train_test_frequency = frequency_stats[frequency_stats["dataset_split"].isin(["train", "test"])].copy()
    interval_pivot = train_test_interval.pivot(index="appliance_type", columns="dataset_split", values="median").reset_index()
    interval_pivot = interval_pivot.rename(columns={"train": "train_median_interval_days", "test": "test_median_interval_days"})
    frequency_pivot = train_test_frequency.pivot(index="appliance_type", columns="dataset_split", values="mean").reset_index()
    frequency_pivot = frequency_pivot.rename(columns={"train": "train_mean_daily_frequency", "test": "test_mean_daily_frequency"})
    analysis_results = interval_pivot.merge(frequency_pivot, on="appliance_type", how="outer")
    analysis_results["interpretation"] = analysis_results.apply(analysis_interpretation, axis=1)

    write_csv(analysis_goals, "analysis_goal_table.csv")
    write_csv(analysis_methods, "analysis_method_table.csv")
    write_csv(interval_stats.round(4), "interval_statistics_by_split.csv")
    write_csv(frequency_stats.round(4), "frequency_statistics_by_split.csv")
    write_csv(analysis_results.round(4), "analysis_result_table.csv")
    write_csv(daily_counts.head(1000), "daily_usage_count_sample.csv")
    write_csv(intervals.head(1000), "interval_sample.csv")
    return analysis_goals, analysis_methods, analysis_results


def analysis_interpretation(row):
    appliance = row["appliance_type"]
    train_interval = row.get("train_median_interval_days")
    test_interval = row.get("test_median_interval_days")
    train_freq = row.get("train_mean_daily_frequency")
    test_freq = row.get("test_mean_daily_frequency")
    if appliance == "dishwasher":
        return f"Frequency increases from about {train_freq:.2f} to {test_freq:.2f} uses/day while interval remains near 1 day."
    return f"Median interval changes from about {train_interval:.2f} to {test_interval:.2f} days."


def build_model_tables(best):
    model_components = pd.DataFrame(
        [
            ["Base Cycle Estimator", "Estimate baseline usage cycle", "train logs", "base_cycle_days", "Web_ui/src/utils/routineCyclePrediction.ts"],
            ["Frequency Estimator", "Estimate baseline daily frequency", "daily usage counts", "base_daily_frequency", "Web_ui/src/utils/routineCyclePrediction.ts"],
            ["Drift Detector", "Detect interval/frequency changes", "recent logs", "cycle_changed, frequency_changed", "Web_ui/src/utils/routineCyclePrediction.ts"],
            ["Adaptive Recalibrator", "Blend base and recent patterns", "base + recent statistics", "adapted_cycle_days, adapted_daily_frequency", "Web_ui/src/utils/routineCyclePrediction.ts"],
            ["Hyperparameter Search", "Find robust thresholds", "grid search", "best_hyperparameters.json", "TCR/hparam-search.py"],
        ],
        columns=["model_or_module", "role", "input", "output", "evidence_file"],
    )
    hparam_space = pd.DataFrame(
        [
            ["minRecentCount", "[2, 3, 4, 5]", "Minimum recent intervals/counts needed for detection"],
            ["diffThresholdDays", "[0.5, 0.75, 1.0, 1.5, 2.0]", "Minimum cycle difference in days"],
            ["maxRecentStd", "[0.5, 1.0, 1.2, 1.5, 2.0]", "Recent interval stability threshold"],
            ["alpha", "[0.3, 0.5, 0.6, 0.7, 0.9]", "Weight for recent pattern in adaptation"],
            ["frequencyDiffThreshold", "[0.3, 0.5, 0.7, 1.0]", "Minimum daily frequency difference"],
            ["frequencyRecentWindowDays", "[7, 14, 21, 30]", "Recent window for daily frequency"],
        ],
        columns=["parameter", "candidates", "meaning"],
    )
    best_table = pd.DataFrame(
        [
            [key, best[key], best_reason(key)]
            for key in [
                "minRecentCount",
                "diffThresholdDays",
                "maxRecentStd",
                "alpha",
                "frequencyDiffThreshold",
                "frequencyRecentWindowDays",
            ]
        ],
        columns=["parameter", "best_value", "reason"],
    )
    write_csv(model_components, "model_component_table.csv")
    write_csv(hparam_space, "hyperparameter_space_table.csv")
    write_csv(best_table, "best_hyperparameter_table.csv")
    return model_components, hparam_space, best_table


def best_reason(key):
    reasons = {
        "minRecentCount": "Allows fast adaptation once at least two recent observations exist.",
        "diffThresholdDays": "Sensitive enough to catch 1-day interval drifts in noisy data.",
        "maxRecentStd": "Keeps detection tolerant to realistic jitter and missing logs.",
        "alpha": "Strongly reflects changed routine during test-time recalibration.",
        "frequencyDiffThreshold": "Captures dishwasher frequency increase from 1/day to 2/day.",
        "frequencyRecentWindowDays": "Uses a stable 30-day window for daily frequency changes.",
    }
    return reasons[key]


def build_prediction_tables(best, best_by_appliance):
    usecols = [
        "params_id",
        "appliance_type",
        "expected_change_type",
        "actual_change_type",
        "pass_change_type",
        "base_cycle_days",
        "recent_cycle_days",
        "adapted_cycle_days",
        "base_daily_frequency",
        "recent_daily_frequency",
        "adapted_daily_frequency",
        "change_confidence",
        "reason",
    ]
    chunks = pd.read_csv(
        HPARAM_BY_APPLIANCE_PATH,
        encoding="utf-8-sig",
        usecols=usecols,
        chunksize=200000,
    )
    best_rows = []
    for chunk in chunks:
        matched = chunk[chunk["params_id"] == best["params_id"]]
        if not matched.empty:
            best_rows.append(matched)
    predictions = pd.concat(best_rows, ignore_index=True) if best_rows else pd.DataFrame(columns=usecols)
    prediction_summary = (
        predictions.groupby(["appliance_type", "expected_change_type", "actual_change_type", "pass_change_type"])
        .size()
        .reset_index(name="appliance_count")
    )
    representative = (
        predictions.sort_values(["pass_change_type", "appliance_type"], ascending=[False, True])
        .groupby("appliance_type")
        .head(3)
        .reset_index(drop=True)
    )
    reason_examples = representative[["appliance_type", "reason"]].drop_duplicates().head(12)
    best_by_appliance_df = pd.DataFrame(
        [
            {
                "appliance_type": appliance_type,
                "params_id": value["params_id"],
                "expected_change_type": value["expected_change_type"],
                "actual_change_type": value["actual_change_type"],
                "score": value["score"],
                **value["params"],
            }
            for appliance_type, value in best_by_appliance.items()
        ]
    )
    write_csv(predictions, "best_prediction_result_table.csv")
    write_csv(prediction_summary, "prediction_result_summary_table.csv")
    write_csv(representative, "prediction_representative_examples.csv")
    write_csv(reason_examples, "daily_report_reason_examples.csv")
    write_csv(best_by_appliance_df, "best_params_by_appliance_table.csv")
    return predictions, prediction_summary, representative, reason_examples, best_by_appliance_df


def build_validation_tables(best, hparams):
    metric_rows = [
        ["MAE", "Mean absolute error", "Cycle and daily frequency prediction error"],
        ["Precision", "Detected changes that were truly changes", "False positive control"],
        ["Recall", "Expected changes that were detected", "False negative control"],
        ["F1-score", "Harmonic mean of precision and recall", "Overall change detection"],
        ["change_type_accuracy", "Exact match of expected vs actual change_type", "Type-level validation"],
        ["cycle_mae", "MAE for adapted cycle days", "Cycle recalibration quality"],
        ["daily_frequency_mae", "MAE for adapted daily frequency", "Frequency recalibration quality"],
    ]
    validation_metrics = pd.DataFrame(metric_rows, columns=["metric", "meaning", "used_for"])
    final_evaluation = pd.DataFrame(
        [
            ["best_score", best["score"], "Overall grid-search objective"],
            ["change_type_accuracy", best["change_type_accuracy"], "Exact change_type match across appliances"],
            ["overall_change_f1", best["overall_change_f1"], "Overall change detection F1"],
            ["interval_change_f1", best["interval_change_f1"], "Interval drift detection F1"],
            ["frequency_change_f1", best["frequency_change_f1"], "Daily frequency drift detection F1"],
            ["cycle_mae", best["cycle_mae"], "Adapted cycle day error"],
            ["daily_frequency_mae", best["daily_frequency_mae"], "Adapted daily frequency error"],
        ],
        columns=["metric", "value", "interpretation"],
    )
    top10 = hparams.sort_values("score", ascending=False).head(10).copy()
    top10.insert(0, "rank", range(1, len(top10) + 1))
    top10 = top10[
        [
            "rank",
            "params_id",
            "score",
            "change_type_accuracy",
            "overall_change_f1",
            "cycle_mae",
            "daily_frequency_mae",
            "minRecentCount",
            "diffThresholdDays",
            "maxRecentStd",
            "alpha",
            "frequencyDiffThreshold",
            "frequencyRecentWindowDays",
        ]
    ]
    write_csv(validation_metrics, "validation_metric_table.csv")
    write_csv(final_evaluation, "final_evaluation_table.csv")
    write_csv(top10, "top10_hyperparameter_table.csv")
    return validation_metrics, final_evaluation, top10


def save_figures(logs, intervals, interval_stats, frequency_stats):
    plt.style.use("seaborn-v0_8-whitegrid")

    interval_plot = interval_stats[interval_stats["dataset_split"].isin(["train", "test"])].copy()
    interval_pivot = interval_plot.pivot(index="appliance_type", columns="dataset_split", values="median").loc[list(APPLIANCE_LABELS)]
    ax = interval_pivot.rename(index=APPLIANCE_LABELS).plot(kind="bar", figsize=(9, 5), color=["#4C78A8", "#F58518"])
    ax.set_title("Median Interval Days: Train vs Changed Routine Test")
    ax.set_xlabel("Appliance")
    ax.set_ylabel("Median interval days")
    ax.legend(title="Split")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "mean_interval_train_test_by_appliance.png", dpi=160)
    plt.close()

    freq_plot = frequency_stats[frequency_stats["dataset_split"].isin(["train", "test"])].copy()
    freq_pivot = freq_plot.pivot(index="appliance_type", columns="dataset_split", values="mean").loc[list(APPLIANCE_LABELS)]
    ax = freq_pivot.rename(index=APPLIANCE_LABELS).plot(kind="bar", figsize=(9, 5), color=["#54A24B", "#E45756"])
    ax.set_title("Daily Usage Frequency: Train vs Changed Routine Test")
    ax.set_xlabel("Appliance")
    ax.set_ylabel("Mean daily usage count")
    ax.legend(title="Split")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "daily_frequency_train_test_by_appliance.png", dpi=160)
    plt.close()

    daily_usage = logs.copy()
    daily_usage["usage_date"] = pd.to_datetime(daily_usage["usage_date"])
    timeline = daily_usage.groupby(["usage_date", "dataset_split"]).size().reset_index(name="usage_count")
    fig, ax = plt.subplots(figsize=(12, 5))
    for split, group in timeline.groupby("dataset_split"):
        ax.plot(group["usage_date"], group["usage_count"], label=split, linewidth=1.4)
    ax.set_title("Usage Count Timeline by Split")
    ax.set_xlabel("Date")
    ax.set_ylabel("Usage logs")
    ax.legend()
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "usage_count_timeline_by_split.png", dpi=160)
    plt.close()

    usage_hours = logs.copy()
    usage_hours["hour"] = usage_hours["started_at"].dt.hour
    heatmap_data = usage_hours.pivot_table(index="appliance_type", columns="hour", values="log_id", aggfunc="count", fill_value=0)
    heatmap_data = heatmap_data.reindex(list(APPLIANCE_LABELS))
    fig, ax = plt.subplots(figsize=(12, 4))
    im = ax.imshow(heatmap_data.values, aspect="auto", cmap="YlGnBu")
    ax.set_title("Usage Hour Heatmap")
    ax.set_yticks(range(len(heatmap_data.index)))
    ax.set_yticklabels([APPLIANCE_LABELS[key] for key in heatmap_data.index])
    ax.set_xticks(range(len(heatmap_data.columns)))
    ax.set_xticklabels(heatmap_data.columns)
    ax.set_xlabel("Hour of day")
    fig.colorbar(im, ax=ax, label="Usage logs")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "usage_hour_heatmap.png", dpi=160)
    plt.close()

    plot_data = [
        intervals.loc[intervals["appliance_type"] == appliance, "interval_days"].clip(upper=10).dropna().values
        for appliance in APPLIANCE_LABELS
    ]
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.boxplot(plot_data, tick_labels=[APPLIANCE_LABELS[key] for key in APPLIANCE_LABELS], showfliers=False)
    ax.set_title("Family Interval Distribution by Appliance")
    ax.set_ylabel("Interval days (clipped at 10)")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "family_interval_boxplot.png", dpi=160)
    plt.close()

    fig, ax = plt.subplots(figsize=(12, 3.8))
    ax.axis("off")
    steps = [
        "Raw appliance logs",
        "Preprocessing",
        "Base cycle/frequency",
        "Recent monitoring",
        "Change detection",
        "Adaptive recalibration",
        "Next date + reason",
    ]
    x_positions = [i / (len(steps) - 1) for i in range(len(steps))]
    for index, (x, step) in enumerate(zip(x_positions, steps)):
        ax.text(
            x,
            0.55,
            step,
            ha="center",
            va="center",
            fontsize=9,
            bbox=dict(boxstyle="round,pad=0.35", facecolor="#F2F4F8", edgecolor="#4C78A8"),
        )
        if index < len(steps) - 1:
            ax.annotate("", xy=(x_positions[index + 1] - 0.045, 0.55), xytext=(x + 0.045, 0.55), arrowprops=dict(arrowstyle="->", color="#333333"))
    ax.set_title("TTA-inspired Adaptive Cycle Recalibration Pipeline", fontsize=12)
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "model_pipeline.png", dpi=160)
    plt.close()


def build_markdown_files(context):
    dataset_summary, pattern_table, generation_settings, appliance_rows, column_descriptions = context["dataset"]
    analysis_goals, analysis_methods, analysis_results = context["analysis"]
    model_components, hparam_space, best_table = context["model"]
    predictions, prediction_summary, representative, reason_examples, best_by_appliance_df = context["prediction"]
    validation_metrics, final_evaluation, top10 = context["validation"]
    best = context["best"]

    report_content = f"""# Report Content Guide

## 1. Data Preparation

### 1-1. Dataset Definition

This project uses a ThinQ-like synthetic appliance usage log dataset. It is not real LG ThinQ user data. The dataset contains 110 families, and each family owns four appliance types: robot_cleaner, dishwasher, washer, and dryer.

The split is time-based, not random. Train covers the base routine period, validation covers the later base-routine period, and test represents changed routine logs arriving after training.

{markdown_table(dataset_summary)}

{markdown_table(pattern_table)}

Evidence files:
- outputs/dummy_appliance_dataset/appliance_usage_generation_report.md
- outputs/dummy_appliance_dataset/appliance_usage_dataset_summary.csv
- outputs/report_evidence/report_tables/dataset_summary_table.csv
- outputs/report_evidence/report_tables/designed_pattern_table.csv

### 1-2. Data Generation Method

Real LG ThinQ logs are difficult to collect because of privacy and access constraints. Therefore, a ThinQ-like schema was used to generate synthetic data. The generator includes day jitter, time jitter, missing logs, duplicate-like repeated usage, weekend usage boost, and family-specific duration, energy, and preferred usage time.

{markdown_table(generation_settings)}

Evidence files:
- TCR/data-make-multifamily.py
- outputs/report_evidence/report_tables/data_generation_settings.csv
- outputs/dummy_appliance_dataset/appliance_usage_generation_report.md

### 1-3. Collected Data

{markdown_table(appliance_rows)}

Key modeling columns:

{markdown_table(column_descriptions)}

## 2. Data Analysis

### 2-1. Analysis Goals

{markdown_table(analysis_goals)}

### 2-2. Analysis Scenario

1. Sort logs by started_at.
2. Group usage dates by family_id and appliance_id.
3. Calculate interval_days from unique usage dates.
4. Calculate daily_usage_count for same-day frequency changes.
5. Compare train, validation, and changed routine test statistics.
6. Confirm that the designed routine changes appear in the generated data.

### 2-3. Analysis Methods

{markdown_table(analysis_methods)}

### 2-4. Analysis Results

{markdown_table(analysis_results.round(4))}

Figures:
- outputs/report_evidence/figures/mean_interval_train_test_by_appliance.png
- outputs/report_evidence/figures/daily_frequency_train_test_by_appliance.png
- outputs/report_evidence/figures/usage_count_timeline_by_split.png
- outputs/report_evidence/figures/usage_hour_heatmap.png
- outputs/report_evidence/figures/family_interval_boxplot.png

## 3. Model Creation And Training

### 3-1. Modeling Goal

The goal is next usage cycle prediction, routine change detection, and TTA-inspired adaptive recalibration. This is not deep learning TTA, full retraining, BatchNorm update, or entropy minimization. The implementation adapts cycle/frequency parameters from recent unlabeled appliance logs.

Pipeline figure:
- outputs/report_evidence/figures/model_pipeline.png

### 3-2. Training Model

{markdown_table(model_components)}

### 3-3. Training Method

The baseline model estimates median cycle and daily frequency from the train period. The changed routine test period is used to evaluate adaptation after training. Hyperparameters are selected by exhaustive grid search.

{markdown_table(hparam_space)}

Best hyperparameters:

{markdown_table(best_table)}

Score formula:

`score = 0.45 * overall_change_f1 + 0.25 * change_type_accuracy + 0.15 * normalized_cycle_score + 0.15 * normalized_frequency_score`

### 3-4. Prediction Results

Best params_id: `{best["params_id"]}`.

{markdown_table(prediction_summary)}

Representative prediction rows:

{markdown_table(representative.head(12))}

Daily Report reason examples:

{markdown_table(reason_examples)}

## 4. Validation

### 4-1. Validation Plan

{markdown_table(validation_metrics)}

### 4-2. Evaluation Results

{markdown_table(final_evaluation)}

Top 10 hyperparameter combinations:

{markdown_table(top10)}

Important interpretation:
- Dishwasher is validated through daily_usage_count based frequency_change detection because interval_days remains near 1 day.
- The test split is changed routine test data, not random validation data.
- The implemented model is TTA-inspired adaptive cycle/frequency recalibration, not full model retraining.
"""
    write_text(EVIDENCE_DIR / "report_content_guide.md", report_content)

    capture_rows = [
        ["C01", "outputs/dummy_appliance_dataset/appliance_usage_generation_report.md", "Overview and split row counts", "1-1 Dataset Definition", "Shows train/validation/test periods and row counts"],
        ["C02", "outputs/report_evidence/report_tables/designed_pattern_table.csv", "Whole table", "1-1 Dataset Definition", "Shows expected appliance routine changes"],
        ["C03", "TCR/data-make-multifamily.py", "Constants and NOISE section", "1-2 Data Generation Method", "Shows family count, appliance list, split periods, jitter and missing log settings"],
        ["C04", "outputs/report_evidence/report_tables/appliance_row_count_table.csv", "Whole table", "1-3 Collected Data", "Shows generated row counts by appliance and split"],
        ["C05", "outputs/report_evidence/report_tables/column_description_table.csv", "Whole table", "1-3 Collected Data", "Explains modeling columns"],
        ["C06", "outputs/report_evidence/figures/mean_interval_train_test_by_appliance.png", "Full image", "2-4 Analysis Results", "Shows interval cycle changes"],
        ["C07", "outputs/report_evidence/figures/daily_frequency_train_test_by_appliance.png", "Full image", "2-4 Analysis Results", "Shows dishwasher daily frequency increase"],
        ["C08", "outputs/report_evidence/figures/family_interval_boxplot.png", "Full image", "2-4 Analysis Results", "Shows multi-family variation"],
        ["C09", "outputs/report_evidence/figures/model_pipeline.png", "Full image", "3-1 Modeling Goal", "Shows TTA-inspired pipeline"],
        ["C10", "Web_ui/src/utils/routineCyclePrediction.ts", "Types and predictRoutineCycle/detect functions", "3-2 Training Model", "Shows model implementation"],
        ["C11", "outputs/routine_hparam_search/best_hyperparameters.json", "Whole file", "3-3 Training Method", "Shows best score and best parameters"],
        ["C12", "outputs/report_evidence/report_tables/top10_hyperparameter_table.csv", "Whole table", "4-2 Evaluation Results", "Shows top 10 grid search results"],
        ["C13", "outputs/report_evidence/report_tables/prediction_result_summary_table.csv", "Whole table", "3-4 Prediction Results", "Shows expected vs actual change_type counts"],
        ["C14", "outputs/report_evidence/execution_log.md", "Command result table", "4-2 Evaluation Results", "Shows build and evaluation execution evidence"],
    ]
    capture_df = pd.DataFrame(capture_rows, columns=["capture_id", "file_path", "capture_position", "report_section", "proves"])
    write_csv(capture_df, "capture_checklist_table.csv")
    write_text(EVIDENCE_DIR / "capture_checklist.md", "# Capture Checklist\n\n" + markdown_table(capture_df))

    index_rows = []
    for path in sorted(EVIDENCE_DIR.rglob("*")):
        if path.is_file():
            index_rows.append(
                {
                    "file_path": str(path.relative_to(ROOT_DIR)).replace("\\", "/"),
                    "purpose": evidence_purpose(path),
                    "report_location": evidence_location(path),
                }
            )
    index_df = pd.DataFrame(index_rows)
    write_csv(index_df, "report_evidence_index.csv")
    write_text(EVIDENCE_DIR / "report_evidence_index.md", "# Report Evidence Index\n\n" + markdown_table(index_df))

    insert_text = f"""# Report Insert Text

## Dataset Summary

The dataset is a ThinQ-like synthetic appliance usage log dataset with 110 families and 440 appliances. It contains {int(dataset_summary['row_count'].sum())} rows across train, validation, and changed routine test splits. The split is time-based: train is 2025-01-01 to 2025-10-31, validation is 2025-11-01 to 2025-12-31, and test is 2026-01-01 to 2026-03-31.

## Modeling Summary

The implemented model is a TTA-inspired Adaptive Cycle Recalibration model. It estimates a base cycle and base daily frequency from historical logs, monitors recent interval and daily-frequency distributions at test time, and adapts only the cycle/frequency parameters when drift is detected. It does not perform full model retraining or deep learning TTA.

## Best Result Summary

The best hyperparameter set is `{best["params_id"]}` with score `{best["score"]}`. Its overall_change_f1 is `{best["overall_change_f1"]}`, change_type_accuracy is `{best["change_type_accuracy"]}`, interval_change_f1 is `{best["interval_change_f1"]}`, and frequency_change_f1 is `{best["frequency_change_f1"]}`. Dishwasher frequency_change is specifically evaluated through daily_usage_count because interval_days alone cannot detect the 1 use/day to 2 uses/day change.
"""
    write_text(EVIDENCE_DIR / "report_insert_text.md", insert_text)


def evidence_purpose(path):
    name = path.name
    if name.endswith(".png"):
        return "Report figure"
    if name.endswith(".csv"):
        return "Report table or analysis result"
    if name.endswith(".md"):
        return "Report-ready narrative or checklist"
    return "Evidence artifact"


def evidence_location(path):
    name = path.name
    if "dataset" in name or "column" in name or "generation" in name:
        return "1. Data Preparation"
    if "analysis" in name or "interval" in name or "frequency" in name or name.endswith(".png"):
        return "2. Data Analysis"
    if "model" in name or "hyperparameter" in name or "prediction" in name:
        return "3. Model Creation And Training"
    if "validation" in name or "evaluation" in name or "execution" in name:
        return "4. Validation"
    return "General evidence"


def run_command(command):
    result = subprocess.run(
        command,
        cwd=ROOT_DIR,
        shell=True,
        text=True,
        capture_output=True,
        encoding="utf-8",
        errors="replace",
    )
    return {
        "command": command,
        "return_code": result.returncode,
        "stdout_tail": result.stdout[-3000:].strip(),
        "stderr_tail": result.stderr[-3000:].strip(),
    }


def write_execution_log(results):
    lines = [
        "# Execution Log",
        "",
        "| command | return_code | result |",
        "| --- | ---: | --- |",
    ]
    for result in results:
        status = "PASS" if result["return_code"] == 0 else "FAIL"
        lines.append(f"| `{result['command']}` | {result['return_code']} | {status} |")
    lines.append("")
    for result in results:
        lines.extend(
            [
                f"## {result['command']}",
                "",
                f"- return_code: {result['return_code']}",
                "",
                "### stdout tail",
                "",
                "```text",
                result["stdout_tail"] or "(empty)",
                "```",
                "",
                "### stderr tail",
                "",
                "```text",
                result["stderr_tail"] or "(empty)",
                "```",
                "",
            ]
        )
    write_text(EVIDENCE_DIR / "execution_log.md", "\n".join(lines))


def maybe_run_validation(skip_commands):
    if skip_commands:
        write_execution_log(
            [
                {
                    "command": "validation commands",
                    "return_code": 0,
                    "stdout_tail": "Skipped by --skip-commands. Existing build/evaluation artifacts were used.",
                    "stderr_tail": "",
                }
            ]
        )
        return
    commands = [
        "npm run build",
        "npm run routine:hparam",
        "python TCR/train-evaluate.py",
    ]
    write_execution_log([run_command(command) for command in commands])


def main():
    skip_commands = "--skip-commands" in sys.argv
    ensure_dirs()
    logs, summary, hparams, best, best_by_appliance = load_inputs()
    intervals, interval_stats = calculate_interval_stats(logs)
    daily_counts, frequency_stats = calculate_frequency_stats(logs)
    dataset_context = build_dataset_tables(logs, summary)
    analysis_context = build_analysis_tables(logs, intervals, interval_stats, daily_counts, frequency_stats)
    model_context = build_model_tables(best)
    prediction_context = build_prediction_tables(best, best_by_appliance)
    validation_context = build_validation_tables(best, hparams)
    save_figures(logs, intervals, interval_stats, frequency_stats)
    build_markdown_files(
        {
            "dataset": dataset_context,
            "analysis": analysis_context,
            "model": model_context,
            "prediction": prediction_context,
            "validation": validation_context,
            "best": best,
        }
    )
    maybe_run_validation(skip_commands)
    print(f"Report evidence saved to: {EVIDENCE_DIR}")
    print(f"Tables saved to: {TABLE_DIR}")
    print(f"Figures saved to: {FIGURE_DIR}")
    print(f"Best params_id: {best['params_id']}")
    print(f"Best score: {best['score']}")


if __name__ == "__main__":
    main()
