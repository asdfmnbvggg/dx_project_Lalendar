# L-lander

> 30·40 기혼 가구의 반복적인 가사 계획 부담을 낮추기 위한 AI 기반 스마트홈 가사 자동화 서비스

L-lander는 가족 일정, 날씨, 실내 센서 데이터, 가전 사용 패턴을 바탕으로 가사 계획을 자동 생성하고 필요한 가전 작업을 추천하는 스마트홈 서비스입니다. 기존 스마트홈 앱이 가전 제어와 상태 확인에 머무르는 한계를 넘어, 사용자가 매일 확인할 만한 생활 맥락형 캘린더 경험을 제공하는 것을 목표로 합니다.

## 프로젝트 배경

스마트홈 시장은 빠르게 성장하고 있지만, 많은 사용자는 스마트홈 앱을 단순히 가전을 켜고 끄거나 상태를 확인하는 도구로만 사용합니다. L-lander는 ThinQ 기반 스마트홈 경험을 "가전 제어 도구"에서 "일상 최적화 AI 파트너"로 확장하기 위해 기획되었습니다.

특히 가사와 육아, 직장 생활을 병행하는 30·40 기혼 가구는 반복적인 집안일 계획, 가족 간 가사 분담, 날씨와 외출 일정에 따른 가사 타이밍 판단에서 부담을 크게 느낍니다. L-lander는 이러한 생활 데이터를 한곳에 모아 가사 계획부터 가전 실행 추천까지 연결합니다.

## 핵심 타깃

- 30·40 기혼 가구
- 맞벌이 가구
- 육아와 가사를 병행하는 유자녀 가구
- 부부 중심으로 가사를 운영하는 신혼·무자녀 가구

주요 pain point는 반복되는 집안일 계획 부담, 가족 구성원 간 가사 분담 불균형, 일정과 가사를 따로 관리해야 하는 번거로움, 날씨와 외출 일정에 따라 달라지는 가사 타이밍 판단의 어려움입니다.

## 주요 기능

- 가족 캘린더: 개인 일정과 가족 일정을 월간, 주간, 일간 단위로 조회하고 구성원별로 필터링합니다.
- AI 가사 계획 생성: 일정과 날씨 정보를 기반으로 작동 가전, 작동 모드, 실행 날짜, 시작/종료 시간을 예측합니다.
- 날씨 기반 가전 추천: 비, 눈, 습도, 더위, 미세먼지 조건을 분석해 세탁기, 건조기, 공기청정기, 에어컨 등의 작업을 추천합니다.
- AI 데일리 리포트: 기준 날짜부터 3일간의 일정, 가전 작업, To-do, 날씨 정보를 요약합니다.
- 실시간 센서 기반 자동화: Firebase Realtime Database의 온도, 습도, PM10, PM2.5 값을 구독해 에어컨 또는 공기청정기 실행을 추천합니다.
- Google Calendar 연동: 외부 일정을 불러와 L-lander 일정 형식으로 변환하고 가족 캘린더에 반영합니다.
- PWA 지원: 모바일과 데스크톱에서 설치 가능한 standalone 앱 경험을 제공합니다.

## 데이터 수집 전략

30·40 기혼 가구의 실제 가사 부담과 스마트홈 활용 니즈를 분석하기 위해 온라인 커뮤니티와 콘텐츠 채널의 텍스트 데이터를 활용했습니다.

수집 채널 예시:

- 네이버 카페
- 유튜브 댓글
- 네이트판
- 당근마켓 커뮤니티
- 브런치
- 오늘의집 커뮤니티
- 지식인

키워드는 크게 두 축으로 설계했습니다.

- Pain 키워드: 살림 귀찮, 독박살림, 맞벌이 집안일, 살림 스트레스 등
- Solution 키워드: 로봇청소기 실사용, 식기세척기 추천, 세탁기 원격제어, 스마트홈 자동화 등

최종 데이터 규모:

