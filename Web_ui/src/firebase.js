// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBz3ZoBgrT24K_lRTCg7dbysVbWCm2WDFU",
  authDomain: "lgdxsirius.firebaseapp.com",
  projectId: "lgdxsirius",
  storageBucket: "lgdxsirius.firebasestorage.app",
  messagingSenderId: "887074017638",
  appId: "1:887074017638:web:2b29be1d87a59518a678a7",
  measurementId: "G-M1FQ2VRV74",
  databaseURL: "https://lgdxsirius-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);
let analyticsPromise = null;

export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);

function getAnalyticsInstance() {
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch((error) => {
        if (import.meta.env.DEV) console.warn("[analytics] init skipped", error);
        return null;
      });
  }

  return analyticsPromise;
}

export async function logAnalyticsEvent(eventName, params = {}) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, eventName, params);
}
