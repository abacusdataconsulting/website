/**
 * Contact Form Handler
 * Cloudflare Pages Function - forwards form data to the Email Worker via Service Binding
 *
 * Endpoint: POST /api/contact
 */

/**
 * Handle OPTIONS requests for CORS preflight.
 * Browsers send a preflight OPTIONS request before any cross-origin POST.
 * These headers tell the browser the POST is allowed.
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // cache preflight for 24 hours
    },
  });
}

/**
 * Handle POST requests - validate form and forward to Email Worker
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  // Every response needs CORS headers so the browser accepts it
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

    // Sanitize inputs — strip angle brackets to prevent HTML/script injection
    // in the email body (the Email Worker embeds these values in an HTML template)
    const sanitize = (str) => String(str).replace(/[<>]/g, '');
    const cleanData = {
      name: sanitize(name),
      email: sanitize(email),
      message: sanitize(message),
      service: service ? sanitize(service) : 'Not specified',
      timestamp: new Date().toISOString(),
    };

    // Forward to Email Worker via Service Binding.
    // The URL "https://email-worker/send" is a convention — Service Bindings
    // intercept the fetch so the hostname never actually resolves. Any URL
    // would work; the path /send is used for readability.
    const workerResponse = await env.EMAIL_WORKER.fetch(
      new Request('https://email-worker/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      })
    );

    if (!workerResponse.ok) {
      const errData = await workerResponse.json().catch(() => ({}));
      console.error('Email Worker returned error:', workerResponse.status, errData);
      throw new Error('Email delivery failed');
    }

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
