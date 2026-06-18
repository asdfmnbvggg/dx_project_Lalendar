#include <DHT.h>
#include "HX711.h"

// =========================
// 기본 설정
// =========================

#define SERIAL_BAUD 115200

// DHT11 온습도 센서
#define DHT_PIN 33
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// SDS011 미세먼지 센서
// SDS011 TX → ESP32 RX 16
// SDS011 RX → ESP32 TX 17
#define SDS_RX_PIN 16
#define SDS_TX_PIN 17
HardwareSerial sdsSerial(2);

// HX711 로드셀
#define HX711_DOUT_PIN 25
#define HX711_SCK_PIN 26
HX711 scale;

// 무게 보정값
// 실제 로드셀에 따라 조정 필요
float calibration_factor = -7050.0;

// 공기청정기 실행 확인용 LED
#define AIR_PURIFIER_LED 2

// 가전 실행 확인용 GPIO
#define SHARED_AIRCON_LED 18
#define WASHER_LED 19
#define SUMIN_AIRCON_LED 27
#define DADA_AIRCON_LED 32
#define JEA_AIRCON_LED 23

// 센서 출력 주기
unsigned long lastSensorPrintTime = 0;
const unsigned long SENSOR_PRINT_INTERVAL = 3000;

// 최근 미세먼지 값 저장
float pm25Value = 0.0;
float pm10Value = 0.0;


// =========================
// SDS011 미세먼지 데이터 읽기
// =========================

bool readSDS011Data(float &pm25, float &pm10) {
  if (sdsSerial.available() < 10) {
    return false;
  }

  while (sdsSerial.available() >= 10) {
    if (sdsSerial.peek() != 0xAA) {
      sdsSerial.read();
      continue;
    }

    uint8_t buffer[10];
    sdsSerial.readBytes(buffer, 10);

    // SDS011 데이터 프레임 확인
    if (buffer[0] != 0xAA || buffer[1] != 0xC0 || buffer[9] != 0xAB) {
      return false;
    }

    // 체크섬 확인
    uint8_t checksum = 0;
    for (int i = 2; i <= 7; i++) {
      checksum += buffer[i];
    }

    if (checksum != buffer[8]) {
      return false;
    }

    // SDS011 공식 데이터 계산
    // PM2.5 = ((high byte * 256) + low byte) / 10
    pm25 = ((buffer[3] * 256) + buffer[2]) / 10.0;
    pm10 = ((buffer[5] * 256) + buffer[4]) / 10.0;

    return true;
  }

  return false;
}


// =========================
// 센서값 출력
// Python 코드가 이 형식을 읽음
// =========================

void printSensorData() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT sensor read failed");
    return;
  }

  float newPm25;
  float newPm10;

  if (readSDS011Data(newPm25, newPm10)) {
    pm25Value = newPm25;
    pm10Value = newPm10;
  }

  float weight = 0.0;

  if (scale.is_ready()) {
    weight = scale.get_units(5);
  } else {
    Serial.println("HX711 not ready");
  }

  // Python 통합 코드가 아래 형식을 파싱함
  Serial.print("T: ");
  Serial.print(temperature, 1);
  Serial.print(" H: ");
  Serial.println(humidity, 1);

  Serial.print("PM2.5: ");
  Serial.print(pm25Value, 1);
  Serial.print(" PM10: ");
  Serial.println(pm10Value, 1);

  Serial.print("Weight: ");
  Serial.println(weight, 1);
}


// =========================
// 가전 명령 처리
// =========================

