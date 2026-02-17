# Abacus Data Consulting — Website

Static marketing site for **Abacus Data Consulting**, hosted on **Cloudflare Pages** with a serverless contact-form pipeline powered by **Cloudflare Email Routing**.

---

## Table of Contents

- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Configured Fields Reference](#configured-fields-reference)
- [Local Development](#local-development)
- [Deployment Guide](#deployment-guide)
  - [Prerequisites](#prerequisites)
  - [1. Enable Email Routing](#1-enable-email-routing)
  - [2. Verify Destination Email](#2-verify-destination-email)
  - [3. Deploy the Email Worker](#3-deploy-the-email-worker)
  - [4. Create Cloudflare Pages Project](#4-create-cloudflare-pages-project)
  - [5. Add the Service Binding](#5-add-the-service-binding)
  - [6. Configure Custom Domain](#6-configure-custom-domain)
  - [7. Trigger Redeploy](#7-trigger-redeploy)
- [How the Contact Form Works](#how-the-contact-form-works)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Git Workflow & Commit Templates](#git-workflow--commit-templates)
- [Useful Commands](#useful-commands)

---

## Architecture

```
Browser (contact.html)
  │
  │  POST /api/contact   { name, email, service, message }
  ▼
Cloudflare Pages Function (functions/api/contact.js)
  │  — validates & sanitizes input
  │  — forwards JSON via Service Binding
  │
  │  env.EMAIL_WORKER.fetch("https://email-worker/send")
  ▼
Email Worker (email-worker/src/index.js)
  │  — builds raw MIME message
  │  — calls env.EMAIL.send()
  │
  │  send_email binding (Cloudflare Email Routing)
  ▼
Cloudflare Email Routing
  │
  ▼
abacus.data.consulting@gmail.com
```

**Why two Workers?** Cloudflare Pages Functions cannot use `send_email` bindings directly. A standalone Worker owns the binding, and Pages reaches it through a **Service Binding** (`EMAIL_WORKER`).

---

## Repository Structure

```
abacus-site/
├── index.html                  # Homepage
├── about.html                  # About page
├── services.html               # Services page
├── contact.html                # Contact page (form + client-side JS)
├── careers.html                # Careers page
├── assets/                     # Images, favicons, webmanifest
│   ├── abacus_logo.png
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   └── site.webmanifest
├── functions/                  # Cloudflare Pages Functions (auto-routed)
│   └── api/
│       └── contact.js          # POST /api/contact — validates, sanitizes, forwards
├── email-worker/               # Standalone Cloudflare Worker
│   ├── wrangler.toml           # Worker config + send_email binding
│   ├── package.json
│   └── src/
│       └── index.js            # Builds MIME, sends via Email Routing
├── package.json                # Root project — Pages dev/deploy scripts
├── .gitignore
└── README.md                   # This file
```

---

## Configured Fields Reference

Every hardcoded value you may need to change when forking or redeploying:

| Value | Location(s) | Purpose |
|-------|-------------|---------|
| `abacus.data.consulting@gmail.com` | `email-worker/wrangler.toml`, `email-worker/src/index.js` (CONFIG.toEmail), `contact.html` (mailto links) | Destination inbox for contact form submissions |
| `noreply@abacusdataconsulting.com` | `email-worker/src/index.js` (CONFIG.fromEmail) | Envelope sender / From address |
| `abacusdataconsulting.com` | `email-worker/src/index.js` (Message-ID domain) | Domain used in MIME Message-ID header |
| `abacus-email-worker` | `email-worker/wrangler.toml` (name) | Worker name — must match the Service Binding service value |
| `EMAIL_WORKER` | `functions/api/contact.js` (`env.EMAIL_WORKER`) | Service Binding variable name (set in Pages dashboard) |
| `EMAIL` | `email-worker/src/index.js` (`env.EMAIL`), `email-worker/wrangler.toml` (`[[send_email]]` name) | send_email binding name |
| `b42363c7f4b8436e1f066450d38d9327` | `email-worker/wrangler.toml` (account_id) | Cloudflare account ID |
| `8788` | `package.json` (`--port 8788`) | Local dev server port |

---

## Local Development

```bash
npm install
npm run dev
```

Opens the site at **http://localhost:8788**.

- Static pages, CSS, and client-side JS work fully.
- The Pages Function (`/api/contact`) runs locally but **the Service Binding to the Email Worker is not available** — form submissions will fail with a binding error. Email delivery can only be tested after deploying to Cloudflare (see [Testing](#testing)).

---

## Deployment Guide

### Prerequisites

- Cloudflare account
- Domain added to Cloudflare (DNS managed by Cloudflare)
- Node.js 18+ and npm
- GitHub repository connected to Cloudflare Pages

### 1. Enable Email Routing

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain (`abacusdataconsulting.com`)
3. Sidebar: **Email** → **Email Routing**
4. Click **Enable Email Routing** and follow prompts to add the required DNS records (MX + verification TXT records are added automatically)

### 2. Verify Destination Email

1. Still in **Email** → **Email Routing** → **Destination addresses**
2. Click **Add destination address** and enter `abacus.data.consulting@gmail.com`
3. Open Gmail and click the verification link Cloudflare sends

### 3. Deploy the Email Worker

```bash
cd email-worker
npm install
npx wrangler deploy
```

This creates the `abacus-email-worker` Worker in your account with its `send_email` binding locked to the verified destination address.

### 4. Create Cloudflare Pages Project

1. Dashboard: **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Select your GitHub repository
3. Build settings:
   - **Build command:** *(leave empty — static site)*
   - **Build output directory:** `/`
4. Click **Save and Deploy**

### 5. Add the Service Binding

This connects the Pages site to the Email Worker:

1. In your Pages project: **Settings** → **Functions**
2. Scroll to **Service bindings**
3. Click **Add binding**
4. Configure:
   - **Variable name:** `EMAIL_WORKER`
   - **Service:** `abacus-email-worker`
   - **Environment:** Production
5. Save

### 6. Configure Custom Domain

1. In your Pages project: **Custom domains**
2. Click **Set up a custom domain**
3. Enter `abacusdataconsulting.com`
4. Cloudflare auto-configures the DNS CNAME

### 7. Trigger Redeploy

Service Bindings only take effect on new deployments. Trigger one by:

- Pushing a commit, **or**
- Pages dashboard → latest deployment → **Retry deployment**

---

## How the Contact Form Works

### Data Flow

```
1. User fills form in contact.html
   │
   │  Browser JS collects: { name, email, service, message }
   │  POST /api/contact  (Content-Type: application/json)
   ▼
2. Pages Function  (functions/api/contact.js)
   │  — Parses JSON (or form-encoded) body
   │  — Validates required fields (name, email, message)
   │  — Validates email format with regex
   │  — Sanitizes all inputs (strips < > to prevent injection)
   │  — Adds timestamp
   │  — Forwards cleaned payload to Email Worker via Service Binding:
   │    env.EMAIL_WORKER.fetch("https://email-worker/send", { body: cleanData })
   ▼
3. Email Worker  (email-worker/src/index.js)
   │  — Reads CONFIG for from/to addresses
   │  — Builds multipart/alternative MIME message (plain text + HTML)
   │  — Sets Reply-To to the submitter's email
   │  — Creates EmailMessage and calls env.EMAIL.send()
   ▼
4. Cloudflare Email Routing delivers to Gmail
```

### Payload Shape at Each Step

```
Browser → Pages Function:
  { name: "Jane", email: "jane@co.com", service: "Data Analytics", message: "Hello" }

Pages Function → Email Worker:
  { name: "Jane", email: "jane@co.com", service: "Data Analytics", message: "Hello", timestamp: "2026-01-15T..." }

Email Worker → Cloudflare Email Routing:
  Raw MIME (multipart/alternative with text/plain + text/html parts)
```

---

## Testing

### Local Testing

```bash
npm run dev
# Visit http://localhost:8788/contact.html
```

- The form UI and validation work.
- Submission will fail because the `EMAIL_WORKER` Service Binding is not available locally.
- Check the terminal for Pages Function log output.

### Production Testing

1. Deploy both the Worker and Pages site (steps above)
2. Visit your live contact page
3. Submit a test message
4. Check Gmail inbox (and spam folder for first messages)

### Tailing Logs

```bash
# Pages Function logs (production)
npm run tail

# Email Worker logs (production)
cd email-worker && npx wrangler tail
```

Both commands stream real-time logs — submit a form while tailing to see the request flow.

---

## Troubleshooting

### Emails not being delivered

1. **Email Routing enabled?** — Dashboard → your domain → Email → Email Routing
2. **Destination verified?** — `abacus.data.consulting@gmail.com` must show as verified
3. **Worker deployed?** — Run `cd email-worker && npx wrangler deploy`
4. **Tail the Worker:** `cd email-worker && npx wrangler tail` — look for errors
5. **Tail Pages Functions:** `npm run tail` — look for binding or validation errors
6. **Check spam** — first emails from a new sender often land in spam

### "EMAIL_WORKER is not defined" error

The Service Binding is missing. Go to **Pages → Settings → Functions → Service bindings** and add:

- Variable: `EMAIL_WORKER`
- Service: `abacus-email-worker`

Then redeploy.

### Form returns 400 "Unsupported content type"

The request `Content-Type` header is not `application/json`, `application/x-www-form-urlencoded`, or `multipart/form-data`. The client JS sends JSON by default — this usually means a proxy or browser extension is interfering.

### Form returns 400 "Missing required fields"

The `name`, `email`, or `message` field is empty. Check that `contact.html` field `id` attributes match what the JS sends.

### Form returns 500 "Email delivery failed"

The Pages Function reached the Email Worker but it returned an error. Tail the Worker logs to see the underlying issue — common causes:

- `send_email` binding misconfigured (wrong destination address)
- Email Routing disabled or DNS records missing
- `destination_address` in `wrangler.toml` doesn't match a verified address

---

## Git Workflow & Commit Templates

### Content update (HTML/CSS)

```bash
git add index.html about.html services.html contact.html careers.html
git commit -m "update site content"
```

### Worker change

```bash
git add email-worker/
git commit -m "update email worker"
```

### Style change

```bash
git add contact.html services.html
git commit -m "update page styles"
```

### Deployment trigger (no code change)

```bash
git commit --allow-empty -m "trigger redeploy"
git push
```

### Full deploy after changes

```bash
# Deploy worker first, then push site
cd email-worker && npx wrangler deploy && cd ..
git add -A && git commit -m "deploy updates" && git push
```

---

## Useful Commands

```bash
# Start local dev server (port 8788)
npm run dev

# Deploy the Email Worker
cd email-worker && npx wrangler deploy

# Tail Pages Function logs (production)
npm run tail

# Tail Email Worker logs (production)
cd email-worker && npx wrangler tail

# Deploy Pages site manually (without git push)
npm run deploy
```
