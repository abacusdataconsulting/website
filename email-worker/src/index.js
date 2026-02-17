/**
 * Abacus Email Worker
 *
 * Standalone Worker that sends contact form emails via Cloudflare Email Routing.
 * Called from the Pages site through a Service Binding (not publicly accessible).
 */

import { EmailMessage } from 'cloudflare:email';

// Email addresses used in every outbound message.
// fromEmail — the envelope sender; must be on a domain with Email Routing enabled.
// toEmail   — must exactly match the destination_address in wrangler.toml's
//             [[send_email]] binding, or Cloudflare will reject the send.
const CONFIG = {
  fromEmail: 'noreply@abacusdataconsulting.com',
  fromName: 'Abacus Website',
  toEmail: 'abacus.data.consulting@gmail.com',
  toName: 'Abacus Data Consulting',
};

// Cloudflare's send_email API requires a raw RFC 5322 MIME message (not a
// simple JSON payload). This function assembles a multipart/alternative
// message with both plain-text and HTML parts so email clients can pick
// whichever they prefer.
function buildMimeMessage({ from, fromName, to, toName, replyTo, replyToName, subject, textBody, htmlBody }) {
  const boundary = '----=_Part_' + Date.now().toString(36);

  const headers = [
    `From: "${fromName}" <${from}>`,
    `To: "${toName}" <${to}>`,
    `Reply-To: "${replyToName}" <${replyTo}>`,
    `Subject: ${subject}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@abacusdataconsulting.com>`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `Date: ${new Date().toUTCString()}`,
  ].join('\r\n');

  const body = [
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    textBody,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    `--${boundary}--`,
  ].join('\r\n');

  return headers + '\r\n\r\n' + body;
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { name, email, service, message, timestamp } = await request.json();

      if (!name || !email || !message) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const subject = `New Contact Form Submission from ${name}`;

      const textBody = `
New contact form submission from the Abacus Data Consulting website:

Name: ${name}
Email: ${email}
Service Interested In: ${service || 'Not specified'}

Message:
${message}

---
Submitted at: ${timestamp || new Date().toISOString()}
      `.trim();

      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #132853; color: #D2AE6A; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #132853; }
    .message-box { background: white; padding: 15px; border-left: 4px solid #D2AE6A; margin-top: 10px; }
    .footer { font-size: 12px; color: #666; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">New Contact Form Submission</h2>
    </div>
    <div class="content">
      <div class="field">
        <span class="label">Name:</span> ${name}
      </div>
      <div class="field">
        <span class="label">Email:</span> <a href="mailto:${email}">${email}</a>
      </div>
      <div class="field">
        <span class="label">Service Interested In:</span> ${service || 'Not specified'}
      </div>
      <div class="field">
        <span class="label">Message:</span>
        <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
      </div>
      <div class="footer">
        Submitted at: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
      </div>
    </div>
  </div>
</body>
</html>
      `.trim();

      const rawEmail = buildMimeMessage({
        from: CONFIG.fromEmail,
        fromName: CONFIG.fromName,
        to: CONFIG.toEmail,
        toName: CONFIG.toName,
        replyTo: email,
        replyToName: name,
        subject,
        textBody,
        htmlBody,
      });

      // env.EMAIL is the send_email binding defined in wrangler.toml.
      // EmailMessage wraps the raw MIME string with envelope from/to addresses.
      // .send() hands the message to Cloudflare Email Routing for delivery.
      const msg = new EmailMessage(CONFIG.fromEmail, CONFIG.toEmail, rawEmail);
      await env.EMAIL.send(msg);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Email Worker error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
