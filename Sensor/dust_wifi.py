import socket

# ESP32가 무선으로 뿜어내는 포트 번호 (아두이노 코드와 일치)
UDP_IP = "0.0.0.0"  # 내 컴퓨터로 들어오는 모든 무선 신호를 받겠다는 뜻
UDP_PORT = 9999

def main():
    # 시리얼(Serial) 대신 네트워크(UDP) 소켓을 생성합니다.
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((UDP_IP, UDP_PORT))
    
    print("📡 [무선 모니터링 시작] 노트북 랜카드를 열었습니다.")
    print("ESP32가 와이파이로 보내는 미세먼지 데이터를 기다리는 중...\n")
    
    while True:
        try:
            # 공중에 날아다니는 데이터 낚아채기 (버퍼 사이즈 1024)
            data, addr = sock.recvfrom(1024)
            
            # 받아온 무선 데이터를 글자로 변환해서 화면에 출력
            message = data.decode('utf-8')
            print(message)
            
        except KeyboardInterrupt:
            print("\n👋 무선 모니터링을 종료합니다.")
            sock.close()
            break

if __name__ == "__main__":
    main()