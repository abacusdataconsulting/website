/**
 * Contact Form Handler
 * Cloudflare Pages Function - sends email via MailChannels
 *
 * Endpoint: POST /api/contact
 */

// Configuration
const CONFIG = {
  toEmail: 'abacus.data.consulting@gmail.com',
  toName: 'Abacus Data Consulting',
  fromEmail: 'noreply@abacusdataconsulting.com', // Update with your domain
  fromName: 'Abacus Website',
};

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Handle POST requests - process contact form
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers for response
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    // Parse form data
    const contentType = request.headers.get('Content-Type') || '';
    let formData;

    if (contentType.includes('application/json')) {
      formData = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const data = await request.formData();
      formData = Object.fromEntries(data);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Unsupported content type' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate required fields
    const { name, email, message, service } = formData;

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: name, email, and message are required'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Sanitize inputs (basic XSS prevention)
    const sanitize = (str) => String(str).replace(/[<>]/g, '');
    const cleanName = sanitize(name);
    const cleanEmail = sanitize(email);
    const cleanMessage = sanitize(message);
    const cleanService = service ? sanitize(service) : 'Not specified';

    // Build email content
    const emailSubject = `New Contact Form Submission from ${cleanName}`;
    const emailBody = `
New contact form submission from the Abacus Data Consulting website:

Name: ${cleanName}
Email: ${cleanEmail}
Service Interested In: ${cleanService}

Message:
${cleanMessage}

---
Submitted at: ${new Date().toISOString()}
    `.trim();

    const emailHtml = `
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
        <span class="label">Name:</span> ${cleanName}
      </div>
      <div class="field">
        <span class="label">Email:</span> <a href="mailto:${cleanEmail}">${cleanEmail}</a>
      </div>
      <div class="field">
        <span class="label">Service Interested In:</span> ${cleanService}
      </div>
      <div class="field">
        <span class="label">Message:</span>
        <div class="message-box">${cleanMessage.replace(/\n/g, '<br>')}</div>
      </div>
      <div class="footer">
        Submitted at: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send email via MailChannels
    const mailChannelsRequest = new Request('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: CONFIG.toEmail, name: CONFIG.toName }],
          },
        ],
        from: {
          email: CONFIG.fromEmail,
          name: CONFIG.fromName,
        },
        reply_to: {
          email: cleanEmail,
          name: cleanName,
        },
        subject: emailSubject,
        content: [
          {
            type: 'text/plain',
            value: emailBody,
          },
          {
            type: 'text/html',
            value: emailHtml,
          },
        ],
      }),
    });

    const mailResponse = await fetch(mailChannelsRequest);

    if (!mailResponse.ok) {
      const errorText = await mailResponse.text();
      console.error('MailChannels error:', errorText);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send email. Please try again later.'
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thank you for your message! We will get back to you within 1-2 business days.'
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Contact form error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred. Please try again later.'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}
