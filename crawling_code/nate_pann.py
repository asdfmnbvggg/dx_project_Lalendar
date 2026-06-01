"""
네이트판 집안일/가사/청소 크롤러 v3
- 2단계 전략:
  1단계) 목록 페이지만 빠르게 훑어서 링크 수집 (메인 드라이버 1개)
  2단계) ThreadPoolExecutor로 본문 병렬 수집 (드라이버 N개 동시)
- 페이지 100개 제한
- 본문 100자 미만 제외 (임베딩 품질)
- 중간 저장 (키워드마다 CSV 갱신)
"""

 

import subprocess, sys
REQUIRED = ["pandas", "selenium", "beautifulsoup4"]
for pkg in REQUIRED:
    try:
        __import__(pkg if pkg != "beautifulsoup4" else "bs4")
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

 

import time, re, os
import pandas as pd
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

 

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from bs4 import BeautifulSoup

 

# ═══════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════
KEYWORDS = [
    "빨래 쉰내",    "집안일 쉽게",  "워킹맘",
    "비 빨래",      "집안일 루틴",  "집안일 몰아",
    "습기 건조",    "집안일 교체",  "집안일 육아",
    "집안일 귀찮",  "청소 루틴",    "집안일 퇴근",
    "집안일 초보",  "빨래 루틴",    "정리정돈",
    "식세기 문제",  "초보 주부",    "대청소",
    "청소 방법",    "초보맘",       "청소 주기",
    "집안일 소질",  "집안일 최소",  "집안일 주기",
    "집안일 못",    "집안일 불편",  "빨래 주기",
    "집안일 싫",    "밀린 집안일",  "집안일 시간",
    "집안일 반복",  "살림 쉽게",    "집안일 습관",
    "집안일 꿀팁",  "살림 루틴",    "집안일 오래",
    "살림 귀찮",    "살림 교체",    "살림 육아",
    "살림 초보",    "살림 최소",    "살림 퇴근",
    "살림 소질",    "살림 불편",    "살림 습관",
    "살림 못",      "밀린 살림",    "살림 반복",
    "전기세",       "살림 꿀팁",    "에어컨 청소",
]

 

BLACKLIST = [
    "자살", "이혼", "외도", "바람피", "불륜", "사망", "죽음", "유서",
    "폭행", "성폭", "강간", "범죄", "마약", "도박", "사기",
]
HOUSEWORK_KEYWORDS = [
    "집안일", "살림", "청소", "빨래", "설거지", "식세기", "건조기",
    "세탁기", "욕실", "화장실", "주방", "부엌", "청결", "가사",
]
AD_RE = [re.compile(p, re.IGNORECASE) for p in [
    r"협찬", r"체험단", r"서포터즈", r"유료\s*광고", r"\bPR\b",
    r"https?://(?!pann\.nate\.com)", r"bit\.ly", r"스마트스토어", r"공동구매",
]]

 

BASE_URL        = "https://pann.nate.com/search/talk"
MAX_PAGES       = 9999      # 페이지 제한 없음 (글 없으면 자동 종료)
PARALLEL_WORKERS = 8        # 병렬 본문 수집 드라이버 수
MIN_BODY_LEN    = 100       # 임베딩용 최소 본문 길이
LIST_DELAY      = 1.0       # 목록 페이지 딜레이
PAGE_LOAD_TIMEOUT = 30
WAIT_TIMEOUT    = 8
OUTPUT_PATH     = "nate_pann_results_v3.csv"

 

# ═══════════════════════════════════════════════════════════
# 필터
# ═══════════════════════════════════════════════════════════
def is_blacklisted(title):
    if not any(w in title for w in BLACKLIST):
        return False
    return not any(w in title for w in HOUSEWORK_KEYWORDS)

 

def is_ad(text):
    return any(p.search(text) for p in AD_RE)

 

# ═══════════════════════════════════════════════════════════
# 드라이버 생성
# ═══════════════════════════════════════════════════════════
def make_driver(headless=False):
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    opts.add_argument("--lang=ko-KR")
    opts.add_argument("--window-size=1280,800")
    opts.page_load_strategy = "eager"
    d = webdriver.Chrome(options=opts)
    d.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
    d.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"}
    )
    return d

 

