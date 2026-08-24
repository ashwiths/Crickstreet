export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticketId, ticketRef, userName, userEmail, category, subject, message, screenshotUrl, createdAt } = body;

    const safeRef = ticketId || ticketRef || `SUP-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Validation
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Subject is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (subject.length > 200) {
      return new Response(
        JSON.stringify({ success: false, error: 'Subject cannot exceed 200 characters.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (message.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message cannot exceed 5000 characters.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const senderEmail = userEmail && emailRegex.test(userEmail) ? userEmail : 'user@crickstreet.com';

    // 2. Secret Configuration
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'infantashil55@gmail.com';
    const SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev';

    if (!RESEND_API_KEY) {
      console.warn('[Support API] RESEND_API_KEY is not set in environment.');
      return new Response(
        JSON.stringify({
          success: false,
          warning: 'Ticket saved in Firestore, but Resend API key is not configured on server.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formattedTime = createdAt
      ? new Date(createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : new Date().toLocaleString();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Support Ticket — ${safeRef}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f1; margin: 0; padding: 20px; color: #1a1a1a; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e8e4d4; }
    .header { background: linear-gradient(135deg, #1e3a1a 0%, #0d1f3c 100%); padding: 28px 24px; color: #ffffff; }
    .badge { display: inline-block; background: #a8cd55; color: #0d1f3c; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .title { font-size: 22px; font-weight: 800; margin: 0 0 4px 0; color: #ffffff; }
    .ticket-id { font-size: 14px; opacity: 0.85; margin: 0; color: #ffffff; }
    .body { padding: 24px; }
    .section-title { font-size: 12px; font-weight: 800; color: #2d5016; text-transform: uppercase; letter-spacing: 0.8px; margin: 20px 0 8px 0; border-bottom: 2px solid #f0f4ec; padding-bottom: 4px; }
    .field-row { margin-bottom: 12px; }
    .field-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
    .field-value { font-size: 15px; color: #1a1a1a; font-weight: 500; word-break: break-word; }
    .message-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 15px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; margin-top: 6px; }
    .btn { display: inline-block; background: #2d5016; color: #ffffff !important; font-weight: 800; font-size: 14px; text-decoration: none; padding: 10px 20px; border-radius: 8px; margin-top: 6px; }
    .footer { padding: 20px 24px; background: #fafafa; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">Status: OPEN</span>
      <h1 class="title">New Support Ticket 🏏</h1>
      <p class="ticket-id">Ticket ID: <strong>#${safeRef}</strong></p>
    </div>
    <div class="body">
      <div class="section-title">User Information</div>
      <div class="field-row">
        <div class="field-label">Name</div>
        <div class="field-value">${userName || 'Crickstreet User'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Email</div>
        <div class="field-value"><a href="mailto:${senderEmail}">${senderEmail}</a></div>
      </div>

      <div class="section-title">Ticket Information</div>
      <div class="field-row">
        <div class="field-label">Category</div>
        <div class="field-value">${category || 'General Inquiry'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Subject</div>
        <div class="field-value"><strong>${subject}</strong></div>
      </div>
      <div class="field-row">
        <div class="field-label">Message</div>
        <div class="message-box">${message}</div>
      </div>

      ${
        screenshotUrl
          ? `
      <div class="section-title">Screenshot</div>
      <div class="field-row">
        <a href="${screenshotUrl}" target="_blank" class="btn">View Screenshot 📷</a>
      </div>
      `
          : ''
      }

      <div class="section-title">Submission Details</div>
      <div class="field-row">
        <div class="field-label">Created At</div>
        <div class="field-value">${formattedTime}</div>
      </div>
    </div>
    <div class="footer">
      Delivered securely via Crickstreet Serverless Support System.
    </div>
  </div>
</body>
</html>
    `;

    // 3. Dispatch to Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Crickstreet Support <${SENDER_EMAIL}>`,
        to: [SUPPORT_EMAIL],
        reply_to: senderEmail,
        subject: `New Support Ticket — ${safeRef}`,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[Support API] Resend error:', resendData);
      return new Response(
        JSON.stringify({
          success: false,
          error: resendData.message || 'Failed to dispatch email via Resend.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id, ticketId: safeRef }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Support API] Internal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
