# L-lander 앱 유스케이스 명세서

- 작성 기준: 현재 frontend 코드 분석 기준
- 분석 대상: 실제 프로젝트 내 화면, 컴포넌트, API 호출, 사용자 인터랙션
- 주의사항: 코드에서 명확히 확인되지 않은 기능은 “추정”이라고 표시

## UC-001 로그인하여 개인/가족 캘린더 세션 시작

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 로그인하여 L-lander 앱을 시작한다 |
| 유스케이스 ID | UC-001 |
| 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 사용자가 `constants/users.js`에 정의된 로그인 사용자 ID와 비밀번호를 알고 있다. |
| 기본 흐름 | 1. 사용자가 로그인 화면에서 아이디를 입력한다.<br>2. 사용자가 비밀번호를 입력한다.<br>3. 사용자가 로그인 버튼을 누른다.<br>4. 시스템이 `findLoginUser(id, password)`로 사용자 정보를 확인한다.<br>5. 인증에 성공하면 `handleLogin(user)`가 현재 사용자와 세션 정보를 `localStorage`에 저장한다.<br>6. 시스템이 사용자의 캘린더/온보딩 상태에 맞는 화면을 표시한다. |
| 예외 | 아이디 또는 비밀번호가 일치하지 않으면 `LoginPage`가 오류 문구를 표시하고 로그인 처리를 중단한다. `localStorage` 파싱에 실패하면 저장된 사용자/세션 정보를 제거하고 로그인 전 상태로 처리한다. |
| 우선 순위 | 상 |
| 관련 화면/컴포넌트 | `Web_ui/src/pages/LoginPage.jsx`의 `LoginPage`, `Web_ui/src/App.jsx`의 `handleLogin`, `readStoredCurrentUser`, `readStoredAppSession` |
| 근거 | `LoginPage`의 `submit` 함수가 `findLoginUser`를 호출하고 실패 시 `error` 상태를 설정한다. `App.jsx`는 `CURRENT_USER_STORAGE_KEY`, `APP_SESSION_STORAGE_KEY`를 사용해 로그인 사용자와 세션을 유지한다. |

## UC-002 온보딩으로 고정 일정과 자동화 가전을 설정

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 초기 온보딩을 진행해 일정/가전 자동화 기본값을 만든다 |
| 유스케이스 ID | UC-002 |
| 사용자 | 가족 구성원 |
| 선행 조건 | 사용자가 로그인했으며 `isOnboardingComplete`가 false이다. |
| 기본 흐름 | 1. 사용자가 하단 일정 탭에 진입한다.<br>2. 시스템이 `OnboardingPage`를 표시하고 배경에 `CalendarPage` 미리보기를 렌더링한다.<br>3. 사용자가 안내 화면을 넘긴다.<br>4. 사용자가 고정 일정 입력 단계에서 일정명, 요일, 시작/종료 시간을 등록하거나 자동 템플릿 버튼을 누른다.<br>5. 사용자가 구글 캘린더 연동 확인 단계에서 건너뛰기 또는 선택 버튼을 누른다.<br>6. 사용자가 자동화할 가전과 가전별 담당자를 선택하거나 자동 배정한다.<br>7. 사용자가 완료하면 `completeOnboarding`이 온보딩 설정을 저장하고, 선택한 가전/고정 일정 기반 작업을 생성한다. |
| 예외 | 사용자가 온보딩을 건너뛰면 `skipGeneration`으로 기본 설정만 저장하고 자동 작업 생성을 생략한다. 고정 일정 입력 폼에서 필수 값이 부족하면 등록 버튼이 비활성 상태로 남는다. 자동화 가전이 없으면 가전별 담당자 지정 목록이 비어 있을 수 있다. |
| 우선 순위 | 상 |
| 관련 화면/컴포넌트 | `Web_ui/src/App.jsx`의 `OnboardingPage`, `completeOnboarding`, `buildOnboardingTasks`, `OnboardingAssigneeSelect`, `TimeSelect` |
| 근거 | `App.jsx`의 `activeTab === "schedule" && !isOnboardingComplete` 분기가 온보딩을 표시한다. `OnboardingPage`에는 `registerFixedSchedule`, `addFixedScheduleTemplate`, `toggleApplianceType`, `changeApplianceAssignee`, `autoFillApplianceAssignees` 함수가 존재한다. |

