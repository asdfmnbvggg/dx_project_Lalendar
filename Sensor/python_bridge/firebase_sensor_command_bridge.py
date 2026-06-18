

import serial

import re

import time

import requests
 
# =========================

# 기본 설정

# =========================
 
PORT = "COM4"

BAUDRATE = 115200
 
DEVICE_ID = "living_room_01"
 
FIREBASE_BASE_URL = "https://lgdxsirius-default-rtdb.asia-southeast1.firebasedatabase.app"
 
# 센서 최신값 저장 경로

SENSOR_LATEST_URL = (

    f"{FIREBASE_BASE_URL}/sensor_latest/{DEVICE_ID}.json"

)
 
# 가전 실행 명령 읽기/상태 업데이트 경로

COMMAND_URL = (

    f"{FIREBASE_BASE_URL}/device_commands/{DEVICE_ID}.json"

)
 
# Firebase 명령 확인 주기

COMMAND_POLL_INTERVAL = 2
 
 
# =========================

# Firebase 센서 데이터 전송

# =========================
 
def upload_sensor_data(payload):

    try:

        response = requests.put(SENSOR_LATEST_URL, json=payload, timeout=5)
 
        if response.status_code == 200:

            print(

                f"🔥 [Firebase 센서 성공] "

                f"T:{payload['temperature']}C | "

                f"H:{payload['humidity']}% | "

                f"PM2.5:{payload['pm25']} | "

                f"PM10:{payload['pm10']} | "

                f"W:{payload['weight']}g"

            )

        else:

            print(f"⚠️ [Firebase 센서 에러] 코드: {response.status_code}, 내용: {response.text}")
 
    except Exception as e:

        print(f"🌐 센서 데이터 전송 오류: {e}")
 
 
# =========================

# Firebase 명령 처리

# =========================
 
def read_firebase_command():

    try:

        response = requests.get(COMMAND_URL, timeout=5)

        response.raise_for_status()

        return response.json()

    except Exception as e:

        print(f"Firebase 명령 읽기 실패: {e}")

        return None
 
 
def update_command_status(status, extra_data=None):

    payload = {

        "status": status,

        "updatedAt": int(time.time() * 1000),

    }
 
    if extra_data:

        payload.update(extra_data)
 
    try:

        response = requests.patch(COMMAND_URL, json=payload, timeout=5)

        response.raise_for_status()

        print(f"Firebase command status 업데이트 완료: {status}")

    except Exception as e:

        print(f"Firebase command status 업데이트 실패: {e}")
 
 
def send_command_to_esp32(ser, command):

    try:

        message = command + "\n"

        ser.write(message.encode("utf-8"))

        ser.flush()

        print(f"ESP32로 명령 전송 완료: {command}")

        return True

    except Exception as e:

        print(f"ESP32 명령 전송 실패: {e}")

        return False
 
 
# =========================

# 메인 실행

# =========================
 
try:

    ser = serial.Serial(PORT, BAUDRATE, timeout=1)

    time.sleep(2)
 
    print("✅ ESP32 연결 성공!")

    print("✅ Firebase 센서 전송 + 가전 명령 Bridge를 시작합니다.")

    print("-" * 60)
 
    temp = humid = pm25 = pm10 = weight = None
 
    last_command_check_time = 0

    last_command_created_at = None
 
    while True:

        now = time.time()
 
        # =========================

        # 1. ESP32에서 센서값 읽기

        # =========================

        if ser.in_waiting > 0:

            line = ser.readline().decode("utf-8", errors="ignore").strip()
 
            if line:

                print(f"ESP32 수신: {line}")
 
                # 명령 응답 로그는 센서 파싱에서 제외

                if "Received command" in line:

                    continue
 
                if "실행 완료" in line:

                    continue
 
                if "종료 완료" in line:

                    continue
 
                if "알 수 없는 명령" in line:

                    continue
 
                if "ESP32 command test ready" in line:

                    continue
 
                # 온습도 파싱 예시: T: 24.5 H: 54

                if "T:" in line and "H:" in line:

                    match = re.search(r"T:\s*([0-9.]+).*H:\s*([0-9.]+)", line)

                    if match:

                        temp, humid = match.groups()
 
                # 미세먼지 파싱 예시: PM2.5: 17.1 PM10: 22

                elif "PM2.5:" in line and "PM10:" in line:

                    match = re.search(r"PM2.5:\s*([0-9.]+).*PM10:\s*([0-9.]+)", line)

                    if match:

                        pm25, pm10 = match.groups()
 
                # 무게 파싱 예시: Weight: 2.5

                elif "Weight:" in line:

                    match = re.search(r"Weight:\s*([0-9.-]+)", line)

                    if match:

                        weight = match.group(1)
 
                        # 모든 센서값이 모이면 Firebase로 전송

                        if None not in (temp, humid, pm25, pm10, weight):

                            payload = {

                                "temperature": float(temp),

                                "humidity": float(humid),

                                "pm25": float(pm25),

                                "pm10": float(pm10),

                                "weight": float(weight),

                                "last_updated": time.strftime("%Y-%m-%d %H:%M:%S"),

                                "updatedAt": int(time.time() * 1000),

                            }
 
                            upload_sensor_data(payload)
 
                            # 다음 센서 사이클을 위해 초기화

                            temp = humid = pm25 = pm10 = weight = None
 
        # =========================

        # 2. Firebase 가전 명령 확인

        # =========================

        if now - last_command_check_time >= COMMAND_POLL_INTERVAL:

            command_data = read_firebase_command()

            last_command_check_time = now
 
            if command_data:

                status = command_data.get("status")

                command = command_data.get("command")

                created_at = command_data.get("createdAt")
 
                if status == "pending" and command:

                    # 같은 명령 중복 실행 방지

                    if created_at != last_command_created_at:

                        print("\n새 실행 명령 감지")

                        print(f"가전명: {command_data.get('applianceName')}")

                        print(f"가전 타입: {command_data.get('applianceType')}")

                        print(f"명령: {command}")

                        print(f"모드: {command_data.get('mode')}")

                        print(f"담당자: {command_data.get('targetUserId')}")
 
                        success = send_command_to_esp32(ser, command)
 
                        if success:

                            update_command_status(

                                "done",

                                {

                                    "executedAt": int(time.time() * 1000),

                                    "executedBy": "python_sensor_command_bridge",

                                },

                            )

                            last_command_created_at = created_at

                        else:

                            update_command_status(

                                "failed",

                                {

                                    "failedAt": int(time.time() * 1000),

                                    "errorMessage": "ESP32 serial command send failed",

                                },

                            )
 
        time.sleep(0.1)
 
except serial.SerialException as e:

    print(f"시리얼 연결 오류: {e}")
 
except KeyboardInterrupt:

    print("\nBridge를 안전하게 종료합니다.")
 
finally:

    if "ser" in locals() and ser.is_open:

        ser.close()
 