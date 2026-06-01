2차 전처리 
코드 : 
import pandas as pd
 
# 합쳐진 파일 경로
input_path = "데이터 경로"
 
df = pd.read_csv(input_path)
 
print("원본 데이터:", len(df))
print("컬럼:", df.columns.tolist())
 
# 결측치 처리
df["title"] = df["title"].fillna("")
df["content"] = df["content"].fillna("")
 
# title + content 기준 중복 제거
before_dup = len(df)
df = df.drop_duplicates(subset=["title", "content"])
print("중복 제거 전:", before_dup)
print("중복 제거 후:", len(df))
 
TOPIC_KEYWORDS = [
    "청소","빨래","세탁","건조기","세탁기","식기세척기","식세기",
    "욕실","화장실","주방","부엌","싱크대","청소기","먼지","곰팡이",
    "냄새","세제","섬유유연제","락스","수납","정리정돈","살림","가사",
    "냉장고","에어컨","전자레인지","로봇청소기","환기","습기","제습",
    "건조","전기세"
]
 
BAD_KEYWORDS = [
    "시어머니","시아버지","시댁","친정",
    "이혼","불륜","외도","바람",
    "육아","아기","신생아","출산","임신",
    "죽고싶","자살","우울","공황","불안장애",
    "성폭","강간","폭행","마약","도박","사기",
    "하소연","위로해"
]
 
AD_KEYWORDS = [
    "협찬","체험단","서포터즈","유료 광고","유료광고",
    "공동구매","스마트스토어","제품제공","원고료",
    "구매링크","할인코드","쿠폰"
]
 
def is_good(row):
    title = str(row["title"])
    content = str(row["content"])
    text = title + " " + content
 
    if len(content) < 80:
        return False
 
    if not any(k in text for k in TOPIC_KEYWORDS):
        return False
 
    if any(k in text for k in BAD_KEYWORDS):
        return False
 
    if any(k in text for k in AD_KEYWORDS):
        return False
 
    return True
 
before_filter = len(df)
 
df_filtered = df[df.apply(is_good, axis=1)].copy()
 
after_filter = len(df_filtered)
 
print("필터 전:", before_filter)
print("필터 후:", after_filter)
print("제거:", before_filter - after_filter)
 
output_path = "데이터 경로"
 
df_filtered.to_csv(
    output_path,
    index=False,
    encoding="utf-8-sig"
)
 
print("저장 완료:", output_path)
 
df_filtered.head()