## UC-003 개인 캘린더를 조회하고 월/주/일 보기로 전환

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 가족 구성원별 개인 캘린더와 일정을 조회한다 |
| 유스케이스 ID | UC-003 |
| 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 사용자가 로그인했고 온보딩이 완료되었다. Firestore 일정 조회는 대상 사용자가 `dada`, `sumin`, `jea` 중 하나여야 한다. |
| 기본 흐름 | 1. 사용자가 일정 탭에 접속한다.<br>2. 시스템이 `getUserSchedules(userId)`로 Firestore 사용자별 일정을 조회한다.<br>3. 시스템이 기본 생성 일정과 Firestore 일정을 병합해 `CalendarPage`에 전달한다.<br>4. 사용자가 프로필 버튼을 눌러 특정 가족 구성원의 캘린더를 선택한다.<br>5. 사용자가 월간/주간/일간 버튼 또는 상단 캘린더 보기 메뉴를 선택한다.<br>6. 시스템이 선택한 보기 방식에 따라 월 그리드, `WeekTimetable`, 일간 화면을 표시한다.<br>7. 사용자가 날짜를 누르면 해당 날짜의 상세 일정 화면 또는 선택 날짜 작업 목록을 표시한다. |
| 예외 | Firestore 조회 실패 시 해당 사용자의 원격 일정은 빈 목록으로 처리하고 개발 환경에서는 경고를 기록한다. 일반 사용자가 다른 사용자의 개인 캘린더를 편집하려 하면 날짜 상세 진입/추가가 차단된다. 날씨 데이터가 없으면 날짜 셀에 대체 UI가 표시된다. |
| 우선 순위 | 상 |
| 관련 화면/컴포넌트 | `Web_ui/src/App.jsx`의 `getUserSchedules` 로딩 effect와 `pageProps`, `Web_ui/src/pages/CalendarPage.jsx`의 `CalendarPage`, `WeekTimetable`, `DayTimelineHead` |
| 근거 | `App.jsx`가 로그인 후 `getFirestoreScheduleUserIds(currentUser)` 대상에 `getUserSchedules`를 호출한다. `CalendarPage`는 `calendarView` 상태로 `month`, `week`, `day` 렌더링을 분기하고 프로필 필터 버튼을 제공한다. |

## UC-004 개인 일정 또는 가사 일정을 추가한다

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 선택한 날짜에 개인 일정 또는 가전 기반 가사 일정을 추가한다 |
| 유스케이스 ID | UC-004 |
| 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 사용자가 편집 권한이 있는 캘린더를 보고 있다. 가사 일정 추가 시 온보딩/설정에서 담당 가전이 지정되어 있어야 한다. |
| 기본 흐름 | 1. 사용자가 캘린더에서 날짜를 선택한다.<br>2. 사용자가 일정 추가 버튼을 누른다.<br>3. 시스템이 개인 캘린더에서는 `DailyScheduleAddPage`의 제목 입력 폼을 표시한다.<br>4. 시스템이 가사 캘린더에서는 담당 가전 선택 드롭다운, 색상 선택, 기간/시간 선택 폼을 표시한다.<br>5. 사용자가 제목 또는 가전, 날짜, 시간, 색상을 입력한다.<br>6. 사용자가 저장 버튼을 누른다.<br>7. 시스템이 `onAddTask`를 통해 `addTask`를 호출하고, Firestore 대상 사용자이면 `createUserSchedule`로 저장한다.<br>8. 시스템이 새 일정이 포함된 날짜 상세 또는 캘린더를 다시 표시한다. |
| 예외 | 개인 일정 제목이 비어 있으면 “제목을 입력해 주세요.” 오류를 표시한다. 가사 일정에서 담당 가전이 없으면 “담당 가전이 없어요...” 오류를 표시한다. 종료 시간이 시작 시간보다 빠르거나 같으면 저장하지 않고 시간 오류를 표시한다. Firestore 저장에 실패하면 화면 상태는 추가되지만 개발 경고가 기록되고 원격 저장은 보장되지 않는다. |
| 우선 순위 | 상 |
| 관련 화면/컴포넌트 | `Web_ui/src/pages/CalendarPage.jsx`의 `DailyScheduleAddPage`, `openCalendarComposer`, `Web_ui/src/App.jsx`의 `addTask`, `Web_ui/src/services/taskService.js`의 `createUserSchedule` |
| 근거 | `DailyScheduleAddPage.saveSchedule`이 필수값과 시간 유효성을 검사하고 `onSave`로 일정 객체를 전달한다. `App.jsx.addTask`는 `createUserSchedule` 호출 후 `schedule_create` analytics 이벤트를 기록한다. |

