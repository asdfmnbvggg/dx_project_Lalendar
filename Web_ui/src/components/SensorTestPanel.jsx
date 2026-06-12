import { useEffect, useState } from "react";
import {
  subscribeSensorLatest,
  writeSensorLatest,
  addSensorLog,
  sendDeviceCommand,
} from "../services/sensorRealtimeService";

const DEVICE_ID = "living_room_01";

function SensorTestPanel() {
  const [sensor, setSensor] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeSensorLatest(DEVICE_ID, (data) => {
      console.log("실시간 센서 데이터:", data);
      setSensor(data);
    });

    return unsubscribe;
  }, []);

  const handleWriteTestSensor = async () => {
    const testData = {
      userId: "sumin",
      temperature: 25.3,
      humidity: 68,
      dust: 42,
    };

    await writeSensorLatest(DEVICE_ID, testData);
    await addSensorLog(DEVICE_ID, testData);

    alert("테스트 센서 데이터 저장 완료");
  };

  const handleSendFanCommand = async () => {
    await sendDeviceCommand(DEVICE_ID, {
      command: "fan_on",
      reason: "테스트용 팬 작동 명령입니다.",
    });

    alert("팬 작동 명령 전송 완료");
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Firebase Realtime DB 센서 테스트</h2>

      <button onClick={handleWriteTestSensor}>
        테스트 센서값 저장
      </button>

      <button onClick={handleSendFanCommand} style={{ marginLeft: 8 }}>
        팬 켜기 명령 전송
      </button>

      <h3>현재 센서값</h3>

      <pre
        style={{
          background: "#f4f4f4",
          padding: 16,
          borderRadius: 8,
          marginTop: 12,
        }}
      >
        {sensor ? JSON.stringify(sensor, null, 2) : "센서 데이터 없음"}
      </pre>
    </div>
  );
}

export default SensorTestPanel;