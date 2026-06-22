# L-lander Use Case Specification

- 작성 기준: 현재 저장소의 `Web_ui/src`, `api`, `Sensor`, `tta-ins`, `outputs/report_evidence`를 다시 확인해 정리
- 범위: 프론트엔드 앱 기능, Firebase/Firestore/Realtime Database 연동, AI/날씨/센서 기반 추천, 기기/케어 탭, PWA, 루틴 예측 모델 및 보고서 산출물
- 주의: 일부 UI 문구와 파일명은 현재 저장소에서 인코딩이 깨져 보이지만, 구현 흐름과 컴포넌트/서비스 이름을 기준으로 기능을 판별했다.

## UC-001 로그인 및 사용자 세션 시작

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 등록된 가족 계정으로 앱에 로그인한다 |
| 주요 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | `constants/users.js`에 사용자 ID, 비밀번호, 권한 정보가 정의되어 있다. |
| 기본 흐름 | 1. 사용자가 로그인 화면에서 ID와 비밀번호를 입력한다.<br>2. `LoginPage`가 `findLoginUser`로 사용자를 검증한다.<br>3. 인증에 성공하면 `App.jsx`의 `handleLogin`이 현재 사용자와 앱 세션을 `localStorage`에 저장한다.<br>4. 앱은 사용자 권한과 저장된 세션에 맞춰 기본 탭, 선택 날짜, 선택 캘린더 사용자를 복원한다. |
| 예외 흐름 | 인증 실패 시 오류 문구를 표시하고 로그인 처리를 중단한다. 저장된 세션 파싱 실패 시 세션을 제거하고 로그인 전 상태로 되돌린다. |
| 관련 코드 | `Web_ui/src/pages/LoginPage.jsx`, `Web_ui/src/App.jsx`, `Web_ui/src/constants/users.js` |

## UC-002 온보딩으로 자동화 기본값 설정

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 초기 설정에서 고정 일정, 자동화 가전, 담당자를 구성한다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | 사용자가 로그인했고 `isOnboardingComplete`가 false이다. |
| 기본 흐름 | 1. 사용자가 일정 탭에 진입한다.<br>2. 앱은 `OnboardingPage`를 표시한다.<br>3. 사용자는 고정 일정 템플릿 또는 직접 입력으로 일정명, 요일, 시간을 등록한다.<br>4. 사용자는 자동화할 가전 유형과 가전별 담당자를 선택하거나 자동 배정을 실행한다.<br>5. 완료 시 `completeOnboarding`이 `onboardingSetup`을 저장하고 기본 작업 생성을 준비한다. |
| 예외 흐름 | 필수 입력이 부족하면 저장을 막는다. 사용자가 건너뛰면 기본 설정만 저장하고 자동 작업 생성은 생략한다. |
| 관련 코드 | `Web_ui/src/App.jsx`, `SettingsPanelContent.jsx`, `CalendarPage.jsx` |

## UC-003 개인/가족 캘린더 조회 및 보기 전환

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 월간, 주간, 일간 캘린더에서 개인 및 가족 일정을 조회한다 |
| 주요 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 사용자가 로그인했고 캘린더 탭에 접근할 수 있다. |
| 기본 흐름 | 1. 앱은 기본 일정과 Firestore 사용자 일정을 병합한다.<br>2. 사용자는 프로필/구성원 선택으로 볼 캘린더를 전환한다.<br>3. 사용자는 설정 또는 보기 버튼으로 월간, 주간, 일간 보기를 선택한다.<br>4. 앱은 선택 날짜, 선택 구성원, 검색어, 완료 상태를 반영해 일정 목록과 시간표를 표시한다.<br>5. 날짜를 선택하면 상세 패널 또는 일별 일정 화면이 열린다. |
| 예외 흐름 | Firestore 조회 실패 시 해당 사용자 일정은 빈 목록으로 처리하고 개발 환경에서 경고를 남긴다. 편집 권한이 없는 사용자 일정은 상세 진입 또는 수정이 제한된다. |
| 관련 코드 | `Web_ui/src/App.jsx`, `Web_ui/src/pages/CalendarPage.jsx`, `Web_ui/src/services/taskService.js` |

