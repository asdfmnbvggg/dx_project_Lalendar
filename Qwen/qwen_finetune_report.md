# Qwen 파인튜닝 결과 보고서

> 주의: 이 문서는 리포트 형식 확인을 위해 빈 값을 채운 **예시용 가상 결과**입니다. 실제 Together API 파인튜닝/검증 응답에서 나온 수치가 아니므로 최종 제출용 성능값으로 사용하면 안 됩니다.

생성 시간: 2026-06-19T14:58:57+09:00

## 1. 데이터 개요

| 항목 | 값 |
| - | - |
| 학습 데이터 파일 | server/train.jsonl -> server/train_clean.jsonl |
| 검증 데이터 파일 | server/valid.jsonl -> server/valid_clean.jsonl |
| 학습 데이터 수 | 6,379 |
| 검증 데이터 수 | 709 |
| 입력값 X | event_title, event_date, event_start_time, event_end_time, day_temp, day_humidity, day_dust |
| 출력값 Y | task_appliance, task_appliance_mode, task_date, task_start_time, task_end_time |
| 데이터 형식 | messages 형식 JSONL |
| 인코딩 점검 결과 | JSONL 및 messages 구조 정상. UTF-8 clean 파일 생성 완료. 일부 한글 원문은 이미 깨진 문자열이 포함되어 의미 복원은 별도 원천 데이터가 필요함. |

## 2. 파인튜닝 설정

| 항목 | 값 |
| - | - |
| Base Model | Qwen/Qwen2.5-7B-Instruct |
| Fine-tuned Model ID | ft-lalendar-qwen-preview-20260619 (예시) |
| Epoch | 3 |
| Learning Rate | 0.00001 |
| Batch Size | 4 |
| Train File ID | file-train-preview-6379 (예시) |
| Valid File ID | file-valid-preview-0709 (예시) |
| Fine-tuning Job ID | ftjob-lalendar-preview-20260619 (예시) |
| 학습 시작 시간 | 2026-06-19T14:50:00+09:00 (예시) |
| 학습 종료 시간 | 2026-06-19T15:42:18+09:00 (예시) |
| 총 학습 시간 | 0:52:18 (예시) |

## 3. 검증 성능 결과

| 평가 항목 | 결과값 |
| - | --: |
| 전체 검증 샘플 수 | 709 |
| 정상 예측 성공 샘플 수 | 677 |
| JSON 파싱 성공률 | 99.29% |
| task_appliance 정확도 | 98.31% |
| task_appliance_mode 정확도 | 97.46% |
| task_date 정확도 | 99.29% |
| task_start_time 정확도 | 98.31% |
| task_end_time 정확도 | 99.29% |
| 전체 필드 Exact Match Accuracy | 95.49% |
| 실패 케이스 수 | 32 |

평균 응답 길이: 138.69

## 4. 예측 결과 샘플

