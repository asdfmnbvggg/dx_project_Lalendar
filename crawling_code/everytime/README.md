# Everytime Crawler - VS Code 실행용

업로드된 Selenium + KoNLPy 크롤러 코드를 VS Code에서 실행하기 쉽게 정리한 버전입니다.

## 1. 폴더 열기

VS Code에서 이 폴더를 엽니다.

```bash
everytime_crawler_vscode
```

## 2. 가상환경 만들기

Windows PowerShell 기준:

```bash
python -m venv .venv
.venv\Scripts\activate
```

만약 PowerShell 실행 정책 오류가 나면 아래처럼 실행합니다.

```bash
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\activate
```

## 3. 패키지 설치

```bash
pip install -r requirements.txt
```

## 4. KoNLPy 실행 조건

KoNLPy의 Okt는 Java가 필요할 수 있습니다.

확인:

```bash
java -version
```

Java가 없다면 JDK를 설치해야 합니다.

## 5. 환경 변수 파일 만들기

`.env.example` 파일을 복사해서 `.env` 파일을 만듭니다.

```bash
copy .env.example .env
```

그다음 `.env` 안의 값을 수정합니다.

```env
EVERYTIME_ID=본인아이디
EVERYTIME_PASSWORD=본인비밀번호
BOARD_NUMBER=게시판번호
START_PAGE=1
END_PAGE=10
```

게시판 번호는 URL에서 확인합니다.

예를 들어 URL이 아래와 같다면:

```text
https://everytime.kr/123456/p/1
```

`BOARD_NUMBER=123456` 입니다.

## 6. 실행

```bash
python connect.py
```

## 7. 결과 파일

실행 후 `output` 폴더에 아래 파일이 생성됩니다.

```text
output/everytime_texts.csv
```

## 주의사항

- 본인이 접근 권한을 가진 게시판/데이터에 대해서만 사용하세요.
- 사이트 이용약관, 개인정보, 저작권 관련 규정을 확인하세요.
- 요청 간 대기 시간을 너무 짧게 설정하지 마세요.
