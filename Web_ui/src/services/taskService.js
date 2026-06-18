// src/services/taskService.js

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export const FIRESTORE_SCHEDULE_USER_IDS = ["dada", "sumin", "jea"];

export function isFirestoreScheduleUser(userId) {
  return FIRESTORE_SCHEDULE_USER_IDS.includes(userId);
}

export async function createUserSchedule(userId, scheduleData) {
  assertScheduleUser(userId);
  const docRef = await addDoc(getUserSchedulesCollection(userId), {
    ...toFirestoreScheduleData(scheduleData),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function getUserSchedules(userId) {
  assertScheduleUser(userId);
  const schedulesQuery = query(getUserSchedulesCollection(userId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(schedulesQuery);

  return querySnapshot.docs.map((scheduleDoc) => ({
    id: scheduleDoc.id,
    scheduleId: scheduleDoc.id,
    userId,
    ...scheduleDoc.data(),
  }));
}

export async function updateUserSchedule(userId, scheduleId, updates) {
  assertScheduleUser(userId);
  if (!scheduleId) throw new Error("scheduleId is required");

  await updateDoc(getUserScheduleDoc(userId, scheduleId), {
    ...toFirestoreScheduleData(updates, { partial: true }),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUserSchedule(userId, scheduleId) {
  assertScheduleUser(userId);
  if (!scheduleId) throw new Error("scheduleId is required");

  await deleteDoc(getUserScheduleDoc(userId, scheduleId));
}

function getUserSchedulesCollection(userId) {
  return collection(db, "users", userId, "schedules");
}

function getUserScheduleDoc(userId, scheduleId) {
  return doc(db, "users", userId, "schedules", scheduleId);
}

function assertScheduleUser(userId) {
  if (!isFirestoreScheduleUser(userId)) {
    throw new Error(`Unsupported schedule user: ${userId || "unknown"}`);
  }
}

function toFirestoreScheduleData(scheduleData = {}, options = {}) {
  const data = {};
  const fields = [
    "title",
    "date",
    "startTime",
    "endTime",
    "type",
    "repeat",
    "daysOfWeek",
    "place",
    "description",
    "reminder",
    "done",
  ];

  fields.forEach((field) => {
    if (scheduleData[field] !== undefined) data[field] = scheduleData[field];
  });

  if (!options.partial) {
    data.title = data.title || "새 일정";
    data.type = data.type || "personal";
    data.repeat = data.repeat || "none";
  }

  return data;
}
