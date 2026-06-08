#!/usr/bin/env python3
from utils import *


from experiments.embedding_pre_trained.gpt.GPTBiLSTMContextExperiment2 import (
    GPTBiLSTMContextExperiment2,
)
from experiments.embedding_pre_trained.gpt.GPTBiLSTMContextWithSepExperiment2 import (
    GPTBiLSTMContextWithSepExperiment2,
)
from experiments.embedding_pre_trained.gpt.GPTBiLSTMHierarchyExperiment2 import (
    GPTBiLSTMHierarchyExperiment2,
)

from experiments.embedding_pre_trained.gpt.GPTBiLSTMHierarchyHourExperiment2 import (
    GPTBiLSTMHierarchyHourExperiment2,
)
from experiments.embedding_pre_trained.gpt.GPTBiLSTMExperiment2 import (
    GPTBiLSTMExperiment2,
)
from experiments.embedding_pre_trained.elmo.ELMoBiLSTMHierarchyExperiment import (
    ELMoBiLSTMHierarchyExperiment,
)
from experiments.embedding_pre_trained.elmo.ELMoBiLSTMHierarchyHourExperiment import (
    ELMoBiLSTMHierarchyHourExperiment,
)
from experiments.embedding_pre_trained.elmo.ELMoBiLSTMExperiment import (
    ELMoBiLSTMExperiment,
)
from experiments.embedding_pre_trained.elmo.ELMoBiLSTMContextExperiment import (
    ELMoBiLSTMContextExperiment,
)
from experiments.embedding_pre_trained.elmo.ELMoBiLSTMContextWithSepExperiment import (
    ELMoBiLSTMContextWithSepExperiment,
)


import os
import json
import argparse
import numpy as np
import random as rn
from pathlib import Path

import tensorflow as tf


SEED = 7
DEBUG_MODE = False

# Set the seed for hash based operations in python
os.environ["PYTHONHASHSEED"] = "0"
# Fix the random seed for tensorflow
tf.random.set_seed(SEED)
# Fix the random seed for numpy
np.random.seed(SEED)
# Fix the random seed for random module
rn.seed(SEED)

tf.keras.utils.set_random_seed(SEED)


def load_config(config_path):
    f = open(
        config_path,
    )

    # returns JSON object as
    # a dictionary
    return json.load(f)


def _resolve_existing_path(path_value, config_path):
    raw_path = Path(path_value)
    code_dir = Path(__file__).resolve().parent
    config_dir = Path(config_path).resolve().parent

    candidates = []
    if raw_path.is_absolute():
        candidates.append(raw_path)
    else:
        candidates.extend(
            [
                Path.cwd() / raw_path,
                code_dir / raw_path,
                config_dir / raw_path,
            ]
        )

    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()

    return None


def validate_and_print_config(config, config_path, dataset_name, require_multi_task=False):
    config.setdefault("time_slot_loss_alpha", 0.5)

    required_path_keys = [
        "pre_train_embedding",
        "word_dict",
        "embedding_parameters",
    ]

    missing_keys = [key for key in required_path_keys if key not in config]
    if missing_keys:
        raise KeyError("Missing required config keys: {}".format(missing_keys))

    dataset_key = str(dataset_name).lower()
    wrong_dataset_paths = []
    for key in required_path_keys:
        if dataset_key not in str(config[key]).lower():
            wrong_dataset_paths.append("{}={}".format(key, config[key]))

    if wrong_dataset_paths:
        raise ValueError(
            "Config paths do not appear to point to the '{}' dataset: {}".format(
                dataset_key, wrong_dataset_paths
            )
        )

    missing_files = []
    for key in required_path_keys:
        resolved_path = _resolve_existing_path(config[key], config_path)
        if resolved_path is None:
            missing_files.append("{}: {}".format(key, config[key]))
        else:
            config[key] = str(resolved_path)

    if missing_files:
        raise FileNotFoundError(
            "Missing pretrained config file(s):\n"
            + "\n".join(["- " + missing_file for missing_file in missing_files])
        )

    if require_multi_task and config.get("multi_task_learning", False) is not True:
        raise ValueError("multi_task_learning must be true for the multi-task GPTHAR_H run.")

    print("\nConfig check")
    print("dataset: {}".format(dataset_key))
    print("multi_task_learning: {}".format(config.get("multi_task_learning")))
    if config.get("multi_task_learning", False):
        print("targets: service_activity_label + time_slot_label")
    print("pre_train_embedding: {}".format(config["pre_train_embedding"]))
    print("word_dict: {}".format(config["word_dict"]))
    print("embedding_parameters: {}".format(config["embedding_parameters"]))
    print("time_slot_loss_alpha: {}".format(config["time_slot_loss_alpha"]))


