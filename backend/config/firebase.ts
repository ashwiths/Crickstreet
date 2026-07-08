import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}
const formattedPrivateKey = privateKey?.replace(/\\n/g, '\n');

// Detect if credentials are not configured or still at placeholder values
const isConfigured = 
  projectId && 
  projectId !== 'crickstreet-890e7' &&
  clientEmail && 
  clientEmail !== 'firebase-adminsdk-xxxxx@crickstreet-890e7.iam.gserviceaccount.com' &&
  formattedPrivateKey && 
  formattedPrivateKey !== 'YOUR_PRIVATE_KEY_HERE';

export let isFirebaseMock = false;
let dbInstance: any = null;
let authInstance: any = null;

if (isConfigured) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
    console.log('[Firebase Admin] Initialized successfully with credentials.');
    dbInstance = admin.firestore();
    authInstance = admin.auth();
  } catch (error) {
    console.error('[Firebase Admin] Initialization failed, falling back to mock mode:', error);
    isFirebaseMock = true;
  }
} else {
  console.log('[Firebase Admin] Running in MOCK Mode for local testing (No credentials configured).');
  isFirebaseMock = true;
}

export { dbInstance as db, authInstance as auth };
