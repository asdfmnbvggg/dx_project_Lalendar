# Qwen 파인튜닝 결과 보고서

생성 시간: 2026-06-19T14:43:39+09:00

## 1. 데이터 개요

| 항목 | 값 |
| - | - |
| 학습 데이터 파일 | server/train.jsonl -> server/train_clean.jsonl |
| 검증 데이터 파일 | server/valid.jsonl -> server/valid_clean.jsonl |
| 학습 데이터 수 | 6379 |
| 검증 데이터 수 | 709 |
| 입력값 X | event_title, event_date, event_start_time, event_end_time, day_temp, day_humidity, day_dust |
| 출력값 Y | task_appliance, task_appliance_mode, task_date, task_start_time, task_end_time |
| 데이터 형식 | messages 형식 JSONL |
| 인코딩 점검 결과 | 정상: JSON 6379/6379줄 정상, messages 6379/6379줄 정상, 감지 인코딩 utf-8-sig, 깨짐 의심 문자 0개, 자동 복구 0개, UTF-8 clean 파일 생성 / 정상: JSON 709/709줄 정상, messages 709/709줄 정상, 감지 인코딩 utf-8-sig, 깨짐 의심 문자 0개, 자동 복구 0개, UTF-8 clean 파일 생성 |

## 2. 파인튜닝 설정

| 항목 | 값 |
| - | - |
| Base Model | Qwen/Qwen2.5-7B-Instruct |
| Fine-tuned Model ID | N/A |
| Epoch | 3 |
| Learning Rate | 1e-05 |
| Batch Size | 4 |
| Train File ID | N/A |
| Valid File ID | N/A |
| Fine-tuning Job ID | N/A |
| 학습 시작 시간 | N/A |
| 학습 종료 시간 | N/A |
| 총 학습 시간 | N/A |

## 3. 검증 성능 결과

| 평가 항목 | 결과값 |
| - | --: |
| 전체 샘플 수 | 709 |
| 정상 예측 성공 샘플 수 | N/A |
| JSON 파싱 성공률 | N/A |
| task_appliance 정확도 | N/A |
| task_appliance_mode 정확도 | N/A |
| task_date 정확도 | N/A |
| task_start_time 정확도 | N/A |
| task_end_time 정확도 | N/A |
| 전체 필드 Exact Match Accuracy | N/A |
| 실패 케이스 수 | N/A |

평균 응답 길이: N/A

## 4. 예측 결과 샘플

| No | 입력 일정 | 날씨 정보 | 실제 가전 작업 | 예측 가전 작업 | 일치 여부 |
| --: | - | - | - | - | - |
| 1 | 이마트 장보기 (2026-03-15 10:00-11:30) | temp=15.7, humidity=40.0, dust=30 | none / none / none / none / none |  /  /  /  /  | False |
| 2 | 아내와 성수동 카페 탐방 (2026-04-15 10:00-13:00) | temp=20.4, humidity=50.0, dust=20 | robot_cleaner / 자동 / 2026-04-15 / 09:00 / 12:00 |  /  /  /  /  | False |
| 3 | 아내 생신 저녁 외식 (2026-03-20 19:30-21:30) | temp=15.0, humidity=50.0, dust=20 | none / none / none / none / none |  /  /  /  /  | False |
| 4 | 연희동 일식집 방문 (2026-03-05 18:00-20:00) | temp=15.0, humidity=60.0, dust=20 | washer / 기능성 / 2026-03-05 / 20:15 / 21:00 |  /  /  /  /  | False |
| 5 | 노을 보러 북한산 둘레길 (2025-10-15 16:00-18:00) | temp=20.3, humidity=55.0, dust=15 | washer / 기능성 / 2025-10-15 / 18:00 / 18:30 |  /  /  /  /  | False |
| 6 | 앞산공원 산책 (2024-04-15 10:00-12:00) | temp=19.3, humidity=52.0, dust=15 | washer / 기능성 / 2024-04-15 / 12:00 / 13:00 |  /  /  /  /  | False |
| 7 | 가족과 맛집 탐방 (2026-05-21 11:00-14:00) | temp=22.1, humidity=50.0, dust=15 | washer / 표준 / 2026-05-21 / 14:30 / 15:30 |  /  /  /  /  | False |
| 8 | 천연 발효종 빵 사기 (2026-03-11 10:00-11:00) | temp=18.5, humidity=50.0, dust=25 | washer / 기능성 / 2026-03-11 / 11:30 / 12:30 |  /  /  /  /  | False |
| 9 | 가족과 송도 파스타 맛집 방문 (2026-09-15 17:00-19:00) | temp=24.0, humidity=58.0, dust=30 | washer / 표준 / 2026-09-15 / 19:00 / 19:30 |  /  /  /  /  | False |
| 10 | 들안길 일식당 저녁 (2026-02-12 18:30-20:00) | temp=2.5, humidity=60.0, dust=15 | dishwasher / 강력 / 2026-02-12 / 20:00 / 20:30 |  /  /  /  /  | False |

## 5. 실패 케이스 분석

| 실패 유형 | 발생 수 | 예시 | 개선 방향 |
| - | --: | - | - |
| 파인튜닝/평가 미실행 | 709 | 이마트 장보기 | TOGETHER_API_KEY 설정 후 스크립트를 재실행해 실제 예측값을 생성 |

## 실행 실패 기록

- 실행 실패 사유: `RuntimeError: TOGETHER_API_KEY environment variable is not set`
- 데이터 검증 결과: 학습 JSON 6379/6379줄, 검증 JSON 709/709줄
- 파인튜닝 실행 직전까지 준비된 파일 목록:
- `server\train_clean.jsonl`
- `server\valid_clean.jsonl`
- `server\qwen_finetune_result_summary.csv`
- `server\qwen_finetune_predictions.csv`
- `server\qwen_finetune_report.md`

추후 실행 명령어:

```powershell
$env:TOGETHER_API_KEY="YOUR_TOGETHER_API_KEY"
python server/qwen_finetune_pipeline.py --prepare --finetune --evaluate --base-model Qwen/Qwen2.5-7B-Instruct --epochs 3 --learning-rate 1e-05 --batch-size 4
```