milan_dict = {
    "Other": "Other",
    "Master_Bedroom_Activity": "Other",
    "Meditate": "Other",
    "Chores": "Work",
    "Desk_Activity": "Work",
    "Morning_Meds": "Take_medicine",
    "Eve_Meds": "Take_medicine",
    "Sleep": "Sleep",
    "Read": "Relax",
    "Watch_TV": "Relax",
    "Leave_Home": "Leave_Home",
    "Dining_Rm_Activity": "Eat",
    "Kitchen_Activity": "Cook",
    "Bed_to_Toilet": "Bed_to_toilet",
    "Master_Bathroom": "Bathing",
    "Guest_Bathroom": "Bathing",
}

cairo_dict = {
    "Other": "Other",
    "R1_wake": "Other",
    "R2_wake": "Other",
    "Night_wandering": "Other",
    "R1_work_in_office": "Work",
    "Laundry": "Work",
    "R2_take_medicine": "Take_medicine",
    "R1_sleep": "Sleep",
    "R2_sleep": "Sleep",
    "Leave_home": "Leave_Home",
    "Breakfast": "Eat",
    "Dinner": "Eat",
    "Lunch": "Eat",
    "Bed_to_toilet": "Bed_to_toilet",
}


aruba_dict = {
    "Other": "Other",
    "Wash_Dishes": "Work",
    "Sleeping": "Sleep",
    "Respirate": "Other",
    "Relax": "Relax",
    "Meal_Preparation": "Cook",
    "Housekeeping": "Work",
    "Enter_Home": "Enter_Home",
    "Leave_Home": "Leave_Home",
    "Eating": "Eat",
    "Bed_to_Toilet": "Bed_to_toilet",
    "Work": "Work",
}

