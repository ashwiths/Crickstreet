import { Router } from 'express';
import { sendOtpHandler, resendOtpHandler, verifyOtpHandler } from '../controllers/authController';

const router = Router();

router.post('/send-otp', sendOtpHandler);
router.post('/resend-otp', resendOtpHandler);
router.post('/verify-otp', verifyOtpHandler);

export default router;