## UC-005 일정 완료, 수정, 삭제, 담당자 변경을 처리한다

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 등록된 일정을 관리한다 |
| 유스케이스 ID | UC-005 |
| 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 일정이 하나 이상 존재하고 사용자가 해당 일정에 대한 편집 권한을 가진다. |
| 기본 흐름 | 1. 사용자가 날짜 상세 화면 또는 작업 목록에서 일정을 확인한다.<br>2. 사용자가 체크 버튼을 누르면 시스템이 완료 상태를 토글한다.<br>3. 사용자가 일정 블록의 컨텍스트 메뉴에서 수정 또는 삭제를 선택한다.<br>4. 수정 선택 시 시스템이 `DailyScheduleEditPage`를 표시한다.<br>5. 사용자가 제목, 날짜, 시간, 색상을 변경하고 저장한다.<br>6. 시스템이 `updateTask`를 호출하고 Firestore 일정이면 `updateUserSchedule`에 반영한다.<br>7. 삭제 선택 시 시스템이 `deleteTask`를 호출하고 Firestore 일정이면 `deleteUserSchedule`에 반영한다.<br>8. 담당자 선택 UI에서 사용자가 담당자를 바꾸면 시스템이 작업 소유자 상태를 변경한다. |
| 예외 | 제목이 비어 있거나 종료 시간이 시작 시간보다 빠르면 수정 저장을 중단한다. 비 오는 날 세탁 일정을 잡거나 같은 시간대 일정이 충돌하면 `getTaskDateRestriction`이 안내 문구를 반환하고 저장하지 않는다. Firestore 업데이트/삭제 실패 시 개발 경고를 남긴다. 표시할 작업이 없으면 빈 상태 UI를 표시한다. |
| 우선 순위 | 상 |
| 관련 화면/컴포넌트 | `Web_ui/src/pages/CalendarPage.jsx`의 `DailyScheduleEditPage`, `TaskItem`, `Web_ui/src/components/DetailPanel.jsx`, `Web_ui/src/App.jsx`의 `toggleTask`, `updateTask`, `deleteTask`, `changeTaskOwner` |
| 근거 | `TaskItem`에는 완료, 담당자 select, 삭제, 미루기, 더보기 버튼이 있다. `DailyScheduleEditPage.saveSchedule`과 `App.jsx`의 CRUD 함수들이 Firestore 업데이트/삭제를 호출한다. |

## UC-006 일정 미루기와 알림 미루기를 수행한다

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 일정 또는 실행 알림을 사람/시간/날짜 기준으로 미룬다 |
| 유스케이스 ID | UC-006 |
| 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 미룰 수 있는 일정 또는 알림이 존재한다. |
| 기본 흐름 | 1. 사용자가 작업 목록, 상세 패널, 알림 팝오버에서 미루기 버튼을 누른다.<br>2. 시스템이 `postponePicker` 다이얼로그를 표시한다.<br>3. 사용자가 다른 사람에게 미루기, 시간 미루기, 날짜 미루기 중 하나를 선택한다.<br>4. 사용자가 담당자, 새 시간 또는 새 날짜/시간을 선택한다.<br>5. 시스템이 선택한 방식에 따라 `moveTaskToPerson`, `moveTaskTime`, `moveTaskDate` 흐름으로 일정을 갱신한다.<br>6. Firestore 일정이면 `updateUserSchedule`을 호출한다.<br>7. 시스템이 캘린더와 알림 목록에 변경된 일정을 반영한다. |
| 예외 | 비 오는 날 세탁 일정으로 변경하려 하거나 같은 사용자의 시간대가 충돌하면 “날짜 변경 불가” 다이얼로그를 표시하고 변경하지 않는다. 알림 미루기에서 일반 자동화 알림은 다음 날 자동화 작업으로 추가하고 기존 알림은 dismissed 처리한다. Firestore 갱신 실패 시 개발 경고를 기록한다. |
| 우선 순위 | 중 |
| 관련 화면/컴포넌트 | `Web_ui/src/App.jsx`의 `postponeTask`, `moveTaskDate`, `moveTaskTime`, `moveTaskToPerson`, `postponeNotification`, `PostponeDatePicker`, `PostponeTimePicker` |
| 근거 | `App.jsx` 하단 렌더링에 `postponePicker` 모달과 사람/시간/날짜 선택 UI가 있으며, `getTaskDateRestriction`으로 날씨/시간 충돌을 검사한다. |

