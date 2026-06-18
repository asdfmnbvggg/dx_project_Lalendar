#define AIR_PURIFIER_LED 2  // ESP32 내장 LED로 많이 쓰는 핀

void setup() {
  Serial.begin(115200);

  pinMode(AIR_PURIFIER_LED, OUTPUT);
  digitalWrite(AIR_PURIFIER_LED, LOW);

  Serial.println("ESP32 command test ready");
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    Serial.print("Received command: ");
    Serial.println(command);

    if (command == "air_purifier_on") {
      digitalWrite(AIR_PURIFIER_LED, HIGH);
      Serial.println("공기청정기 실행 완료");
    }

    else if (command == "air_purifier_off") {
      digitalWrite(AIR_PURIFIER_LED, LOW);
      Serial.println("공기청정기 종료 완료");
    }

    else if (command == "air_conditioner_on") {
      Serial.println("에어컨 냉방 실행 완료");
    }

    else if (command == "air_conditioner_power_cool") {
      Serial.println("에어컨 파워냉방 실행 완료");
    }

    else if (command == "air_conditioner_dehumidify") {
      Serial.println("에어컨 제습 모드 실행 완료");
    }

    else {
      Serial.println("알 수 없는 명령입니다.");
    }
  }
}