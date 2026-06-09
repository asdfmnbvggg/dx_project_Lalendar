# coding: utf-8
# !/usr/bin/env python3

import os
import csv
import time
import json
import numpy as np
import h5py
import pandas as pd

from tqdm import tqdm

from sklearn.model_selection import StratifiedKFold
from sklearn.model_selection import train_test_split
from sklearn import preprocessing
from sklearn.metrics import accuracy_score
from sklearn.metrics import balanced_accuracy_score
from sklearn.metrics import classification_report
from sklearn.metrics import confusion_matrix
from sklearn.metrics import f1_score
import keras_nlp
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.models import *
from tensorflow.keras.layers import *
from tensorflow.keras.utils import *
from tensorflow.keras.callbacks import *
from tensorflow.keras.activations import *
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import Tokenizer


from SmartHomeHARLib.custom_layers import TokenAndPositionEmbedding
from SmartHomeHARLib.custom_layers import GPT_Block
from SmartHomeHARLib.custom_layers import TransformerBlock
from SmartHomeHARLib.custom_layers.transfomers import padding_attention_mask_3


from SmartHomeHARLib.utils import Evaluator
from SmartHomeHARLib.utils import MultiTaskEvaluator

from appliance_postprocessing import add_appliance_recommendations


SERVICE_ACTIVITY_CLASSES = [
    "식사준비",
    "설거지",
    "청소/정리",
    "세탁",
    "외출",
    "귀가",
    "휴식/수면",
    "기타",
]

TIME_SLOT_CLASSES = ["새벽", "아침", "오전", "점심", "오후", "저녁", "밤"]


def isGroup(obj):
    if isinstance(obj, h5py.Group):
        return True

    return False


def isDataset(obj):
    if isinstance(obj, h5py.Dataset):
        return True

    return False


def getDatasetFromGroup(datasets, obj):
    if isGroup(obj):
        for key in obj:
            x = obj[key]
            getDatasetFromGroup(datasets, x)
    else:
        datasets.append(obj)


def getWeightsForLayer(layerName, fileName):
    weights = []
    with h5py.File(fileName, mode="r") as f:
        model = f["/model_weights"]
        for key in model:
            if layerName in key:
                obj = model[key]
                datasets = []
                getDatasetFromGroup(datasets, obj)

                for dataset in datasets:
                    w = np.array(dataset)
                    weights.append(w)
    return weights


def load_config(config_path):
    f = open(
        config_path,
    )

    # returns JSON object as
    # a dictionary
    return json.load(f)