# ═══════════════════════════════════════════════════════════
# 1단계: 목록 페이지에서 링크 수집
# ═══════════════════════════════════════════════════════════
def collect_links(driver, keyword, seen_links):
    """목록만 빠르게 훑어서 (title, link, meta) 튜플 리스트 반환"""
    encoded = quote(keyword)
    collected = []
    dup_count = 0

 

    for page in range(1, MAX_PAGES + 1):
        url = f"{BASE_URL}?q={encoded}&page={page}"
        try:
            driver.get(url)
            WebDriverWait(driver, WAIT_TIMEOUT).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.srcharea, ul, li"))
            )
        except Exception:
            pass
        time.sleep(LIST_DELAY)

 

        soup = BeautifulSoup(driver.page_source, "html.parser")

 

        # 셀렉터: 실제 확인된 구조 우선
        posts = (
            soup.select("div.srch_list.section ul li")
            or soup.select("div.srcharea ul li")
            or soup.select("#container div.srcharea div ul li")
            or soup.select("ul.search_result_list li")
            or soup.select("ul.clist_t li")
            or soup.select(".list_wrap li")
        )
        # 탭 메뉴 li 제외
        posts = [p for p in posts if p.select_one("div.tit h2 a") or p.select_one("a[href*='/talk/']")]

 

        if not posts:
            print(f"    [종료] '{keyword}' p{page}: 글 없음")
            break

 

        page_new = 0
        for post in posts:
            title_tag = (
                post.select_one("div.tit h2 a")
                or post.select_one("h2 a")
                or post.select_one("a.subject")
                or post.select_one("a[href*='/talk/']")
            )
            if not title_tag:
                continue

 

            title = title_tag.get_text(strip=True)
            href  = title_tag.get("href", "")
            link  = f"https://pann.nate.com{href}" if href.startswith("/") else href

 

            if not title or len(title) < 3 or not link or "pann.nate.com" not in link:
                continue
            if link in seen_links:
                dup_count += 1
                continue
            if is_blacklisted(title):
                continue

 

            # 메타 정보 추출
            date_tag    = post.select_one(".date, .time, time, .regdate")
            like_tag    = post.select_one(".num_like, .like_count, .sympathy, .like")
            comment_tag = post.select_one(".num_cmt, .comment_count, .comment, .cmt")
            author_tag  = post.select_one(".writer, .nick, .author, .name")

 

            seen_links.add(link)
            collected.append({
                "keyword" : keyword,
                "title"   : title,
                "link"    : link,
                "author"  : author_tag.get_text(strip=True)  if author_tag  else "",
                "date"    : date_tag.get_text(strip=True)    if date_tag    else "",
                "likes"   : re.sub(r"[^0-9]", "", like_tag.get_text()    if like_tag    else ""),
                "comments": re.sub(r"[^0-9]", "", comment_tag.get_text() if comment_tag else ""),
            })
            page_new += 1

 

        print(f"    p{page:03d} | 신규 {page_new:3d}건 | 누적 {len(collected):,}건 | 중복 {dup_count}건")

 

    return collected

 

# ═══════════════════════════════════════════════════════════
# 2단계: 본문 병렬 수집
# ═══════════════════════════════════════════════════════════
def fetch_body(item):
    """단일 글 본문 수집 (각 스레드가 자체 드라이버 사용)"""
    driver = make_driver(headless=True)
    try:
        driver.get(item["link"])
        try:
            WebDriverWait(driver, WAIT_TIMEOUT).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.posting"))
            )
        except Exception:
            pass
        time.sleep(0.5)

 

        soup = BeautifulSoup(driver.page_source, "html.parser")
        body_tag = (
            soup.select_one("div.posting")
            or soup.select_one("div.view-wrap")
            or soup.select_one("div.viewarea")
            or soup.select_one("article")
        )
        if body_tag:
            for t in body_tag.select("script,style,.ad,.btn_area,iframe"):
                t.decompose()
            body = body_tag.get_text(separator="\n", strip=True)
            item["body"] = body
        else:
            item["body"] = ""
    except Exception as e:
        item["body"] = ""
    finally:
        driver.quit()
    return item

 

