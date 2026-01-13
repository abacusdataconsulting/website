# Abacus Data Consulting - Cloudflare Pages Setup Guide

This guide covers deploying the website to Cloudflare Pages with serverless functions for contact form handling.

## Prerequisites

- Cloudflare account
- Domain added to Cloudflare (DNS managed by Cloudflare)
- Node.js 18+ installed locally
- Git repository (GitHub, GitLab, or Bitbucket)

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Run local development server
npm run dev
```

Visit `http://localhost:8788` to test the site locally.

---

## Deployment Steps

### 1. Push to Git Repository

Ensure your code is pushed to a Git repository (GitHub recommended for Cloudflare Pages integration).

### 2. Create Cloudflare Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create application** → **Pages**
3. Connect your Git repository
4. Configure build settings:
   - **Build command:** (leave empty - static site)
   - **Build output directory:** `/` (root)
5. Click **Save and Deploy**

### 3. Configure Custom Domain

1. In your Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `abacusdataconsulting.com`)
4. Cloudflare will automatically configure DNS records

---

## Email Configuration (MailChannels)

For the contact form to send emails, you need to configure DNS records for MailChannels.

### Required DNS Records

Add these DNS records in your Cloudflare DNS settings:

#### SPF Record (Required)
| Type | Name | Content |
|------|------|---------|
| TXT | @ | `v=spf1 a mx include:relay.mailchannels.net ~all` |

#### Domain Lockdown (Required for MailChannels)
This prevents unauthorized use of your domain for sending emails:

| Type | Name | Content |
|------|------|---------|
| TXT | _mailchannels | `v=mc1 cfid=YOUR_ACCOUNT_ID` |

To find your Cloudflare Account ID:
1. Go to any zone in Cloudflare Dashboard
2. Scroll down on the right sidebar
3. Copy the **Account ID**

#### DKIM Record (Recommended for better deliverability)
Generate DKIM keys and add:

| Type | Name | Content |
|------|------|---------|
| TXT | mailchannels._domainkey | `v=DKIM1; p=YOUR_PUBLIC_KEY` |

### Update the Function Configuration

Edit `functions/api/contact.js` and update the `CONFIG` object with your domain:

```javascript
const CONFIG = {
  toEmail: 'abacus.data.consulting@gmail.com',
  toName: 'Abacus Data Consulting',
  fromEmail: 'noreply@abacus.com',  // ← Update this
  fromName: 'Abacus Website',
};
```

---

## Testing the Contact Form

### Local Testing

1. Run `npm run dev`
2. Go to `http://localhost:8788/contact.html`
3. Submit a test form
4. Check the terminal for any errors

**Note:** MailChannels may not work in local development. Test email delivery after deploying to Cloudflare Pages.

### Production Testing

1. Deploy to Cloudflare Pages
2. Visit your live site's contact page
3. Submit a test form
4. Check your email inbox (and spam folder)

---

## Troubleshooting

### Emails not being delivered

1. **Check DNS records** - Ensure SPF and _mailchannels TXT records are properly configured
2. **Check spam folder** - First emails may land in spam
3. **View function logs:**
   ```bash
   npm run tail
   ```
4. **Verify domain lockdown** - The `_mailchannels` TXT record must include your Cloudflare account ID

### Form submission errors

1. Open browser DevTools → Network tab
2. Submit the form and check the `/api/contact` request
3. Look at the response for error details

### CORS errors

The function includes CORS headers. If you see CORS errors:
1. Ensure you're accessing the site via the correct domain
2. Check that the function is deployed correctly

---

## Project Structure

```
abacus-site/
├── index.html          # Homepage
├── about.html          # About page
├── services.html       # Services page
├── contact.html        # Contact page (with form)
├── careers.html        # Careers page
├── assets/             # Images and assets
│   └── abacus_logo.png
├── functions/          # Cloudflare Pages Functions
│   └── api/
│       └── contact.js  # Contact form handler
├── wrangler.toml       # Cloudflare configuration
├── package.json        # Node.js dependencies
└── .gitignore          # Git ignore rules
```

---

## Useful Commands

```bash
# Start local dev server
npm run dev

# Deploy to Cloudflare Pages (manual)
npm run deploy

# View real-time logs from deployed functions
npm run tail
```

---

## Adding Spam Protection (Future)

When you're ready to add Cloudflare Turnstile:

1. Go to Cloudflare Dashboard → Turnstile
2. Add a new site and get your site key and secret key
3. Add the Turnstile widget to `contact.html`
4. Update `functions/api/contact.js` to verify the token

---

## Support

For issues with:
- **Cloudflare Pages:** [Cloudflare Community](https://community.cloudflare.com/)
- **MailChannels:** [MailChannels Docs](https://mailchannels.zendesk.com/hc/en-us)