class GPTBiLSTMHierarchyHourExperiment2:
    def __init__(
        self,
        dataset_name,
        train_x,
        test_x,
        experiment_parameters,
        cross_validation=True,
    ):
        super().__init__()

        self.experiment_parameters = experiment_parameters
        self.embedding_parameters = load_config(
            self.experiment_parameters["embedding_parameters"]
        )

        self.experiment_tag = "Dataset_{}_Encoding_{}_Segmentation_{}_Batch_{}_Patience_{}_SeqLenght_{}_EmbDim_{}_NbUnits_{}".format(
            dataset_name,
            self.experiment_parameters["encoding"],
            self.experiment_parameters["segmentation"],
            self.experiment_parameters["batch_size"],
            self.experiment_parameters["patience"],
            self.experiment_parameters["sequence_lenght"],
            self.embedding_parameters["embedding_size"],
            self.experiment_parameters["nb_units"],
        )

        # General
        self.global_classifier_accuracy = []
        self.global_classifier_balance_accuracy = []
        self.global_time_slot_accuracy = []
        self.global_activity_macro_f1 = []
        self.global_time_slot_macro_f1 = []
        self.global_joint_accuracy = []
        self.current_time = None
        self.wordDict = self.load_vocabulay_file(
            self.experiment_parameters["word_dict"]
        )
        self.actDict = {}
        self.timeSlotDict = {}
        self.multi_task_learning = self.experiment_parameters.get(
            "multi_task_learning", False
        )
        self.time_slot_loss_alpha = self.experiment_parameters.get(
            "time_slot_loss_alpha", 0.5
        )
        self.train_x = train_x
        self.train_y = None
        self.train_time_slot_y = None
        self.train_x_encoded = None
        self.train_y_encoded = None
        self.train_activity_y_encoded = None
        self.train_time_slot_y_encoded = None
        self.dataset_name = dataset_name
        self.cross_validation = cross_validation

        # Classifier
        self.classifier_dataset_encoder = None
        self.classifier_segmentator = None

        self.classifier_model = None
        self.classifier_best_model_path = None
        self.classifier_data_X = []
        self.classifier_data_Y = []
        self.classifier_data_X_train = []
        self.classifier_data_Y_train = []
        self.classifier_data_X_test = []
        self.classifier_data_Y_test = []
        self.classifier_data_X_val = []
        self.classifier_data_Y_val = []

        self.test_x = test_x

        # Fix the random seed for tensorflow
        tf.random.set_seed(self.experiment_parameters["seed"])
        # Fix the random seed for numpy
        np.random.seed(self.experiment_parameters["seed"])
        # Enable mixed precision, which will speed up training by running most of our computations with 16 bit (instead of 32 bit) floating point numbers.

    def load_vocabulay_file(self, vocab_filename):
        with open(vocab_filename) as json_file:
            return json.load(json_file)

    def _normalize_service_activity_labels(self, labels):
        if not self.multi_task_learning:
            return labels

        allowed_labels = set(SERVICE_ACTIVITY_CLASSES)
        return np.array(
            [label if label in allowed_labels else "기타" for label in labels]
        )

    def data_preprocessing(self):
        # extract labels
        if "service_activity_label" in self.train_x.columns:
            self.train_y = self.train_x.service_activity_label.values
        else:
            self.train_y = self.train_x.labels.values
        self.train_y = self._normalize_service_activity_labels(self.train_y)

        if self.multi_task_learning:
            if "time_slot_label" not in self.train_x.columns:
                raise ValueError("time_slot_label column is required for multi-task learning.")
            self.train_time_slot_y = self.train_x.time_slot_label.values

        # extract inputs
        x1 = self.train_x.input_1.values
        x2 = self.train_x.input_2.values

        x3 = self.train_x.input_6.values
        x4 = self.train_x.input_7.values

        x5 = self.train_x.input_11.values
        x6 = self.train_x.input_12.values

        x_all = x1 + x3 + x5

        # encode tokens

        tokenizer = Tokenizer(filters="", lower=False, oov_token="<UNK>")
        tokenizer.fit_on_texts(x_all)
        tokenizer.word_index = self.wordDict

        # replace words into sentences by their index token
        x1_encoded = np.array(tokenizer.texts_to_sequences(x1), dtype=object)
        x1_encoded = pad_sequences(
            x1_encoded,
            maxlen=self.experiment_parameters["sequence_lenght"],
            padding="post",
        )

        x3_encoded = np.array(tokenizer.texts_to_sequences(x3), dtype=object)
        x3_encoded = pad_sequences(
            x3_encoded,
            maxlen=self.experiment_parameters["sequence_lenght"],
            padding="post",
        )

        x5_encoded = np.array(tokenizer.texts_to_sequences(x5), dtype=object)
        x5_encoded = pad_sequences(
            x5_encoded,
            maxlen=self.experiment_parameters["sequence_lenght"],
            padding="post",
        )

        x2_encoded = pad_sequences(
            x2, maxlen=self.experiment_parameters["sequence_lenght"], padding="post"
        )

        x4_encoded = pad_sequences(
            x4, maxlen=self.experiment_parameters["sequence_lenght"], padding="post"
        )

        x6_encoded = pad_sequences(
            x6, maxlen=self.experiment_parameters["sequence_lenght"], padding="post"
        )

        # create the time distributed input
        reshaped_input_1 = []
        reshaped_input_2 = []

        for i in range(len(x1_encoded)):
            input_1 = []
            input_1.append(x1_encoded[i])
            input_1.append(x3_encoded[i])
            input_1.append(x5_encoded[i])

            input_2 = []
            input_2.append(x2_encoded[i])
            input_2.append(x4_encoded[i])
            input_2.append(x6_encoded[i])

            reshaped_input_1.append(input_1)
            reshaped_input_2.append(input_2)

        self.train_x_encoded = np.array(
            np.stack((reshaped_input_1, reshaped_input_2), axis=-1)
        )

        if self.DEBUG:
            print(self.train_x_encoded.shape)
            input("Press Enter to continue...")

        # encode labels

        le = preprocessing.LabelEncoder()
        le.fit(SERVICE_ACTIVITY_CLASSES if self.multi_task_learning else self.train_y)

        self.label_encoder = le

        self.train_activity_y_encoded = le.transform(self.train_y)
        self.train_y_encoded = self.train_activity_y_encoded

        self.actDict = dict(zip(le.classes_, le.transform(le.classes_)))

        # cast in int
        for keys in self.actDict:
            self.actDict[keys] = int(self.actDict[keys])

        if self.multi_task_learning:
            time_slot_le = preprocessing.LabelEncoder()
            time_slot_le.fit(TIME_SLOT_CLASSES)
            self.time_slot_label_encoder = time_slot_le
            self.train_time_slot_y_encoded = time_slot_le.transform(
                self.train_time_slot_y
            )
            self.timeSlotDict = dict(
                zip(time_slot_le.classes_, time_slot_le.transform(time_slot_le.classes_))
            )
            for keys in self.timeSlotDict:
                self.timeSlotDict[keys] = int(self.timeSlotDict[keys])
            self.train_y_encoded = np.stack(
                [self.train_activity_y_encoded, self.train_time_slot_y_encoded],
                axis=1,
            )

    def data_preprocessing_test(self):
        # extract labels
        if "service_activity_label" in self.test_x.columns:
            self.test_y = self.test_x.service_activity_label.values
        else:
            self.test_y = self.test_x.labels.values
        self.test_y = self._normalize_service_activity_labels(self.test_y)

        if self.multi_task_learning:
            if "time_slot_label" not in self.test_x.columns:
                raise ValueError("time_slot_label column is required for multi-task learning.")
            self.test_time_slot_y = self.test_x.time_slot_label.values

        # extract inputs
        x1 = self.test_x.input_1.values
        x2 = self.test_x.input_2.values

        x3 = self.test_x.input_6.values
        x4 = self.test_x.input_7.values

        x5 = self.test_x.input_11.values
        x6 = self.test_x.input_12.values

        x_all = x1 + x3 + x5

        # encode tokens

        tokenizer = Tokenizer(filters="", lower=False, oov_token="<UNK>")
        tokenizer.fit_on_texts(x_all)
        tokenizer.word_index = self.wordDict

        # replace words into sentences by their index token
        x1_encoded = np.array(tokenizer.texts_to_sequences(x1), dtype=object)
        x1_encoded = pad_sequences(
            x1_encoded,
            maxlen=self.experiment_parameters["sequence_lenght"],
            padding="post",
        )

        x3_encoded = np.array(tokenizer.texts_to_sequences(x3), dtype=object)
        x3_encoded = pad_sequences(
            x3_encoded,
            maxlen=self.experiment_parameters["sequence_lenght"],
            padding="post",
        )

        x5_encoded = np.array(tokenizer.texts_to_sequences(x5), dtype=object)
        x5_encoded = pad_sequences(
            x5_encoded,
            maxlen=self.experiment_parameters["sequence_lenght"],
            padding="post",
        )

        x2_encoded = pad_sequences(
            x2, maxlen=self.experiment_parameters["sequence_lenght"], padding="post"
        )

        x4_encoded = pad_sequences(
            x4, maxlen=self.experiment_parameters["sequence_lenght"], padding="post"
        )

        x6_encoded = pad_sequences(
            x6, maxlen=self.experiment_parameters["sequence_lenght"], padding="post"
        )

        # create the time distributed input
        reshaped_input_1 = []
        reshaped_input_2 = []

        for i in range(len(x1_encoded)):
            input_1 = []
            input_1.append(x1_encoded[i])
            input_1.append(x3_encoded[i])
            input_1.append(x5_encoded[i])

            input_2 = []
            input_2.append(x2_encoded[i])
            input_2.append(x4_encoded[i])
            input_2.append(x6_encoded[i])

            reshaped_input_1.append(input_1)
            reshaped_input_2.append(input_2)

        self.test_x_encoded = np.array(
            np.stack((reshaped_input_1, reshaped_input_2), axis=-1)
        )

        if self.DEBUG:
            print(self.test_x_encoded.shape)
            input("Press Enter to continue...")

        # encode labels

        self.test_activity_y_encoded = self.label_encoder.transform(self.test_y)
        self.test_y_encoded = self.test_activity_y_encoded

        if self.multi_task_learning:
            self.test_time_slot_y_encoded = self.time_slot_label_encoder.transform(
                self.test_time_slot_y
            )
            self.test_y_encoded = np.stack(
                [self.test_activity_y_encoded, self.test_time_slot_y_encoded],
                axis=1,
            )

    def model_selection(self):
        if self.cross_validation:
            with tqdm(total=2, desc="Dataset Split for cross validation") as pbar:
                kfold = StratifiedKFold(
                    n_splits=self.experiment_parameters["nb_splits"],
                    shuffle=True,
                    random_state=self.experiment_parameters["seed"],
                )

                stratify_y = (
                    self.train_y_encoded[:, 0]
                    if self.multi_task_learning
                    else self.train_y_encoded
                )

                for train, test in kfold.split(
                    self.train_x_encoded, stratify_y, groups=None
                ):
                    self.classifier_data_X_train.append(
                        np.array(self.train_x_encoded)[train]
                    )
                    self.classifier_data_Y_train.append(
                        np.array(self.train_y_encoded)[train]
                    )

                    print(np.array(self.train_x_encoded)[train].shape)
                    print(np.array(self.train_y_encoded)[train].shape)

                    self.classifier_data_X_test.append(
                        np.array(self.train_x_encoded)[test]
                    )
                    self.classifier_data_Y_test.append(
                        np.array(self.train_y_encoded)[test]
                    )

                pbar.update(1)

                print(
                    "Before concatenate X_train folds:",
                    [x.shape for x in self.classifier_data_X_train],
                )
                print(
                    "Before concatenate Y_train folds:",
                    [y.shape for y in self.classifier_data_Y_train],
                )
                print(
                    "Before concatenate X_test folds:",
                    [x.shape for x in self.classifier_data_X_test],
                )
                print(
                    "Before concatenate Y_test folds:",
                    [y.shape for y in self.classifier_data_Y_test],
                )

                self.classifier_data_X_train = np.concatenate(
                    self.classifier_data_X_train, axis=0
                )
                self.classifier_data_Y_train = np.concatenate(
                    self.classifier_data_Y_train, axis=0
                )

                self.classifier_data_X_test = np.concatenate(
                    self.classifier_data_X_test, axis=0
                )
                self.classifier_data_Y_test = np.concatenate(
                    self.classifier_data_Y_test, axis=0
                )

                print("After concatenate X_train:", self.classifier_data_X_train.shape)
                print("After concatenate Y_train:", self.classifier_data_Y_train.shape)
                print("After concatenate X_test:", self.classifier_data_X_test.shape)
                print("After concatenate Y_test:", self.classifier_data_Y_test.shape)
                pbar.update(1)

                if self.DEBUG:
                    print("")
                    print(self.classifier_data_X_train.shape)
                    print(self.classifier_data_Y_train.shape)
                    print(self.classifier_data_X_test.shape)
                    print(self.classifier_data_Y_test.shape)

                    input("Press Enter to continue...")
        else:
            with tqdm(total=1, desc="Dataset Split train and validation") as pbar:
                (
                    self.classifier_data_X_train,
                    self.classifier_data_X_val,
                    self.classifier_data_Y_train,
                    self.classifier_data_Y_val,
                ) = train_test_split(
                    self.train_x_encoded,
                    self.train_y_encoded,
                    test_size=0.2,
                    shuffle=True,
                    stratify=(
                        self.train_y_encoded[:, 0]
                        if self.multi_task_learning
                        else self.train_y_encoded
                    ),
                    random_state=self.experiment_parameters["seed"],
                )

                pbar.update(1)

                self.classifier_data_X_test = np.array(self.test_x_encoded)
                self.classifier_data_Y_test = np.array(self.test_y_encoded)

                if self.DEBUG:
                    print("Data processed")
                    print(self.classifier_data_X_train.shape)
                    print(self.classifier_data_Y_train.shape)
                    print(self.classifier_data_X_val.shape)
                    print(self.classifier_data_Y_val.shape)
                    print(self.classifier_data_X_test.shape)
                    print(self.classifier_data_Y_test.shape)

                    input("Press Enter to continue...")

    def build_model_classifier(self, run_number=0):
        nb_timesteps = 3
        nb_classes = len(list(self.actDict.keys()))
        nb_time_slot_classes = len(list(self.timeSlotDict.keys()))
        embed_dim = self.embedding_parameters["embedding_size"]
        num_heads = self.embedding_parameters["num_heads"]
        dropout_rate = self.embedding_parameters["dropout"]
        num_of_layers = self.embedding_parameters["num_layers"]
        vocab_size = len(list(self.wordDict.keys())) + 1
        output_dim = self.experiment_parameters["nb_units"]
        hour_emb_dim = self.experiment_parameters["hour_emb_dim"]
        output_embedding_layer_nomalized = self.experiment_parameters[
            "output_embedding_layer_nomalized"
        ]

        if self.DEBUG:
            print("")
            print(vocab_size)

            input("Press Enter to continue...")

        # build the model

        # classifier
        input_sensor = Input(
            shape=(
                (
                    nb_timesteps,
                    None,
                )
            )
        )
        input_hour = Input(
            shape=(
                (
                    nb_timesteps,
                    None,
                )
            )
        )

        # GPT Embedding

        model_base = load_model(
            self.experiment_parameters["pre_train_embedding"],
            custom_objects={
                "TokenAndPositionEmbedding": keras_nlp.layers.TokenAndPositionEmbedding,
                # "TokenAndPositionEmbedding": TokenAndPositionEmbedding,
                "TransformerDecoder": keras_nlp.layers.TransformerDecoder,
                "Perplexity": keras_nlp.metrics.Perplexity,
            },
        )
        print(model_base.summary())

        # new_model_base = tf.keras.Sequential()
        # new_model_base.add(model_base.layers[0])
        # new_model_base.add(model_base.layers[1])
        # new_model_base.add(model_base.layers[2])
        # new_model_base.add(model_base.layers[3])
        # new_model_base.add(model_base.layers[4])
        # new_model_base.add(model_base.layers[5])
        # new_model_base.add(model_base.layers[6])
        # new_model_base.add(model_base.layers[7])

        # new_model_base.trainable = self.experiment_parameters["trainable"]
        # output_gpt_embedding = new_model_base(
        #    inputs, training=self.experiment_parameters["trainable"])

        # print(new_model_base.summary())
        output_gpt_embedding = TimeDistributed(
            model_base.layers[1], trainable=self.experiment_parameters["trainable"]
        )(input_sensor)
        # gpt_embedding = TimeDistributed(
        #     model_base.layers[2], trainable=self.experiment_parameters["trainable"]
        # )(gpt_embedding)
        # gpt_embedding = TimeDistributed(
        #     model_base.layers[3], trainable=self.experiment_parameters["trainable"]
        # )(gpt_embedding)
        # output_gpt_embedding = TimeDistributed(
        #     model_base.layers[4], trainable=self.experiment_parameters["trainable"]
        # )(gpt_embedding)

        for i in range(2, num_of_layers + 2):
            # new_model_base.add(model_base.layers[i + 1])
            decoder_layer = TimeDistributed(
                model_base.layers[i], trainable=self.experiment_parameters["trainable"]
            )
            output_gpt_embedding = decoder_layer(output_gpt_embedding)

        if output_embedding_layer_nomalized:
            sensor_embedding = TimeDistributed(LayerNormalization(epsilon=1e-5))(
                output_gpt_embedding
            )

            sensor_embedding = TimeDistributed(Bidirectional(LSTM(output_dim)))(
                sensor_embedding
            )
        else:
            sensor_embedding = TimeDistributed(Bidirectional(LSTM(output_dim)))(
                output_gpt_embedding
            )

        # Time Embedding

        embedding_hour = Embedding(
            input_dim=24 + 1,
            output_dim=hour_emb_dim,
            input_length=nb_timesteps,
            mask_zero=True,
        )

        hour_embedding = TimeDistributed(embedding_hour)(input_hour)

        if output_embedding_layer_nomalized:
            hour_embedding = TimeDistributed(LayerNormalization(epsilon=1e-5))(
                hour_embedding
            )
            hour_embedding = TimeDistributed(Bidirectional(LSTM(output_dim)))(
                hour_embedding
            )
        else:
            hour_embedding = TimeDistributed(Bidirectional(LSTM(output_dim)))(
                hour_embedding
            )

        ####

        seq_embedding = Concatenate()([sensor_embedding, hour_embedding])
        # seq_embedding = Concatenate()([output_gpt_embedding, hour_embedding])

        if output_embedding_layer_nomalized:
            # seq_embedding = TimeDistributed(LayerNormalization(epsilon=1e-5))(
            #     seq_embedding
            # )

            # seq_embedding = TimeDistributed(Bidirectional(LSTM(448)))(seq_embedding)
            seq_embedding = TimeDistributed(
                keras_nlp.layers.TransformerEncoder(
                    intermediate_dim=448,
                    num_heads=num_heads,
                    dropout=dropout_rate,
                    activation="relu",
                    normalize_first=True,
                )
            )(seq_embedding)

            # seq_embedding = TimeDistributed(GlobalAveragePooling1D())(seq_embedding)

            # seq_embedding = TimeDistributed(LayerNormalization(epsilon=1e-5))(
            #     seq_embedding
            # )

            seq_embedding = TimeDistributed(Bidirectional(LSTM(224)))(seq_embedding)

            # seq_embedding = TimeDistributed(BatchNormalization())(seq_embedding)

        lstm_1 = Bidirectional(LSTM(128))(seq_embedding)

        # lstm_1 = BatchNormalization()(lstm_1)

        if self.multi_task_learning:
            activity_output = Dense(
                nb_classes, activation="softmax", name="activity_output"
            )(lstm_1)
            time_slot_output = Dense(
                nb_time_slot_classes, activation="softmax", name="time_slot_output"
            )(lstm_1)
            output_layer = [activity_output, time_slot_output]
        else:
            output_layer = Dense(nb_classes, activation="softmax")(lstm_1)

        if output_embedding_layer_nomalized:
            self.classifier_model = Model(
                inputs=[input_sensor, input_hour],
                outputs=output_layer,
                # name="GPT_Hierachy_Hour_BiLSTM_NORM_V1_Classifier",
                name=(
                    "GPT_Hierachy_Hour_BiLSTM_NORM_V4_224_Encoder_MTL_Classifier"
                    if self.multi_task_learning
                    else "GPT_Hierachy_Hour_BiLSTM_NORM_V4_224_Encoder_Classifier"
                ),
            )
        else:
            self.classifier_model = Model(
                inputs=[input_sensor, input_hour],
                outputs=output_layer,
                name=(
                    "GPT_Hierachy_Hour_BiLSTM_MTL_Classifier"
                    if self.multi_task_learning
                    else "GPT_Hierachy_Hour_BiLSTM_Classifier"
                ),
            )

        # ceate a picture of the model
        picture_name = (
            self.classifier_model.name
            + "_"
            + self.experiment_tag
            + "_"
            + str(run_number)
            + ".png"
        )
        picture_path = os.path.join(self.experiment_result_path, picture_name)

        plot_model(self.classifier_model, show_shapes=True, to_file=picture_path)

    def _format_y_for_model(self, y):
        if not self.multi_task_learning:
            return y

        return {
            "activity_output": y[:, 0],
            "time_slot_output": y[:, 1],
        }

    def _has_validation_data(self):
        return isinstance(self.classifier_data_X_val, np.ndarray) and len(
            self.classifier_data_X_val
        ) > 0

    def _extract_target_hours(self, X_input):
        encoded_hours = np.array(X_input[1])
        target_hours = []
        for row in encoded_hours:
            hour_value = row[2][0] if len(row) > 2 and len(row[2]) > 0 else 1
            target_hours.append((int(hour_value) - 1) % 24)
        return target_hours

    def train(
        self, X_train_input, Y_train_input, X_val_input, Y_val_input, run_number=0
    ):
        root_logdir = os.path.join(
            self.experiment_parameters["name"],
            "logs_{}_{}".format(self.experiment_parameters["name"], self.dataset_name),
        )

        run_id = (
            self.classifier_model.name
            + "_"
            + self.experiment_tag
            + "_"
            + str(self.current_time)
            + str(run_number)
        )
        log_dir = os.path.join(root_logdir, run_id)

        if not os.path.exists(log_dir):
            os.makedirs(log_dir)

        best_model_name_saved = (
            self.classifier_model.name
            + "_"
            + self.experiment_tag
            + "_BEST_"
            + str(run_number)
            + ".h5"
        )
        self.classifier_best_model_path = os.path.join(
            self.experiment_result_path, best_model_name_saved
        )

        csv_name = (
            self.classifier_model.name
            + "_"
            + self.experiment_tag
            + "_"
            + str(run_number)
            + ".csv"
        )
        csv_path = os.path.join(self.experiment_result_path, csv_name)

        # create a callback for the tensorboard
        tensorboard_cb = tf.keras.callbacks.TensorBoard(log_dir)

        # callbacks
        csv_logger = CSVLogger(csv_path)

        # simple early stopping
        es = EarlyStopping(
            monitor="val_loss",
            mode="min",
            verbose=1,
            patience=self.experiment_parameters["patience"],
        )
        mc = ModelCheckpoint(
            self.classifier_best_model_path,
            monitor=(
                "val_activity_output_sparse_categorical_accuracy"
                if self.multi_task_learning
                else "val_sparse_categorical_accuracy"
            ),
            mode="max",
            verbose=1,
            save_best_only=True,
        )
        # mc = ModelCheckpoint(self.classifier_best_model_path,
        #                     mode='auto', verbose=1, save_best_only=True)
        # mc = ModelCheckpoint(self.classifier_best_model_path, monitor = 'val_loss', mode = 'min', verbose = 1, save_best_only = True)

        # cbs = [csv_logger,tensorboard_cb,mc,es,cm_callback]
        cbs = [csv_logger, tensorboard_cb, mc, es]

        if self.cross_validation:
            self.classifier_model.fit(
                X_train_input,
                self._format_y_for_model(Y_train_input),
                epochs=self.experiment_parameters["nb_epochs"],
                batch_size=self.experiment_parameters["batch_size"],
                verbose=self.experiment_parameters["verbose"],
                callbacks=cbs,
                validation_split=0.2,
                shuffle=True,
            )
        else:
            self.classifier_model.fit(
                X_train_input,
                self._format_y_for_model(Y_train_input),
                epochs=self.experiment_parameters["nb_epochs"],
                batch_size=self.experiment_parameters["batch_size"],
                verbose=self.experiment_parameters["verbose"],
                callbacks=cbs,
                validation_data=(X_val_input, self._format_y_for_model(Y_val_input)),
                shuffle=True,
            )

    def check_input_model(self, run_number=0):
        X_val_input = []
        Y_val_input = []

        if self.DEBUG:
            print("check input")
            print(self.classifier_data_X_train.ndim)
            print(self.classifier_data_X_train.shape)
            print(self.classifier_data_X_test.shape)
            if self._has_validation_data():
                print(self.classifier_data_X_val.shape)
            else:
                print("None")
            input("Press Enter to continue...")

        # Check number size of exemples
        if self.classifier_data_X_train.ndim < 5:
            data_X_train = self.classifier_data_X_train
            data_Y_train = self.classifier_data_Y_train
        else:
            data_X_train = self.classifier_data_X_train[run_number]
            data_Y_train = self.classifier_data_Y_train[run_number]

        if self.classifier_data_X_test.ndim < 5:
            data_X_test = self.classifier_data_X_test
            data_Y_test = self.classifier_data_Y_test
        else:
            data_X_test = self.classifier_data_X_test[run_number]
            data_Y_test = self.classifier_data_Y_test[run_number]

        if self._has_validation_data():
            if self.classifier_data_X_val.ndim < 5:
                data_X_val = self.classifier_data_X_val
                data_Y_val = self.classifier_data_Y_val
            else:
                data_X_val = self.classifier_data_X_val[run_number]
                data_Y_val = self.classifier_data_Y_val[run_number]

        # Nb features depends on data shape
        if data_X_train.ndim > 3:
            nb_features = data_X_train.shape[3]
        else:
            nb_features = 1

        if self.DEBUG:
            print(len(data_X_train))
            print(len(data_X_val))
            print(len(data_X_test))
            print(data_X_train.shape)
            print(data_X_val.shape)
            print(data_X_test.shape)
            input("Press Enter to continue...")

        X_train_input = [data_X_train[:, :, :, 0], data_X_train[:, :, :, 1]]
        X_test_input = [data_X_test[:, :, :, 0], data_X_test[:, :, :, 1]]

        if self._has_validation_data():
            X_val_input = [data_X_val[:, :, :, 0], data_X_val[:, :, :, 1]]

        # X_train_input = data_X_train.transpose(3, 0, 1, 2)
        # X_test_input = data_X_test.transpose(3, 0, 1, 2)

        # if self.classifier_data_X_val != []:
        #     X_val_input = data_X_val.transpose(3, 0, 1, 2)

        Y_train_input = data_Y_train
        Y_test_input = data_Y_test

        if self._has_validation_data():
            Y_val_input = data_Y_val

        if self.DEBUG:
            print("Train {}:".format(np.array(X_train_input).shape))
            if self._has_validation_data():
                print("Val : {}".format(np.array(X_val_input).shape))
            else:
                print("Val : None")
            print("Test : {}".format(np.array(X_test_input).shape))

            input("Press Enter to continue...")

        return (
            X_train_input,
            Y_train_input,
            X_val_input,
            Y_val_input,
            X_test_input,
            Y_test_input,
            nb_features,
        )

    def compile_model(self):
        if self.multi_task_learning:
            self.classifier_model.compile(
                loss={
                    "activity_output": "sparse_categorical_crossentropy",
                    "time_slot_output": "sparse_categorical_crossentropy",
                },
                loss_weights={
                    "activity_output": 1.0,
                    "time_slot_output": self.time_slot_loss_alpha,
                },
                optimizer=tf.keras.optimizers.Adam(),
                metrics={
                    "activity_output": ["sparse_categorical_accuracy"],
                    "time_slot_output": ["sparse_categorical_accuracy"],
                },
            )
        else:
            self.classifier_model.compile(
                loss="sparse_categorical_crossentropy",
                # optimizer = tf.keras.optimizers.Adam(learning_rate=cyclical_learning_rate),
                optimizer=tf.keras.optimizers.Adam(),
                metrics=["sparse_categorical_accuracy"],
            )

        # print summary
        print(self.classifier_model.summary())

    def evaluate(self, X_test_input, Y_test_input, run_number=0):
        if self.DEBUG:
            print("")
            print("EVALUATION")
            print(np.array(X_test_input).shape)
            print(np.array(Y_test_input).shape)
            print(self.classifier_best_model_path)
            input("Press Enter to continue...")

        if self.multi_task_learning:
            y_activity_true = Y_test_input[:, 0]
            y_time_slot_true = Y_test_input[:, 1]

            y_hat = self.classifier_model.predict(X_test_input)
            y_activity_pred = np.argmax(y_hat[0], axis=1).astype("int32")
            y_time_slot_pred = np.argmax(y_hat[1], axis=1).astype("int32")

            multitask_evaluator = MultiTaskEvaluator(
                y_activity_true,
                y_activity_pred,
                y_time_slot_true,
                y_time_slot_pred,
            )
            metrics = multitask_evaluator.compute()
            activity_accuracy = metrics["service_activity_label_accuracy"]
            time_slot_accuracy = metrics["time_slot_label_accuracy"]
            activity_macro_f1 = metrics["service_activity_label_macro_f1"]
            time_slot_macro_f1 = metrics["time_slot_label_macro_f1"]
            joint_accuracy = metrics["joint_accuracy"]

            self.global_classifier_accuracy.append(activity_accuracy)
            self.global_classifier_balance_accuracy.append(
                balanced_accuracy_score(y_activity_true, y_activity_pred)
            )
            self.global_time_slot_accuracy.append(time_slot_accuracy)
            self.global_activity_macro_f1.append(activity_macro_f1)
            self.global_time_slot_macro_f1.append(time_slot_macro_f1)
            self.global_joint_accuracy.append(joint_accuracy)

            activity_labels = list(self.actDict.keys())
            activity_indexes = list(self.actDict.values())
            time_slot_labels = list(self.timeSlotDict.keys())
            time_slot_indexes = list(self.timeSlotDict.values())

            activity_report, time_slot_report = multitask_evaluator.classification_reports(
                activity_labels,
                activity_indexes,
                time_slot_labels,
                time_slot_indexes,
            )

            activity_report_path = os.path.join(
                self.experiment_result_path,
                "{}_activity_report_{}_{}.csv".format(
                    self.classifier_model.name, self.experiment_tag, run_number
                ),
            )
            time_slot_report_path = os.path.join(
                self.experiment_result_path,
                "{}_time_slot_report_{}_{}.csv".format(
                    self.classifier_model.name, self.experiment_tag, run_number
                ),
            )
            pd.DataFrame(activity_report).transpose().to_csv(
                activity_report_path, sep="\t", encoding="utf-8"
            )
            pd.DataFrame(time_slot_report).transpose().to_csv(
                time_slot_report_path, sep="\t", encoding="utf-8"
            )

            activity_cm, time_slot_cm = multitask_evaluator.confusion_matrices(
                activity_indexes, time_slot_indexes
            )
            pd.DataFrame(
                activity_cm, index=activity_labels, columns=activity_labels
            ).to_csv(
                os.path.join(
                    self.experiment_result_path,
                    "{}_activity_confusion_matrix_{}_{}.csv".format(
                        self.classifier_model.name, self.experiment_tag, run_number
                    ),
                ),
                sep="\t",
                encoding="utf-8",
            )
            pd.DataFrame(
                time_slot_cm, index=time_slot_labels, columns=time_slot_labels
            ).to_csv(
                os.path.join(
                    self.experiment_result_path,
                    "{}_time_slot_confusion_matrix_{}_{}.csv".format(
                        self.classifier_model.name, self.experiment_tag, run_number
                    ),
                ),
                sep="\t",
                encoding="utf-8",
            )

            print(
                "service_activity_label accuracy: {:.4f}, macro F1: {:.4f}".format(
                    activity_accuracy, activity_macro_f1
                )
            )
            print(
                "time_slot_label accuracy: {:.4f}, macro F1: {:.4f}".format(
                    time_slot_accuracy, time_slot_macro_f1
                )
            )
            print("joint accuracy: {:.4f}".format(joint_accuracy))

            if len(y_activity_pred) > 0:
                predicted_activity_labels = self.label_encoder.inverse_transform(
                    y_activity_pred
                )
                predicted_time_slot_labels = self.time_slot_label_encoder.inverse_transform(
                    y_time_slot_pred
                )
                target_hours = self._extract_target_hours(X_test_input)
                prediction_df = pd.DataFrame(
                    {
                        "date": "",
                        "predicted_service_activity_label": predicted_activity_labels,
                        "predicted_time_slot_label": predicted_time_slot_labels,
                        "hour": target_hours,
                        "day_of_week": "",
                    }
                )
                recommendation_df = add_appliance_recommendations(prediction_df)
                recommendation_path = os.path.join(
                    self.experiment_result_path,
                    "{}_appliance_recommendations_{}_{}.csv".format(
                        self.classifier_model.name, self.experiment_tag, run_number
                    ),
                )
                recommendation_df.to_csv(
                    recommendation_path, index=False, encoding="utf-8-sig"
                )

                predicted_activity = predicted_activity_labels[0]
                predicted_time_slot = predicted_time_slot_labels[0]
                print("예측 활동: {}".format(predicted_activity))
                print("예상 시작 시간대: {}".format(predicted_time_slot))
                print(
                    "추천 가전: {}".format(
                        recommendation_df.iloc[0]["recommended_appliance"]
                    )
                )

            return

        evaluator = Evaluator(X_test_input, Y_test_input, model=self.classifier_model)

        evaluator.simpleEvaluation(
            self.experiment_parameters["batch_size"], Y_test_input=Y_test_input
        )
        self.global_classifier_accuracy.append(evaluator.ascore)

        evaluator.evaluate()

        listActivities = list(self.actDict.keys())
        indexLabels = list(self.actDict.values())
        evaluator.classificationReport(listActivities, indexLabels)
        # print(evaluator.report)

        report_name = (
            self.classifier_model.name
            + "_repport_"
            + self.experiment_tag
            + "_"
            + str(run_number)
            + ".csv"
        )
        report_path = os.path.join(self.experiment_result_path, report_name)
        evaluator.saveClassificationReport(report_path)

        evaluator.confusionMatrix()
        # print(evaluator.cm)

        confusion_name = (
            self.classifier_model.name
            + "_confusion_matrix_"
            + self.experiment_tag
            + "_"
            + str(run_number)
            + ".csv"
        )
        confusion_path = os.path.join(self.experiment_result_path, confusion_name)
        evaluator.saveConfusionMatrix(confusion_path)

        evaluator.balanceAccuracyCompute()
        self.global_classifier_balance_accuracy.append(evaluator.bscore)

    def start(self):
        # Star time of the experiment
        self.current_time = time.strftime("%Y_%m_%d_%H_%M_%S")

        self.experiment_result_path = os.path.join(
            self.experiment_parameters["name"],
            self.experiment_parameters["model_type"],
            "run_" + self.experiment_tag + "_" + str(self.current_time),
        )

        # create a folder with the model name
        # if the folder doesn't exist
        if not os.path.exists(self.experiment_result_path):
            os.makedirs(self.experiment_result_path)

        self.data_preprocessing()

        if not self.cross_validation:
            self.data_preprocessing_test()

        # Split the dataset into train, val and test examples
        self.model_selection()

        if self.cross_validation:
            nb_runs = self.experiment_parameters["nb_splits"]
        else:
            nb_runs = 1

        if self.DEBUG:
            print("")
            print("NB RUN: {}".format(nb_runs))

        for run_number in range(nb_runs):
            # prepare input according to the model type
            (
                X_train_input,
                Y_train_input,
                X_val_input,
                Y_val_input,
                X_test_input,
                Y_test_input,
                nb_features,
            ) = self.check_input_model(run_number)

            self.build_model_classifier(run_number)

            # compile the model
            self.compile_model()

            self.train(
                X_train_input, Y_train_input, X_val_input, Y_val_input, run_number
            )

            self.evaluate(X_test_input, Y_test_input, run_number)

    def start_from_checkpoint(self, checkpoint_path, run_number=0):
        self.current_time = time.strftime("%m%d_%H%M")
        self.experiment_result_path = os.path.join(
            self.experiment_parameters["name"],
            self.experiment_parameters["model_type"],
            "eval_" + str(self.current_time),
        )
        os.makedirs(self.experiment_result_path, exist_ok=True)

        self.data_preprocessing()

        if not self.cross_validation:
            self.data_preprocessing_test()

        self.model_selection()

        (
            X_train_input,
            Y_train_input,
            X_val_input,
            Y_val_input,
            X_test_input,
            Y_test_input,
            nb_features,
        ) = self.check_input_model(run_number)

        self.build_model_classifier(run_number)
        self.compile_model()

        print("Loading checkpoint weights: {}".format(checkpoint_path))
        self.classifier_model.load_weights(checkpoint_path)
        self.classifier_best_model_path = checkpoint_path

        self.evaluate(X_test_input, Y_test_input, run_number)

    def __save_dict_to_json(self, where_to_save, dict_to_save):
        with open(where_to_save, "w") as json_dict_file:
            json.dump(dict_to_save, json_dict_file, indent=4)

    def save_word_dict(self):
        word_dict_name = "wordDict.json"
        word_dict_path = os.path.join(self.experiment_result_path, word_dict_name)

        self.__save_dict_to_json(word_dict_path, self.wordDict)

    def save_activity_dict(self):
        activity_dict_name = "activityDict.json"
        activity_dict_path = os.path.join(
            self.experiment_result_path, activity_dict_name
        )

        self.__save_dict_to_json(activity_dict_path, self.actDict)

        if self.multi_task_learning:
            time_slot_dict_name = "timeSlotDict.json"
            time_slot_dict_path = os.path.join(
                self.experiment_result_path, time_slot_dict_name
            )
            self.__save_dict_to_json(time_slot_dict_path, self.timeSlotDict)

    def save_config(self):
        experiment_parameters_name = "experiment_parameters.json"
        experiment_parameters_path = os.path.join(
            self.experiment_result_path, experiment_parameters_name
        )

        self.__save_dict_to_json(experiment_parameters_path, self.experiment_parameters)

    def save_metrics(self):
        csv_name = (
            "cv_scores"
            + self.classifier_model.name
            + "_"
            + self.experiment_tag
            + "_"
            + str(self.current_time)
            + ".csv"
        )
        csv_path = os.path.join(self.experiment_result_path, csv_name)

        with open(csv_path, "w") as output:
            writer = csv.writer(output, lineterminator="\n")

            writer.writerow(["accuracy score :"])
            for val in self.global_classifier_accuracy:
                writer.writerow([val * 100])
            writer.writerow([])
            writer.writerow([np.mean(self.global_classifier_accuracy) * 100])
            writer.writerow([np.std(self.global_classifier_accuracy)])

            writer.writerow([])
            writer.writerow(["balanced accuracy score :"])

            for val2 in self.global_classifier_balance_accuracy:
                writer.writerow([val2 * 100])
            writer.writerow([])
            writer.writerow([np.mean(self.global_classifier_balance_accuracy) * 100])
            writer.writerow([np.std(self.global_classifier_balance_accuracy)])

            if self.multi_task_learning:
                writer.writerow([])
                writer.writerow(["activity macro f1 :"])
                for val in self.global_activity_macro_f1:
                    writer.writerow([val])
                writer.writerow([np.mean(self.global_activity_macro_f1)])
                writer.writerow([np.std(self.global_activity_macro_f1)])

                writer.writerow([])
                writer.writerow(["time slot accuracy score :"])
                for val in self.global_time_slot_accuracy:
                    writer.writerow([val * 100])
                writer.writerow([np.mean(self.global_time_slot_accuracy) * 100])
                writer.writerow([np.std(self.global_time_slot_accuracy)])

                writer.writerow([])
                writer.writerow(["time slot macro f1 :"])
                for val in self.global_time_slot_macro_f1:
                    writer.writerow([val])
                writer.writerow([np.mean(self.global_time_slot_macro_f1)])
                writer.writerow([np.std(self.global_time_slot_macro_f1)])

                writer.writerow([])
                writer.writerow(["joint accuracy score :"])
                for val in self.global_joint_accuracy:
                    writer.writerow([val * 100])
                writer.writerow([np.mean(self.global_joint_accuracy) * 100])
                writer.writerow([np.std(self.global_joint_accuracy)])
