import serial
import time
import requests

# =========================
# 설정값
# =========================

# ESP32가 연결된 포트
# 작업자 노트북에서 실제 포트가 COM4가 아니면 수정해야 함
SERIAL_PORT = "COM4"
BAUD_RATE = 115200

# Firebase Realtime Database 명령 경로
FIREBASE_COMMAND_URL = (
    "https://lgdxsirius-default-rtdb.asia-southeast1.firebasedatabase.app/"
    "device_commands/living_room_01.json"
)

# 몇 초마다 Firebase 명령을 확인할지
POLL_INTERVAL = 2


def read_firebase_command():
    """Firebase에서 현재 가전 명령을 읽어온다."""
    try:
        response = requests.get(FIREBASE_COMMAND_URL, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Firebase 명령 읽기 실패: {e}")
        return None


def update_command_status(status, extra_data=None):
    """Firebase 명령 상태를 업데이트한다."""
    payload = {
        "status": status,
        "updatedAt": int(time.time() * 1000),
    }

    if extra_data:
        payload.update(extra_data)

    try:
        response = requests.patch(FIREBASE_COMMAND_URL, json=payload, timeout=5)
        response.raise_for_status()
        print(f"Firebase status 업데이트 완료: {status}")
    except Exception as e:
        print(f"Firebase status 업데이트 실패: {e}")


def send_command_to_esp32(serial_conn, command):
    """USB 시리얼로 ESP32에 명령을 보낸다."""
    try:
        message = command + "\n"
        serial_conn.write(message.encode("utf-8"))
        serial_conn.flush()
        print(f"ESP32로 명령 전송 완료: {command}")
        return True
    except Exception as e:
        print(f"ESP32 명령 전송 실패: {e}")
        return False


def main():
    print("Firebase ↔ ESP32 USB Bridge 시작")

    try:
        esp32 = serial.Serial(
            port=SERIAL_PORT,
            baudrate=BAUD_RATE,
            timeout=1
        )
        time.sleep(2)
        print(f"ESP32 연결 성공: {SERIAL_PORT}, {BAUD_RATE}")

    except Exception as e:
        print(f"ESP32 연결 실패: {e}")
        print("포트 번호가 맞는지 확인하세요. 예: COM3, COM4, COM5")
        return

    last_created_at = None

    while True:
        try:
            command_data = read_firebase_command()

            if not command_data:
                time.sleep(POLL_INTERVAL)
                continue

            status = command_data.get("status")
            command = command_data.get("command")
            created_at = command_data.get("createdAt")
            command_identity = command_data.get("commandId") or created_at

            if status == "pending" and command:
                # 같은 명령 중복 실행 방지
                if command_identity == last_created_at:
                    time.sleep(POLL_INTERVAL)
                    continue

                print("\n새 실행 명령 감지")
                print(f"가전명: {command_data.get('applianceName')}")
                print(f"가전 타입: {command_data.get('applianceType')}")
                print(f"명령: {command}")
                print(f"모드: {command_data.get('mode')}")
                print(f"담당자: {command_data.get('targetUserId')}")

                success = send_command_to_esp32(esp32, command)

                if success:
                    update_command_status(
                        "done",
                        {
                            "executedAt": int(time.time() * 1000),
                            "executedBy": "python_serial_bridge"
                        }
                    )
                    last_created_at = command_identity
                else:
                    update_command_status(
                        "failed",
                        {
                            "failedAt": int(time.time() * 1000),
                            "errorMessage": "ESP32 serial command send failed"
                        }
                    )

            # ESP32에서 오는 응답이 있으면 콘솔에 출력
            if esp32.in_waiting > 0:
                line = esp32.readline().decode("utf-8", errors="ignore").strip()
                if line:
                    print(f"ESP32 응답: {line}")

            time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            print("\nBridge 종료")
            break

        except Exception as e:
            print(f"반복 처리 중 오류: {e}")
            time.sleep(POLL_INTERVAL)

    esp32.close()


if __name__ == "__main__":
    main()
