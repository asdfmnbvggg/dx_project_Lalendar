#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include "HX711.h"

// =========================
// 기본 설정
// =========================

#define SERIAL_BAUD 115200

// =========================
// LCD 3개 설정
// =========================

// LCD 3개 모두 같은 I2C 라인에 연결
// LCD SDA → ESP32 GPIO 21
// LCD SCL → ESP32 GPIO 22
#define LCD_SDA_PIN 21
#define LCD_SCL_PIN 22

// LCD 주소
// 1번 LCD: 납땜 안 한 기본 → 0x27
// 2번 LCD: A0 납땜       → 0x26
// 3번 LCD: A1 납땜       → 0x25
LiquidCrystal_I2C lcdTempHumid(0x27, 16, 2);  // 온습도 LCD
LiquidCrystal_I2C lcdDust(0x26, 16, 2);       // 미세먼지 LCD
LiquidCrystal_I2C lcdWeight(0x25, 16, 2);     // 무게 LCD

// 만약 LCD가 안 나오면 주소가 0x3F 계열일 수 있음
// 그 경우 아래처럼 바꾸기
// LiquidCrystal_I2C lcdTempHumid(0x3F, 16, 2);
// LiquidCrystal_I2C lcdDust(0x3E, 16, 2);
// LiquidCrystal_I2C lcdWeight(0x3D, 16, 2);


// =========================
// DHT11 온습도 센서
// =========================

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
float calibration_factor = -6.20;

// 공기청정기 실행 확인용 LED
#define AIR_PURIFIER_LED 2

// 가전 실행 확인용 GPIO
#define SHARED_AIRCON_LED 18
#define WASHER_LED 19
#define SUMIN_AIRCON_LED 23
#define DADA_AIRCON_LED 27
#define JEA_AIRCON_LED 32
#define ROBOT_CLEANER_LED 4
#define DISHWASHER_LED 5
#define DRYER_LED 14

const int APPLIANCE_LED_PINS[] = {
  AIR_PURIFIER_LED,
  SHARED_AIRCON_LED,
  WASHER_LED,
  SUMIN_AIRCON_LED,
  DADA_AIRCON_LED,
  JEA_AIRCON_LED,
  ROBOT_CLEANER_LED,
  DISHWASHER_LED,
  DRYER_LED
};
const int APPLIANCE_LED_COUNT = sizeof(APPLIANCE_LED_PINS) / sizeof(APPLIANCE_LED_PINS[0]);

// 가전 LED는 실행 확인용으로 3초만 켜둠
const unsigned long APPLIANCE_LED_ON_DURATION = 3000;
unsigned long applianceLedTurnedOnAt = 0;
bool applianceLedActive = false;

// 센서 출력 주기
unsigned long lastSensorPrintTime = 0;
const unsigned long SENSOR_PRINT_INTERVAL = 3000;

// 최근 미세먼지 값 저장
float pm25Value = 0.0;
float pm10Value = 0.0;


// =========================
// LCD 공통 함수
// =========================

String fitLCDText(String text) {
  text.replace("\n", " ");
  text.replace("|", " ");
  text.trim();

  if (text.length() > 16) {
    text = text.substring(0, 16);
  }

  return text;
}


void displayLCD(LiquidCrystal_I2C &targetLCD, String line1, String line2) {
  line1 = fitLCDText(line1);
  line2 = fitLCDText(line2);

  targetLCD.clear();

  targetLCD.setCursor(0, 0);
  targetLCD.print(line1);

  targetLCD.setCursor(0, 1);
  targetLCD.print(line2);
}


void initLCDs() {
  Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);

  lcdTempHumid.init();
  lcdTempHumid.backlight();

  lcdDust.init();
  lcdDust.backlight();

  lcdWeight.init();
  lcdWeight.backlight();

  displayLCD(lcdTempHumid, "TEMP / HUMID", "LCD Ready");
  displayLCD(lcdDust, "PM2.5 / PM10", "LCD Ready");
  displayLCD(lcdWeight, "WEIGHT", "LCD Ready");
}


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
// LCD 3개에도 각각 분리 출력
// =========================