## UC-004 개인 일정 및 가전 일정 추가

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 선택한 날짜에 개인 일정 또는 가전 작업을 등록한다 |
| 주요 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 사용자가 편집 가능한 캘린더를 보고 있다. |
| 기본 흐름 | 1. 사용자가 날짜 또는 추가 버튼을 누른다.<br>2. 개인 일정이면 제목, 날짜, 시간, 색상, 담당자를 입력한다.<br>3. 가전 일정이면 가전 유형, 기기/모드, 시간, 담당자를 입력한다.<br>4. `addTask`가 로컬 상태를 갱신하고 Firestore 대상 사용자 일정이면 `createUserSchedule`로 저장한다.<br>5. 앱은 변경된 일정을 캘린더와 상세 목록에 반영한다. |
| 예외 흐름 | 제목 누락, 가전 유형 누락, 잘못된 시간 범위, 같은 사람의 일정 충돌은 저장을 막는다. Firestore 저장 실패 시 원격 저장 보장은 하지 않고 개발 경고를 남긴다. |
| 관련 코드 | `CalendarPage.jsx`, `TaskComposer.jsx`, `App.jsx`, `taskService.js` |

## UC-005 일정 완료, 수정, 삭제, 담당자 변경

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 등록된 일정을 완료, 수정, 삭제, 재배정한다 |
| 주요 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 하나 이상의 일정이 존재하고 사용자가 해당 일정에 접근할 수 있다. |
| 기본 흐름 | 1. 사용자가 일정 목록 또는 상세 패널에서 일정을 확인한다.<br>2. 체크 버튼으로 완료 상태를 토글한다.<br>3. 편집 화면에서 제목, 날짜, 시간, 색상, 모드 등을 수정한다.<br>4. 삭제 버튼으로 일정을 제거한다.<br>5. 담당자 선택으로 작업 소유자를 변경한다.<br>6. Firestore 일정이면 `updateUserSchedule` 또는 `deleteUserSchedule`이 호출된다. |
| 예외 흐름 | 입력값 검증 실패, 일정 충돌, 원격 업데이트 실패 시 변경을 제한하거나 개발 경고를 남긴다. |
| 관련 코드 | `TaskItem.jsx`, `DetailPanel.jsx`, `CalendarPage.jsx`, `App.jsx`, `taskService.js` |

## UC-006 일정 미루기

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 일정을 다른 사람, 다른 시간, 다른 날짜로 미룬다 |
| 주요 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 미룰 수 있는 일정 또는 알림이 존재한다. |
| 기본 흐름 | 1. 사용자가 일정 또는 알림에서 미루기를 선택한다.<br>2. 앱은 사람에게 미루기, 시간 미루기, 날짜 미루기 선택지를 표시한다.<br>3. 사용자가 대상 담당자, 시간, 날짜를 선택한다.<br>4. `moveTaskToPerson`, `moveTaskTime`, `moveTaskDate`가 일정 정보를 갱신한다.<br>5. Firestore 일정이면 변경 사항을 원격 저장한다. |
| 예외 흐름 | 빈 날짜, 잘못된 시간, 같은 사용자 일정 충돌이 있으면 변경을 막는다. 조건 기반 자동화 알림은 다음 실행 일정으로 새 작업을 만들고 기존 알림을 dismissed 처리할 수 있다. |
| 관련 코드 | `App.jsx`, `TaskItem.jsx`, `DetailPanel.jsx` |

## UC-007 날씨 및 루틴 기반 추천 일정 추가

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 날씨와 ThinQ 유사 사용 패턴으로 추천된 가전 일정을 추가한다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | 날씨 데이터 또는 내장 날씨 데이터, 루틴 예측 입력이 존재한다. |
| 기본 흐름 | 1. 앱이 `fetchCalendarWeather`로 날짜별 날씨를 불러온다.<br>2. `buildWeatherRecommendationsByDate`가 비, 눈, 더위, 미세먼지 등 조건에 따른 가전 추천을 만든다.<br>3. `buildRoutineRecommendations`가 사용 패턴 기반 루틴 추천을 만든다.<br>4. 사용자는 선택 날짜의 추천 카드에서 일정 추가를 누른다.<br>5. `addWeatherRecommendationTask`가 가전 일정으로 등록한다. |
| 예외 흐름 | 날씨 API 실패 시 상태를 error로 두고 로컬 데이터 또는 빈 추천 목록으로 처리한다. 추천이 없으면 추천 영역을 숨기거나 빈 상태를 표시한다. |
| 관련 코드 | `weatherService.js`, `weatherRecommendationService.js`, `routinePredictionService.js`, `CalendarPage.jsx`, `App.jsx` |

