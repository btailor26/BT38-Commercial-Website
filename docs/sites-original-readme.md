# Sites Worker ESM starter

## BT38 commercial website

The advertised base package starts at GBP 4,999 one-off and includes training
and three months of support for faults or issues from handover. Bespoke requirements
have a separate enquiry path. Hosting and third-party fees are separate.

Referral partners use platform-managed ChatGPT sign-in. `/work-with-us`
contains enrolment; `/partner` is the private account; `/referral-terms`
shows the current terms. An authorised admin configures the commission rate,
eligible scope, hold/payout periods, legal operator and contact URL in `/admin`.
Enrolment is closed until those terms are confirmed and enabled. No commercial
commission percentage is seeded by source or tests.

Links use `/r/BT38-...` and redirect to a URL containing the referral code.
The client preserves the code in same-site navigation without tracking cookies
or localStorage. An enquiry must contain the code to be attributed; returning
without it is not attributed. Each enquiry snapshots the accepted rate/terms.
Existing partner terms are not silently replaced on settings changes.

Receipts/refunds are manually verified in administration; transaction references
are idempotent and records are kept in the site's R2 bucket. The partner area
does not disclose customer contact details. Recording a completed payout is an
accounting record and does not transfer funds. Automatic Revolut webhook/checkout
reconciliation is NOT wired to this site. Do not claim automatic commission
payment. Connect a verified server-side payment path before offering that.

Set `ADMIN_EMAIL` as a runtime secret to the authorised owner's email.
Email alerts additionally require RESEND_API_KEY and EMAIL_FROM; without those,
submissions remain available in `/admin` and no alert is promised.
Preserve the existing site audience until the owner requests public access.

Checks: `node scripts/check.mjs` and `node scripts/check-referrals.mjs`.
All check data is in-memory only and never writes to a live account.

Use this starter for a static microsite, click counter, or simple internal UI whose state is browser-scoped. It has no dependencies and needs no install.

Edit `worker/index.js`, then publish through the Sites hosting workflow with this starter's build and validation in `commands`.

The build copies only `worker/index.js` and `.openai/hosting.json`. Do not add standalone asset files. Embed any essential raster bytes in `worker/index.js` and serve or reference them as a data URL.

Pass these argument arrays as `commands`:

```json
[
  ["bash", "scripts/build.sh"],
  ["node", "scripts/validate-artifact.mjs"]
]
```

The deterministic build produces:

```text
dist/
├── .openai/
│   └── hosting.json
└── server/
    └── index.js
```

`dist/server/index.js` is an ES module with a default export containing `fetch(request, env, ctx)`. Edit `worker/index.js`, not the generated file under `dist/`.


## One-off checkout and Audit and Support

Price now offers the GBP 4,999 starting system and Audit and Support at GBP 99
for one month, purchased as needed without automatic renewal. Bespoke work
retains its quote route because it has no fixed payable price.

Company details are entered at /checkout?product=system or product=support.
The server owns all prices; browser-supplied amounts are ignored. A private
capability link opens /billing, which redirects to Revolut's hosted payment
page only on the customer's Pay action. No card data is collected by this site.
No polling runs. Payment return and explicit status refresh verify the exact
provider order. Signed ORDER_COMPLETED webhooks trigger a paid invoice and
email; authorised payments never issue a paid invoice. Retryable mail failures
return a retry response; deterministic invoice identity and email idempotency
protect duplicate event delivery. The invoice is an HTML email with a private
printable HTML copy, not a PDF. Paid checkout referrals use the existing ledger;
refunds and actual partner payouts remain administrator-recorded.

Production checkout is closed until all of the following are configured:
CHECKOUT_ENABLED=true; REVOLUT_PRODUCTION_API_SECRET_KEY;
REVOLUT_MERCHANT_API_VERSION; REVOLUT_WEBHOOK_SIGNING_SECRET;
RESEND_API_KEY; EMAIL_FROM; INVOICE_SELLER_NAME; INVOICE_SELLER_ADDRESS;
INVOICE_COMPANY_NUMBER; INVOICE_CONTACT_EMAIL; BILLING_COUNTRY_TAX_JSON.
INVOICE_VAT_NUMBER is also required for any country with a positive tax rate.
BILLING_COUNTRY_TAX_JSON is an explicitly confirmed mapping of ISO country codes
to inclusive tax rates and invoice descriptions, for example a test-only GB
entry uses {"GB":{"bps":2000,"label":"Includes 20% VAT"}}. This example is not a
statement of the seller's VAT status or the correct treatment of a real buyer.
Unsupported billing countries must contact BT38 before purchase. Advertised
prices are treated as final totals inclusive of configured tax; do not enable
until the seller has confirmed that price/tax policy and actual invoice details.
REVOLUT_SANDBOX=true switches only the fixed provider hosts to sandbox.

Configure the Merchant webhook for this website's /api/checkout/webhook endpoint
and ORDER_COMPLETED. Do not redirect the operational application's existing
/webhooks/revolut endpoint here: that flow manages account subscriptions.
The operational app's existing client contract (Bearer key, version header,
HMAC timestamp verification) informs this one-off integration, but its logged-in
subscription-start route cannot be used as a public one-off checkout endpoint.
No Fly production settings or GitHub application code were changed.