## UC-007 날씨/루틴 기반 추천 일정을 확인하고 추가한다

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 날씨와 ThinQ 패턴 기반 추천 가사일을 일정에 추가한다 |
| 유스케이스 ID | UC-007 |
| 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 날씨 API 또는 내장 날씨 데이터, ThinQ 사용 로그/상태 기반 추천 입력이 존재한다. |
| 기본 흐름 | 1. 사용자가 일정 화면에서 날짜를 선택한다.<br>2. 시스템이 `fetchCalendarWeather` 결과를 `buildWeatherRecommendationsByDate`로 변환한다.<br>3. 시스템이 `buildRoutineRecommendations` 결과와 날짜별 날씨 추천을 합쳐 추천 목록을 만든다.<br>4. `CalendarPage`가 선택 날짜의 “추천 일정” 카드 목록을 표시한다.<br>5. 사용자가 추천 카드의 일정 추가 버튼을 누른다.<br>6. 시스템이 `addWeatherRecommendationTask`로 가전 유형, 추천 시간, 추천 출처, 신뢰도 등이 포함된 가사 일정을 추가한다. |
| 예외 | 날씨 API 호출에 실패하면 `weatherApiStatus`가 `error`가 되고 추천은 빈 목록 또는 로컬 날씨 데이터 기반으로 제한된다. 추천 목록이 없으면 추천 일정 섹션을 표시하지 않는다. Firestore 저장 실패 시 일정 원격 저장이 누락될 수 있다. |
| 우선 순위 | 중 |
| 관련 화면/컴포넌트 | `Web_ui/src/pages/CalendarPage.jsx`의 추천 일정 패널, `Web_ui/src/App.jsx`의 `addWeatherRecommendationTask`, `Web_ui/src/services/weatherService.js`, `weatherRecommendationService.js`, `routinePredictionService.js` |
| 근거 | `CalendarPage`는 `selectedRecommendations`를 렌더링하고 각 카드의 `onAddWeatherRecommendation(selectedDate, recommendation)` 버튼을 제공한다. |

## UC-008 AI Daily Report를 생성하고 상세 리포트를 확인한다

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 3일치 일정/가사일/날씨 기반 AI Daily Report를 확인한다 |
| 유스케이스 ID | UC-008 |
| 사용자 | 가족 구성원 |
| 선행 조건 | 사용자가 일정 화면에 있고 날씨/미세먼지 로딩이 완료되었거나 실패 처리되었다. |
| 기본 흐름 | 1. 시스템이 선택 날짜부터 3일간의 개인 일정, 가사 일정, To-do 진행률을 `collectDailyReportTasks`로 수집한다.<br>2. 시스템이 선택 날짜부터 3일간의 날씨와 당일 미세먼지를 `collectDailyReportWeather`로 수집한다.<br>3. 시스템이 `fetchDailyReport(input)`으로 `/api/daily-report`에 POST 요청을 보낸다.<br>4. 응답이 성공하면 제목, 요약, 상세, 날씨 팁, 가사 팁, 이미지 테마를 상태와 sessionStorage 캐시에 저장한다.<br>5. 사용자가 캘린더의 `DailyReportCard`를 누른다.<br>6. 시스템이 `/daily-report/:date` 경로를 history에 push하고 `DailyReportDetail`을 표시한다.<br>7. 사용자가 상세 리포트에서 일정/가사/날씨 브리핑과 이미지 기록을 확인한다. |
| 예외 | `/api/daily-report` 요청 실패, 응답 누락, Abort 발생 시 `createDailyReportFallback`으로 대체 리포트를 표시한다. 날씨 API가 아직 loading이면 리포트 생성을 지연한다. 같은 요청 키는 sessionStorage 캐시를 재사용한다. |
| 우선 순위 | 상 |
| 관련 화면/컴포넌트 | `Web_ui/src/App.jsx`의 `collectDailyReportTasks`, `collectDailyReportWeather`, daily report effect, `Web_ui/src/services/dailyReportService.js`, `Web_ui/src/features/dailyReport/DailyReportCard.jsx`, `DailyReportDetail.jsx`, `dailyReportData.js` |
| 근거 | `App.jsx`는 `fetchDailyReport`를 호출하고 실패 시 fallback을 설정한다. `CalendarPage.openDailyReport`는 `/daily-report/${todayDailyReport.id}`로 라우팅한다. |

## UC-009 Daily Report에서 To-do를 추가/수정/완료한다

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | Daily Report 상세에서 오늘의 To-do를 관리한다 |
| 유스케이스 ID | UC-009 |
| 사용자 | 가족 구성원 |
| 선행 조건 | Daily Report 상세 화면이 열려 있다. |
| 기본 흐름 | 1. 사용자가 Daily Report 상세 화면에서 To-do 진행 현황 카드를 누른다.<br>2. 시스템이 To-do 관리 시트를 연다.<br>3. 사용자가 기존 To-do의 체크 버튼을 누른다.<br>4. 시스템이 `onUpdateTodo(id, { done })`를 호출해 완료 상태를 갱신한다.<br>5. 사용자가 기존 To-do 항목을 눌러 제목/시간을 수정한다.<br>6. 사용자가 새 To-do 제목과 시간을 입력하고 추가 버튼을 누른다.<br>7. 시스템이 `onAddTodo`를 통해 해당 리포트 날짜의 개인 일정으로 To-do를 추가한다. |
| 예외 | 제목이 비어 있으면 저장하지 않는다. 기존 To-do가 없으면 빈 상태 문구를 표시한다. `onUpdateTodo` 또는 `onAddTodo`가 연결되지 않은 경우 UI 입력은 가능하지만 실제 일정 반영은 되지 않는다. |
| 우선 순위 | 중 |
| 관련 화면/컴포넌트 | `Web_ui/src/features/dailyReport/DailyReportDetail.jsx`, `Web_ui/src/pages/CalendarPage.jsx`의 `DailyReportDetail` props 연결 |
| 근거 | `DailyReportDetail.saveTodo`는 제목 trim 후 `onAddTodo` 또는 `onUpdateTodo`를 호출한다. `CalendarPage`는 이 콜백을 `onAddTask`, `updateTask`로 연결한다. |