## UC-008 AI 가전 작업 예측 및 담당자 추천

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | AI가 가전 작업의 기기, 모드, 담당자를 예측해 일정 생성을 돕는다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | `/api/predict-task` API가 사용 가능하거나 예측 실패를 처리할 수 있다. |
| 기본 흐름 | 1. 사용자가 작업 입력 또는 추천 흐름을 시작한다.<br>2. 앱이 `predictHouseworkTask`로 작업 텍스트와 맥락을 전송한다.<br>3. API 응답에서 가전 유형과 모드가 검증된다.<br>4. 예측 결과를 기반으로 일정 초안, 담당자 배정 팝업, 자동화 알림을 제공한다. |
| 예외 흐름 | API 실패 또는 응답 스키마 불일치 시 예측 결과를 폐기하고 수동 입력 흐름을 유지한다. |
| 관련 코드 | `Web_ui/src/services/taskPredictionService.js`, `api/predict-task.js`, `App.jsx` |

## UC-009 AI Daily Report 생성 및 상세 조회

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 일정, 가사일, 날씨를 요약한 AI 데일리 리포트를 확인한다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | 캘린더 일정과 날씨/미세먼지 데이터가 수집되었거나 실패 처리되었다. |
| 기본 흐름 | 1. 앱이 선택 날짜부터 3일간의 개인 일정, 가전 일정, To-do 진행률을 수집한다.<br>2. 앱이 같은 기간의 날씨와 미세먼지 정보를 수집한다.<br>3. `fetchDailyReport`가 `/api/daily-report`에 리포트 입력을 POST한다.<br>4. 응답 제목, 요약, 상세, 날씨 팁, 작업 팁, 이미지 테마를 상태와 `sessionStorage` 캐시에 저장한다.<br>5. 사용자가 `DailyReportCard`를 누르면 `/daily-report/:date` 상세 화면으로 이동한다.<br>6. 상세 화면에서 일정 브리핑, 가전 브리핑, 이미지 기록을 확인한다. |
| 예외 흐름 | API 실패, 응답 누락, Abort 발생 시 `createDailyReportFallback`으로 대체 리포트를 표시한다. 동일 요청은 캐시를 재사용한다. |
| 관련 코드 | `dailyReportService.js`, `DailyReportCard.jsx`, `DailyReportDetail.jsx`, `dailyReportData.js`, `App.jsx` |

## UC-010 Daily Report에서 To-do 관리

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 데일리 리포트 상세 화면에서 오늘의 To-do를 추가, 수정, 완료 처리한다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | Daily Report 상세 화면이 열려 있다. |
| 기본 흐름 | 1. 사용자가 To-do 진행 현황 카드를 연다.<br>2. 기존 To-do의 완료 체크를 변경한다.<br>3. 기존 To-do의 제목 또는 시간을 수정한다.<br>4. 새 To-do 제목과 시간을 입력해 추가한다.<br>5. 변경은 캘린더 작업의 추가 또는 업데이트 콜백으로 반영된다. |
| 예외 흐름 | 제목이 비어 있으면 저장하지 않는다. 콜백이 연결되지 않은 경우 UI 입력은 가능하지만 실제 일정 반영은 제한된다. |
| 관련 코드 | `DailyReportDetail.jsx`, `CalendarPage.jsx`, `App.jsx` |

## UC-011 ThinQ/홈 화면에서 날씨 및 대기질 조회

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 홈 화면에서 단기예보, 중기예보, 미세먼지 상태를 확인하고 새로고침한다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | 공공데이터 API 키가 환경 변수에 있거나 API 실패 상태를 처리할 수 있다. |
| 기본 흐름 | 1. 사용자가 홈/ThinQ 화면에 진입한다.<br>2. 앱이 `fetchShortWeather`, `fetchMidWeather`, `fetchAirQuality`를 병렬 호출한다.<br>3. 카드별 loading, success, error 상태를 표시한다.<br>4. 사용자가 새로고침을 누르면 같은 데이터를 다시 요청한다.<br>5. 성공한 데이터는 카드와 추천 일정 생성에 활용된다. |
| 예외 흐름 | 일부 API가 실패해도 나머지 성공 데이터는 표시한다. 빈 응답은 빈 상태 메시지로 처리한다. |
| 관련 코드 | `App.jsx`, `weatherService.js`, `midWeatherService.js`, `airQualityService.js` |

