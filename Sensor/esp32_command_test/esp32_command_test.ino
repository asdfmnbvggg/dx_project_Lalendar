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
    else if (command == "power_cooling") {
      Serial.println("에어컨 파워냉방 실행 완료");
    }

    else if (command == "dry") {
      Serial.println("에어컨 제습 모드 실행 완료");
    }

    else if (command == "cooling") {
      Serial.println("에어컨 냉방 실행 완료");
    }

    // =========================
    // 세탁기
    // =========================
    else if (command == "washer_start") {
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
}