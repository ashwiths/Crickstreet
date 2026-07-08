import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { verifyOtpCode } from '../services/otpService';
import { db, auth } from '../firebase';

export const verifyOtp = onCall(async (request) => {
  const { email, otp } = request.data || {};

  if (!email || !otp || otp.length !== 6) {
    throw new HttpsError('invalid-argument', 'Please provide email and 6-digit verification code.');
  }

  try {
    console.log(`[verifyOtp] Verifying OTP for: ${email}`);
    
    // 1. Verify code
    await verifyOtpCode(email, otp);

    // 2. Fetch or create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`[verifyOtp] Found existing Firebase User: ${userRecord.uid}`);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        console.log(`[verifyOtp] User not found. Creating new Firebase User account for: ${email}`);
        userRecord = await auth.createUser({
          email,
          emailVerified: true,
        });
        console.log(`[verifyOtp] Successfully created new user: ${userRecord.uid}`);
      } else {
        throw err;
      }
    }

    // 3. Sync profile in Firestore
    const userRef = db.collection('users').doc(userRecord.uid);
    const userSnap = await userRef.get();
    const now = new Date();
    const defaultDisplayName = email.split('@')[0];

    if (!userSnap.exists) {
      console.log(`[verifyOtp] Creating user document in Firestore for UID: ${userRecord.uid}`);
      await userRef.set({
        uid: userRecord.uid,
        email,
        displayName: userRecord.displayName || defaultDisplayName,
        photoURL: userRecord.photoURL || '',
        createdAt: now,
        lastLogin: now,
        provider: 'email',
      });
    } else {
      console.log(`[verifyOtp] Updating user last login in Firestore for UID: ${userRecord.uid}`);
      await userRef.set({
        lastLogin: now,
        provider: 'email',
      }, { merge: true });
    }

    // 4. Generate custom auth token
    console.log(`[verifyOtp] Generating Firebase Custom Token for UID: ${userRecord.uid}`);
    const customToken = await auth.createCustomToken(userRecord.uid);

    return {
      success: true,
      customToken,
      user: {
        uid: userRecord.uid,
        email: userRecord.email || email,
        displayName: userRecord.displayName || defaultDisplayName,
        photoURL: userRecord.photoURL || '',
      }
    };
  } catch (error: any) {
    console.error(`[verifyOtp] Error:`, error.message);
    throw new HttpsError('permission-denied', error.message || 'OTP verification failed.');
  }
});
