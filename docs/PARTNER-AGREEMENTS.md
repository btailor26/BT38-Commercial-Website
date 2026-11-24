# Partner management and agreement records

The existing website Google identity, restricted Neon connection, `website.records`
table, optimistic revisions and committed event mechanism remain authoritative.
There is no new database, account system or CRM. Existing application, lead,
commission and payment keys are retained. No production migration or automatic
approval runs on deployment.

## Administrator workflow

- Applications retains original application information and review history.
- Partner Management searches the session-held directory across identity/contact,
  reference, country, categories, assigned models, agreement and account status.
  Legacy profiles without an application also appear; saving an administrator
  amendment opens them for review, never approval. Amendments retain the original
  application and record before/after values in the administration audit history.
- Programme Settings saves all three model rates, responsibilities, calculation,
  VAT, refunds, third-party costs, partial payments and payment conditions.
  Publishing does not create, issue or accept a document agreement.
- Upload the actual document for its model, supplying a version. Uploading a
  replacement creates a new immutable template ID. Activate a clean version for
  future issuing. Deactivating it does not invalidate issued agreements.
- Approve one or several models for the existing partner identity. Select a clean
  active template, confirm the rate and conditions, then issue a separate agreement.
  A varied rate requires explicit authorisation and a recorded reason.
- Partner acceptance is a separate authenticated action. Administrators cannot
  accept for a partner through review, issuing or agreement status controls.
- Suspending an agreement disables only that arrangement. Suspending the partner
  account disables all commercial actions. Neither deletes histories or payments.
- Lead Management, Sales Management, Referrals & Commission and Payments use the
  existing enquiry and ledger records and governed commercial controls. Recording
  a payout does not transfer funds or verify an unrecorded receipt.

## Evidence and permissions

`referrals/agreement-templates/<id>.json` holds template metadata. Private object
bytes use `partner-agreements/templates/<id>/<sha256>` in the existing private
object adapter. Template upload IDs and model/version reservations prevent overwrite.

`referrals/agreements/<owner-hash>/<id>.json` holds the immutable issued document
pointer, SHA-256 hash, version, exact percentage, conditions, issuer, issue time,
partner identity, explicit acceptance declaration, authenticated acceptance identity
and timestamp, plus append-only status history. Application records index agreement
IDs and approved model IDs; accepted evidence is not copied from an approval.
Download and acceptance both verify stored bytes against the pinned hash.

A new arrangement is inactive until explicitly accepted. A replacement references
its prior agreement; that prior agreement remains effective until the replacement
is accepted, when it becomes superseded. Original leads retain their original
agreement and rate; their historical sales/commission actions retain that snapshot.
New leads cannot use a superseded agreement. Programme edits do not rewrite or
invalidate an accepted document agreement.

Every lead has one attribution and one percentage. Self-generated introductions
select an accepted lead-introduction or full-sales agreement. Administrators assign
BT38 warm leads under an accepted warm-lead agreement; warm-lead-only permissions
cannot submit or import self-generated introductions. Sales actions are authorised
against each lead's specific agreement, not another active model on the account.
Only administrators approve quotations, verify receipts, approve commission and
record completed payouts. Customer messaging still requires separate administrator
authorisation. Referral links retain the selected agreement through navigation.

Legacy explicit programme acceptance is preserved for existing records. New review
approvals require the document agreement workflow; the old programme checkbox
cannot activate them. Historical records and accepted document objects are never
removed by supporting-document retention.

## Storage configuration and safe activation

Reuse `PRIVATE_UPLOADS` or the existing `PRIVATE_S3_*` environment variables.
No private bucket is provisioned automatically. Without private storage, uploads
and document acceptance fail closed with an actionable configuration message.
PDF, DOC, DOCX and RTF templates remain quarantined until the configured HTTPS
`UPLOAD_SCAN_URL` gateway returns `clean`. Use `UPLOAD_SCAN_TOKEN` where required.
Validated plain UTF-8 TXT follows the existing supporting-document safety rules.
No generic legal agreement or production template is seeded by this release.
Accepted objects must be retained and backed up by the object storage operator;
do not apply a short expiration policy to `partner-agreements/`.

## Verification

`npm test` includes multi-agreement API, security, integrity, immutable snapshot,
variation, replacement, ownership, independent suspension, quarantine and audit tests,
plus the existing authentication, customer, referral, commission, sales and messaging
suite. Fixtures are synthetic, isolated and never written to Neon.

`npm run test:ui` uses Playwright and the real Worker with isolated local records
and intercepted test-origin requests. Install its browser with
`npx playwright install --with-deps chromium`. CI runs desktop/mobile navigation,
partner directory search, three-model settings, document upload, activation, issuing
and separate partner acceptance before deploying. The hosted GitHub runner builds
the production image; no workstation or replacement Fly application is required.
