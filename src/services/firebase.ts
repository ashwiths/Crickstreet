import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  Auth,
  // @ts-ignore
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration placeholders
// Note: Replace these credentials with your Firebase Project Configuration from the Firebase Console.
const firebaseConfig = {
  apiKey: "AIzaSyC062R_qS1jbdlknD1NWrArfgnNgHcU2Nc",
  authDomain: "crickstreet-890e7.firebaseapp.com",
  projectId: "crickstreet-890e7",
  storageBucket: "crickstreet-890e7.firebasestorage.app",
  messagingSenderId: "461731506048",
  appId: "1:461731506048:web:d1bf43596bd0b607268365"
}

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with persistent React Native storage
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

// Initialize Firestore Database
const db = getFirestore(app);

export { app, auth, db };
