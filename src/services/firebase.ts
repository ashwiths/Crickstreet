import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  Auth,
  // @ts-ignore
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

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

// Safely initialize Firestore Database with long polling to prevent QUIC errors and handle hot-reload duplication
let db: any;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch (err) {
  db = getFirestore(app);
}

// Initialize Functions (targeting the us-central1 region)
const functions = getFunctions(app, 'us-central1');

// Connect to functions emulator during local development
if (__DEV__) {
  console.log('[Firebase Client] Running in dev mode. Connecting to Functions Emulator on localhost:5001...');
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { app, auth, db, functions };
