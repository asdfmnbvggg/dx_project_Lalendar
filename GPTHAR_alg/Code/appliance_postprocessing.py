#!/usr/bin/env python3

import argparse
import os

import pandas as pd


NO_RECOMMENDATION = "추천없음"
NIGHT_TIME_SLOTS = {"밤", "새벽"}
DINNER_TIME_SLOTS = {"저녁"}
NEAR_LEAVE_HOURS = {7, 8, 9, 10, 17, 18, 19, 20}
SUMMER_MONTHS = {6, 7, 8}


def _normalize_hour(hour):
    if pd.isna(hour) or hour == "":
        return None
    return int(hour)


def _is_summer(date_value):
    if date_value is None or pd.isna(date_value) or date_value == "":
        return False

    parsed = pd.to_datetime(date_value, errors="coerce")
    if pd.isna(parsed):
        return False
    return int(parsed.month) in SUMMER_MONTHS


def _join_appliances(appliances):
    unique_appliances = []
    for appliance in appliances:
        if appliance not in unique_appliances:
            unique_appliances.append(appliance)
    return ", ".join(unique_appliances)


def generate_appliance_recommendation(
    predicted_service_activity_label,
    predicted_time_slot_label,
    hour=None,
    day_of_week=None,
    date=None,
):
    service_label = str(predicted_service_activity_label)
    time_slot = str(predicted_time_slot_label)
    normalized_hour = _normalize_hour(hour)
    day_text = "" if day_of_week is None or pd.isna(day_of_week) else str(day_of_week)

    if service_label == "세탁":
        appliances = ["세탁기"]
        reason = "세탁 활동이 예측되어 세탁기를 기본 추천했습니다."
        if time_slot in NIGHT_TIME_SLOTS:
            appliances.extend(["건조기", "제습기"])
            reason += " 밤/새벽 시간대라 실내 건조 보조를 위해 건조기와 제습기도 함께 추천했습니다."
        return _join_appliances(appliances), reason

    if service_label == "설거지":
        return "식기세척기", "설거지 활동이 예측되어 식기세척기를 추천했습니다."

    if service_label == "청소/정리":
        near_leave = (
            normalized_hour in NEAR_LEAVE_HOURS
            or time_slot in {"아침", "오전", "저녁"}
        )
        reason = "청소/정리 활동이 예측되어 로봇청소기를 추천했습니다."
        if near_leave:
            reason += " 외출 전후로 가까운 시간대라 방해가 적은 자동 청소를 우선 추천했습니다."
        return "로봇청소기", reason

    if service_label == "식사준비":
        appliances = ["공기청정기"]
        reason = "식사준비 활동이 예측되어 조리 중 냄새와 미세먼지 관리를 위해 공기청정기를 추천했습니다."
        if _is_summer(date) or time_slot in DINNER_TIME_SLOTS:
            appliances.append("에어컨")
            reason += " 여름 또는 저녁 시간대 조건에 해당해 에어컨도 후보로 추가했습니다."
        return _join_appliances(appliances), reason

    if service_label == "귀가":
        return (
            "에어컨, 공기청정기",
            "귀가 활동이 예측되어 실내 온도와 공기질 관리를 위해 에어컨과 공기청정기를 추천했습니다.",
        )

    if service_label == "외출":
        return "로봇청소기", "외출 활동이 예측되어 부재 중 자동 청소가 가능한 로봇청소기를 추천했습니다."

    suffix = " {} 데이터 기준입니다.".format(day_text) if day_text else ""
    return NO_RECOMMENDATION, "추천 대상 서비스 활동이 아니어서 추천없음으로 처리했습니다." + suffix


def add_appliance_recommendations(predictions_df):
    df = predictions_df.copy()

    if "date" not in df.columns:
        df["date"] = ""

    required_columns = [
        "predicted_service_activity_label",
        "predicted_time_slot_label",
        "hour",
        "day_of_week",
    ]
    missing_columns = [column for column in required_columns if column not in df.columns]
    if missing_columns:
        raise ValueError("Missing required prediction columns: {}".format(missing_columns))

    recommendations = df.apply(
        lambda row: generate_appliance_recommendation(
            row["predicted_service_activity_label"],
            row["predicted_time_slot_label"],
            row["hour"],
            row["day_of_week"],
            row["date"],
        ),
        axis=1,
    )
    df["recommended_appliance"] = recommendations.map(lambda item: item[0])
    df["recommendation_reason"] = recommendations.map(lambda item: item[1])

    return df[
        [
            "date",
            "predicted_service_activity_label",
            "predicted_time_slot_label",
            "recommended_appliance",
            "recommendation_reason",
        ]
    ]


def save_appliance_recommendations(predictions_df, output_path):
    recommendation_df = add_appliance_recommendations(predictions_df)
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    recommendation_df.to_csv(output_path, index=False, encoding="utf-8-sig")
    return recommendation_df


def parse_args():
    parser = argparse.ArgumentParser(
        description="Post-process multi-task GPTHAR predictions into appliance recommendations."
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Prediction CSV with predicted_service_activity_label, predicted_time_slot_label, hour, day_of_week.",
    )
    parser.add_argument(
        "--output",
        default="datasets/predicted_appliance_recommendations.csv",
        help="Output recommendation CSV path.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    predictions = pd.read_csv(args.input)
    recommendations = save_appliance_recommendations(predictions, args.output)
    print("Saved appliance recommendations: {}".format(args.output))
    print(recommendations.head())
