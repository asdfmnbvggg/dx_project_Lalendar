import serial
import re
import time
import requests

# ⚠️ 본인의 아두이노 포트에 맞게 수정하세요.
PORT = 'COM4' 
BAUDRATE = 9600

# 🎯 사용자님의 Firebase Realtime Database 주소 (반드시 https:// 로 시작해야 합니다)
FIREBASE_URL = "https://lgdxsirius-default-rtdb.asia-southeast1.firebasedatabase.app/sensor_latest/living_room_01.json"

try:
    ser = serial.Serial(PORT, BAUDRATE, timeout=1)
    time.sleep(2)
    
    print("✅ 아두이노 연결 성공! Firebase로 데이터 전송을 시작합니다...\n")
    print("-" * 60)

    temp = humid = pm25 = pm10 = weight = None

    while True:
        if ser.in_waiting > 0:
            line = ser.readline().decode('utf-8', errors='ignore').strip()

            if "T:" in line and "H:" in line:
                match = re.search(r"T:\s*([0-9.]+).*H:\s*([0-9.]+)", line)
                if match:
                    temp, humid = match.groups()

            elif "PM2.5:" in line and "PM10:" in line:
                match = re.search(r"PM2.5:\s*([0-9.]+).*PM10:\s*([0-9.]+)", line)
                if match:
                    pm25, pm10 = match.groups()

            elif "Weight:" in line:
                match = re.search(r"Weight:\s*([0-9.-]+)", line)
                if match:
                    weight = match.group(1)

                    # 모든 데이터가 모였을 때 Firebase로 전송
                    if None not in (temp, humid, pm25, pm10, weight):
                        
                        # 1. Firebase에 보낼 데이터 패키지(JSON) 만들기
                        payload = {
                            "temperature": float(temp),
                            "humidity": float(humid),
                            "pm25": float(pm25),
                            "pm10": float(pm10),
                            "weight": float(weight),
                            "last_updated": time.strftime('%Y-%m-%d %H:%M:%S') # 업데이트 시간 추가!
                        }

                        # 2. REST API(PUT 방식)로 Firebase에 덮어쓰기 전송
                        try:
                            response = requests.put(FIREBASE_URL, json=payload)
                            
                            if response.status_code == 200:
                                print(f"🔥 [Firebase 성공] T:{temp}C | H:{humid}% | PM2.5:{pm25} | W:{weight}g")
                            else:
                                print(f"⚠️ [Firebase 에러] 코드: {response.status_code}, 내용: {response.text}")
                        
                        except Exception as e:
                            print(f"🌐 인터넷 연결 또는 전송 오류: {e}")
                        
                        # 3. 다음 사이클을 위해 변수 초기화
                        temp = humid = pm25 = pm10 = weight = None

except serial.SerialException as e:
    print(f"시리얼 연결 오류: {e}")
except KeyboardInterrupt:
    print("\n데이터 수집을 안전하게 종료합니다.")
finally:
    if 'ser' in locals() and ser.is_open:
        ser.close()