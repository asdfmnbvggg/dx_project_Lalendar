
import csv
import os
import time
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options


# =========================
# 1. 환경 변수 로드
# =========================
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

EVERYTIME_ID = os.getenv("EVERYTIME_ID", "").strip()
EVERYTIME_PASSWORD = os.getenv("EVERYTIME_PASSWORD", "").strip()
BOARD_NUMBER = os.getenv("BOARD_NUMBER", "").strip()
KEY_WORD = os.getenv("KEY_WORD", "").strip()
KEY_WORDS = [keyword.strip() for keyword in KEY_WORD.split(",") if keyword.strip()]

START_PAGE = int(os.getenv("START_PAGE", "1"))
END_PAGE = int(os.getenv("END_PAGE", "10"))

PAGE_DELAY = float(os.getenv("PAGE_DELAY", "1.5"))
POST_DELAY = float(os.getenv("POST_DELAY", "0.7"))

HEADLESS = os.getenv("HEADLESS", "false").lower() == "true"

OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

RESULT_FILE = OUTPUT_DIR / "everytime_texts.csv"


# =========================
# 2. Selenium 설정
# =========================
def create_driver() -> webdriver.Chrome:
    chrome_options = Options()

    if HEADLESS:
        chrome_options.add_argument("--headless=new")

    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")

    # Selenium 4.6+는 Selenium Manager가 ChromeDriver를 자동 관리합니다.
    driver = webdriver.Chrome(options=chrome_options)
    driver.implicitly_wait(5)
    return driver


def login(driver: webdriver.Chrome) -> None:
    driver.get("https://everytime.kr/login")
    print("브라우저에서 에브리타임 로그인을 직접 완료하세요.")
    input("로그인이 끝나면 이 터미널에서 Enter를 누르세요: ")


def collect_post_links(driver: webdriver.Chrome, keyword: str, page: int) -> List[str]:
    if not BOARD_NUMBER:
        raise ValueError(".env 파일에 BOARD_NUMBER를 입력하세요.")

    url = f"https://everytime.kr/{BOARD_NUMBER}/all/{keyword}/p/{page}"
    driver.get(url)
    time.sleep(PAGE_DELAY)

    posts = driver.find_elements(By.CSS_SELECTOR, "article > a.article")
    links = []

    for post in posts:
        href = post.get_attribute("href")
        if href:
            links.append(href)

    return links


def collect_texts_from_post(driver: webdriver.Chrome, link: str) -> List[str]:
    driver.get(link)
    time.sleep(POST_DELAY)

    # 기존 코드 기준: 게시글/댓글 텍스트가 p.large에 들어있다고 가정
    comments = driver.find_elements(By.CSS_SELECTOR, "p.large")
    return [comment.text.strip() for comment in comments if comment.text.strip()]


def save_collected_texts(rows: List[Dict[str, object]], writer: csv.DictWriter) -> None:
    for row in rows:
        text = str(row["text"])
        print(text)
        writer.writerow(row)


def main() -> None:
    if not KEY_WORDS:
        raise ValueError(".env 파일에 KEY_WORD를 입력하세요. 여러 개는 쉼표로 구분합니다.")

    driver = create_driver()

    try:
        login(driver)

        fieldnames = ["keyword", "page", "post_index", "url", "text_index", "text"]

        with RESULT_FILE.open("w", newline="", encoding="utf-8-sig") as file:
            writer = csv.DictWriter(file, fieldnames=fieldnames)
            writer.writeheader()

            for keyword_index, keyword in enumerate(KEY_WORDS, start=1):
                print(f"\n===== Keyword {keyword_index}/{len(KEY_WORDS)}: {keyword} =====")

                for page in range(START_PAGE, END_PAGE + 1):
                    print(f"\n===== Page {page} =====")

                    links = collect_post_links(driver, keyword, page)
                    print(f"수집한 게시글 링크 수: {len(links)}")

                    page_rows = []
                    for idx, link in enumerate(links, start=1):
                        print(f"[{idx}/{len(links)}] {link}")
                        try:
                            texts = collect_texts_from_post(driver, link)

                            for text_idx, text in enumerate(texts, start=1):
                                page_rows.append(
                                    {
                                        "keyword": keyword,
                                        "page": page,
                                        "post_index": idx,
                                        "url": link,
                                        "text_index": text_idx,
                                        "text": text,
                                    }
                                )
                        except Exception as e:
                            print(f"게시글 수집 실패: {link} / {e}")

                    save_collected_texts(page_rows, writer)

        print("\n완료")
        print(f"- {RESULT_FILE}")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()