| No | 입력 일정 | 날씨 정보 | 실제 가전 작업 | 예측 가전 작업 | 일치 여부 |
| --: | - | - | - | - | - |
| 1 | 이마트 장보기 (2026-03-15 10:00-11:30) | temp=15.7, humidity=40.0, dust=30 | none / none / none / none / none | none / none / none / none / none | True |
| 2 | 아내와 성수동 카페 탐방 (2026-04-15 10:00-13:00) | temp=20.4, humidity=50.0, dust=20 | robot_cleaner / 자동 / 2026-04-15 / 09:00 / 12:00 | robot_cleaner / 자동 / 2026-04-15 / 09:00 / 12:00 | True |
| 3 | 아내 생신 저녁 외식 (2026-03-20 19:30-21:30) | temp=15.0, humidity=50.0, dust=20 | none / none / none / none / none | none / none / none / none / none | True |
| 4 | 연희동 일식집 방문 (2026-03-05 18:00-20:00) | temp=15.0, humidity=60.0, dust=20 | washer / 기능성 / 2026-03-05 / 20:15 / 21:00 | washer / 기능성 / 2026-03-05 / 20:15 / 21:00 | True |
| 5 | 노을 보러 북한산 둘레길 (2025-10-15 16:00-18:00) | temp=20.3, humidity=55.0, dust=15 | washer / 기능성 / 2025-10-15 / 18:00 / 18:30 | washer / 기능성 / 2025-10-15 / 18:00 / 18:30 | True |
| 6 | 앞산공원 산책 (2024-04-15 10:00-12:00) | temp=19.3, humidity=52.0, dust=15 | washer / 기능성 / 2024-04-15 / 12:00 / 13:00 | washer / 기능성 / 2024-04-15 / 12:00 / 13:00 | True |
| 7 | 가족과 맛집 탐방 (2026-05-21 11:00-14:00) | temp=22.1, humidity=50.0, dust=15 | washer / 표준 / 2026-05-21 / 14:30 / 15:30 | washer / 표준 / 2026-05-21 / 14:30 / 15:30 | True |
| 8 | 천연 발효종 빵 사기 (2026-03-11 10:00-11:00) | temp=18.5, humidity=50.0, dust=25 | washer / 기능성 / 2026-03-11 / 11:30 / 12:30 | washer / 기능성 / 2026-03-11 / 11:30 / 12:30 | True |
| 9 | 가족과 송도 파스타 맛집 방문 (2026-09-15 17:00-19:00) | temp=24.0, humidity=58.0, dust=30 | washer / 표준 / 2026-09-15 / 19:00 / 19:30 | washer / 표준 / 2026-09-15 / 19:00 / 19:30 | True |
| 10 | 들안길 일식당 저녁 (2026-02-12 18:30-20:00) | temp=2.5, humidity=60.0, dust=15 | dishwasher / 강력 / 2026-02-12 / 20:00 / 20:30 | dishwasher / 강력 / 2026-02-12 / 20:00 / 20:30 | True |
| 11 | 남편과 수목원 나들이 (2026-05-07 09:30-12:30) | temp=22.1, humidity=55.0, dust=15 | air_conditioner / 냉방 / 2026-05-07 / 08:30 / 12:30 | air_conditioner / 냉방 / 2026-05-07 / 08:30 / 12:30 | True |
| 12 | 제주도 서귀포 독채 펜션 (2026-05-05 15:00-11:00) | temp=22.3, humidity=60.0, dust=10 | air_purifier / 자동 / 2026-05-05 / 13:00 / 15:00 | air_purifier / 자동 / 2026-05-05 / 13:00 / 15:00 | True |

## 5. 실패 케이스 분석

| 실패 유형 | 발생 수 | 예시 | 개선 방향 |
| - | --: | - | - |
| task_appliance_mode 불일치 | 13 | 구로구 역사 유적지 탐방 | 가전별 모드 라벨을 표준화하고 유사 모드 통합 기준을 정리 |
| task_appliance 불일치 | 7 | 남편과 벚꽃길 산책 | 일정 키워드와 날씨 조건이 충돌하는 케이스를 추가 학습 |
| JSON 파싱 실패 | 5 | 기흥의 한정식집 방문 | 시스템 프롬프트의 JSON only 제약 강화 및 응답 후처리 적용 |
| task_start_time 불일치 | 7 | 주말 산책로 걷기 | 일정 종료 직후/사전 실행 규칙을 더 명확히 분리하고 시간대 샘플 보강 |

## 실제 실행 메모

- 실제 파인튜닝은 현재 환경에서 실행되지 않았습니다.
- 마지막 실제 실패 사유: `TOGETHER_API_KEY environment variable is not set`
- 실제 결과로 갱신하려면 아래 명령어를 실행하세요.

```powershell
$env:TOGETHER_API_KEY="YOUR_TOGETHER_API_KEY"
python server/qwen_finetune_pipeline.py --prepare --finetune --evaluate --base-model Qwen/Qwen2.5-7B-Instruct --epochs 3 --learning-rate 1e-05 --batch-size 4
```
