# Commercial portal alignment

The existing website, Google identity namespace, Neon database/schema and saved
profiles are retained. New functionality is implemented in `worker/commercial-*`
and `worker/portal-*`; no new database or schema migration is required.

## Journeys and roles

Main Sign Up/Log In remain customer destinations. Work With Us adds Become a
Partner, Partner Sign Up, Partner Log In and Partner Dashboard. Both use the same
verified Google subject; separate profiles do not create a second identity.
The existing partner profile is preserved. A profile without experience and
terms acknowledgement is shown the profile editor before direct introductions.

Customer enquiries submitted while signed in are explicitly associated with that
identity. Customers see only their own enquiry/project/quotation view, alongside
their existing profile, onboarding, orders, invoices and support. Partner direct
introductions never grant a customer account access automatically: administration
must select a registered matching contact and explicitly confirm the association.
Partner commissions, commercial terms and internal notes are excluded from the
customer API and event projection, including for people with both roles.

## Introductions and progress

Direct introductions require an existing acknowledged partner profile, valid
customer details and permission to share. Server-owned UUID references and
insert-only writes make retries idempotent. Existing customer/lead matches and
competing email/company claims are flagged, not overwritten or automatically
claimed. Attribution and qualification conflicts require administrator review.
New introductions can be reviewed while programme terms are unpublished, but
cannot be qualified or earn commission without published, accepted terms.
A partner can explicitly apply accepted terms to their own pending introductions;
no historical rate or terms version is silently replaced.

The controlled transition graph is in commercial-api.js. Every transition records
reference, previous/new stage, timestamp, actor/source and visible explanation.
Generic lead editing cannot bypass referral transitions or remove financial audit
records. Customer acceptance is separately confirmed. Project IDs distinguish
introduced referrals from approved projects. Partner responses redact internal
notes, private quotation text and other partners' information.

## Money

Potential values require an authorised quotation and accepted commission rate.
They never count as earned commission. Pending values use administrator-verified
receipts or exact completed Revolut orders. Approval requires positive net funds,
recorded project completion, customer acceptance, resolved attribution and expired
clearance. Actual completed payouts require prior approval, exact net amount and
an unused provider reference. Recording a payout does not move money.
Commission/related timeline updates are atomic with optimistic revision checks.

Verified refunds reduce net commission. Historical payouts remain actual payments;
post-payment refunds show an adjustment/recovery due rather than rewriting money
already sent. Next payment dates appear only when explicitly confirmed by BT38.
No revenue, sales result or payment date is seeded into the live dashboard.

## Push and session data

`NeonRecordStore` writes each enquiry/commission update and its outbox event in one
SQL statement, then publishes pg_notify on `bt38_website_events` in the dedicated
website database. Authenticated SSE endpoints use direct Neon WebSocket LISTEN
connections. Matching notifications fetch the exact affected record; partner,
customer and admin projections are separate. Referrals and earnings stay in the
browser page's memory across dashboard tabs. Successful submissions merge their
record immediately. Existing notification email remains optional.

There is no database polling. SSE heartbeats do not query Neon. A LISTEN connection
stays open while a dashboard is open and can keep the website compute awake; it
closes when the page leaves. A connection failure is displayed, with manual
Refresh/reconnect. Reconnect replays the durable outbox with a short overlap and
idempotent client record merges. No inventory database connection is used.

The independent Node adapter streams response bodies and aborts connections when
clients disconnect. Local tests use a temporary file store; production uses the
existing restricted Neon website role. No infrastructure, logical replication,
Neon Auth or inventory application configuration is changed.

## Verification and configuration

`npm test` covers original functionality plus dual roles, preserved profile fields,
referrals, duplicate detection, authorisation, controlled stages, quotation
privacy, explicit customer association, earnings/adjustments, live local SSE and
atomic SQL construction. The live read-only verification script plans the exact
SQL, tests LISTEN/NOTIFY, and compares all record fingerprints without changing
records. Its connection is supplied only via hidden stdin and is never persisted.

Local browser QA uses scripts/preview-commercial.mjs, with clearly named temporary
fixtures. It is not imported by a deployment entrypoint and uses no live credentials.
No real partner terms are accepted or live commercial records created by QA.

At audit time the website had only Google/admin/Neon runtime keys. Revolut merchant,
webhook, legal seller/tax settings and Resend sender/credentials were not configured.
The existing checkout correctly remains closed. No payment, email delivery, public
access change, Google client origin change or live browser Google login is claimed.
Full programme terms must be completed and published by BT38 in the existing admin
controls before commission-bearing qualification/referral links can activate.
