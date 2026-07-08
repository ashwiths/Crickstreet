import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Clean double quotes if passed directly
if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}
const formattedPrivateKey = privateKey?.replace(/\\n/g, '\n');

if (projectId && clientEmail && formattedPrivateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
    console.log('[Firebase Admin] Initialized with credentials from env variables.');
  } catch (error) {
    console.error('[Firebase Admin] Failed initializing with credentials:', error);
    admin.initializeApp();
  }
} else {
  try {
    admin.initializeApp();
    console.log('[Firebase Admin] Initialized with Application Default Credentials.');
  } catch (error) {
    console.warn('[Firebase Admin] Warning: Missing credentials. Please configure .env for database sync.');
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
