import pandas as pd
import re
 
# 1. 본문 수집 결과 합친 파일명
INPUT_PATH = "넣을 데이터 파일 경로"
OUTPUT_PATH = "아웃풋 데이터 경로"
 
REQUIRED_TOPIC_KEYWORDS = [
    "청소", "빨래", "세탁", "건조기", "세탁기", "식기세척기", "식세기",
    "욕실", "화장실", "주방", "부엌", "싱크대", "청소기",
    "먼지", "곰팡이", "냄새", "세제", "섬유유연제", "락스",
    "걸레", "대걸레", "수납", "정리정돈", "살림", "가사",
    "냉장고", "에어컨", "전자레인지", "가전", "로봇청소기",
    "환기", "습기", "제습", "건조", "전기세",
]
 
EMOTIONAL_MARKERS = [
    "너무 힘들", "눈물이", "위로해", "하소연", "고민이에요", "고민인데",
    "어떡하죠", "어떡해요", "남편이", "시어머니", "시댁이",
    "아이가 너무", "아기가", "임신 중", "출산 후",
    "우울해", "불안해", "외로워", "억울해", "서럽",
    "결혼하기 싫", "이혼하고 싶", "도망가고 싶",
]
 
EMOTIONAL_THRESHOLD = 2
MIN_BODY_LEN = 100
 
AD_RE = [re.compile(p, re.IGNORECASE) for p in [
    r"협찬", r"체험단", r"서포터즈", r"유료\s*광고", r"\bPR\b",
    r"https?://(?!pann\.nate\.com)", r"bit\.ly", r"스마트스토어", r"공동구매",
]]
 
def is_ad(text):
    return any(p.search(text) for p in AD_RE)
 
def is_relevant_topic(title, body=""):
    text = str(title) + " " + str(body)
 
    if not any(w in text for w in REQUIRED_TOPIC_KEYWORDS):
        return False
 
    emotional_count = sum(1 for m in EMOTIONAL_MARKERS if m in text)
    if emotional_count >= EMOTIONAL_THRESHOLD:
        return False
 
    return True
 
# 2. CSV 불러오기
df = pd.read_csv(INPUT_PATH)
 
before = len(df)
 
# 3. 결측치 처리
df["title"] = df["title"].fillna("")
df["body"] = df["body"].fillna("")
 
# 4. 중복 제거
if "link" in df.columns:
    df = df.drop_duplicates(subset=["link"])
 
# 5. 본문 길이 필터
df = df[df["body"].str.len() >= MIN_BODY_LEN]
 
# 6. 광고 제거
df = df[~df["body"].apply(is_ad)]
 
# 7. v4 토픽/감정 필터 적용
df = df[df.apply(lambda row: is_relevant_topic(row["title"], row["body"]), axis=1)]
 
after = len(df)
 
# 8. 저장
df.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")
 
print(f"필터링 전: {before:,}건")
print(f"필터링 후: {after:,}건")
print(f"제거된 수: {before - after:,}건")
print(f"저장 완료: {OUTPUT_PATH}")
