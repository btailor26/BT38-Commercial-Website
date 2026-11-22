# Independent deployment

## Planned shared Fly deployment: www.bt38inv.com

Target canonical commercial origin: `https://www.bt38inv.com`.
The apex `https://bt38inv.com` should redirect to that canonical origin only
once its existing traffic and integrations have been audited. The inventory UI
is intended for `https://app.bt38inv.com`; keep `bt38-prod.fly.dev` available
as a recovery address. These are **planned** routes, not deployed routes.

Both applications must share the **existing** `bt38-prod` Fly machine; do not
create another Fly machine or deploy this repository's standalone Dockerfile
onto `bt38-prod`, because doing so would replace the inventory runtime.
Build a combined image from the pinned inventory and commercial source revisions,
retain Gunicorn on internal port 5000 and Node on internal port 3000, and add a
small hostname-aware reverse proxy on the Fly service port. Start and supervise
both processes; preserve signals, logs, webhook paths and health checks. Route
`www.bt38inv.com` to Node, and `app.bt38inv.com` and the existing
`bt38-prod.fly.dev` to Gunicorn. Do not infer a destination from a request path
alone or expose either internal port publicly.

Before switching DNS or certificates, verify the combined image in isolation:
run the existing inventory tests and commercial `npm test`, `npm run build`,
`npm run validate`; verify the proxy's Host routing and reject unknown hosts;
check real inventory webhook reachability, website Google authentication, Neon
website-only database access, partner/customer isolation and sandbox checkout.
The website process requires `PUBLIC_ORIGIN=https://www.bt38inv.com` and its
own website-only secrets. Existing inventory secrets must not be exposed to
website requests or logs. Verify any webhook callback URLs before changing
routing, and keep existing marketplace callback URLs working throughout.

Measure the combined process tree's idle and peak RAM before deployment on the
512 MB machine. An idle Node process does **not** sleep automatically, and
Fly machine auto-stop cannot independently stop Node while Gunicorn remains
running. Do not introduce speculative sleep/wake logic. Keep the prior Fly
release available for rollback and monitor memory, CPU, Neon calls, website
responses and marketplace webhooks for 48 hours after release. Do not merge
branches or increase machine size without explicit approval.

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
