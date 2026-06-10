# Aruba GPTHAR_H 4-Head Multi-task 실행 가이드

이 문서는 CASAS Aruba 데이터를 이용해 GPTHAR_H 기반 집안일 활동 예측 모델을 실행하는 방법을 정리한 것이다.  
기존 GPTHAR_H 모델은 센서 토큰 시퀀스와 hour embedding, hierarchical Bi-LSTM을 이용해 activity label 하나를 예측했다.  
본 프로젝트에서는 기존 구조의 입력부는 유지하되, 출력부를 4개의 task로 확장하였다.

## 1. 프로젝트 목표

CASAS 스마트홈 센서 로그를 사용하여 사용자의 집안일 활동과 활동 시작 시간 정보를 예측하고, 예측 결과를 추천 가전 및 기본 일정 생성에 연결하는 것을 목표로 한다.

최종 모델 입력:

```text
sensor token sequence + hour embedding + hierarchical context
```

센서 토큰 예시:

```text
M005OFF -> M007ON -> M004ON
```

최종 모델 출력:

```text
1. service_activity_label
2. time_slot_label
3. activity_start_hour
4. day_of_week
```

추천 가전은 모델 출력 이후 post-processing 단계에서 생성한다.

## 2. 사용 데이터

본 프로젝트는 CASAS 데이터셋 중 Aruba를 메인 데이터셋으로 사용한다. Cairo와 Milan은 보조 또는 확장 검토용 데이터셋으로 정의하였다.

```text
메인 데이터셋: Aruba
보조 데이터셋: Cairo
확장 데이터셋: Milan
```

CASAS 원본 로그는 대략 다음 정보를 포함한다.

```text
datetime
sensor
value
activity
activityState
```

예시:

```text
2010-11-04 00:03:50.209589    M003    ON     Sleeping    begin
2010-11-04 00:03:57.399391    M003    OFF    Sleeping
```

## 3. 전처리 구조

전처리에서는 원본 CASAS activity label을 그대로 사용하지 않고, 서비스 목적에 맞는 `service_activity_label`로 재매핑한다.

Aruba 주요 매핑:

```text
Meal_Preparation -> 식사준비
Wash_Dishes      -> 설거지
Housekeeping     -> 청소/정리
Eating           -> 식사
Leave_Home       -> 외출
Enter_Home       -> 귀가
Relax            -> 휴식/수면
Sleeping         -> 휴식/수면
Work             -> 기타
Bed_to_Toilet    -> 기타
Respirate        -> 기타
Other            -> 기타
```

전처리 후 classification dataframe에는 다음 컬럼이 포함된다.

```text
activity_label
service_activity_label
time_slot_label
activity_start_hour
day_of_week_index
labels
```

`activity_start_hour`와 `day_of_week_index`가 기존 pickle에 없을 경우, `utils.py`에서 다음 입력 컬럼을 이용해 자동으로 파생한다.

```text
activity_start_hour <- input_12
day_of_week_index   <- input_15
time_slot_label     <- activity_start_hour
```

## 4. Time Slot 기준

`activity_start_hour`는 다음 기준으로 `time_slot_label`로 변환된다.

```text
05:00~08:59 -> 아침
09:00~11:59 -> 오전
12:00~13:59 -> 점심
14:00~17:59 -> 오후
18:00~20:59 -> 저녁
21:00~23:59 -> 밤
00:00~04:59 -> 새벽
```

## 5. 데이터 수가 줄어드는 이유

최종 학습 데이터 수는 원본 CASAS 센서 row 수보다 작다. 이유는 모든 센서 이벤트를 개별 학습 샘플로 사용하지 않기 때문이다.

전처리 흐름:

```text
원본 센서 로그
-> activity 변화 지점 기준으로 activity sequence 생성
-> 길이 1인 sequence 제거
-> 3개의 연속 activity sequence를 하나의 모델 입력으로 구성
```

즉 모델 입력은 단일 센서 row가 아니라, 이전 활동 2개와 현재 활동 1개를 포함하는 3-sequence window이다. 완전한 3-sequence window를 만들 수 없는 일부 sequence는 제외된다.

또한 추천 가전 및 시작 시점 데이터셋은 `activityState == "begin"`인 row만 추출하므로 원본 로그보다 더 작다.

Aruba 기준 최종 classification 데이터:

```text
train: 8,875 samples
test:  3,720 samples
total: 12,595 samples
```