def collect_bodies_parallel(items, workers=PARALLEL_WORKERS):
    """ThreadPoolExecutor로 본문 병렬 수집"""
    results = []
    total = len(items)
    done  = 0
    print_lock = Lock()

 

    with ThreadPoolExecutor(max_workers=workers) as exe:
        futures = {exe.submit(fetch_body, item): item for item in items}
        for future in as_completed(futures):
            done += 1
            result = future.result()
            body_len = len(result.get("body", ""))

 

            with print_lock:
                print(f"  [{done:,}/{total:,}] {result['title'][:35]}... | 본문 {body_len}자")

 

            # 본문 너무 짧으면 제외 (임베딩 품질)
            if body_len < MIN_BODY_LEN:
                continue
            # 광고 체크
            if is_ad(result.get("body", "")):
                continue

 

            results.append(result)

 

    return results

 

# ═══════════════════════════════════════════════════════════
# 중간 저장
# ═══════════════════════════════════════════════════════════
def save_csv(all_results):
    df = pd.DataFrame(all_results)
    df.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")
    return df

 

# ═══════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════
def main():
    print(f"\n{'═'*60}")
    print(f"  네이트판 크롤러 v3 — 병렬 본문 수집")
    print(f"  키워드 {len(KEYWORDS)}개 | 페이지 최대 {MAX_PAGES}p | 병렬 {PARALLEL_WORKERS}개")
    print(f"  최소 본문 길이: {MIN_BODY_LEN}자 (임베딩 품질 보장)")
    print(f"{'═'*60}\n")

 

    seen_links  = set()
    all_results = []

 

    # ── 1단계: 목록 수집 (드라이버 1개, 빠르게)
    print("[ 1단계 ] 목록 링크 수집 시작\n")
    list_driver = make_driver(headless=False)  # 목록은 눈에 보이게
    all_items   = []

 

    try:
        for idx, kw in enumerate(KEYWORDS, 1):
            print(f"\n[{idx:02d}/{len(KEYWORDS)}] 키워드: '{kw}'")
            items = collect_links(list_driver, kw, seen_links)
            all_items.extend(items)
            print(f"  → '{kw}' 수집: {len(items):,}건 | 전체 링크: {len(all_items):,}건")
    finally:
        list_driver.quit()
        print(f"\n1단계 완료 — 총 링크 {len(all_items):,}건\n")

 

    if not all_items:
        print("수집된 링크가 없습니다.")
        return

 

    # ── 2단계: 본문 병렬 수집
    print(f"[ 2단계 ] 본문 병렬 수집 시작 ({PARALLEL_WORKERS}개 동시)\n")
    print(f"  예상 시간: 약 {len(all_items) * 2 / PARALLEL_WORKERS / 60:.0f}분\n")

 

    all_results = collect_bodies_parallel(all_items, workers=PARALLEL_WORKERS)

 

    # ── 저장
    df = save_csv(all_results)
    filled = df["body"].apply(lambda x: bool(str(x).strip())).sum()

 

    print(f"\n{'═'*60}")
    print(f"  ✅ 저장 완료 → {OUTPUT_PATH}")
    print(f"  - 링크 수집:  {len(all_items):,}건")
    print(f"  - 본문 통과:  {len(all_results):,}건 ({len(all_results)/len(all_items)*100:.1f}%)")
    print(f"  - 본문 수집률: {filled}/{len(df)} ({filled/max(len(df),1)*100:.1f}%)")
    print(f"{'═'*60}\n")

 

    print("[ 미리보기 (상위 3개) ]")
    for _, row in df.head(3).iterrows():
        print(f"\n키워드: {row['keyword']}")
        print(f"제목  : {row['title']}")
        print(f"본문  : {str(row['body'])[:150]}...")

 

    return df

 

if __name__ == "__main__":
    main()
