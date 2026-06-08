#!/usr/bin/env python3
import pickle
import json
import os

from label_mapping import add_service_activity_label


def get_time_slot_label_from_hour(hour):
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


def _first_sequence_hour(hour_sequence):
    if hasattr(hour_sequence, "__len__") and not isinstance(hour_sequence, str):
        if len(hour_sequence) == 0:
            return 0
        hour = hour_sequence[0]
    else:
        hour = hour_sequence

    # Existing preprocessing stores hours as dt.hour + 1 for embedding mask_zero.
    return (int(hour) - 1) % 24


def load_config(config_path):
    f = open(
        config_path,
    )

    # returns JSON object as
    # a dictionary
    return json.load(f)


def _load_pickle_from_candidates(paths):
    for path in paths:
        if os.path.exists(path):
            with open(path, "rb") as f:
                return pickle.load(f)

    raise FileNotFoundError("Could not find any dataset pickle: {}".format(paths))


def prepare_classification_dataframe_labels(
    df, dataset_name, label_column="service_activity_label"
):
    df = df.copy()

    if "activity_label" not in df.columns:
        df["activity_label"] = df["labels"]

    if "service_activity_label" not in df.columns:
        add_service_activity_label(
            df,
            dataset_name,
            source_column="activity_label",
            target_column="service_activity_label",
        )

    if "time_slot_label" not in df.columns:
        if "input_12" not in df.columns:
            raise ValueError(
                "time_slot_label is missing and input_12 is not available to derive it."
            )
        df["activity_start_hour"] = df["input_12"].map(_first_sequence_hour)
        df["time_slot_label"] = df["activity_start_hour"].map(
            get_time_slot_label_from_hour
        )

    if label_column not in df.columns:
        raise ValueError(
            "Unknown label_column '{}'. Available columns: {}".format(
                label_column, list(df.columns)
            )
        )

    df["labels"] = df[label_column]
    return df


def print_class_distribution(df, label_column="service_activity_label", title=None):
    title = title or "{} class distribution".format(label_column)
    print("\n{}".format(title))
    print(df[label_column].value_counts(dropna=False).sort_index())


def load_train_data_gpt(data):
    train_x = None
    train_y = None

    # Load the list of DataFrames from the pickle file
    with open("datasets/" + data + "_train_data_time.pickle", "rb") as f:
        train_x = pickle.load(f)

    return train_x, train_y


def load_train_data_gpt_sep(data):
    train_x = None
    train_y = None

    # Load the list of DataFrames from the pickle file
    with open("datasets/" + data + "_train_gpt_with_sep_X.pickle", "rb") as f:
        train_x = pickle.load(f)

    with open("datasets/" + data + "_train_gpt_with_sep_Y.pickle", "rb") as f:
        train_y = pickle.load(f)

    return train_x, train_y


def load_train_data_elmo(dataset_name):
    # Load train data X from the pickle file
    with open(
        "datasets/" + dataset_name + "_train_classification_data_X.pickle", "rb"
    ) as f:
        train_x = pickle.load(f)

    return train_x


def load_train_data_from_dataframe_time(
    dataset_name, with_sep=False, label_column="service_activity_label"
):
    # Load train data X from the pickle file
    if with_sep:
        paths = [
            "datasets/"
            + dataset_name
            + "_train_classification_data_time_with_sep_dataframe.pickle",
        ]
    else:
        paths = [
            "datasets/" + dataset_name + "_train_classification_data_time_dataframe.pickle",
        ]

    train_x = _load_pickle_from_candidates(paths)

    return prepare_classification_dataframe_labels(train_x, dataset_name, label_column)


def load_test_data_from_dataframe_time(
    dataset_name, with_sep=False, label_column="service_activity_label"
):
    # Load train data X from the pickle file
    if with_sep:
        paths = [
            "datasets/"
            + dataset_name
            + "_test_classification_data_time_with_sep_dataframe.pickle",
            "datasets/"
            + dataset_name
            + "_test_classification_dataa_time_with_sep_dataframe.pickle",
        ]
    else:
        paths = [
            "datasets/" + dataset_name + "_test_classification_data_time_dataframe.pickle",
        ]

    test_x = _load_pickle_from_candidates(paths)

    return prepare_classification_dataframe_labels(test_x, dataset_name, label_column)