분할 방식:

```text
train:test = 70:30
분할 기준 = week 단위
random_state = 42
```

코드:

```python
train_data, test_data = train_test_split(weeks, test_size=0.3, random_state=42)
```

## 6. 모델 구조

기본 구조는 기존 GPTHAR_H를 따른다.

```text
sensor token sequence
-> GPT Transformer Decoder embedding
-> Bi-LSTM

hour sequence
-> hour embedding
-> Bi-LSTM

3개 activity sequence representation
-> hierarchical Bi-LSTM
-> multi-task output heads
```

기존 GPTHAR_H는 하나의 softmax head만 사용했지만, 본 프로젝트에서는 4개의 output head를 사용한다.

```text
activity_output  -> service_activity_label
time_slot_output -> time_slot_label
hour_output      -> activity_start_hour
day_output       -> day_of_week_index
```

클래스 구성:

```text
service_activity_label:
식사준비, 설거지, 청소/정리, 세탁, 외출, 귀가, 휴식/수면, 기타

time_slot_label:
새벽, 아침, 오전, 점심, 오후, 저녁, 밤

activity_start_hour:
0~23

day_of_week_index:
0~6
```

## 7. Loss 설정

4-head multi-task learning의 total loss는 다음과 같다.

```text
total_loss = activity_loss
           + alpha * time_slot_loss
           + beta  * hour_loss
           + gamma * day_loss
```

config 기본값:

```json
"multi_task_learning": true,
"time_slot_loss_alpha": 0.5,
"hour_loss_beta": 0.3,
"day_loss_gamma": 0.3
```

의미:

```text
alpha: time_slot_loss가 전체 loss에 반영되는 가중치
beta:  hour_loss가 전체 loss에 반영되는 가중치
gamma: day_loss가 전체 loss에 반영되는 가중치
```

## 8. 추천 가전 생성

추천 가전은 모델 head에서 직접 학습하지 않고, 예측된 `service_activity_label`, `time_slot_label`, `activity_start_hour`, `day_of_week`를 이용해 post-processing으로 생성한다.

기본 규칙:

```text
세탁      -> 세탁기
설거지    -> 식기세척기
청소/정리 -> 로봇청소기
식사준비  -> 공기청정기
외출      -> 로봇청소기
귀가      -> 에어컨, 공기청정기
휴식/수면 -> 추천없음
기타      -> 추천없음
```

추가 규칙:

```text
세탁 + 밤/새벽 -> 건조기/제습기 후보 추가
식사준비 + 저녁 또는 여름 -> 에어컨 후보 추가
청소/정리 + 외출 시간대 근처 -> 로봇청소기 우선 추천
```

## 9. 실행 전 설치

프로젝트 루트에서 실행한다.

```powershell
pip install -r requirements.txt
```

SmartHomeHARLib 설치:

```powershell
cd SmartHomeHARLib
python setup.py develop --user
cd ..
```

이후 `Code` 폴더로 이동한다.

```powershell
cd Code
```

## 10. Aruba 전처리 실행

노트북을 직접 실행하거나, 터미널에서 nbconvert로 실행한다.

```powershell
jupyter nbconvert --execute --to notebook --inplace data_preprocessing_time.ipynb --ExecutePreprocessor.timeout=3600
jupyter nbconvert --execute --to notebook --inplace classification_data_preprocessing_time.ipynb --ExecutePreprocessor.timeout=3600
```

기대 출력:

```text
datasets/aruba_train_data_time.pickle
datasets/aruba_test_data_time.pickle
datasets/aruba_train_classification_data_time_dataframe.pickle
datasets/aruba_test_classification_data_time_dataframe.pickle
```

## 11. GPT Pretrained Embedding 생성

config의 pretrained embedding 파일이 없으면 먼저 생성한다.

```powershell
python GPTEmbeddingExperimentations.py --d aruba --e gpt2 --c configs/embeddings/GPT2_8H_3L_384E.json
```

기대 출력:

```text
pretrain_embedding/GPT2_8H_3L_384E/aruba/<run_folder>/GPT_basic_raw_aruba_1024_384_model.h5
pretrain_embedding/GPT2_8H_3L_384E/aruba/<run_folder>/GPT_basic_raw_aruba_1024_384_dict_vocabulary.json
pretrain_embedding/GPT2_8H_3L_384E/aruba/<run_folder>/experiment_parameters.json
```

