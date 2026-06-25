import {
  ref,
  onValue,
  off,
  set,
  push,
  query,
  orderByChild,
  limitToLast,
} from "firebase/database";
import { realtimeDb } from "../firebase";

// 최신 센서값 실시간 구독
export function subscribeSensorLatest(deviceId, callback) {
  const sensorRef = ref(realtimeDb, `sensor_latest/${deviceId}`);

  const unsubscribe = onValue(sensorRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || null);
  });

  return () => {
    off(sensorRef);
    unsubscribe();
  };
}

// 최신 센서값 저장/덮어쓰기
export async function writeSensorLatest(deviceId, sensorData) {
  const sensorRef = ref(realtimeDb, `sensor_latest/${deviceId}`);

  return set(sensorRef, {
    ...sensorData,
    updatedAt: Date.now(),
  });
}

// 센서 로그 누적 저장
export async function addSensorLog(deviceId, sensorData) {
  const logsRef = ref(realtimeDb, `sensor_logs/${deviceId}/logs`);

  return push(logsRef, {
    ...sensorData,
    createdAt: Date.now(),
  });
}

// 최근 센서 로그 구독
export function subscribeRecentSensorLogs(deviceId, callback, count = 20) {
  const logsQuery = query(
    ref(realtimeDb, `sensor_logs/${deviceId}/logs`),
    orderByChild("createdAt"),
    limitToLast(count)
  );

  const unsubscribe = onValue(logsQuery, (snapshot) => {
    const value = snapshot.val();

    if (!value) {
      callback([]);
      return;
    }

    const logs = Object.entries(value)
      .map(([id, data]) => ({
        id,
        ...data,
      }))
      .sort((a, b) => a.createdAt - b.createdAt);

    callback(logs);
  });

  return () => {
    off(logsQuery);
    unsubscribe();
  };
}

// 앱에서 아두이노/가전으로 명령 전송
export async function sendDeviceCommand(deviceId, commandData) {
  const commandRef = ref(realtimeDb, `device_commands/${deviceId}`);

  return set(commandRef, {
    ...commandData,
    status: "pending",
    createdAt: Date.now(),
  });
}

// subscribeSensorLatest
// → 앱이 Firebase에서 최신 센서값을 실시간으로 받아옴

// writeSensorLatest
// → 테스트용으로 최신 센서값을 Firebase에 저장

// addSensorLog
// → 3초마다 들어오는 로그 데이터를 누적 저장

// subscribeRecentSensorLogs
// → 최근 로그 몇 개만 불러옴

// sendDeviceCommand
// → 앱이 Firebase에 가전 제어 명령을 저장
