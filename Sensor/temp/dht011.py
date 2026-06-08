import serial
import csv
import time

# 본인의 포트와 속도에 맞게 수정
port = 'COM4' 
baudrate = 115200  # 또는 9600
output_file = 'dht_data.csv'

try:
    py_serial = serial.Serial(port=port, baudrate=baudrate, timeout=1)
    print(f"{port} 연결 성공! 데이터 수집을 시작합니다. (종료: Ctrl+C)")
    
    # CSV 파일 열기 (공백 라인이 생기지 않도록 newline='' 설정)
    with open(output_file, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        # 엑셀에서 보기 편하게 첫 줄에 헤더(제목)를 적어줍니다.
        writer.writerow(['Timestamp', 'Sensor Data'])
        
        while True:
            if py_serial.readable():
                # 보드로부터 한 줄 읽어오기
                response = py_serial.readline().decode('utf-8').strip()
                
                if response:
                    # 현재 시간 생성
                    current_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
                    print(f"[{current_time}] {response}")
                    
                    # 시간과 데이터를 CSV에 기록
                    writer.writerow([current_time, response])
                    file.flush() # 실시간으로 파일에 바로 저장하도록 강제

except KeyboardInterrupt:
    print("\n데이터 수집을 안전하게 종료합니다.")
except Exception as e:
    print(f"오류 발생: {e}")