## UC-010 ThinQ 홈에서 날씨/미세먼지 환경 데이터를 조회한다

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | ThinQ 홈 화면에서 오늘의 환경 정보를 확인하고 새로고침한다 |
| 유스케이스 ID | UC-010 |
| 사용자 | 가족 구성원 |
| 선행 조건 | 사용자가 홈 탭에 진입했다. 날씨/미세먼지 API 키가 환경 변수에 설정되어 있으면 실제 API 호출이 가능하다. |
| 기본 흐름 | 1. 사용자가 홈 탭을 연다.<br>2. 시스템이 `fetchShortWeather`, `fetchMidWeather`, `fetchAirQuality`를 병렬로 호출한다.<br>3. 시스템이 단기예보, 중기예보, 미세먼지 카드를 표시한다.<br>4. 사용자가 새로고침 버튼을 누른다.<br>5. 시스템이 세 API를 다시 호출하고 로딩 상태를 표시한다.<br>6. 응답이 완료되면 최신 환경 데이터를 카드에 반영한다. |
| 예외 | API 키가 없거나 API 요청이 실패하면 해당 카드의 상태가 error가 되고, 다른 성공한 카드만 데이터가 표시된다. 데이터가 빈 배열이면 “데이터가 없습니다” 유형의 빈 상태를 표시한다. |
| 우선 순위 | 중 |
| 관련 화면/컴포넌트 | `Web_ui/src/App.jsx`의 `HomePage`, `EnvironmentDataPanel`, `ForecastSummaryCard`, `AirQualityCard`, `Web_ui/src/services/weatherService.js`, `midWeatherService.js`, `airQualityService.js` |
| 근거 | `HomePage.loadEnvironmentData`와 `refreshEnvironmentData`가 세 서비스를 `Promise.allSettled`로 호출하고 `resultToApiState`로 카드 상태를 만든다. |

## UC-011 센서 기반 가전 실행 추천 팝업을 확인하고 실행한다

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 실시간 센서 상태에 따라 에어컨/공기청정기/세탁기 실행을 확인한다 |
| 유스케이스 ID | UC-011 |
| 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 사용자가 로그인했고 온보딩이 완료되었다. Firebase Realtime Database의 `sensor_latest/living_room_01` 데이터가 수신된다. |
| 기본 흐름 | 1. 시스템이 `subscribeSensorLatest("living_room_01")`로 최신 센서 값을 구독한다.<br>2. 센서 값이 변경되면 `buildRealtimeAppliancePopups`가 온도, 습도, PM10, PM2.5 기준을 검사한다.<br>3. 시스템이 담당자와 일정 필터를 적용해 사용자에게 보여줄 팝업을 큐에 넣는다.<br>4. 사용자가 팝업 내용을 확인한다.<br>5. 사용자가 실행 버튼을 누른다.<br>6. 시스템이 `buildDeviceCommandPayloadFromRealtimePopup`으로 명령 payload를 만들고 `sendDeviceCommand("living_room_01", payload)`를 호출한다.<br>7. 시스템이 Firebase Realtime Database의 `device_commands/living_room_01`에 pending 명령을 저장하고 팝업을 닫는다. |
| 예외 | 팝업이 blocked 상태이면 실행하지 않고 닫는다. 세탁기 일정에서 문이 열렸거나 무게가 기준 이하이면 실행 차단 팝업을 표시한다. 같은 팝업은 10분 cooldown 또는 이미 표시된 세탁기 팝업 키로 중복 표시를 방지한다. Firebase 명령 전송 실패 시 개발 경고를 기록하고 팝업을 닫는다. |
| 우선 순위 | 상 |
| 관련 화면/컴포넌트 | `Web_ui/src/App.jsx`의 `subscribeSensorLatest` effect, `enqueueSensorPopups`, `executeSensorPopup`, `SensorPopupDialog`, `Web_ui/src/services/sensorRealtimeService.js`, `appliancePopupRuleService.js` |
| 근거 | `sensorRealtimeService.sendDeviceCommand`가 `device_commands/{deviceId}`에 pending 명령을 저장한다. `appliancePopupRuleService`는 온도/습도/미세먼지/세탁기 무게 기준으로 팝업을 생성한다. |

