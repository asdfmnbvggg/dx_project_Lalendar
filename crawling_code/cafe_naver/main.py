#통합 Terminal 사용할 때, 주의사항!
# (1) 만약에, uvicorn 실행정지 하고싶다면? -> ctrl c 2번
# (2) 이전 코드를 실행하고 싶다면? -> 키보드 화살표 위, 아래
# (3) 복사한 내용을 붙여넣고 싶다면? -> 마우스 우클릭
 
#0. 라이브러리 설치 : fastapi, uvicorn(편하게 실행하기 위해서 다운로드)

#1. 필요한 라이브러리 가져오기
from fastapi import FastAPI
# CORS (Cross Origin Resoure Sharing) 정책에 대해 허용해주기 위해 필요한 라이브러리
# 웹 브라우저느 기본으로 서로다른 출처(ip주소 ~ post번호까지)간의 데이터 교환을 허용하지 x
from fastapi.middleware.cors import CORSMiddleware
import crawling as craw

#2. 작동할 app 생성(Springboot의 Controller 역할과 유사)
app = FastAPI()

#4. 동일출처정책 허용해주기
# origins -> 허용할 url 지정하는 역역
# methods -> 허용할 전송방식 지정하는 영역
#headers, credentials -> 지금은 몰라도 돼
app.add_middleware(CORSMiddleware,
                   allow_origins =["http://localhost:8083"],
                   allow_methods=["*"],
                   allow_headers=["*"],
                   allow_credentials=["*"]
                   )

#3. app에 요청을 처리해줄 url mapping을 달아주기
@app.get("/")
def index(sendData) :#데이터수집을 해줄 때 매개변수의 이름 == 보내주는 key값 일치시키기!
    print(f"수집데이터:{sendData}")
    return "통신성공" # 요청이 들어왔을 때 되돌아가는 값

# /crawling url처리하는 함수 생성하기
# 이때 데이터를 1개 수집
# Springboot에서 요청을 보낼 수 있게 STS코드 수정해주기!

@app.get("/crawling")
def crawing(sendData) :
    print(f"check : {sendData}")
    # 수집한 데이터 기반으로 크롤링하는 코드 작성할거에요!
    src = craw.img_crawling(sendData)
    return src



