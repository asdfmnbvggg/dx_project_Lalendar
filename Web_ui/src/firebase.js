// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBz3ZoBgrT24K_lRTCg7dbysVbWCm2WDFU",
  authDomain: "lgdxsirius.firebaseapp.com",
  projectId: "lgdxsirius",
  storageBucket: "lgdxsirius.firebasestorage.app",
  messagingSenderId: "887074017638",
  appId: "1:887074017638:web:2b29be1d87a59518a678a7",
  measurementId: "G-M1FQ2VRV74"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);