import csv
import re
import time
import random
from urllib.parse import quote, urlsplit, urlunsplit

from bs4 import BeautifulSoup

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


# =========================
# 1. 설정값
# =========================

KEYWORDS = [
    "집안일 귀찮",
    "집안일 불편",
    "집안일 싫",
    "집안일 반복",
    "집안일 퇴근",
    "밀린 집안일",
    "집안일 육아",
    "워킹맘 집안일",
    "살림 귀찮",
    "살림 불편",
    "살림 반복",
    "살림 루틴",
    "집안일 루틴",
    "집안일 시간",
    "빨래 쉰내",
    "비 빨래",
    "습기 건조",
    "식세기 문제",
    "정리정돈",
    "에어컨 청소",
]

OUTPUT_FILE = "brunch_housework_articles.csv"

MAX_ARTICLES_PER_KEYWORD = 30
SCROLL_COUNT_PER_KEYWORD = 8

REQUEST_DELAY_MIN = 1.0
REQUEST_DELAY_MAX = 2.5


# =========================
# 2. 공통 유틸
# =========================

def log(message):
    print(f"[LOG] {message}")


def polite_sleep(a=REQUEST_DELAY_MIN, b=REQUEST_DELAY_MAX):
    time.sleep(random.uniform(a, b))


def clean_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def make_driver():
    options = Options()
    options.add_argument("--start-maximized")
    options.add_argument("--lang=ko-KR")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )

    # 테스트 끝난 뒤 필요하면 주석 해제
    # options.add_argument("--headless=new")

    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(2)
    return driver


# =========================
# 3. 검색 URL 생성
# =========================

def build_search_url(keyword: str) -> str:
    encoded = quote(keyword)
    return f"https://brunch.co.kr/search?q={encoded}&type=article"


def is_brunch_article_url(url: str) -> bool:
    return bool(re.search(r"brunch\.co\.kr/@[^/]+/\d+", url))


# =========================
# 4. 검색 결과에서 글 URL 수집
# =========================

def collect_article_urls(driver, keyword: str, max_articles: int = 30):
    search_url = build_search_url(keyword)

    log(f"검색 시작: {keyword}")
    log(f"검색 URL: {search_url}")

    driver.get(search_url)

    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )

    polite_sleep(1.5, 2.5)

    article_urls = []
    seen = set()
    no_new_count = 0

    for scroll_idx in range(SCROLL_COUNT_PER_KEYWORD):
        prev_url_count = len(article_urls)
        prev_link_count = len(driver.find_elements(By.CSS_SELECTOR, "a[href]"))

        links = driver.find_elements(By.CSS_SELECTOR, "a[href]")

        for link in links:
            try:
                href = link.get_attribute("href")

                if not href:
                    continue

                href = clean_url(href)

                if not is_brunch_article_url(href):
                    continue

                if href in seen:
                    continue

                seen.add(href)
                article_urls.append(href)

                if len(article_urls) >= max_articles:
                    break

            except Exception:
                continue

        log(
            f"스크롤 {scroll_idx + 1}/{SCROLL_COUNT_PER_KEYWORD} "
            f"/ 현재 글 URL 수: {len(article_urls)}"
        )

        if len(article_urls) >= max_articles:
            break

        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.END)

        try:
            WebDriverWait(driver, 5).until(
                lambda d: len(d.find_elements(By.CSS_SELECTOR, "a[href]")) > prev_link_count
            )
        except Exception:
            pass

        polite_sleep(1.0, 2.0)

        if len(article_urls) == prev_url_count:
            no_new_count += 1
            log(f"새 URL 없음: {no_new_count}회")
        else:
            no_new_count = 0

        if no_new_count >= 2:
            log("새 URL이 더 이상 없어 스크롤 중단")
            break

    log(f"'{keyword}' URL 수집 완료: {len(article_urls)}개")
    return article_urls


# =========================
# 5. 본문 파싱
# =========================

def extract_date_from_text(text: str) -> str:
    patterns = [
        r"\b[A-Z][a-z]{2}\s+\d{1,2}\.\s+\d{4}\b",
        r"\b[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\b",
        r"\d{4}\.\s*\d{1,2}\.\s*\d{1,2}",
        r"\d{4}-\d{1,2}-\d{1,2}",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0)

    return ""


def parse_article_html(html: str, url: str):
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    title = ""

    title_selectors = [
        "h1",
        "meta[property='og:title']",
        "meta[name='title']",
    ]

    for selector in title_selectors:
        el = soup.select_one(selector)

        if not el:
            continue

        if el.name == "meta":
            title = el.get("content", "").strip()
        else:
            title = el.get_text(" ", strip=True)

        if title:
            break

    author = ""

    author_meta = soup.select_one("meta[name='author']")
    if author_meta:
        author = author_meta.get("content", "").strip()

    full_text = soup.get_text("\n", strip=True)

    if not author:
        author_match = re.search(r"\bby\s*([^\n]+)", full_text)
        if author_match:
            author = author_match.group(1).strip()

    published_at = extract_date_from_text(full_text)

    body_candidates = [
        "article",
        ".wrap_article",
        ".wrap_body",
        ".wrap_item_cont",
        ".article_view",
        ".viewer",
        "body",
    ]

    body_text = ""

    for selector in body_candidates:
        el = soup.select_one(selector)

        if not el:
            continue

        candidate_text = el.get_text("\n", strip=True)

        if len(candidate_text) > len(body_text):
            body_text = candidate_text

    body_text = re.sub(r"\n{3,}", "\n\n", body_text)
    body_text = re.sub(r"[ \t]{2,}", " ", body_text)

    return {
        "url": url,
        "title": title,
        "author": author,
        "published_at": published_at,
        "body": body_text,
    }