void printSensorData() {
  // =========================
  // 1. 온습도 센서
  // =========================

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT sensor read failed");

    displayLCD(lcdTempHumid, "DHT Failed", "Check Sensor");
  } else {
    // Python 통합 코드가 아래 형식을 파싱함
    Serial.print("T: ");
    Serial.print(temperature, 1);
    Serial.print(" H: ");
    Serial.println(humidity, 1);

    // 1번 LCD: 온습도
    String tempLine = String("Temp: ") + String(temperature, 1) + " C";
    String humidLine = String("Humid: ") + String(humidity, 1) + " %";

    displayLCD(lcdTempHumid, tempLine, humidLine);
  }

  // =========================
  // 2. 미세먼지 센서
  // =========================

  float newPm25;
  float newPm10;

  if (readSDS011Data(newPm25, newPm10)) {
    pm25Value = newPm25;
    pm10Value = newPm10;
  }

  // Python 통합 코드가 아래 형식을 파싱함
  Serial.print("PM2.5: ");
  Serial.print(pm25Value, 1);
  Serial.print(" PM10: ");
  Serial.println(pm10Value, 1);

  // 2번 LCD: 미세먼지
  String pm25Line = String("PM2.5: ") + String(pm25Value, 1);
  String pm10Line = String("PM10 : ") + String(pm10Value, 1);

  displayLCD(lcdDust, pm25Line, pm10Line);

  // =========================
  // 3. 로드셀 무게 센서
  // =========================

  float weight = 0.0;

  if (scale.is_ready()) {
    weight = scale.get_units(5);

    // 3번 LCD: 무게
    String weightLine1 = "Weight";
    String weightLine2 = String(weight, 1) + " g";

    displayLCD(lcdWeight, weightLine1, weightLine2);
  } else {
    Serial.println("HX711 not ready");

    displayLCD(lcdWeight, "HX711 Error", "Not Ready");
  }

  // Python 통합 코드가 아래 형식을 파싱함
  Serial.print("Weight: ");
  Serial.println(weight, 1);
}


// =========================
// 가전 LED 공통 함수
// =========================

void initApplianceLedPins() {
  for (int i = 0; i < APPLIANCE_LED_COUNT; i++) {
    pinMode(APPLIANCE_LED_PINS[i], OUTPUT);
    digitalWrite(APPLIANCE_LED_PINS[i], LOW);
  }
}

void turnOffAllApplianceLeds() {
  for (int i = 0; i < APPLIANCE_LED_COUNT; i++) {
    digitalWrite(APPLIANCE_LED_PINS[i], LOW);
  }

  applianceLedActive = false;
  applianceLedTurnedOnAt = 0;
}

void turnOnOnlyApplianceLed(int ledPin, const char* applianceLabel) {
  turnOffAllApplianceLeds();
  digitalWrite(ledPin, HIGH);
  applianceLedActive = true;
  applianceLedTurnedOnAt = millis();
  Serial.print("LED ON GPIO");
  Serial.print(ledPin);
  Serial.print(": ");
  Serial.println(applianceLabel);
}