## UC-012 센서 기반 실시간 가전 팝업 실행

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 실시간 센서 값이 조건을 넘으면 가전 실행 팝업을 표시하고 명령을 전송한다 |
| 주요 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | Firebase Realtime Database의 `sensor_latest/living_room_01` 값이 갱신된다. |
| 기본 흐름 | 1. 앱이 `subscribeSensorLatest`로 최신 센서 값을 구독한다.<br>2. `buildRealtimeAppliancePopups`가 온도, 습도, PM10, PM2.5, 빨래 무게 조건을 검사한다.<br>3. 조건을 만족하면 에어컨, 공기청정기, 의류관리 등 실행 팝업을 큐에 넣는다.<br>4. 사용자가 실행을 누르면 명령 payload를 만든다.<br>5. `sendDeviceCommand`가 `device_commands/living_room_01`에 pending 명령을 저장한다. |
| 예외 흐름 | 차단 조건 또는 쿨다운에 걸리면 팝업을 표시하지 않는다. 명령 전송 실패 시 개발 경고를 남기고 팝업을 닫는다. |
| 관련 코드 | `sensorRealtimeService.js`, `appliancePopupRuleService.js`, `App.jsx`, `Sensor/python_bridge/*` |

## UC-013 알림 목록에서 실행 또는 미루기 처리

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 일정 기반 알림을 확인하고 가전 실행 또는 자동화 일정 처리를 수행한다 |
| 주요 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 기준 날짜와 시간이 설정되어 있고 실행 예정/진행 중인 가전 일정이 존재한다. |
| 기본 흐름 | 1. 사용자가 상단 알림 버튼 또는 메뉴의 알림 진입점을 누른다.<br>2. 앱은 작업 알림과 조건 기반 자동화 알림을 계산해 표시한다.<br>3. 사용자는 데모 날짜/시간을 조정할 수 있다.<br>4. 실행 버튼을 누르면 가전 명령 전송 후 작업을 완료 처리한다.<br>5. 미루기를 누르면 사람/시간/날짜 변경 또는 다음 자동화 작업 추가 흐름으로 이어진다. |
| 예외 흐름 | 표시할 알림이 없으면 빈 상태를 표시한다. 명령 payload를 만들 수 없는 작업은 완료 상태만 변경될 수 있다. |
| 관련 코드 | `App.jsx`, `DetailPanel.jsx`, `sensorRealtimeService.js` |

## UC-014 가족 주간 일정 관리

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 가족 구성원별 주간 시간표를 조회하고 로컬 가족 일정을 등록한다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | 하단 메뉴/크루 탭에 접근할 수 있고 브라우저 `localStorage`를 사용할 수 있다. |
| 기본 흐름 | 1. 사용자가 크루 또는 가족 일정 화면에 진입한다.<br>2. `FamilySchedulePage`가 저장된 가족 일정을 불러온다.<br>3. 사용자는 구성원 필터, 주 이동, 주말 표시 여부를 조정한다.<br>4. 빈 시간대 또는 추가 버튼을 눌러 `ScheduleModal`을 연다.<br>5. 제목, 날짜/요일, 반복, 시간, 담당자, 장소, 카테고리, 알림, 메모, 색상을 입력한다.<br>6. `saveSchedules`가 로컬 저장소에 반영하고 주간 시간표를 갱신한다. |
| 예외 흐름 | 필수 입력 누락 또는 종료 시간이 시작 시간보다 빠르면 저장하지 않는다. 캘린더 작업에서 변환된 일정은 직접 삭제하지 않고 복사 초안으로 열 수 있다. |
| 관련 코드 | `CrewPage.jsx`, `FamilySchedulePage.jsx`, `WeeklyTimetable.jsx`, `ScheduleModal.jsx`, `scheduleStorage.js` |

## UC-015 Google Calendar 일정 가져오기

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | Google Calendar OAuth 권한을 받아 외부 일정을 가져온다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | `VITE_GOOGLE_CLIENT_ID`가 설정되어 있고 브라우저에서 Google Identity script를 로드할 수 있다. |
| 기본 흐름 | 1. 사용자가 Google Calendar 가져오기를 실행한다.<br>2. 앱이 Google Identity script를 로드한다.<br>3. OAuth 토큰 클라이언트가 calendar readonly scope 권한을 요청한다.<br>4. 액세스 토큰을 받으면 Google Calendar events API를 호출한다.<br>5. 가져온 이벤트를 앱 일정 형식으로 변환해 캘린더에 반영한다. |
| 예외 흐름 | Client ID 누락, script 로드 실패, OAuth 거절, events API 실패 시 코드와 메시지를 가진 오류를 반환한다. |
| 관련 코드 | `googleCalendarService.js`, `App.jsx` |

