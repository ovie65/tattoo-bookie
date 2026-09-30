const TEST_EMAIL = 'scminkofficial5@gmail.com';
const FROM_EMAIL = 'scminkofficial5@gmail.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, to, subject, html, attachments, bookingRef } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) {
      console.error('RESEND_API_KEY environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error: missing API key' });
    }

    const emailPayload = {
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html
    };

    if (attachments && attachments.length > 0) {
      emailPayload.attachments = attachments.map(att => ({
        filename: att.filename || 'reference.png',
        content: att.content,
        content_type: att.content_type || 'image/png'
      }));
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify(emailPayload)
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error(`Resend API error (${type}):`, resendResponse.status, errorData);
      return res.status(resendResponse.status).json({
        error: `Email send failed: ${resendResponse.status}`,
        details: errorData
      });
    }

    const result = await resendResponse.json();
    console.log(`✓ Email sent successfully [${type}] to ${to} — Booking: ${bookingRef}`);

    return res.status(200).json({
      success: true,
      id: result.id,
      type: type,
      to: to
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}