## UC-012 알림 목록에서 가전 실행 또는 자동화 일정을 처리한다

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 일정 기반 알림을 확인하고 실행 또는 미루기한다 |
| 유스케이스 ID | UC-012 |
| 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 선택 날짜와 시간 기준으로 실행 예정 또는 진행 중인 가사/가전 일정이 존재한다. |
| 기본 흐름 | 1. 사용자가 상단 알림 버튼 또는 홈 화면 알림 버튼을 누른다.<br>2. 시스템이 알림 팝오버를 열고 기준 날짜/시간과 알림 목록을 표시한다.<br>3. 사용자가 시간 선택기를 조정하거나 “지금” 버튼으로 현재 시간을 반영한다.<br>4. 시스템이 `tasksForNotification`, `buildTaskNotificationTitle`, `buildConditionalNotifications`로 알림 목록을 계산한다.<br>5. 사용자가 실행 버튼을 누른다.<br>6. 알림이 작업 기반이면 시스템이 가전 명령 payload를 만들고 `sendDeviceCommand`를 호출한 뒤 작업을 완료 처리한다.<br>7. 알림이 조건 기반 자동화이면 시스템이 자동화 작업을 추가하고 알림을 dismissed 처리한다.<br>8. 사용자가 미루기를 누르면 작업 미루기 또는 다음 날 자동화 추가 흐름으로 처리한다. |
| 예외 | 알림 목록이 없으면 “표시할 알림이 없습니다” UI를 표시한다. 가전 명령 payload를 만들 수 없는 작업이면 명령 전송 없이 완료 상태만 변경될 수 있다. 장치 명령 전송 실패 시 개발 경고를 기록한다. |
| 우선 순위 | 중 |
| 관련 화면/컴포넌트 | `Web_ui/src/App.jsx`의 알림 팝오버 렌더링, `notificationItems`, `executeNotification`, `postponeNotification`, `buildConditionalNotifications`, `DetailPanel`의 `panel.type === "notifications"` |
| 근거 | `App.jsx`는 알림 팝오버에 미루기/실행 버튼을 렌더링한다. `executeNotification`은 task 타입에서 `sendDeviceCommandFromNotification`과 `toggleTask`를 호출한다. |

## UC-013 가족 주간 일정표를 조회하고 로컬 일정을 등록한다

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 가족 구성원별 주간 시간표를 조회하고 반복 일정을 등록한다 |
| 유스케이스 ID | UC-013 |
| 사용자 | 가족 구성원 |
| 선행 조건 | 사용자가 하단 메뉴/크루 탭에 진입했다. 브라우저 `localStorage` 사용이 가능하다. |
| 기본 흐름 | 1. 사용자가 메뉴 탭을 연다.<br>2. 시스템이 `CrewPage`와 `FamilySchedulePage`를 표시한다.<br>3. 시스템이 `loadSchedules`로 로컬 저장된 가족 일정을 읽고, 현재 앱 작업을 주간 시간표용 일정으로 변환한다.<br>4. 사용자가 구성원 필터를 선택한다.<br>5. 사용자가 이전/다음 주 버튼 또는 날짜 input으로 기준 주를 변경한다.<br>6. 사용자가 빈 시간 슬롯 또는 일정 추가 버튼을 누른다.<br>7. 시스템이 `ScheduleModal`을 열고 제목, 날짜, 반복, 시간, 담당자, 요일, 장소, 카테고리, 알림, 메모, 색상 입력을 받는다.<br>8. 사용자가 저장하면 `saveSchedules`로 로컬 저장소에 반영하고 주간 시간표를 갱신한다. |
| 예외 | 제목, 날짜/요일, 시작/종료 시간, 담당자가 누락되면 `ScheduleModal`이 구체적인 오류 문구를 표시한다. 종료 시간이 시작 시간보다 빠르면 저장하지 않는다. `source === "task"`로 변환된 앱 작업은 삭제할 수 없고, 클릭하면 새 로컬 일정 초안으로 복사된다. |
| 우선 순위 | 중 |
| 관련 화면/컴포넌트 | `Web_ui/src/pages/CrewPage.jsx`, `Web_ui/src/components/familySchedule/FamilySchedulePage.jsx`, `ScheduleModal.jsx`, `WeeklyTimetable.jsx`, `MemberFilter.jsx`, `Web_ui/src/services/scheduleStorage.js` |
| 근거 | `FamilySchedulePage`는 `loadSchedules`, `saveSchedules`, `openNewSchedule`, `saveSchedule`, `deleteSchedule`, `applyTemplate`을 사용한다. `ScheduleModal.submit`은 필수 입력값 검증 후 `onSave`를 호출한다. |