## UC-016 기기 탭에서 캘린더 연동 가전 상태 확인

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 선택 날짜의 가전 일정과 연결된 기기 상태를 확인하고 실행/예약/미루기를 수행한다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | 기기 탭에 접근할 수 있고 캘린더 작업 목록이 전달된다. |
| 기본 흐름 | 1. `DeviceTabSynced`가 선택 날짜와 이후 2일의 가전 일정을 수집한다.<br>2. 세탁기, 로봇청소기, 식기세척기, 공기청정기, 에어컨 기기 카드에 가장 가까운 일정을 연결한다.<br>3. 사용자는 기기별 상태, 담당자, 추천 문구, 최근 작업 로그를 확인한다.<br>4. 실행 버튼을 누르면 로컬 상태를 running으로 바꾸고 작업 로그를 추가한다.<br>5. 예약 또는 미루기 버튼을 누르면 reserved 상태와 로그를 반영한다.<br>6. 자동화 설정 토글로 AI 추천, 실행 전 확인, 야간 청소 제한 값을 켜고 끈다. |
| 예외 흐름 | 연결된 가전 일정이 없으면 기기 연결 상태와 빈 일정 안내를 표시한다. 현재 구현의 실행/예약은 기기 탭 내부 로컬 상태와 로그 중심이다. |
| 관련 코드 | `DeviceTabSynced.jsx`, `DeviceTab.css`, `CalendarPage.jsx`, `App.jsx` |

## UC-017 케어 리포트 조회

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 제품 케어, 에너지 사용량, 제품별 사용 리포트를 확인한다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | 케어 리포트 탭에 접근할 수 있다. |
| 기본 흐름 | 1. 사용자가 케어 리포트 탭에 진입한다.<br>2. 사용자는 월 선택기를 통해 이전/다음 월로 이동한다.<br>3. 제품 케어 요약에서 스마트 진단 수와 케어 알림 수를 확인한다.<br>4. 에너지 사용량 카드에서 비용, kWh, 전월 대비 변화율을 확인하고 상세 모달을 연다.<br>5. 제품 필터로 정수기, 세탁기, 건조기, 에어컨 리포트를 필터링한다.<br>6. 제품별 사용 횟수, 사용량, 추천 케어, 추세 차트를 확인한다. |
| 예외 흐름 | 현재 리포트 데이터는 정적 샘플 중심이며 외부 API 저장/동기화 흐름은 확인되지 않는다. |
| 관련 코드 | `CareReportTab.jsx`, `CareReportTab.css` |

## UC-018 캘린더 테마 변경

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 캘린더의 무드 테마를 변경한다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | 캘린더 설정 패널 또는 메뉴 설정에 접근할 수 있다. |
| 기본 흐름 | 1. 사용자가 캘린더 설정 메뉴를 연다.<br>2. 사용자가 오늘의 무드/테마 변경 메뉴로 진입한다.<br>3. 앱은 기본, 산뜻한 하루, 포근한 하루, 활기찬 하루, 다정한 하루, 몽글한 하루 등 테마 선택지를 표시한다.<br>4. 사용자가 원하는 테마를 선택한다.<br>5. `normalizeCalendarSettings`가 선택값을 검증하고 앱이 `moodTheme`을 상태와 `localStorage`에 저장한다.<br>6. 캘린더 화면은 선택한 테마 색상과 분위기를 반영해 다시 표시된다. |
| 예외 흐름 | 저장된 설정 파싱 실패 또는 허용되지 않은 테마 값은 기본 테마로 복원한다. |
| 관련 코드 | `CalendarSettings.jsx`, `AppSettingsContext.jsx`, `App.jsx` |

