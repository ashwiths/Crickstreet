import crypto from 'crypto';
import { db, isFirebaseMock } from '../config/firebase';

const OTP_COLLECTION = 'otp_codes';
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

export interface OtpRecord {
  email: string;
  otp: string; // Hashed OTP
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  used: boolean;
}

// In-memory fallback database for testing without Firebase project credentials
const inMemoryOtpStore = new Map<string, OtpRecord>();

/**
 * Hashes the raw OTP string using SHA-256.
 */
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Checks for rate limits and generates a secure random 6-digit OTP code,
 * storing its hash in Firestore (or in-memory store if in mock mode).
 * 
 * @param email User email address.
 * @returns The raw 6-digit OTP code.
 */
export async function generateOtp(email: string): Promise<string> {
  const now = new Date();
  const rawCode = crypto.randomInt(100000, 999999).toString();
  const hashedCode = hashOtp(rawCode);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

  // 1. Mock Mode implementation
  if (isFirebaseMock) {
    const existing = inMemoryOtpStore.get(email);
    if (existing && !existing.used && !existing.verified) {
      // Cooldown limit validation
      if (now.getTime() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS) {
        throw new Error('Please wait 60 seconds before requesting a new verification code.');
      }
      existing.used = true;
    }

    inMemoryOtpStore.set(email, {
      email,
      otp: hashedCode,
      createdAt: now,
      expiresAt,
      attempts: 0,
      verified: false,
      used: false,
    });

    console.log(`[OTP Service MOCK] Saved OTP for ${email}. Expires: ${expiresAt.toLocaleTimeString()}`);
    return rawCode;
  }

  // 2. Production Firestore implementation
  const collectionRef = db.collection(OTP_COLLECTION);
  const snapshot = await collectionRef
    .where('email', '==', email)
    .where('used', '==', false)
    .where('verified', '==', false)
    .get();

  if (!snapshot.empty) {
    let hasCooldownConflict = false;
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      const createdAt = data.createdAt.toDate();
      if (now.getTime() - createdAt.getTime() < RESEND_COOLDOWN_MS) {
        hasCooldownConflict = true;
      }
    });

    if (hasCooldownConflict) {
      throw new Error('Please wait 60 seconds before requesting a new verification code.');
    }

    const batch = db.batch();
    snapshot.forEach((doc: any) => {
      batch.update(doc.ref, { used: true });
    });
    await batch.commit();
    console.log(`[OTP Service] Invalidated previous OTP records for ${email}`);
  }

  await collectionRef.add({
    email,
    otp: hashedCode,
    createdAt: now,
    expiresAt,
    attempts: 0,
    verified: false,
    used: false,
  });

  console.log(`[OTP Service] Stored new OTP record for ${email}. Expires at: ${expiresAt.toLocaleTimeString()}`);
  return rawCode;
}

/**
 * Validates the raw OTP code submitted by the user.
 * 
 * @param email User email address.
 * @param rawCode The submitted 6-digit OTP string.
 * @returns boolean true if successfully validated.
 */
export async function verifyOtpCode(email: string, rawCode: string): Promise<boolean> {
  const now = new Date();

  // 1. Mock Mode implementation
  if (isFirebaseMock) {
    const record = inMemoryOtpStore.get(email);
    if (!record || record.used || record.verified) {
      throw new Error('No active verification request found. Please request a new code.');
    }

    if (now.getTime() > record.expiresAt.getTime()) {
      record.used = true;
      throw new Error('Verification code has expired. Please request a new one.');
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      record.used = true;
      throw new Error('Too many incorrect attempts. Please request a new code.');
    }

    const hashedInput = hashOtp(rawCode);
    if (record.otp !== hashedInput) {
      record.attempts += 1;
      const remaining = MAX_ATTEMPTS - record.attempts;
      if (remaining <= 0) {
        record.used = true;
        throw new Error('Too many incorrect attempts. Please request a new code.');
      }
      throw new Error(`Incorrect verification code. Attempts remaining: ${remaining}`);
    }

    record.verified = true;
    record.used = true;
    console.log(`[OTP Service MOCK] Verified OTP successfully for ${email}`);
    return true;
  }

  // 2. Production Firestore implementation
  const collectionRef = db.collection(OTP_COLLECTION);
  const snapshot = await collectionRef
    .where('email', '==', email)
    .where('used', '==', false)
    .where('verified', '==', false)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error('No active verification request found. Please request a new code.');
  }

  const otpDoc = snapshot.docs[0];
  const otpData = otpDoc.data() as OtpRecord;

  const expiresAt = (otpData.expiresAt as any).toDate();
  if (now.getTime() > expiresAt.getTime()) {
    await otpDoc.ref.update({ used: true });
    throw new Error('Verification code has expired. Please request a new one.');
  }

  if (otpData.attempts >= MAX_ATTEMPTS) {
    await otpDoc.ref.update({ used: true });
    throw new Error('Too many incorrect attempts. Please request a new code.');
  }

  const hashedInput = hashOtp(rawCode);
  if (otpData.otp !== hashedInput) {
    const newAttempts = otpData.attempts + 1;
    await otpDoc.ref.update({ attempts: newAttempts });
    
    const remaining = MAX_ATTEMPTS - newAttempts;
    if (remaining <= 0) {
      await otpDoc.ref.update({ used: true });
      throw new Error('Too many incorrect attempts. Please request a new code.');
    }
    throw new Error(`Incorrect verification code. Attempts remaining: ${remaining}`);
  }

  await otpDoc.ref.update({
    verified: true,
    used: true,
  });

  console.log(`[OTP Service] Verified OTP successfully for ${email}`);
  return true;
}
