# BT38 Commercial Website

Full editable source handover from existing Sites version **11**, source commit
`1c0468615e7d98e06e644b139a0e49aacf6435de`. Repository:
https://github.com/btailor26/BT38-Commercial-Website

Development branch: `sites-full-source-handover`. No application merge to main.

## Install, test, build and run without Sites

Requires Node.js 22.12+ (Node 24 used for verification) and npm.

```sh
git clone --branch sites-full-source-handover https://github.com/btailor26/BT38-Commercial-Website.git
cd BT38-Commercial-Website
npm ci
cp .env.example .env
npm test
npm run build
npm run validate
npm start
```

Open http://localhost:3000. Public marketing pages and enquiry submissions work
without credentials. In local mode, structured records persist in ignored
`.data/records.json`; never use this single-process store for production. Google
login needs the configuration below. `npm run dev` builds and starts the same
independent runtime. No Sites CLI, account, deployment service or manifest is
needed for these commands. The original Sites build remains as `build:sites`
for provenance/rollback compatibility; future development uses `build`.

## What is included

- All original tracked source files, embedded HTML/CSS/assets/client scripts and
  server code, plus both existing SQL migration files.
- Original pages, services and commercial offers, quotation/application forms,
  internal lead management, statuses, assignment, notes and CSV exports.
- Google customer/partner login; customer registration, onboarding, billing and
  support; partner profiles, referral attribution and commission administration.
- Existing Neon record adapter and schema; Revolut checkout/webhook/invoice code;
  optional Resend notifications; all original validation scripts.
- Independent Node server, Cloudflare Worker entry, Dockerfile, environment
  template, lockfile, build scripts, CI and deployment/handover documentation.

The frontend is embedded editable strings in `worker/index.js`, including its
styling, markup, icons and browser scripts. This is the existing source layout,
not a static-only export. There were no separate component or asset directories
to omit. No redesign or replacement frontend was introduced.

## Authentication outside Sites

`runtime/worker.js` adapts the existing application to its existing verified Google
sessions. It strips incoming platform identity headers on **every** request,
then supplies only verified cookie claims to the preserved authorization code.
Administrators must sign in with the verified Google account matching
`ADMIN_EMAIL`. Customer/partner ownership retains the existing `google:` subject
namespace. No account is matched or reassigned merely by email.

Set `GOOGLE_CLIENT_ID`, a server-only `GOOGLE_SESSION_SIGNING_KEY` (32+ characters),
and `ADMIN_EMAIL`. Add each actual HTTPS website origin to the Google client's
Authorized JavaScript origins. Local Google testing also requires the localhost
origin in that client. Cookies remain Secure/HttpOnly/SameSite=Lax; real login
should be tested on HTTPS staging before launch. No client secret, Google access
token or Gmail permission is required. Deployments on a different origin require
users to sign in again. Any legacy Sites-only customer/partner identities need
an explicitly reviewed mapping; they are never silently relinked.

## Neon and CRM

Use the **existing dedicated website database** `bt38inv_website`, schema
`website`, restricted role `bt38inv_website_app`, through `WEBSITE_DATABASE_URL`.
Never use the operational inventory `neondb` connection. The existing migrations
are preserved verbatim. Do not rerun them against the existing database: the
second migration adds a constraint and is not blindly repeatable. New isolated
databases can be provisioned by an operator with the two files in numerical order.
The runtime never auto-migrates. No live SQL or production data changes were made
for this handover. Existing data stays in Neon; it is not copied into GitHub.

CRM functionality is the existing internal enquiry/customer/partner lead manager.
**No external CRM provider integration or credentials were present in version 11.**
No integration is invented or represented as connected. See
[the handover audit](docs/HANDOVER.md) for what is and is not verified.

## Independent deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for Node/Docker and Cloudflare instructions,
secret configuration, data preservation and release checks. Existing live Sites,
Fly, DNS, Google client, merchant and Neon settings are not changed by this source
handover. Checkout and email need their existing external service configuration;
no real payment, email or Google login was performed by the mocked tests.

Original implementation notes are preserved in
[sites-original-readme.md](docs/sites-original-readme.md). Read the newer deployment
instructions first where old notes describe platform-managed admin authentication.
