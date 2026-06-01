# 필요한 라이브러리 가져오기
from selenium import webdriver as wb
from selenium.webdriver.common.by import By # 선택자 사용을 위한 도구

def img_crawling(data) : 
    # 1. 브라우저 열어주기
    driver = wb.Chrome()
    # 2. url 경로 이동하기
    driver.get(f"https://search.naver.com/search.naver?ssc=tab.image.all&where=image&sm=tab_jum&query={data}")
    # 3. 잠시 기다리기
    driver.implicitly_wait(5)
    # 4. 가져올 태그 선택하기(CSS 선택자 기준으로 태그 가져오기)
    img = driver.find_element(By.CSS_SELECTOR, "#main_pack > section > div.api_subject_bx._fe_image_tab_grid_root.ani_fadein > div > div > div.image_tile._fe_image_tab_grid > div:nth-child(1) > div > div > div > img")
    # 5. 이미지 경로만 가져오기
    src = img.get_attribute("src")
    driver.quit()
    # 6. 반환하기
    return src