현재 Aruba config는 다음 파일을 사용하도록 설정되어 있다.

```text
pretrain_embedding/GPT2_8H_3L_384E/aruba/run_0608_0821/GPT_basic_raw_aruba_1024_384_model.h5
pretrain_embedding/GPT2_8H_3L_384E/aruba/run_0608_0821/GPT_basic_raw_aruba_1024_384_dict_vocabulary.json
pretrain_embedding/GPT2_8H_3L_384E/aruba/run_0608_0821/experiment_parameters.json
```

## 12. 4-Head Multi-task 학습 실행

빠른 1차 테스트:

```powershell
python classification_train.py --d aruba --e GPTHAR_H --c configs/GPTHAR_H/aruba_bi_lstm_gpt2_8H_3L_384E_hierarcy_hour.json --n 1 --cv False
```

cross-validation 실행:

```powershell
python classification_train.py --d aruba --e GPTHAR_H --c configs/GPTHAR_H/aruba_bi_lstm_gpt2_8H_3L_384E_hierarcy_hour.json --cv True
```

주의:

```text
--cv True는 오래 걸릴 수 있다.
먼저 --n 1 --cv False로 동작 확인 후 실행하는 것을 권장한다.
```

## 13. Checkpoint 평가

학습 중 가장 좋은 모델은 `BEST_0.h5` 형태로 저장된다.  
단, 기존 2-head 모델에서 생성된 checkpoint는 현재 4-head 모델과 구조가 다르므로 그대로 사용할 수 없다.

현재 4-head 모델을 평가하려면 4-head 코드로 새로 학습하여 생성된 checkpoint를 사용해야 한다.

4-head checkpoint가 있을 때 evaluate-only 실행:

```powershell
python classification_train.py --d aruba --e GPTHAR_H --c configs/GPTHAR_H/aruba_bi_lstm_gpt2_8H_3L_384E_hierarcy_hour.json --cv False --evaluate_only True --checkpoint "checkpoints/aruba_BEST_0.h5"
```

`evaluate_only=True`일 때는 자동으로 `--cv False`가 적용되며, test set 기준 평가만 수행한다.

## 14. 결과 파일

결과는 다음 경로 아래에 저장된다.

```text
results/Bi_LSTM_GPT_8H_3L_384E_HIERARCHY_HOUR/<run_or_eval_folder>/
```

주요 저장 파일:

```text
cv_scores*.csv
activity_report_*.csv
time_slot_report_*.csv
hour_report_*.csv
day_report_*.csv
activity_confusion_matrix_*.csv
time_slot_confusion_matrix_*.csv
hour_confusion_matrix_*.csv
day_confusion_matrix_*.csv
appliance_recommendations_*.csv
activityDict.json
timeSlotDict.json
hourDict.json
dayOfWeekDict.json
wordDict.json
experiment_parameters.json
```

`cv_scores*.csv`에 저장되는 값:

```text
service_activity_label accuracy
service_activity_label balanced accuracy
service_activity_label macro F1
time_slot_label accuracy
time_slot_label macro F1
activity_start_hour accuracy
activity_start_hour macro F1
day_of_week accuracy
day_of_week macro F1
activity + time_slot joint accuracy
all-task joint accuracy
```

`appliance_recommendations_*.csv`에 저장되는 값:

```text
date
predicted_service_activity_label
predicted_time_slot_label
recommended_appliance
recommendation_reason
```

## 15. 실행 시 출력되는 config 정보

`classification_train.py`는 실행 전에 다음 정보를 출력한다.

```text
multi_task_learning
targets
pre_train_embedding
word_dict
embedding_parameters
time_slot_loss_alpha
hour_loss_beta
day_loss_gamma
```

pretrained embedding, word_dict, embedding_parameters 파일이 없으면 `FileNotFoundError`를 발생시켜 어떤 파일이 없는지 알려준다.

## 16. 기존 결과와 현재 코드의 차이

이전 실험 결과는 2-head 모델 기준이었다.

```text
activity_output
time_slot_output
```

현재 최종 코드는 4-head 모델이다.

```text
activity_output
time_slot_output
hour_output
day_output
```

따라서 이전 2-head checkpoint의 결과와 현재 4-head 모델의 결과는 직접 비교할 때 주의해야 한다.  
최종 보고서에는 현재 4-head 구조 기준으로 새로 학습한 결과를 사용하는 것이 가장 정확하다.