Run node scripts/check-checkout.mjs for the mocked payment/invoice checks.
The live merchant connection, mail sender, webhook registration, seller/tax
configuration and end-to-end payment test remain outstanding. No real customer
order, charge, email or invoice was created during implementation.


## BT38inv.com website records in Neon

Dedicated database bt38inv_website in existing project dry-cake-93203646,
production branch br-shiny-bread-aiijh3rb. Schema website holds the canonical
records and filtered views for enquiries, applications, partners, commission,
billing orders, invoices, future customer accounts, onboarding, support and
payout status. The operational neondb database is separate and unchanged.

WEBSITE_DATABASE_URL is a server-only secret using role bt38inv_website_app,
which is restricted to the website schema in this database. No database URL,
password or SQL is sent to browsers. Existing server authorization still applies.
Static marketing pages do not query Neon; records are accessed on API actions.

Bank-account and card details are entered directly with Revolut. Do not collect,
log, import or persist them in BT38. The database rejects explicitly named bank
and card credential fields recursively. Payout status records may contain only
non-sensitive provider references, commission amounts and transaction status.
This does not imply that a Revolut partner-payout onboarding flow is implemented.

The one-time /api/storage/import POST is available only while
WEBSITE_IMPORT_ENABLED=true on this confirmed owner-private site. It relies on
the platform's owner/service access boundary, copies legacy R2 records with
insert-only conflict handling, never removes originals, then records a completion
marker. Disable the flag immediately after the transfer. Exact-record fallback
and tombstones avoid overwriting newer Neon records or resurrecting deleted ones.
R2 remains available for files; structured website records use Neon after transfer.


## Customer accounts and partner profiles

Top navigation now has Sign up and Log in. The existing Sites/ChatGPT identity
system is retained: customer sign-up collects a company profile after sign-in.
Profile records are keyed by the hash of the authenticated stable user ID.
There is no separate password database. The customer workspace includes
/account, /account/onboarding, /account/billing and /account/support.

Customers save delivery requirements, review owned purchases and invoices, and
raise/reply to support requests. Authorised administration includes customer
profiles, delivery-stage/handover updates and support replies. No automatic
support email alerts are claimed; replies are visible in the account workspace.
New checkout orders require a registered customer and are indexed under that
owner. The billing and invoice APIs enforce ownership. Legacy unowned orders
retain their original private-capability access. They are not claimed by email.

The public GBP 99 offer is now Business Systems Audit: a one-off review and
recommendations for an existing operation. Existing BT38 customer support costs
GBP 99 for one month and is purchased from the customer workspace as needed.
The starting system's three months of support remain included from handover.
No recurring subscription was created or enabled.

Partners can save name, company, country, contact and network/service details at
/partner. Full referral registration and link activation continue to require
published commission and payout terms. The published starting rate remains 5%.
Bank details are entered directly with Revolut; no partner bank form exists.
A Revolut-hosted partner payout onboarding URL has not yet been configured.

Live checkout still requires merchant credentials, invoice email configuration,
legal seller details and confirmed tax handling. These have not been invented
or enabled. Account and support features can operate while checkout is closed.
Run node scripts/check-customers.mjs plus the existing checks for validation.


## Google replaces customer and partner ChatGPT sign-in

Customer and partner sign-up/sign-in now use Google Identity Services, reusing
the public Google client ID served by the existing Fly /login page. The Fly app's
approved-inventory-user login and Flask session are unchanged. Website signup
does not automatically create or grant an inventory user. Customer identities
use the stable verified Google subject with a google: namespace, not an email
match or a browser-supplied identifier. Existing accounts are not silently linked
by email. Existing platform-based administrator authorization is preserved.

/auth/google renders Google's own sign-in button. The backend validates RS256
signatures using Google's public keys, issuer, audience, expiry, issue time,
verified/authoritative email and a nonce bound to a signed HttpOnly cookie.
Website sessions use a separate signed Secure HttpOnly SameSite=Lax cookie.
No Google access token, refresh token, password or Gmail permission is requested.
The browser is never trusted to provide an account identity. Google-session
mode strips platform identity headers for customer/partner API operations and
uses only verified Google-session claims. Logout clears the website session.

Runtime secrets: GOOGLE_CLIENT_ID, GOOGLE_SESSION_SIGNING_KEY and
CUSTOMER_AUTH_PROVIDER=google. The session signing key is separate from the Fly
app secret and never exposed in the browser. No Google client secret is needed
for this identity-only flow.

Required external configuration: add the current https://...chatgpt.site origin
and the eventual https://bt38inv.com origin to Authorized JavaScript origins on
the existing Google OAuth web client. This implementation uses popup/FedCM mode,
so it does not add a Google OAuth redirect callback URI. Origin authorization
and a real Google browser login have not been verified. The owner-private Sites
gate remains unchanged; opening public customer access is a separate decision.
Run node scripts/check-google-auth.mjs for signed-token/session/ownership tests.