## UC-019 캘린더 글자 크기 변경

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 캘린더의 글자 크기를 작게, 기본, 크게 중 선택한다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | 캘린더 설정 패널 또는 메뉴 설정에 접근할 수 있다. |
| 기본 흐름 | 1. 사용자가 캘린더 설정 메뉴를 연다.<br>2. 사용자가 글자 크기 변경 메뉴로 진입한다.<br>3. 앱은 작게, 기본, 크게 선택지를 표시한다.<br>4. 사용자가 원하는 글자 크기를 선택한다.<br>5. `normalizeCalendarSettings`가 선택값을 검증하고 앱이 `fontSizeMode`를 상태와 `localStorage`에 저장한다.<br>6. 캘린더의 일정 텍스트와 주요 표시 요소가 선택한 글자 크기 모드에 맞춰 표시된다. |
| 예외 흐름 | 저장된 설정 파싱 실패 또는 허용되지 않은 글자 크기 값은 기본 글자 크기로 복원한다. |
| 관련 코드 | `CalendarSettings.jsx`, `AppSettingsContext.jsx`, `App.jsx` |

## UC-020 일간/주간/월간 캘린더 보기 전환

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 캘린더 보기 방식을 일간, 주간, 월간으로 전환한다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | 캘린더 화면 또는 캘린더 설정 패널에 접근할 수 있다. |
| 기본 흐름 | 1. 사용자가 캘린더 보기 방식 메뉴를 연다.<br>2. 앱은 일간 보기, 주간 보기, 월간 보기 선택지를 표시한다.<br>3. 사용자가 원하는 보기 방식을 선택한다.<br>4. `normalizeCalendarSettings`가 선택값을 검증하고 앱이 `calendarViewMode`를 상태와 `localStorage`에 저장한다.<br>5. `CalendarPage`는 선택값에 따라 일간 타임라인, 주간 시간표, 월간 달력 중 하나를 렌더링한다.<br>6. 사용자가 앱을 다시 열어도 저장된 보기 방식이 복원된다. |
| 예외 흐름 | 저장된 설정 파싱 실패 또는 허용되지 않은 보기 값은 월간 보기로 복원한다. |
| 관련 코드 | `CalendarSettings.jsx`, `CalendarPage.jsx`, `App.jsx` |

## UC-021 센서 테스트 및 Firebase 명령 검증

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 테스트 패널과 브리지 코드로 센서 데이터 저장 및 기기 명령 송신을 검증한다 |
| 주요 사용자 | 개발자, 관리자 |
| 선행 조건 | Firebase Realtime Database 설정과 센서/브리지 실행 환경이 준비되어 있다. |
| 기본 흐름 | 1. 개발자가 `SensorTestPanel`에서 테스트 센서 값 저장을 누른다.<br>2. `writeSensorLatest`와 `addSensorLog`가 최신 값과 로그를 저장한다.<br>3. 개발자가 명령 전송 버튼을 누른다.<br>4. `sendDeviceCommand`가 기기 명령 경로에 명령을 저장한다.<br>5. Python 브리지 또는 ESP32 테스트 코드가 DB 명령을 읽어 실제 장치 제어로 연결할 수 있다. |
| 예외 흐름 | Firebase 접근 실패 또는 브리지 미실행 시 앱 저장/명령 전송 이후 실제 하드웨어 동작은 보장되지 않는다. |
| 관련 코드 | `SensorTestPanel.jsx`, `sensorRealtimeService.js`, `Sensor/python_bridge/firebase_sensor_command_bridge.py`, `Sensor/esp32_command_test/esp32_command_test.ino` |

## UC-022 루틴 변화 예측 모델 및 평가 산출물 생성

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | ThinQ 유사 사용 로그로 루틴 변화 탐지 및 TTA-inspired 재보정을 평가한다 |
| 주요 사용자 | 개발자, 연구자, 보고서 작성자 |
| 선행 조건 | 합성 가전 사용 로그와 `tta-ins` 스크립트가 준비되어 있다. |
| 기본 흐름 | 1. `data-make-multifamily.py`가 110가구, 4개 가전 유형의 합성 사용 로그를 생성한다.<br>2. train/validation/test를 시간 기준으로 분리한다.<br>3. `routineCyclePrediction.ts` 또는 `adaptive-cycle-recalibration` 로직이 기준 주기, 일일 빈도, 최근 패턴을 계산한다.<br>4. grid search가 `minRecentCount`, `diffThresholdDays`, `maxRecentStd`, `alpha`, `frequencyDiffThreshold`, `frequencyRecentWindowDays`를 탐색한다.<br>5. 최고 조합과 성능 지표를 `outputs/routine_hparam_search`와 `outputs/report_evidence`에 저장한다.<br>6. 보고서에서는 F1, change type accuracy, cycle MAE, daily frequency MAE를 제시한다. |
| 예외 흐름 | 현재 구현은 딥러닝 TTA, BatchNorm 업데이트, entropy minimization이 아니라 최근 무라벨 로그 기반의 주기/빈도 재보정이다. |
| 관련 코드/산출물 | `Web_ui/src/utils/routineCyclePrediction.ts`, `tta-ins/*.py`, `outputs/report_evidence/report_content_guide.md`, `outputs/routine_hparam_search/*` |

