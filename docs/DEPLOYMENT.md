# Independent deployment

## Node or Docker

1. Use Node 22.12+ and `npm ci`, `npm test`, `npm run build`, `npm run validate`.
2. Configure runtime secrets using the host's secret manager. `.env.example`
   documents every existing application environment key. Never commit `.env`.
3. Set `NODE_ENV=production`, `PORT`, and `PUBLIC_ORIGIN` to the exact external
   HTTPS origin without a path. Terminate HTTPS at a trusted reverse proxy.
   The Node adapter constructs requests from PUBLIC_ORIGIN and does not trust
   browser-supplied forwarding or identity headers.
4. Set the existing website `WEBSITE_DATABASE_URL`, `ADMIN_EMAIL`, Google client ID
   and session signing key. Run `npm start` with a process manager. Production
   startup refuses missing HTTPS origin or missing Neon connection.
5. Docker alternative: `docker build -t bt38-commercial-website .`, then run it
   with the same secret environment values and port mapping. The Docker image
   is defined but was not built in this environment.

No Fly configuration is reused or changed. Deploy this as a separate website
service, not as a replacement for the inventory app. Node-only production needs
no R2 bucket once canonical website records are in Neon. The optional R2 legacy
fallback remains supported by the preserved application when supplied a binding.
Do not enable legacy import on a public deployment. The standalone boundary
requires a Google-authenticated administrator for it, in addition to the existing
import flag. Existing SQL migrations and application database namespace are unchanged.

## Cloudflare Workers alternative

`wrangler.jsonc` is an independent deployment config. With an operator-managed
Wrangler installation, authenticate to your Cloudflare account, configure the
runtime secrets with `wrangler secret put KEY`, then run `wrangler deploy`.
The configured build command creates the independent Worker bundle; it does not
read `.openai/hosting.json`. PUBLIC_ORIGIN must be the actual deployment origin.
Neon is the structured record store. If legacy R2 access is required, the operator
must bind the existing intended bucket as BUCKET; no bucket is created, selected
or migrated automatically by this handover. Wrangler authentication, resource
provisioning and deployment are not performed by the handover tests.

## Configure services

- Google: authorize the new HTTPS origin on the existing web client. Use a
  strong signing key stored only server-side. Customer and partner identity is
  based on verified Google `sub`, not email. The Google sign-in popup requires
  network access to Google's Identity Services and JWK endpoints.
- Neon: transfer the existing **website-only restricted** connection via your
  secret manager. Do not paste it into source or use an operational app URL.
- Resend: set RESEND_API_KEY and a verified EMAIL_FROM, plus ADMIN_EMAIL.
  Enquiry alert links use PUBLIC_ORIGIN; original Sites fallback remains only
  for the original platform compatibility path. No alert is sent if unconfigured.
- Revolut: preserve the existing sandbox/live choice and secret credentials.
  Keep CHECKOUT_ENABLED=false until invoice seller details, confirmed tax mapping,
  sender and webhook signing key are configured. Register the new origin's
  `/api/checkout/webhook` separately. Never repoint the inventory app's subscription
  webhook. See the original notes for all checkout requirements. Live merchant,
  invoice email, payment and refund/payout integration tests remain operator tasks.
- External CRM: none existed in the exported source. Internal lead/customer
  management uses Neon. Adding a separate CRM is future work, not part of transfer.

## Data and release checks

Keep WEBSITE_IMPORT_ENABLED=false. Do not rerun applied SQL on an existing DB.
Do not copy customer data or credentials into the repository. Check backups and
canonical Neon records before changing any live traffic. Existing Sites session
cookies are origin-bound; new-origin users must log in again. Historical Google
subjects remain unchanged. Legacy Sites-only accounts require a controlled
explicit identity mapping before they can be accessed through Google.

Before any public release, test a real Google login for customer, partner and
admin, ownership isolation, quote submission/reference retrieval, referral
attribution, dashboard review, notifications and sandbox checkout on HTTPS staging.
Confirm terms, legal contact details and Google origin settings. Existing
third-party configuration may already be set on Sites, but its secret values are
not part of GitHub and must be reconfigured by the operator. No DNS, production
Neon/Fly, merchant, access policy or live Sites deployment was changed here.
