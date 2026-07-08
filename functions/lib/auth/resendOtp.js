"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendOtp = void 0;
const https_1 = require("firebase-functions/v2/https");
const otpService_1 = require("../services/otpService");
const emailService_1 = require("../services/emailService");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
exports.resendOtp = (0, https_1.onCall)(async (request) => {
    const { email } = request.data || {};
    if (!email || !emailRegex.test(email)) {
        throw new https_1.HttpsError('invalid-argument', 'Please provide a valid email address.');
    }
    try {
        console.log(`[resendOtp] Regenerating OTP code for: ${email}`);
        const rawOtp = await (0, otpService_1.generateOtp)(email);
        await (0, emailService_1.sendOtpEmail)(email, rawOtp);
        return { success: true, message: 'Verification code resent successfully.' };
    }
    catch (error) {
        console.error(`[resendOtp] Error:`, error.message);
        const isRateLimit = error.message.includes('wait');
        throw new https_1.HttpsError(isRateLimit ? 'resource-exhausted' : 'internal', error.message || 'Failed to resend verification code.');
    }
});
//# sourceMappingURL=resendOtp.js.map