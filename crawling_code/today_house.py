import csv
import re
import time
import random
from urllib.parse import urlsplit, urlunsplit
 
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
 
 
CATEGORY_URL = "https://ohou.se/store/category?category_id=14000000&order=popular&affect_type=StoreHomeCategory&affect_id=1%22
OUTPUT_FILE = "ohou_selenium_reviews.csv"
FAILED_FILE = "failed_goods_ids.txt"
 
# 목표
TARGET_REVIEW_COUNT = 100000
 
# 링크 수집
MAX_PRODUCTS_TO_COLLECT = 2000
LIST_SCROLL_COUNT = 120
 
# 리뷰 수집
MAX_REVIEW_PAGES_PER_PRODUCT = 300   # 상품당 최대 리뷰 페이지 수
RESTART_DRIVER_EVERY = 80            # 상품 80개마다 브라우저 재시작
 
 
def log(msg):
    print(f"[LOG] {msg}")
 
 
def human_sleep(a=0.7, b=1.6):
    time.sleep(random.uniform(a, b))
 
 
def clean_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))
 
 
def extract_goods_id(url: str):
    m = re.search(r"/goods/(\d+)", url)
    return m.group(1) if m else ""
 
 
def make_driver():
    options = Options()
    options.add_argument("--start-maximized")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--lang=ko-KR")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
    )
    # options.add_argument("--headless=new")
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(2)
    return driver
 
 
def scroll_down(driver, n=1, delay=1.2):
    for i in range(n):
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.END)
        time.sleep(delay)
        if (i + 1) % 10 == 0 or i == n - 1:
            log(f"목록 스크롤 {i+1}/{n}")
 
 
def collect_product_urls(driver, max_products=2000):
    log("1단계: 카테고리 페이지 접속")
    driver.get(CATEGORY_URL)
    WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )
    time.sleep(2)
 
    log("2단계: 상품 href 대량 수집 시작")
    urls = []
    seen = set()
 
    for batch in range(LIST_SCROLL_COUNT):
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.END)
        time.sleep(1.0)
 
        links = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/goods/"]')
 
        for link in links:
            try:
                href = link.get_attribute("href")
                if not href:
                    continue
 
                href = clean_url(href)
                goods_id = extract_goods_id(href)
                if not goods_id:
                    continue
 
                y = driver.execute_script(
                    "const r = arguments[0].getBoundingClientRect(); return r.top + window.scrollY;",
                    link
                )
                if y < 1800:
                    continue
 
                if href not in seen:
                    seen.add(href)
                    urls.append(href)
 
                if len(urls) >= max_products:
                    break
 
            except Exception:
                continue
 
        if (batch + 1) % 10 == 0 or batch == LIST_SCROLL_COUNT - 1:
            log(f"현재까지 수집된 상품 링크 수: {len(urls)}")
 
        if len(urls) >= max_products:
            break
 
    log(f"상품 href 수집 완료: {len(urls)}개")
    return urls
 
 
def click_review_tab(driver):
    """
    리뷰 탭만 클릭
    """
    xpaths = [
        "//a[starts-with(normalize-space(.), '리뷰')]",
        "//button[starts-with(normalize-space(.), '리뷰')]",
        "//*[self::a or self::button or self::div or self::span][starts-with(normalize-space(.), '리뷰')]",
    ]
 
    for xp in xpaths:
        elems = driver.find_elements(By.XPATH, xp)
        for el in elems:
            try:
                txt = el.text.strip()
                if not txt.startswith("리뷰"):
                    continue
 
                driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                time.sleep(0.4)
                driver.execute_script("arguments[0].click();", el)
                time.sleep(1.5)
                log(f"리뷰 탭 클릭 성공 -> {txt}")
                return True
            except Exception:
                continue
 
    log("리뷰 탭 클릭 실패")
    return False
 
 
def parse_reviews_from_html(html):
    """
    리뷰 1개 단위:
    article[data-object-type='PRODUCTION_REVIEW']
    날짜:
    span.css-dx44qu
    본문:
    p.css-v9zk7s
    """
    soup = BeautifulSoup(html, "html.parser")
    review_articles = soup.select("article[data-object-type='PRODUCTION_REVIEW']")
 
    rows = []
    for article in review_articles:
        date_el = article.select_one("span.css-dx44qu")
        text_el = article.select_one("p.css-v9zk7s")
 
        created_at = date_el.get_text(" ", strip=True) if date_el else ""
        comment = text_el.get_text("\n", strip=True) if text_el else ""
 
        if comment:
            rows.append({
                "created_at": created_at,
                "comment": comment
            })
 
    return rows
 
 
