import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

export const db = admin.firestore();
export const auth = admin.auth();