void updateApplianceLedAutoOff() {
  if (applianceLedActive && millis() - applianceLedTurnedOnAt >= APPLIANCE_LED_ON_DURATION) {
    turnOffAllApplianceLeds();
    Serial.println("LED OFF: auto timeout");
  }
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
    turnOnOnlyApplianceLed(AIR_PURIFIER_LED, "air purifier");
    Serial.println("공기청정기 자동 모드 실행 완료");
  }

  else if (command == "air_purifier_off") {
    turnOffAllApplianceLeds();
    Serial.println("공기청정기 종료 완료");
  }

  else if (command == "air_purifier_power" || command == "strong") {
    turnOnOnlyApplianceLed(AIR_PURIFIER_LED, "air purifier");
    Serial.println("공기청정기 강력 모드 실행 완료");
  }

  // =========================
  // 에어컨
  // =========================
  else if (command == "shared_aircon_power_cooling") {
    turnOnOnlyApplianceLed(SHARED_AIRCON_LED, "shared aircon");
    Serial.println("공동 에어컨 파워냉방 실행 완료");
  }

  else if (command == "shared_aircon_dry") {
    turnOnOnlyApplianceLed(SHARED_AIRCON_LED, "shared aircon");
    Serial.println("공동 에어컨 제습 실행 완료");
  }

  else if (command == "sumin_aircon_power_cooling") {
    turnOnOnlyApplianceLed(SUMIN_AIRCON_LED, "sumin aircon");
    Serial.println("수민 에어컨 파워냉방 실행 완료");
  }

  else if (command == "sumin_aircon_dry") {
    turnOnOnlyApplianceLed(SUMIN_AIRCON_LED, "sumin aircon");
    Serial.println("수민 에어컨 제습 실행 완료");
  }

  else if (command == "dada_aircon_power_cooling") {
    turnOnOnlyApplianceLed(DADA_AIRCON_LED, "dada aircon");
    Serial.println("다빈 에어컨 파워냉방 실행 완료");
  }

  else if (command == "dada_aircon_dry") {
    turnOnOnlyApplianceLed(DADA_AIRCON_LED, "dada aircon");
    Serial.println("다빈 에어컨 제습 실행 완료");
  }

  else if (command == "jea_aircon_power_cooling") {
    turnOnOnlyApplianceLed(JEA_AIRCON_LED, "jea aircon");
    Serial.println("재혁 에어컨 파워냉방 실행 완료");
  }

  else if (command == "jea_aircon_dry") {
    turnOnOnlyApplianceLed(JEA_AIRCON_LED, "jea aircon");
    Serial.println("재혁 에어컨 제습 실행 완료");
  }

  else if (command == "power_cooling") {
    turnOnOnlyApplianceLed(SHARED_AIRCON_LED, "shared aircon");
    Serial.println("에어컨 파워냉방 실행 완료");
  }

  else if (command == "dry") {
    turnOnOnlyApplianceLed(SHARED_AIRCON_LED, "shared aircon");
    Serial.println("에어컨 제습 모드 실행 완료");
  }

  else if (command == "cooling") {
    turnOnOnlyApplianceLed(SHARED_AIRCON_LED, "shared aircon");
    Serial.println("에어컨 냉방 실행 완료");
  }

  // =========================
  // 세탁기
  // =========================
  else if (command == "washer_start") {
    turnOnOnlyApplianceLed(WASHER_LED, "washer");
    Serial.println("세탁기 표준 모드 실행 완료");
  }

  else if (command == "washer_quick") {
    turnOnOnlyApplianceLed(WASHER_LED, "washer");
    Serial.println("세탁기 빠른 세탁 모드 실행 완료");
  }

  else if (command == "washer_dry") {
    turnOnOnlyApplianceLed(WASHER_LED, "washer");
    Serial.println("세탁기 건조 모드 실행 완료");
  }

  // =========================
  // 로봇청소기
  // =========================
  else if (command == "robot_cleaner_start") {
    turnOnOnlyApplianceLed(ROBOT_CLEANER_LED, "robot cleaner");
    Serial.println("로봇청소기 실행 완료");
  }

  // =========================
  // 식기세척기
  // =========================
  else if (command == "dishwasher_start") {
    turnOnOnlyApplianceLed(DISHWASHER_LED, "dishwasher");
    Serial.println("식기세척기 표준 모드 실행 완료");
  }

  // =========================
  // 건조기
  // =========================
  else if (command == "dryer_start") {
    Serial.println("건조기 실행 완료");
    turnOnOnlyApplianceLed(DRYER_LED, "dryer");
  }

  // =========================
  // 알 수 없는 명령
  // =========================
  else {
    Serial.print("Unknown command: ");
    Serial.println(command);
  }
}


// =========================
// setup
// =========================

void setup() {
  Serial.begin(SERIAL_BAUD);
  Serial.setTimeout(50);

  initApplianceLedPins();
  turnOffAllApplianceLeds();

  // LCD 3개 초기화
  initLCDs();

  dht.begin();

  sdsSerial.begin(9600, SERIAL_8N1, SDS_RX_PIN, SDS_TX_PIN);

  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  scale.set_scale(calibration_factor);
  scale.tare();

  displayLCD(lcdTempHumid, "TEMP / HUMID", "Ready");
  displayLCD(lcdDust, "DUST SENSOR", "Ready");
  displayLCD(lcdWeight, "WEIGHT SENSOR", "Ready");

  Serial.println("ESP32 sensor + command bridge ready");
  Serial.println("3 LCD sensor display ready");
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

  updateApplianceLedAutoOff();

  // 2. Python에서 들어오는 명령 수신
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    handleCommand(command);
  }
}