if __name__ == "__main__":
    # Specify the Tensorflow environment
    gpus = tf.config.experimental.list_physical_devices("GPU")
    if gpus:
        try:
            # Currently, memory growth needs to be the same across GPUs
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)

        except RuntimeError as e:
            # Memory growth must be set before GPUs have been initialized
            print(e)

    strategy = tf.distribute.MirroredStrategy()

    # Set and parse the arguments list
    p = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter, description=""
    )
    p.add_argument(
        "--d",
        dest="data",
        action="store",
        default="",
        help="dataset name",
        required=True,
    )
    p.add_argument(
        "--e",
        dest="experiment",
        action="store",
        default="",
        help="dataset name",
        required=True,
    )
    p.add_argument(
        "--c",
        dest="config",
        action="store",
        default="",
        help="config_file",
        required=True,
    )
    p.add_argument(
        "--nb",
        "--n",
        dest="nb_run",
        action="store",
        default="1",
        help="number of repitition",
        required=False,
    )

    p.add_argument(
        "--cv",
        dest="cross_val",
        action="store",
        default="True",
        help="cross validation training",
        required=False,
    )
    p.add_argument(
        "--label_column",
        dest="label_column",
        action="store",
        default="service_activity_label",
        choices=["labels", "activity_label", "service_activity_label"],
        help="target label column used as y",
        required=False,
    )
    p.add_argument(
        "--compare_labels",
        dest="compare_labels",
        action="store",
        default="False",
        help="train once with activity_label and once with service_activity_label",
        required=False,
    )
    p.add_argument(
        "--with_sep",
        dest="with_sep",
        action="store",
        default="False",
        help="load *_time_with_sep_dataframe.pickle files",
        required=False,
    )

    args = p.parse_args()

    data = str(args.data)
    experiment = str(args.experiment)
    config_path = str(args.config)
    nb_run = int(args.nb_run)
    cross_val = str(args.cross_val)
    label_column = str(args.label_column)
    compare_labels = str(args.compare_labels)
    with_sep = str(args.with_sep)

    if cross_val == "True":
        cross_val = True
    else:
        cross_val = False

    compare_labels = compare_labels == "True"
    with_sep = with_sep == "True"

    # Load the config file
    config = load_config(config_path)
    validate_and_print_config(
        config,
        config_path,
        data,
        require_multi_task=(experiment == "GPTHAR_H"),
    )

    label_columns_to_run = (
        ["activity_label", "service_activity_label"]
        if compare_labels
        else [label_column]
    )

    comparison_results = {}

    for current_label_column in label_columns_to_run:
        print("\n==============================")
        print("Training target label: {}".format(current_label_column))
        print("==============================")

        # Load data
        train_x = load_train_data_from_dataframe_time(
            data, with_sep=with_sep, label_column=current_label_column
        )
        print_class_distribution(
            train_x,
            label_column=current_label_column,
            title="Train {} class distribution".format(current_label_column),
        )
        if config.get("multi_task_learning", False) and "time_slot_label" in train_x.columns:
            print_class_distribution(
                train_x,
                label_column="time_slot_label",
                title="Train time_slot_label class distribution",
            )

        if not cross_val:
            test_x = load_test_data_from_dataframe_time(
                data, with_sep=with_sep, label_column=current_label_column
            )
            print_class_distribution(
                test_x,
                label_column=current_label_column,
                title="Test {} class distribution".format(current_label_column),
            )
            if config.get("multi_task_learning", False) and "time_slot_label" in test_x.columns:
                print_class_distribution(
                    test_x,
                    label_column="time_slot_label",
                    title="Test time_slot_label class distribution",
                )
        else:
            test_x = None

        tab_acc = []
        tab_bal_acc = []
        result_dataset_name = "{}_{}".format(data, current_label_column)

        with strategy.scope():
            print("NB RUNS = {}".format(nb_run))
            for i in range(nb_run):
                print("\nRUN = {}/{}\n".format(i + 1, nb_run))

                if experiment == "ELMoAR":
                    exp = ELMoBiLSTMExperiment(
                        result_dataset_name, train_x, test_x, config, cross_val)

                elif experiment == "GPTAR":
                    exp = GPTBiLSTMExperiment2(
                        result_dataset_name, train_x, test_x, config, cross_val)

                elif experiment == "ELMoHAR":
                    exp = ELMoBiLSTMHierarchyExperiment(
                        result_dataset_name, train_x, test_x, config, cross_val
                    )
                elif experiment == "ELMoHAR_H":
                    exp = ELMoBiLSTMHierarchyHourExperiment(
                        result_dataset_name, train_x, test_x, config, cross_val
                    )
                elif experiment == "ELMoAR_C":
                    exp = ELMoBiLSTMContextExperiment(
                        result_dataset_name, train_x, test_x, config, cross_val
                    )
                elif experiment == "ELMoAR_C_S":
                    exp = ELMoBiLSTMContextWithSepExperiment(
                        result_dataset_name, train_x, test_x, config, cross_val
                    )
                elif experiment == "GPTHAR":
                    exp = GPTBiLSTMHierarchyExperiment2(
                        result_dataset_name, train_x, test_x, config, cross_val
                    )
                elif experiment == "GPTHAR_H":
                    exp = GPTBiLSTMHierarchyHourExperiment2(
                        result_dataset_name, train_x, test_x, config, cross_val
                    )
                elif experiment == "GPTAR_C_S":
                    exp = GPTBiLSTMContextWithSepExperiment2(
                        result_dataset_name, train_x, test_x, config, cross_val)
                elif experiment == "GPTAR_C":
                    exp = GPTBiLSTMContextExperiment2(
                        result_dataset_name, train_x, test_x, config, cross_val
                    )
                else:
                    raise ValueError("Unknown experiment: {}".format(experiment))

                exp.DEBUG = DEBUG_MODE

                exp.start()

                # Save word dict
                exp.save_word_dict()

                # Save activity dict
                exp.save_activity_dict()

                # Save metrics
                exp.save_metrics()

                # Save experiment config
                exp.save_config()

                print(
                    "Accuracy run {}: {:.2f}% (+/- {:.2f}%)".format(
                        i + 1,
                        np.mean(exp.global_classifier_accuracy) * 100,
                        np.std(exp.global_classifier_accuracy),
                    )
                )

                print(
                    "Balanced Accuracy run {}: {:.2f}% (+/- {:.2f}%)".format(
                        i + 1,
                        np.mean(exp.global_classifier_balance_accuracy) * 100,
                        np.std(exp.global_classifier_balance_accuracy),
                    )
                )

                if getattr(exp, "multi_task_learning", False):
                    print(
                        "Activity Macro F1 run {}: {:.4f}".format(
                            i + 1, np.mean(exp.global_activity_macro_f1)
                        )
                    )
                    print(
                        "Time Slot Accuracy run {}: {:.2f}%".format(
                            i + 1, np.mean(exp.global_time_slot_accuracy) * 100
                        )
                    )
                    print(
                        "Time Slot Macro F1 run {}: {:.4f}".format(
                            i + 1, np.mean(exp.global_time_slot_macro_f1)
                        )
                    )
                    print(
                        "Joint Accuracy run {}: {:.2f}%".format(
                            i + 1, np.mean(exp.global_joint_accuracy) * 100
                        )
                    )

                tab_acc.append(np.mean(exp.global_classifier_accuracy))
                tab_bal_acc.append(np.mean(exp.global_classifier_balance_accuracy))

        avg_acc = np.mean(tab_acc)
        std_acc = np.std(tab_acc)
        avg_bal_acc = np.mean(tab_bal_acc)
        std_bal_acc = np.std(tab_bal_acc)

        comparison_results[current_label_column] = {
            "accuracy": avg_acc,
            "accuracy_std": std_acc,
            "balanced_accuracy": avg_bal_acc,
            "balanced_accuracy_std": std_bal_acc,
        }

        print(
            "Average Accuracy over all runs: {:.2f}% (+/- {:.2f}%)".format(
                avg_acc * 100, std_acc
            )
        )

        print(
            "Average Balanced Accuracy over all runs: {:.2f}% (+/- {:.2f}%)".format(
                avg_bal_acc * 100, std_bal_acc
            )
        )

        if "exp" in locals() and getattr(exp, "multi_task_learning", False):
            print(
                "Average Activity Macro F1 over all runs: {:.4f} (+/- {:.4f})".format(
                    np.mean(exp.global_activity_macro_f1),
                    np.std(exp.global_activity_macro_f1),
                )
            )
            print(
                "Average Time Slot Accuracy over all runs: {:.2f}% (+/- {:.2f}%)".format(
                    np.mean(exp.global_time_slot_accuracy) * 100,
                    np.std(exp.global_time_slot_accuracy),
                )
            )
            print(
                "Average Time Slot Macro F1 over all runs: {:.4f} (+/- {:.4f})".format(
                    np.mean(exp.global_time_slot_macro_f1),
                    np.std(exp.global_time_slot_macro_f1),
                )
            )
            print(
                "Average Joint Accuracy over all runs: {:.2f}% (+/- {:.2f}%)".format(
                    np.mean(exp.global_joint_accuracy) * 100,
                    np.std(exp.global_joint_accuracy),
                )
            )

    if compare_labels:
        print("\nLabel comparison summary")
        for result_label_column, result in comparison_results.items():
            print(
                "{}: accuracy={:.2f}% (+/- {:.2f}%), balanced_accuracy={:.2f}% (+/- {:.2f}%)".format(
                    result_label_column,
                    result["accuracy"] * 100,
                    result["accuracy_std"],
                    result["balanced_accuracy"] * 100,
                    result["balanced_accuracy_std"],
                )
            )