void handleCommand(String command) {
  command.trim();

  Serial.print("Received command: ");
  Serial.println(command);

  // =========================
  // 공기청정기
  // =========================
  if (command == "air_purifier_on") {
    digitalWrite(AIR_PURIFIER_LED, HIGH);
    Serial.println("공기청정기 자동 모드 실행 완료");
  }

  else if (command == "air_purifier_off") {
    digitalWrite(AIR_PURIFIER_LED, LOW);
    Serial.println("공기청정기 종료 완료");
  }

  else if (command == "air_purifier_power") {
    digitalWrite(AIR_PURIFIER_LED, HIGH);
    Serial.println("공기청정기 강력 모드 실행 완료");
  }

  // =========================
  // 에어컨
  // =========================
  else if (command == "shared_aircon_power_cooling") {
    digitalWrite(SHARED_AIRCON_LED, HIGH);
    Serial.println("공동 에어컨 파워냉방 실행 완료");
  }

  else if (command == "shared_aircon_dry") {
    digitalWrite(SHARED_AIRCON_LED, HIGH);
    Serial.println("공동 에어컨 제습 실행 완료");
  }

  else if (command == "sumin_aircon_power_cooling") {
    digitalWrite(SUMIN_AIRCON_LED, HIGH);
    Serial.println("수민 에어컨 파워냉방 실행 완료");
  }

  else if (command == "sumin_aircon_dry") {
    digitalWrite(SUMIN_AIRCON_LED, HIGH);
    Serial.println("수민 에어컨 제습 실행 완료");
  }

  else if (command == "dada_aircon_power_cooling") {
    digitalWrite(DADA_AIRCON_LED, HIGH);
    Serial.println("다빈 에어컨 파워냉방 실행 완료");
  }

  else if (command == "dada_aircon_dry") {
    digitalWrite(DADA_AIRCON_LED, HIGH);
    Serial.println("다빈 에어컨 제습 실행 완료");
  }

  else if (command == "jea_aircon_power_cooling") {
    digitalWrite(JEA_AIRCON_LED, HIGH);
    Serial.println("재혁 에어컨 파워냉방 실행 완료");
  }

  else if (command == "jea_aircon_dry") {
    digitalWrite(JEA_AIRCON_LED, HIGH);
    Serial.println("재혁 에어컨 제습 실행 완료");
  }

  else if (command == "power_cooling") {
    digitalWrite(SHARED_AIRCON_LED, HIGH);
    Serial.println("에어컨 파워냉방 실행 완료");
  }

  else if (command == "dry") {
    digitalWrite(SHARED_AIRCON_LED, HIGH);
    Serial.println("에어컨 제습 모드 실행 완료");
  }

  else if (command == "cooling") {
    digitalWrite(SHARED_AIRCON_LED, HIGH);
    Serial.println("에어컨 냉방 실행 완료");
  }

  // =========================
  // 세탁기
  // =========================
  else if (command == "washer_start") {
    digitalWrite(WASHER_LED, HIGH);
    Serial.println("세탁기 표준 모드 실행 완료");
  }

  else if (command == "washer_quick") {
    Serial.println("세탁기 빠른 세탁 모드 실행 완료");
  }

  else if (command == "washer_dry") {
    Serial.println("세탁기 건조 모드 실행 완료");
  }

  // =========================
  // 알 수 없는 명령
  // =========================
  else {
    Serial.print("알 수 없는 명령입니다: ");
    Serial.println(command);
  }
}


// =========================
// setup
// =========================

void setup() {
  Serial.begin(SERIAL_BAUD);

  pinMode(AIR_PURIFIER_LED, OUTPUT);
  pinMode(SHARED_AIRCON_LED, OUTPUT);
  pinMode(WASHER_LED, OUTPUT);
  pinMode(SUMIN_AIRCON_LED, OUTPUT);
  pinMode(DADA_AIRCON_LED, OUTPUT);
  pinMode(JEA_AIRCON_LED, OUTPUT);

  digitalWrite(AIR_PURIFIER_LED, LOW);
  digitalWrite(SHARED_AIRCON_LED, LOW);
  digitalWrite(WASHER_LED, LOW);
  digitalWrite(SUMIN_AIRCON_LED, LOW);
  digitalWrite(DADA_AIRCON_LED, LOW);
  digitalWrite(JEA_AIRCON_LED, LOW);

  dht.begin();

  sdsSerial.begin(9600, SERIAL_8N1, SDS_RX_PIN, SDS_TX_PIN);

  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  scale.set_scale(calibration_factor);
  scale.tare();

  Serial.println("ESP32 sensor + command bridge ready");
}


// =========================
// loop
// =========================

void loop() {
  // 1. 센서값 주기적으로 출력
  if (millis() - lastSensorPrintTime >= SENSOR_PRINT_INTERVAL) {
    lastSensorPrintTime = millis();
    printSensorData();
  }

  // 2. Python에서 들어오는 명령 수신
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    handleCommand(command);
  }
}
