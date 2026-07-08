import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Nodemailer SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

/**
 * Sends a premium-designed HTML verification OTP email.
 * 
 * @param to The target recipient email address.
 * @param code The 6-digit OTP code string.
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Crickstreet" <no-reply@crickstreet.app>',
    to,
    subject: 'Your Crickstreet Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Crickstreet Verification</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #F3F4F1;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 500px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border: 1px solid #E8E4D4;
          }
          .header {
            background-color: #FFFFFF;
            padding: 32px 24px;
            text-align: center;
            border-bottom: 2px solid #F3F4F1;
          }
          .logo {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 4px;
            color: #111827;
            margin: 0 0 4px 0;
          }
          .logo-sub {
            font-size: 11px;
            color: #59C749;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }
          .content {
            padding: 32px 24px;
            text-align: center;
          }
          .welcome-title {
            font-size: 22px;
            font-weight: 800;
            color: #111827;
            margin: 0 0 12px 0;
          }
          .welcome-text {
            font-size: 14px;
            color: #4B5563;
            line-height: 1.5;
            margin: 0 0 32px 0;
          }
          .otp-box {
            background-color: #F9FAFB;
            border: 2px dashed #CCD4C5;
            border-radius: 12px;
            padding: 18px 24px;
            margin: 0 auto 32px auto;
            display: inline-block;
          }
          .otp-code {
            font-size: 36px;
            font-weight: 800;
            letter-spacing: 6px;
            color: #59C749;
          }
          .notice-box {
            background-color: rgba(255, 69, 58, 0.04);
            border: 1px solid rgba(255, 69, 58, 0.1);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 24px;
          }
          .notice-text {
            font-size: 12px;
            color: #EF4444;
            margin: 0;
            font-weight: 500;
          }
          .footer {
            background-color: #F9FAFB;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
          }
          .footer-text {
            font-size: 11px;
            color: #9CA3AF;
            line-height: 1.5;
            margin: 0;
          }
          .footer-link {
            color: #59C749;
            text-decoration: none;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CRICKSTREET</div>
            <div class="logo-sub">Match Management Platform</div>
          </div>
          <div class="content">
            <h1 class="welcome-title">Your Verification Code</h1>
            <p class="welcome-text">
              Use the single-use code below to complete your login. This code is valid for exactly <strong>5 minutes</strong>.
            </p>
            
            <div class="otp-box">
              <span class="otp-code">${code}</span>
            </div>

            <div class="notice-box">
              <p class="notice-text">
                If you did not request this verification code, you can safely ignore this email. Someone else may have typed your address by mistake.
              </p>
            </div>
          </div>
          <div class="footer">
            <p class="footer-text">
              Sent by Crickstreet App. Please do not reply directly to this mail.<br>
              Need assistance? Contact <a href="mailto:support@crickstreet.app" class="footer-link">support@crickstreet.app</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] OTP mail successfully sent to ${to}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Email Service] Failed to send OTP email to ${to}:`, error);
    throw new Error('Email delivery failed. Please verify your SMTP settings.');
  }
}
