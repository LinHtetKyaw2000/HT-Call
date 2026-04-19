import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAQwwaAIvjFEfh9wXre3kZBfhG5BkZTjQ8",
  authDomain: "ht-call.firebaseapp.com",
  projectId: "ht-call",
  storageBucket: "ht-call.firebasestorage.app",
  messagingSenderId: "705950372059",
  appId: "1:705950372059:web:d7f089562be4fe2bf53cfe",
  measurementId: "G-0E7L4KN9VL"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;