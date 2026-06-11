#!/usr/bin/env python3

DEFAULT_SERVICE_LABEL = "기타"

NO_RECOMMENDED_APPLIANCE = "추천없음"

ARUBA_SERVICE_ACTIVITY_MAPPING = {
    "Meal_Preparation": "식사준비",
    "Wash_Dishes": "설거지",
    "Housekeeping": "청소/정리",
    "Eating": "식사",
    "Leave_Home": "외출",
    "Enter_Home": "귀가",
    "Relax": "휴식/수면",
    "Sleeping": "휴식/수면",
    "Work": "기타",
    "Bed_to_Toilet": "기타",
    "Respirate": "기타",
    "Other": "기타",
}

CAIRO_SERVICE_ACTIVITY_MAPPING = {
    "Laundry": "세탁",
    "Breakfast": "식사준비",
    "Lunch": "식사준비",
    "Dinner": "식사준비",
    "Leave_home": "외출",
    "R1_sleep": "휴식/수면",
    "R2_sleep": "휴식/수면",
    "R1_wake": "기타",
    "R2_wake": "기타",
    "R1_work_in_office": "기타",
    "R2_take_medicine": "기타",
    "Night_wandering": "기타",
    "Bed_to_toilet": "기타",
    "Other": "기타",
}

MILAN_SERVICE_ACTIVITY_MAPPING = {
    "Chores": "청소/정리",
    "Kitchen_Activity": "식사준비",
    "Dining_Rm_Activity": "식사",
    "Leave_Home": "외출",
    "Sleep": "휴식/수면",
    "Watch_TV": "휴식/수면",
    "Read": "휴식/수면",
    "Desk_Activity": "기타",
    "Morning_Meds": "기타",
    "Eve_Meds": "기타",
    "Guest_Bathroom": "기타",
    "Master_Bathroom": "기타",
    "Master_Bedroom_Activity": "기타",
    "Meditate": "휴식/수면",
    "Bed_to_Toilet": "기타",
    "Other": "기타",
}

SERVICE_ACTIVITY_MAPPINGS = {
    "aruba": ARUBA_SERVICE_ACTIVITY_MAPPING,
    "cairo": CAIRO_SERVICE_ACTIVITY_MAPPING,
    "milan": MILAN_SERVICE_ACTIVITY_MAPPING,
}

SERVICE_ACTIVITY_APPLIANCE_MAPPING = {
    "세탁": "세탁기",
    "설거지": "식기세척기",
    "청소/정리": "로봇청소기",
    "식사준비": "공기청정기",
    "외출": "로봇청소기",
    "귀가": "에어컨/공기청정기",
    "휴식/수면": NO_RECOMMENDED_APPLIANCE,
    "기타": NO_RECOMMENDED_APPLIANCE,
}

SERVICE_ACTIVITY_APPLIANCE_CANDIDATES = {
    "세탁": ["세탁기", "건조기", "제습기"],
    "설거지": ["식기세척기"],
    "청소/정리": ["로봇청소기"],
    "식사준비": ["공기청정기"],
    "외출": ["로봇청소기"],
    "귀가": ["에어컨", "공기청정기"],
    "휴식/수면": [NO_RECOMMENDED_APPLIANCE],
    "기타": [NO_RECOMMENDED_APPLIANCE],
}


def normalize_dataset_name(dataset_name):
    return str(dataset_name).strip().lower()


def get_service_activity_mapping(dataset_name):
    dataset_key = normalize_dataset_name(dataset_name)
    if dataset_key not in SERVICE_ACTIVITY_MAPPINGS:
        supported = ", ".join(sorted(SERVICE_ACTIVITY_MAPPINGS))
        raise ValueError(
            f"Unsupported dataset '{dataset_name}'. Supported datasets: {supported}"
        )
    return SERVICE_ACTIVITY_MAPPINGS[dataset_key]


def map_activity_to_service_label(activity_label, dataset_name):
    mapping = get_service_activity_mapping(dataset_name)
    return mapping.get(str(activity_label), DEFAULT_SERVICE_LABEL)


def add_service_activity_label(
    df,
    dataset_name,
    source_column="activity",
    target_column="service_activity_label",
):
    df[target_column] = df[source_column].map(
        lambda activity: map_activity_to_service_label(activity, dataset_name)
    )
    return df


def map_service_label_to_appliance(service_activity_label):
    return SERVICE_ACTIVITY_APPLIANCE_MAPPING.get(
        str(service_activity_label), NO_RECOMMENDED_APPLIANCE
    )


def map_service_label_to_appliance_candidates(service_activity_label):
    return SERVICE_ACTIVITY_APPLIANCE_CANDIDATES.get(
        str(service_activity_label), [NO_RECOMMENDED_APPLIANCE]
    )