## UC-014 앱 설정에서 자동화 가전/담당자/고정 일정을 변경한다

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 온보딩 이후 자동화 설정을 수정한다 |
| 유스케이스 ID | UC-014 |
| 사용자 | 가족 구성원, 관리자 |
| 선행 조건 | 사용자가 로그인했고 설정 패널을 열 수 있다. |
| 기본 흐름 | 1. 사용자가 캘린더 설정 버튼 또는 메뉴의 테마 설정 버튼을 누른다.<br>2. 시스템이 `DetailPanel`의 settings 패널을 표시한다.<br>3. 사용자가 자동화 가전 변경 메뉴를 선택한다.<br>4. 시스템이 세탁기, 건조기, 식기세척기, 로봇청소기, 공기청정기, 에어컨 목록을 표시하고 선택 상태를 토글한다.<br>5. 사용자가 가전별 담당자 변경 메뉴에서 각 가전의 담당자를 select로 지정한다.<br>6. 사용자가 고정 일정 변경 메뉴에서 고정 일정을 추가, 수정, 삭제한다.<br>7. 사용자가 저장 버튼을 누르면 `onOnboardingSetupChange`가 앱의 `onboardingSetup` 상태를 갱신한다. |
| 예외 | 자동화 가전을 하나도 선택하지 않으면 담당자 변경 화면에 선택된 자동화 가전이 없다는 안내를 표시한다. 고정 일정 저장 시 제목/요일/시간이 부족하면 저장하지 않는다. 설정은 앱 세션 저장 effect를 통해 localStorage에 저장되므로 저장소 접근이 실패하면 다음 세션 복원이 제한될 수 있다. |
| 우선 순위 | 중 |
| 관련 화면/컴포넌트 | `Web_ui/src/components/DetailPanel.jsx`, `Web_ui/src/components/detailPanel/SettingsPanelContent.jsx`, `Web_ui/src/App.jsx`의 `updateOnboardingSetup` |
| 근거 | `SettingsPanelContent`는 `automation`, `assignee`, `fixed` view로 분기하며 각 화면에 저장 버튼과 입력 컨트롤이 있다. |

## UC-015 PWA로 앱을 설치 가능한 형태로 제공한다

| 항목 | 내용 |
| --- | --- |
| 유스케이스 이름 | 모바일/데스크톱에서 설치 가능한 PWA 앱으로 접근한다 |
| 유스케이스 ID | UC-015 |
| 사용자 | 가족 구성원 |
| 선행 조건 | 브라우저가 PWA 설치를 지원하고 빌드된 앱이 HTTPS 또는 localhost에서 제공된다. |
| 기본 흐름 | 1. 사용자가 브라우저에서 L-lander 웹 앱에 접속한다.<br>2. 시스템이 `index.html`의 모바일 웹앱 메타 태그와 아이콘을 제공한다.<br>3. 빌드 시 `vite-plugin-pwa`가 manifest와 service worker 등록 자산을 생성한다.<br>4. 브라우저가 설치 가능 조건을 만족하면 설치 UI를 제공한다.<br>5. 사용자가 브라우저의 설치 버튼을 누르면 standalone 표시 모드로 앱을 실행할 수 있다. |
| 예외 | 코드에 앱 내부 설치 버튼이나 `beforeinstallprompt` 처리 흐름은 명확히 확인되지 않았다. 따라서 설치 프롬프트 표시와 설치 버튼은 브라우저 기본 동작에 의존하는 것으로 추정한다. 서비스 워커/manifest 생성은 빌드 환경에 따라 달라질 수 있다. |
| 우선 순위 | 하 |
| 관련 화면/컴포넌트 | `Web_ui/vite.config.js`의 `VitePWA`, `Web_ui/index.html`, `Web_ui/public/icons/icon-192.png`, `icon-512.png` |
| 근거 | `vite.config.js`에서 `VitePWA({ registerType: "autoUpdate", manifest: { name: "L-lander", display: "standalone", icons: ... }})`를 설정한다. `index.html`에는 `apple-mobile-web-app-capable`, `theme-color`, icon 링크가 있다. |

## 코드상 추정 또는 제한 사항

- 구글 캘린더 연동은 온보딩 단계 UI와 `importGoogleCalendar` 함수명은 있으나 실제 OAuth/API 호출은 확인되지 않아 “추정/제한”으로 본다.
- 홈 화면의 제품 추가, 더보기, 이벤트 알아보기, 즐겨찾기 편집, ThinQ PLAY 배너는 버튼 UI는 있으나 실제 동작 핸들러가 구현되지 않은 정적 UI로 확인된다.
- 디바이스 탭과 케어 탭은 `SimpleTabPage` 안내 화면만 있고 실제 기기 목록/케어 리포트 기능은 아직 준비 중으로 표시된다.
- PWA 설치는 manifest/service worker 설정은 있으나 앱 내부 설치 유도 버튼은 확인되지 않아 브라우저 기본 설치 흐름으로 추정한다.

## 분석한 주요 파일 목록