- 전처리 전: 157,950건
- 전처리 후: 51,213건

## AI 및 모델

L-lander의 가사 계획 생성 모델은 사용자 일정과 날씨 데이터를 입력받아 가전 제어에 필요한 구조화된 결과를 생성합니다.

입력 예시:

- 일정 제목
- 일정 날짜
- 시작 시간
- 종료 시간
- 기온
- 습도
- 미세먼지 정보

출력 예시:

- `task_appliance`
- `task_appliance_mode`
- `task_date`
- `task_start_time`
- `task_end_time`

루틴 재학습 모델은 과거 가전 사용 로그와 최근 사용 패턴을 비교해 사용자의 생활 루틴 변화 여부를 탐지하고, 변화된 패턴에 맞게 다음 가전 사용 가능성과 추천 신뢰도를 계산합니다.

## 시스템 구조

```text
사용자 일정 / 가족 일정 / Google Calendar
        ↓
날씨 API / 미세먼지 API / 실내 센서 데이터
        ↓
AI 가사 계획 생성 모델
        ↓
가전 작업 추천 및 담당자 배정
        ↓
가족 캘린더 반영
        ↓
Firebase 명령 저장
        ↓
Python Bridge
        ↓
ESP32 기반 가전 실행 시뮬레이션
```

## 기술 스택

- Frontend: React, Vite, PWA, JavaScript, CSS
- Backend/API: Vercel Serverless API, AI Prediction API, Daily Report API, Weather API
- Database: Firebase Firestore, Firebase Realtime Database, localStorage, sessionStorage
- AI/Model: Qwen/Together 기반 가사 계획 생성, Routine Relearning Model, 날씨·일정 기반 추천 로직
- Hardware Simulation: ESP32, Python Serial Bridge, GPIO/LED 기반 가전 동작 시뮬레이션

## 프로젝트 구조

```text
dx_project_Lalendar/
├── Web_ui/              # React/Vite frontend
├── api/                 # Vercel serverless API
├── Qwen/                # Qwen fine-tuning data and pipeline
├── TCR/                 # routine cycle prediction and evaluation
├── Sensor/              # sensor scripts, Python bridge, ESP32 simulation
├── Cx/                  # crawling and preprocessing scripts
├── database/            # Firebase related files
└── outputs/             # generated analysis outputs
```

## 실행 방법

```bash
npm install
npm run dev
```

프론트엔드만 실행하려면 다음 명령을 사용할 수 있습니다.

```bash
cd Web_ui
npm install
npm run dev
```

빌드:

```bash
npm run build
```

## 환경 변수

로컬 실행 시 `Web_ui/.env.example`을 참고해 `Web_ui/.env`를 생성합니다. 실제 API 키는 Git에 커밋하지 않습니다.

주요 변수:

```env
VITE_WEATHER_SERVICE_KEY=
VITE_MID_WEATHER_SERVICE_KEY=
VITE_AIR_SERVICE_KEY=
VITE_GOOGLE_CLIENT_ID=

WEATHER_API_KEY=
MID_LAND_REG_ID=
MID_TEMP_REG_ID=
OPENAI_API_KEY=
TOGETHER_API_KEY=
TOGETHER_MODEL=
```

Vercel 배포 환경에서는 Project Settings의 Environment Variables에 동일한 값을 등록합니다.

## 팀 정보

| 구분 | 내용 |
| --- | --- |
| 팀명 | SIRIUS |
| 프로젝트 | L-lander |
| 주제 | 30·40 기혼 가구의 가사 노동 스트레스를 낮춰줄 스마트 솔루션 |
| 과정 | 2026 K-Digital Training 디지털 선도기업 아카데미 |
| 분야 | LG전자 주제 |

## 한 줄 요약

L-lander는 가족 일정과 생활 데이터를 기반으로 가사 계획을 자동 생성하고, 스마트홈 가전 실행까지 연결하는 AI 기반 가사 자동화 플랫폼입니다.
