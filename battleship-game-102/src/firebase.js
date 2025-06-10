// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBndaZf6YxhEHW4OhK2juEwWiGyNoK--b8",
  authDomain: "battleships-eee70.firebaseapp.com",
  databaseURL: "https://battleships-eee70-default-rtdb.firebaseio.com/",
  projectId: "battleships-eee70",
  storageBucket: "battleships-eee70.firebasestorage.app",
  messagingSenderId: "798376945022",
  appId: "1:798376945022:web:f74f1be077c062acee3f2f",
  measurementId: "G-NRYQ3VSP62"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics
export const analytics = getAnalytics(app);

// Initialize Realtime Database
export const database = getDatabase(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export default app;
