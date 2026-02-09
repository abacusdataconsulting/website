# Abacus Data Consulting - Cloudflare Pages Setup Guide

This guide covers deploying the website to Cloudflare Pages with email sending via a separate Cloudflare Worker and Service Binding.

## Architecture

```
Contact Form (browser)
    ↓ POST /api/contact
Pages Function (functions/api/contact.js)  — validates & sanitizes input
    ↓ Service Binding (EMAIL_WORKER)
Email Worker (email-worker/)               — sends email via send_email binding
    ↓ Cloudflare Email Routing
abacus.data.consulting@gmail.com
```

Pages Functions don't support `send_email` bindings, so we use a standalone Worker
connected via a Service Binding (which Pages does support).

## Prerequisites

- Cloudflare account
- Domain added to Cloudflare (DNS managed by Cloudflare)
- Node.js 18+ installed locally
- Git repository (GitHub recommended)

## Quick Start (Local Development)

```bash
npm install
npm run dev
```

Visit `http://localhost:8788` to test the site locally.

---

## Deployment Steps

### 1. Enable Email Routing on Your Domain

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain (`abacusdataconsulting.com`)
3. In the left sidebar, click **Email** → **Email Routing**
4. Enable Email Routing and follow the prompts to add DNS records
5. Under **Destination addresses**, add `abacus.data.consulting@gmail.com`
6. Check your Gmail and click the verification link

### 2. Add Required DNS Records

| Type | Name | Content |
|------|------|---------|
| TXT | `@` | `v=spf1 a mx include:relay.mailchannels.net ~all` |

Email Routing will add its own MX and verification records automatically.

### 3. Deploy the Email Worker

```bash
cd email-worker
npm install
npx wrangler deploy
```

This deploys `abacus-email-worker` to your Cloudflare account. It has the `send_email`
binding locked to `abacus.data.consulting@gmail.com`.

### 4. Create Cloudflare Pages Project

1. Go to **Workers & Pages** → **Create application** → **Pages**
2. Connect your Git repository
3. Configure build settings:
   - **Build command:** (leave empty - static site)
   - **Build output directory:** `/`
4. Click **Save and Deploy**

### 5. Add the Service Binding

This connects your Pages site to the Email Worker:

1. In your Pages project, go to **Settings** → **Functions**
2. Scroll to **Service bindings**
3. Click **Add binding**
4. Set:
   - **Variable name:** `EMAIL_WORKER`
   - **Service:** `abacus-email-worker`
5. Save

### 6. Configure Custom Domain

1. In your Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `abacusdataconsulting.com`)
4. Cloudflare will automatically configure DNS records

### 7. Redeploy

Trigger a new deployment so the Service Binding takes effect. You can do this by
pushing a commit or clicking **Retry deployment** in the Pages dashboard.

---

## Testing

### Local Testing

1. Run `npm run dev`
2. Go to `http://localhost:8788/contact.html`
3. Submit a test form
4. Check terminal for errors

**Note:** The Service Binding to the Email Worker won't work locally. Email delivery
can only be tested after deploying to Cloudflare.

### Production Testing

1. Deploy both the Worker and Pages site
2. Visit your live contact page
3. Submit a test form
4. Check your Gmail inbox (and spam folder)

---

## Troubleshooting

### Emails not being delivered

1. **Verify Email Routing is enabled** — check Email → Email Routing in your domain dashboard
2. **Verify destination address** — `abacus.data.consulting@gmail.com` must be verified
3. **Check Worker logs:** `cd email-worker && npx wrangler tail`
4. **Check Pages Function logs:** `npm run tail`
5. **Check spam folder** — first emails may land in spam

### "EMAIL_WORKER is not defined" error

The Service Binding is not configured. Go to Pages → Settings → Functions → Service bindings
and add the `EMAIL_WORKER` → `abacus-email-worker` binding. Then redeploy.

### Form submission errors

1. Open browser DevTools → Network tab
2. Submit the form and check the `/api/contact` request
3. Look at the response for error details

---

## Project Structure

```
abacus-site/
├── index.html              # Homepage
├── about.html              # About page
├── services.html           # Services page
├── contact.html            # Contact page (with form)
├── careers.html            # Careers page
├── assets/                 # Images and assets
│   └── abacus_logo.png
├── functions/              # Cloudflare Pages Functions
│   └── api/
│       └── contact.js      # Contact form handler (calls Email Worker)
├── email-worker/           # Standalone Cloudflare Worker for email
│   ├── wrangler.toml       # Worker config with send_email binding
│   ├── package.json
│   └── src/
│       └── index.js        # Email sending logic
├── package.json            # Pages project dependencies
└── SETUP.md                # This file
```

---

## Useful Commands

```bash
# Start local Pages dev server
npm run dev

# Deploy the Email Worker
cd email-worker && npx wrangler deploy

# View Pages Function logs
npm run tail

# View Email Worker logs
cd email-worker && npx wrangler tail
```