def go_to_next_review_page(driver, current_page_num=None):
    """
    리뷰 하단 페이지네이션에서 다음 숫자 버튼이나 오른쪽 화살표 클릭
    """
    try:
        page_buttons = driver.find_elements(By.CSS_SELECTOR, "button.css-ogbb2t")
        visible_buttons = [b for b in page_buttons if b.is_displayed() and b.is_enabled()]
 
        if visible_buttons:
            candidate = None
            candidate_num = None
 
            for btn in visible_buttons:
                txt = btn.text.strip()
                if txt.isdigit():
                    num = int(txt)
                    if current_page_num is None or num > current_page_num:
                        if candidate_num is None or num < candidate_num:
                            candidate = btn
                            candidate_num = num
 
            if candidate:
                driver.execute_script("arguments[0].scrollIntoView({block:'center'});", candidate)
                time.sleep(0.4)
                driver.execute_script("arguments[0].click();", candidate)
                time.sleep(1.8)
                return candidate_num
    except Exception:
        pass
 
    try:
        arrow_buttons = driver.find_elements(By.CSS_SELECTOR, "button.css-9rtra2")
        for btn in arrow_buttons:
            if btn.is_displayed() and btn.is_enabled():
                driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
                time.sleep(0.4)
                driver.execute_script("arguments[0].click();", btn)
                time.sleep(1.8)
                return (current_page_num + 1) if current_page_num else None
    except Exception:
        pass
 
    return None
 
 
def crawl_reviews_from_product(driver, product_url, max_review_pages=300):
    goods_id = extract_goods_id(product_url)
    log(f"상품 진입: goods_id={goods_id}")
 
    driver.get(product_url)
    WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )
    human_sleep(2.0, 3.5)
 
    review_clicked = click_review_tab(driver)
    if not review_clicked:
        return []
 
    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "article[data-object-type='PRODUCTION_REVIEW']"))
        )
    except TimeoutException:
        log(f"goods_id={goods_id} / 리뷰 article 로딩 실패")
        return []
 
    all_rows = []
    seen = set()
    current_page_num = 1
 
    for page_idx in range(1, max_review_pages + 1):
        rows = parse_reviews_from_html(driver.page_source)
 
        new_count = 0
        for row in rows:
            key = (row["created_at"], row["comment"])
            if key not in seen:
                seen.add(key)
                all_rows.append(row)
                new_count += 1
 
        log(f"goods_id={goods_id} / 리뷰페이지 {page_idx} / 신규 {new_count}개 / 누적 {len(all_rows)}개")
 
        if new_count == 0 and page_idx > 1:
            break
 
        next_page = go_to_next_review_page(driver, current_page_num=current_page_num)
        if next_page is None:
            break
 
        current_page_num = next_page
        human_sleep(0.8, 1.6)
 
    return all_rows
 
 
def save_rows(rows, filename, append=False):
    fieldnames = ["created_at", "comment"]
    mode = "a" if append else "w"
 
    with open(filename, mode, newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not append:
            writer.writeheader()
        writer.writerows(rows)
 
 
def main():
    driver = make_driver()
    total_rows = 0
    first_save = True
    failed_goods = []
 
    try:
        log("크롤링 시작")
 
        # 1) 상품 링크 대량 수집
        product_urls = collect_product_urls(driver, max_products=MAX_PRODUCTS_TO_COLLECT)
        goods_ids = [extract_goods_id(url) for url in product_urls if extract_goods_id(url)]
        log(f"수집된 goods_id 수: {len(goods_ids)}")
 
        # 2) 상품별 리뷰 수집
        for idx, product_url in enumerate(product_urls, start=1):
            goods_id = extract_goods_id(product_url)
 
            if total_rows >= TARGET_REVIEW_COUNT:
                log(f"목표 리뷰 수 {TARGET_REVIEW_COUNT}건 도달 -> 수집 중단")
                break
 
            log("====================================")
            log(f"[{idx}/{len(product_urls)}] goods_id={goods_id} 처리 시작")
 
            # 브라우저 주기적 재시작
            if idx % RESTART_DRIVER_EVERY == 0:
                try:
                    driver.quit()
                except Exception:
                    pass
                log("브라우저 재시작")
                driver = make_driver()
 
            try:
                rows = crawl_reviews_from_product(
                    driver,
                    product_url=product_url,
                    max_review_pages=MAX_REVIEW_PAGES_PER_PRODUCT
                )
 
                # 상품 1개 끝날 때마다 바로 저장
                if rows:
                    save_rows(rows, OUTPUT_FILE, append=not first_save)
                    first_save = False
                    log(f"[{idx}/{len(product_urls)}] 상품 단위 저장 완료: {len(rows)}건")
 
                total_rows += len(rows)
                log(f"[{idx}/{len(product_urls)}] 현재 누적 리뷰 수: {total_rows}")
 
            except Exception as e:
                log(f"[{idx}/{len(product_urls)}] 실패: {e}")
                failed_goods.append(goods_id)
 
            human_sleep(1.0, 2.2)
 
        if failed_goods:
            with open(FAILED_FILE, "w", encoding="utf-8") as f:
                for gid in failed_goods:
                    f.write(str(gid) + "\n")
            log(f"실패 goods_id 저장 완료: {len(failed_goods)}개")
 
        log(f"전체 완료 / 총 리뷰 수: {total_rows}")
 
    finally:
        try:
            driver.quit()
        except Exception:
            pass
        log("브라우저 종료")
 
 
if __name__ == "__main__":
    main()