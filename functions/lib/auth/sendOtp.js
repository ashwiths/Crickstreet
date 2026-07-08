"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtp = void 0;
const https_1 = require("firebase-functions/v2/https");
const otpService_1 = require("../services/otpService");
const emailService_1 = require("../services/emailService");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
exports.sendOtp = (0, https_1.onCall)(async (request) => {
    const { email } = request.data || {};
    if (!email || !emailRegex.test(email)) {
        throw new https_1.HttpsError('invalid-argument', 'Please provide a valid email address.');
    }
    try {
        console.log(`[sendOtp] Generating OTP code for: ${email}`);
        const rawOtp = await (0, otpService_1.generateOtp)(email);
        await (0, emailService_1.sendOtpEmail)(email, rawOtp);
        return { success: true, message: 'Verification code sent successfully.' };
    }
    catch (error) {
        console.error(`[sendOtp] Error:`, error.message);
        // Map rate limit/wait times to too-many-requests status code
        const isRateLimit = error.message.includes('wait');
        throw new https_1.HttpsError(isRateLimit ? 'resource-exhausted' : 'internal', error.message || 'Failed to generate verification code.');
    }
});
//# sourceMappingURL=sendOtp.js.map