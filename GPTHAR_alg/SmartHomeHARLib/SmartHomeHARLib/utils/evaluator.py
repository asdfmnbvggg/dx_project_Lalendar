# coding: utf-8
# !/usr/bin/env python3
import pandas as pd
import numpy as np

import tensorflow as tf
from tensorflow.keras.models import *
from tensorflow.keras.utils import *

from sklearn.metrics import confusion_matrix
from sklearn.metrics import classification_report
from sklearn.metrics import balanced_accuracy_score
from sklearn.metrics import accuracy_score
from sklearn.metrics import f1_score
from sklearn.metrics import multilabel_confusion_matrix


class Evaluator(object):

    def __init__(self, testX, testY, model=None, model_path=None, custom_objects=None, model_type="keras"):

        self.X_test_input = testX

        self.Y_test_input = testY

        self.Y_pred = []

        self.ascore = 0.0
        self.report = None
        self.cm = None
        self.bscore = 0.0
        self.model_type = model_type

        if model != None:
            self.saved_model = model

        if model_path != None:
            self.saved_model = tf.keras.models.load_model(model_path, custom_objects=custom_objects)

        if self.model_type == "keras":
            print(self.saved_model.summary())

    def evaluate(self):
        Y_hat = self.saved_model.predict(self.X_test_input)

        if self.model_type == "keras":
            self.Y_pred = np.argmax(Y_hat, axis=1)
            self.Y_pred = self.Y_pred.astype('int32')
        else:
            self.Y_pred = Y_hat

    def simpleEvaluation(self, batch_size, Y_test_input=None, verbose=False):

        if len(Y_test_input) < 1:
            Y = self.Y_test_input
        else:
            Y = Y_test_input

        # evaluate model
        _, self.ascore = self.saved_model.evaluate(self.X_test_input, Y, batch_size=batch_size, verbose=verbose)

    def classificationReport(self, listActivities, labels):

        self.report = classification_report(self.Y_test_input, self.Y_pred, target_names=listActivities, digits=4,
                                            labels=labels, output_dict=True)

    def confusionMatrix(self):

        self.cm = confusion_matrix(self.Y_test_input, self.Y_pred)

    def multi_label_confusion_matrix(self):

        self.cm = multilabel_confusion_matrix(self.Y_test_input, self.Y_pred)

    def accuracyCompute(self):

        self.ascore = accuracy_score(self.Y_test_input, self.Y_pred)

    def balanceAccuracyCompute(self):

        self.bscore = balanced_accuracy_score(self.Y_test_input, self.Y_pred)

    def saveClassificationReport(self, pathResults):
        df = pd.DataFrame(self.report).transpose()
        df.to_csv(pathResults, sep='\t', encoding='utf-8')

    def saveConfusionMatrix(self, pathResults):
        df = pd.DataFrame(self.cm)
        df.to_csv(pathResults, sep='\t', encoding='utf-8', header=False, index=False)


class MultiTaskEvaluator(object):

    def __init__(
        self,
        activity_true,
        activity_pred,
        time_slot_true,
        time_slot_pred,
        activity_labels=None,
        time_slot_labels=None,
    ):
        self.activity_true = activity_true
        self.activity_pred = activity_pred
        self.time_slot_true = time_slot_true
        self.time_slot_pred = time_slot_pred
        self.activity_labels = activity_labels
        self.time_slot_labels = time_slot_labels
        self.metrics = {}
        self.activity_report = None
        self.time_slot_report = None
        self.activity_cm = None
        self.time_slot_cm = None

    def compute(self):
        self.metrics = {
            "service_activity_label_accuracy": accuracy_score(
                self.activity_true, self.activity_pred
            ),
            "service_activity_label_macro_f1": f1_score(
                self.activity_true,
                self.activity_pred,
                average="macro",
                zero_division=0,
            ),
            "time_slot_label_accuracy": accuracy_score(
                self.time_slot_true, self.time_slot_pred
            ),
            "time_slot_label_macro_f1": f1_score(
                self.time_slot_true,
                self.time_slot_pred,
                average="macro",
                zero_division=0,
            ),
            "joint_accuracy": np.mean(
                (self.activity_true == self.activity_pred)
                & (self.time_slot_true == self.time_slot_pred)
            ),
        }
        return self.metrics

    def classification_reports(self, activity_names, activity_indexes, time_slot_names, time_slot_indexes):
        self.activity_report = classification_report(
            self.activity_true,
            self.activity_pred,
            target_names=activity_names,
            labels=activity_indexes,
            digits=4,
            output_dict=True,
            zero_division=0,
        )
        self.time_slot_report = classification_report(
            self.time_slot_true,
            self.time_slot_pred,
            target_names=time_slot_names,
            labels=time_slot_indexes,
            digits=4,
            output_dict=True,
            zero_division=0,
        )
        return self.activity_report, self.time_slot_report

    def confusion_matrices(self, activity_indexes=None, time_slot_indexes=None):
        self.activity_cm = confusion_matrix(
            self.activity_true, self.activity_pred, labels=activity_indexes
        )
        self.time_slot_cm = confusion_matrix(
            self.time_slot_true, self.time_slot_pred, labels=time_slot_indexes
        )
        return self.activity_cm, self.time_slot_cm

    def save_reports(self, activity_report_path, time_slot_report_path):
        pd.DataFrame(self.activity_report).transpose().to_csv(
            activity_report_path, sep='\t', encoding='utf-8'
        )
        pd.DataFrame(self.time_slot_report).transpose().to_csv(
            time_slot_report_path, sep='\t', encoding='utf-8'
        )

    def save_confusion_matrices(
        self,
        activity_confusion_path,
        time_slot_confusion_path,
        activity_names=None,
        time_slot_names=None,
    ):
        pd.DataFrame(
            self.activity_cm, index=activity_names, columns=activity_names
        ).to_csv(activity_confusion_path, sep='\t', encoding='utf-8')
        pd.DataFrame(
            self.time_slot_cm, index=time_slot_names, columns=time_slot_names
        ).to_csv(time_slot_confusion_path, sep='\t', encoding='utf-8')