def fetch_article_selenium(driver, url: str):
    log(f"본문 페이지 접속: {url}")

    driver.get(url)

    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )

    polite_sleep(1.2, 2.0)

    html = driver.page_source
    return parse_article_html(html, url)


# =========================
# 6. 불편사항 분류
# =========================

PAIN_PATTERNS = {
    "귀찮음/회피": [
        "귀찮",
        "하기 싫",
        "싫다",
        "미루",
        "회피",
    ],
    "반복/끝없음": [
        "반복",
        "끝이 없",
        "계속",
        "매일",
        "또 해야",
    ],
    "시간 부족": [
        "시간",
        "퇴근",
        "주말",
        "바쁘",
        "틈이 없",
        "오래",
    ],
    "육아 병행": [
        "육아",
        "아이",
        "애기",
        "워킹맘",
        "엄마",
    ],
    "분담/불공평": [
        "분담",
        "남편",
        "아내",
        "독박",
        "불공평",
        "당연하게",
    ],
    "빨래/건조 문제": [
        "빨래",
        "쉰내",
        "건조",
        "습기",
        "비 오는 날",
    ],
    "청소/정리 문제": [
        "청소",
        "정리",
        "어지럽",
        "먼지",
        "머리카락",
    ],
    "가전/비용 문제": [
        "식세기",
        "에어컨",
        "전기세",
        "고장",
        "비용",
    ],
}


def classify_pain_points(text: str):
    matched = []

    for category, keywords in PAIN_PATTERNS.items():
        for keyword in keywords:
            if keyword in text:
                matched.append(category)
                break

    return ", ".join(matched)


def make_excerpt(text: str, max_len: int = 300):
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_len]


# =========================
# 7. CSV 저장
# =========================

def save_to_csv(rows, filename, append=False):
    fieldnames = [
        "search_keyword",
        "title",
        "author",
        "published_at",
        "url",
        "pain_point_category",
        "excerpt",
        "body",
    ]

    mode = "a" if append else "w"

    with open(filename, mode, newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)

        if not append:
            writer.writeheader()

        writer.writerows(rows)


# =========================
# 8. 메인 실행
# =========================

def main():
    driver = make_driver()

    seen_urls = set()
    first_save = True
    total_count = 0

    try:
        log("브런치 크롤링 시작")

        for keyword_idx, keyword in enumerate(KEYWORDS, start=1):
            log("====================================")
            log(f"[{keyword_idx}/{len(KEYWORDS)}] 키워드 시작: {keyword}")

            keyword_rows = []

            try:
                article_urls = collect_article_urls(
                    driver,
                    keyword=keyword,
                    max_articles=MAX_ARTICLES_PER_KEYWORD,
                )

            except Exception as e:
                log(f"키워드 검색 실패: {keyword} / 이유: {e}")
                continue

            for article_idx, url in enumerate(article_urls, start=1):
                if url in seen_urls:
                    log(f"중복 URL 스킵: {url}")
                    continue

                seen_urls.add(url)

                try:
                    log(f"[{keyword}] 글 수집 {article_idx}/{len(article_urls)}")

                    article = fetch_article_selenium(driver, url)
                    body = article["body"]

                    if not body or len(body) < 50:
                        log(f"본문이 너무 짧아 스킵: {url}")
                        continue

                    row = {
                        "search_keyword": keyword,
                        "title": article["title"],
                        "author": article["author"],
                        "published_at": article["published_at"],
                        "url": article["url"],
                        "pain_point_category": classify_pain_points(body),
                        "excerpt": make_excerpt(body),
                        "body": body,
                    }

                    keyword_rows.append(row)
                    polite_sleep()

                except Exception as e:
                    log(f"글 수집 실패: {url} / 이유: {e}")
                    polite_sleep(2.0, 4.0)

            # 키워드 하나 끝날 때마다 저장
            if keyword_rows:
                save_to_csv(
                    keyword_rows,
                    OUTPUT_FILE,
                    append=not first_save,
                )

                first_save = False
                total_count += len(keyword_rows)

                log(f"키워드 저장 완료: {keyword} / {len(keyword_rows)}개")
                log(f"현재 누적 저장 글 수: {total_count}")

            else:
                log(f"저장할 글 없음: {keyword}")

            polite_sleep(2.0, 4.0)

        log("====================================")
        log(f"전체 완료: 총 {total_count}개 글 저장")
        log(f"저장 파일: {OUTPUT_FILE}")

    finally:
        try:
            driver.quit()
        except Exception:
            pass

        log("브라우저 종료")


if __name__ == "__main__":
    main()