## UC-023 PWA로 앱 설치 및 실행

| 항목 | 내용 |
| --- | --- |
| 유스케이스명 | 모바일/데스크톱에서 설치 가능한 PWA 앱으로 접근한다 |
| 주요 사용자 | 가족 구성원 |
| 선행 조건 | 앱이 HTTPS 또는 localhost에서 제공되고 브라우저가 PWA 설치를 지원한다. |
| 기본 흐름 | 1. 사용자가 브라우저에서 L-lander에 접속한다.<br>2. `index.html`이 모바일 web app 메타 태그와 아이콘을 제공한다.<br>3. `vite-plugin-pwa`가 manifest와 service worker를 생성한다.<br>4. 브라우저가 설치 가능 조건을 만족하면 설치 UI를 제공한다.<br>5. 사용자는 standalone 모드로 앱을 실행할 수 있다. |
| 예외 흐름 | 앱 내부의 별도 설치 버튼 흐름은 확인되지 않으며, 설치 프롬프트 표시는 브라우저 기본 동작에 의존한다. |
| 관련 코드 | `Web_ui/vite.config.js`, `Web_ui/index.html`, `Web_ui/public/icons/*`, `Web_ui/dist/manifest.webmanifest` |

## 기능 범위와 제한 사항

- Google Calendar 연동은 OAuth token client와 events API 호출 코드가 있으며, 실제 동작은 `VITE_GOOGLE_CLIENT_ID`와 사용자의 권한 승인에 의존한다.
- 기기 탭의 실행/예약/미루기는 현재 `DeviceTabSynced` 내부 로컬 상태와 로그가 중심이며, 센서 팝업/알림 실행 경로의 `sendDeviceCommand`와는 별도 흐름이다.
- 케어 리포트는 현재 정적 샘플 데이터 기반 UI로 확인된다.
- 센서 기반 팝업과 명령 전송은 Firebase Realtime Database 경로를 사용하며, 실제 하드웨어 제어는 별도 Python/ESP32 브리지 실행 여부에 의존한다.
- 루틴 예측 모델은 TTA-inspired adaptive recalibration으로 정의하며, 완전한 딥러닝 재학습 또는 실사용 ThinQ 원본 데이터 학습으로 표현하지 않는다.

## 확인한 주요 파일

- `Web_ui/src/App.jsx`
- `Web_ui/src/pages/LoginPage.jsx`
- `Web_ui/src/pages/CalendarPage.jsx`
- `Web_ui/src/pages/CrewPage.jsx`
- `Web_ui/src/components/TaskComposer.jsx`
- `Web_ui/src/components/TaskItem.jsx`
- `Web_ui/src/components/DetailPanel.jsx`
- `Web_ui/src/components/detailPanel/SettingsPanelContent.jsx`
- `Web_ui/src/components/DeviceTabSynced.jsx`
- `Web_ui/src/components/CareReportTab.jsx`
- `Web_ui/src/components/CalendarSettings.jsx`
- `Web_ui/src/components/SensorTestPanel.jsx`
- `Web_ui/src/components/familySchedule/*`
- `Web_ui/src/features/dailyReport/*`
- `Web_ui/src/services/taskService.js`
- `Web_ui/src/services/weatherService.js`
- `Web_ui/src/services/midWeatherService.js`
- `Web_ui/src/services/airQualityService.js`
- `Web_ui/src/services/weatherRecommendationService.js`
- `Web_ui/src/services/routinePredictionService.js`
- `Web_ui/src/services/dailyReportService.js`
- `Web_ui/src/services/taskPredictionService.js`
- `Web_ui/src/services/googleCalendarService.js`
- `Web_ui/src/services/sensorRealtimeService.js`
- `Web_ui/src/services/appliancePopupRuleService.js`
- `Web_ui/src/utils/routineCyclePrediction.ts`
- `api/predict-task.js`, `api/daily-report.js`, `api/weather.js`
- `Sensor/python_bridge/*`, `Sensor/esp32_command_test/*`
- `tta-ins/*`
- `outputs/report_evidence/*`
