#!/usr/bin/env python3

import argparse
import os

import pandas as pd

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CASAS_DATASET_DIR = os.path.normpath(
    os.path.join(
        CURRENT_DIR,
        "..",
        "SmartHomeHARLib",
        "SmartHomeHARLib",
        "datasets",
        "original_datasets",
        "CASAS",
    )
)

from label_mapping import (
    add_service_activity_label,
    map_service_label_to_appliance,
    map_service_label_to_appliance_candidates,
)


SUPPORTED_DATASETS = {"aruba", "cairo", "milan"}

DAY_OF_WEEK_LABELS = {
    0: "월요일",
    1: "화요일",
    2: "수요일",
    3: "목요일",
    4: "금요일",
    5: "토요일",
    6: "일요일",
}


def get_time_slot_label(hour):
    hour = int(hour)
    if 5 <= hour <= 8:
        return "아침"
    if 9 <= hour <= 11:
        return "오전"
    if 12 <= hour <= 13:
        return "점심"
    if 14 <= hour <= 17:
        return "오후"
    if 18 <= hour <= 20:
        return "저녁"
    if 21 <= hour <= 23:
        return "밤"
    return "새벽"


def _resolve_activity_status_column(df):
    for column in ("activityState", "activity_status", "log"):
        if column in df.columns:
            return column
    raise ValueError(
        "Activity status column not found. Expected one of: activityState, activity_status, log"
    )


def build_activity_start_dataset(dataset_name, df):
    status_column = _resolve_activity_status_column(df)
    working_df = df.copy()
    working_df["datetime"] = pd.to_datetime(working_df["datetime"])

    begin_df = working_df[
        working_df[status_column].fillna("").astype(str).str.lower().eq("begin")
    ].copy()
    begin_df = begin_df[begin_df["activity"].notna()].copy()

    add_service_activity_label(begin_df, dataset_name)

    begin_df["dataset"] = dataset_name.lower()
    begin_df["activity_label"] = begin_df["activity"].astype(str)
    begin_df["activity_start_time"] = begin_df["datetime"]
    begin_df["activity_start_hour"] = begin_df["activity_start_time"].dt.hour.astype(int)
    begin_df["day_of_week"] = begin_df["activity_start_time"].dt.dayofweek.map(
        DAY_OF_WEEK_LABELS
    )
    begin_df["time_slot_label"] = begin_df["activity_start_hour"].map(
        get_time_slot_label
    )
    begin_df["recommended_appliance"] = begin_df["service_activity_label"].map(
        map_service_label_to_appliance
    )
    begin_df["recommended_appliance_candidates"] = begin_df[
        "service_activity_label"
    ].map(lambda label: ";".join(map_service_label_to_appliance_candidates(label)))

    columns = [
        "dataset",
        "activity_label",
        "service_activity_label",
        "activity_start_time",
        "activity_start_hour",
        "day_of_week",
        "time_slot_label",
        "recommended_appliance",
        "recommended_appliance_candidates",
    ]
    return begin_df[columns].sort_values("activity_start_time").reset_index(drop=True)


def load_casas_cleaned_data(dataset_name, dataset_root=CASAS_DATASET_DIR):
    cleaned_data_path = os.path.join(dataset_root, dataset_name.lower(), "cleanedData")
    if not os.path.exists(cleaned_data_path):
        raise FileNotFoundError("CASAS cleanedData not found: {}".format(cleaned_data_path))

    df = pd.read_csv(
        cleaned_data_path,
        sep="\t",
        header=None,
        names=["datetime", "sensor", "value", "activity", "activityState"],
    )
    df["datetime"] = pd.to_datetime(df["datetime"])
    return df


def build_datasets(dataset_names):
    frames = []
    for dataset_name in dataset_names:
        dataset_key = dataset_name.lower()
        if dataset_key not in SUPPORTED_DATASETS:
            supported = ", ".join(sorted(SUPPORTED_DATASETS))
            raise ValueError(
                "Unsupported dataset '{}'. Supported datasets: {}".format(
                    dataset_name, supported
                )
            )

        df = load_casas_cleaned_data(dataset_key)
        frames.append(build_activity_start_dataset(dataset_key, df))

    return pd.concat(frames, ignore_index=True)


def save_service_activity_datasets(activity_sequences, output_dir):
    os.makedirs(output_dir, exist_ok=True)

    processed_path = os.path.join(
        output_dir, "processed_service_activity_sequences.csv"
    )
    start_time_path = os.path.join(output_dir, "activity_start_time_dataset.csv")
    appliance_path = os.path.join(
        output_dir, "appliance_recommendation_dataset.csv"
    )

    activity_sequences.to_csv(processed_path, index=False, encoding="utf-8-sig")

    activity_sequences[
        [
            "dataset",
            "service_activity_label",
            "activity_start_time",
            "activity_start_hour",
            "day_of_week",
            "time_slot_label",
        ]
    ].to_csv(start_time_path, index=False, encoding="utf-8-sig")

    activity_sequences[
        [
            "dataset",
            "service_activity_label",
            "time_slot_label",
            "recommended_appliance",
            "recommended_appliance_candidates",
            "activity_start_time",
            "activity_start_hour",
            "day_of_week",
        ]
    ].to_csv(appliance_path, index=False, encoding="utf-8-sig")

    return {
        "processed_service_activity_sequences": processed_path,
        "activity_start_time_dataset": start_time_path,
        "appliance_recommendation_dataset": appliance_path,
    }


def parse_args():
    parser = argparse.ArgumentParser(
        description="Build service activity start-time and appliance recommendation datasets."
    )
    parser.add_argument(
        "--datasets",
        nargs="+",
        default=["aruba", "cairo", "milan"],
        help="CASAS datasets to include: aruba cairo milan",
    )
    parser.add_argument(
        "--output_dir",
        default="datasets",
        help="Directory where CSV files will be written.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    activity_sequences_df = build_datasets(args.datasets)
    output_paths = save_service_activity_datasets(
        activity_sequences_df, args.output_dir
    )

    print("service_activity_label class distribution")
    print(activity_sequences_df["service_activity_label"].value_counts().sort_index())

    print("\ntime_slot_label distribution")
    print(activity_sequences_df["time_slot_label"].value_counts().sort_index())

    print("\nSaved files")
    for name, path in output_paths.items():
        print("{}: {}".format(name, path))