- `Web_ui/src/App.jsx`: 전체 화면 탭 분기, 로그인/세션, 온보딩, Firestore 일정 로딩, 알림, 미루기, 센서 팝업, AI Daily Report 생성 흐름 확인
- `Web_ui/src/main.jsx`: React 앱 진입점 확인
- `Web_ui/src/pages/LoginPage.jsx`: 로그인 입력 폼과 인증 실패 처리 확인
- `Web_ui/src/pages/CalendarPage.jsx`: 캘린더 월/주/일 보기, 날짜 선택, 개인/가사 캘린더 전환, 일정 추가/수정/삭제, Daily Report 상세 라우트 확인
- `Web_ui/src/pages/CrewPage.jsx`: 가족/크루 탭과 `FamilySchedulePage` 연결 확인
- `Web_ui/src/components/TaskComposer.jsx`: 전역 작업 추가 모달의 입력 폼과 수동 일정 생성 흐름 확인
- `Web_ui/src/components/TaskItem.jsx`: 일정 완료, 삭제, 담당자 변경, 미루기, 상세 열기 버튼 확인
- `Web_ui/src/components/DetailPanel.jsx`: 알림/설정/추천/작업 상세 패널과 작업 추가 버튼 확인
- `Web_ui/src/components/detailPanel/SettingsPanelContent.jsx`: 자동화 가전, 가전별 담당자, 고정 일정 설정 변경 흐름 확인
- `Web_ui/src/components/familySchedule/FamilySchedulePage.jsx`: 가족 주간 시간표, 로컬 일정 저장, 템플릿 적용 흐름 확인
- `Web_ui/src/components/familySchedule/ScheduleModal.jsx`: 가족 일정 등록/수정 폼과 필수값 검증 확인
- `Web_ui/src/components/familySchedule/WeeklyTimetable.jsx`: 주간 시간표 슬롯 클릭 및 일정 블록 클릭 UI 확인
- `Web_ui/src/components/familySchedule/MemberFilter.jsx`: 가족 일정 구성원 필터 확인
- `Web_ui/src/features/dailyReport/DailyReportCard.jsx`: AI 데일리 리포트 카드 진입 버튼 확인
- `Web_ui/src/features/dailyReport/DailyReportDetail.jsx`: 상세 리포트, To-do 추가/수정/완료, 이미지 기록 확인
- `Web_ui/src/features/dailyReport/dailyReportData.js`: 리포트 이미지 선택, 브리핑 데이터, 이미지 기록 생성 로직 확인
- `Web_ui/src/services/taskService.js`: Firestore 사용자별 일정 CRUD API 흐름 확인
- `Web_ui/src/services/dailyReportService.js`: `/api/daily-report` 호출과 fallback 처리 확인
- `Web_ui/src/services/taskPredictionService.js`: `/api/predict-task` 호출과 가전/모드 응답 검증 확인
- `Web_ui/src/services/weatherService.js`: 단기예보 API 호출, 날짜별 날씨 데이터 변환, sessionStorage 캐시 확인
- `Web_ui/src/services/midWeatherService.js`: 중기예보 API 호출과 캐시 확인
- `Web_ui/src/services/airQualityService.js`: 미세먼지 API 호출과 캐시 확인
- `Web_ui/src/services/weatherRecommendationService.js`: 날씨 기반 가전 추천 일정 생성 로직 확인
- `Web_ui/src/services/routinePredictionService.js`: ThinQ 사용 로그 기반 루틴 추천 로직 확인
- `Web_ui/src/services/sensorRealtimeService.js`: Firebase Realtime Database 센서 구독과 기기 명령 저장 확인
- `Web_ui/src/services/appliancePopupRuleService.js`: 센서 임계값 기반 에어컨/공기청정기/세탁기 팝업 생성 확인
- `Web_ui/src/services/scheduleStorage.js`: 가족 주간 일정 localStorage 저장/조회/삭제 확인
- `Web_ui/src/constants/users.js`: 사용자, 관리자, 로그인 사용자 목록과 권한 판단 확인
- `Web_ui/src/data.js`: 기본 일정/멤버/가전/날씨 샘플 데이터 확인
- `Web_ui/src/firebase.js`: Firestore, Realtime Database, Analytics 초기화 확인
- `Web_ui/vite.config.js`: Vite PWA 설정과 로컬 serverless API 라우팅 확인
- `Web_ui/index.html`: PWA/모바일 웹앱 메타 태그와 아이콘 리소스 확인
- `Web_ui/src/styles.css`, `Web_ui/src/styles/*.css`: 화면/탭/캘린더/데일리 리포트/온보딩/반응형 UI 구조 이해에 필요한 스타일 확인
- `Web_ui/public/icons/icon-192.png`, `Web_ui/public/icons/icon-512.png`: PWA 아이콘 리소스 확인
