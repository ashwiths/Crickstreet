import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { generateOtp } from '../services/otpService';
import { sendOtpEmail } from '../services/emailService';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const resendOtp = onCall(async (request) => {
  const { email } = request.data || {};

  if (!email || !emailRegex.test(email)) {
    throw new HttpsError('invalid-argument', 'Please provide a valid email address.');
  }

  try {
    console.log(`[resendOtp] Regenerating OTP code for: ${email}`);
    const rawOtp = await generateOtp(email);
    
    await sendOtpEmail(email, rawOtp);
    
    return { success: true, message: 'Verification code resent successfully.' };
  } catch (error: any) {
    console.error(`[resendOtp] Error:`, error.message);
    const isRateLimit = error.message.includes('wait');
    throw new HttpsError(
      isRateLimit ? 'resource-exhausted' : 'internal', 
      error.message || 'Failed to resend verification code.'
    );
  }
});
