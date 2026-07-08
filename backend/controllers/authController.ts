import { Request, Response } from 'express';
import { generateOtp, verifyOtpCode } from '../services/otpService';
import { sendOtpEmail } from '../services/emailService';
import { auth, db } from '../config/firebase';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Handles generating and sending OTP to user.
 */
export async function sendOtpHandler(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  if (!email || !emailRegex.test(email)) {
    res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    return;
  }

  try {
    console.log(`[Auth Controller] OTP request received for email: ${email}`);
    
    // Generate secure OTP
    const rawOtp = await generateOtp(email);
    
    // Send email using Nodemailer
    await sendOtpEmail(email, rawOtp);
    
    console.log(`[Auth Controller] OTP generated and sent successfully to: ${email}`);
    res.status(200).json({ success: true, message: 'Verification code sent successfully.' });
  } catch (error: any) {
    console.error(`[Auth Controller] Error in send-otp:`, error.message);
    res.status(error.message.includes('wait') ? 429 : 500).json({ 
      success: false, 
      message: error.message || 'An error occurred while generating verification code.' 
    });
  }
}

/**
 * Handles resending OTP code to user.
 */
export async function resendOtpHandler(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  if (!email || !emailRegex.test(email)) {
    res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    return;
  }

  try {
    console.log(`[Auth Controller] OTP resend request received for email: ${email}`);
    
    // Generate secure OTP
    const rawOtp = await generateOtp(email);
    
    // Send email
    await sendOtpEmail(email, rawOtp);
    
    console.log(`[Auth Controller] OTP regenerated and resent successfully to: ${email}`);
    res.status(200).json({ success: true, message: 'Verification code resent successfully.' });
  } catch (error: any) {
    console.error(`[Auth Controller] Error in resend-otp:`, error.message);
    res.status(error.message.includes('wait') ? 429 : 500).json({ 
      success: false, 
      message: error.message || 'An error occurred while resending verification code.' 
    });
  }
}

/**
 * Handles verifying user submitted OTP, logging in, or creating the user.
 */
export async function verifyOtpHandler(req: Request, res: Response): Promise<void> {
  const { email, otp } = req.body;

  if (!email || !otp || otp.length !== 6) {
    res.status(400).json({ success: false, message: 'Please provide email and 6-digit verification code.' });
    return;
  }

  try {
    console.log(`[Auth Controller] Verifying OTP for email: ${email}`);
    
    // 1. Verify code
    await verifyOtpCode(email, otp);

    // 2. Fetch or create user in Firebase auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`[Auth Controller] Found existing Firebase User: ${userRecord.uid}`);
    } catch (err: any) {
      // Code 'auth/user-not-found' means we create it
      if (err.code === 'auth/user-not-found') {
        console.log(`[Auth Controller] User not found. Creating new Firebase User account for: ${email}`);
        userRecord = await auth.createUser({
          email,
          emailVerified: true,
        });
        console.log(`[Auth Controller] Successfully created new user: ${userRecord.uid}`);
      } else {
        throw err;
      }
    }

    // 3. Sync User Profile in Firestore
    const userRef = db.collection('users').doc(userRecord.uid);
    const userSnap = await userRef.get();
    
    const now = new Date();
    const defaultDisplayName = email.split('@')[0];
    
    if (!userSnap.exists) {
      console.log(`[Auth Controller] Creating user document in Firestore for UID: ${userRecord.uid}`);
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
      console.log(`[Auth Controller] Updating user last login in Firestore for UID: ${userRecord.uid}`);
      await userRef.set({
        lastLogin: now,
        provider: 'email',
      }, { merge: true });
    }

    // 4. Generate custom auth token
    console.log(`[Auth Controller] Generating Firebase Custom Token for UID: ${userRecord.uid}`);
    const customToken = await auth.createCustomToken(userRecord.uid);

    res.status(200).json({
      success: true,
      customToken,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || defaultDisplayName,
        photoURL: userRecord.photoURL || '',
      }
    });
    console.log(`[Auth Controller] OTP verification completed successfully for ${email}`);
  } catch (error: any) {
    console.error(`[Auth Controller] Error verifying OTP for ${email}:`, error.message);
    res.status(400).json({ success: false, message: error.message || 'Invalid code.' });
  }
}
