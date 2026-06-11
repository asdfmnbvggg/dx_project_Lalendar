// src/services/taskService.js

import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function addTestTask() {
  const docRef = await addDoc(collection(db, "tasks"), {
    title: "테스트 가사일",
    category: "laundry",
    date: "2026-06-11",
    status: "pending",
    createdAt: serverTimestamp()
  });

  return docRef.id;
}

export async function getTasks() {
  const querySnapshot = await getDocs(collection(db, "tasks"));

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
}