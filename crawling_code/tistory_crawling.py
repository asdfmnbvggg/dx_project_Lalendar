import requests
from bs4 import BeautifulSoup

# 시작할 포스팅 번호 (653)부터 끝 번호 (1)까지 반복
for post_number in range(653, 0, -1):
    # 크롤링할 티스토리 포스팅 URL
    url = f'https://rldd.tistory.com/{post_number}'
    
    # 웹페이지 요청
    response = requests.get(url)
    
    # 요청이 성공했는지 확인
    if response.status_code == 200:
        # BeautifulSoup을 사용해 HTML 파싱
        soup = BeautifulSoup(response.content, 'html.parser')
        
        try:
            # 포스팅 제목 추출
            title = soup.find('meta', property='og:title')['content']
            
            # 포스팅 URL 추출
            post_url = soup.find('meta', property='og:url')['content']
            
            # 출력 형식: [제목](링크)
            print(f"[{title}]({post_url})")
        
        except TypeError:
            # meta 태그가 없는 경우 처리
            print(f"Post {post_number}: 제목 또는 URL을 찾을 수 없습니다.")