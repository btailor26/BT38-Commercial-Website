# Connected commercial workflow and pricing

The existing website, Google identity, website Neon schema, partner approval,
terms acceptance, immutable referral-rate snapshots, payment verification and
commission eligibility rules remain authoritative. No separate CRM, database,
website or email service is introduced.

## Shared enquiries and account linking

One canonical `records/enquiry/<UUID>.json` record contains the commercial enquiry
and its `sales` activity, source, next action, follow-up, requests and quotation
versions. Both assigned partner models can manually introduce customers and
import CSV/XLSX. New manual enquiries record the selected channel; each accepted
spreadsheet row is a separately saved referral. Duplicates create review flags,
never overwrite or claim an existing enquiry. The CSV/XLSX limits are 2 MB,
200 data rows and 40 columns. The preview supports explicit column mapping,
validation/error reporting and confirmation before valid rows are saved. Partial
batch outcomes are reported per row. A retry uses the same row UUIDs.

Share the existing Google registration link using Copy customer registration
link. Email matching alone never grants access. The existing administrator
`link-customer` API requires an already registered matching contact and explicit
administrator verification/confirmation. The Sales & Quotations section now
provides that same control, without duplicating account-linking business logic.

## Model permissions and communications

The 5% model submits/imports leads, records internal notes, tracks its authorised
referrals and earnings and exchanges messages with BT38. The 10% model also
records calls, sales stages, follow-ups, customer-reported payment information
and quotation requests. Sales stages are operational notes, not verified project,
payment, commission or completion states. Partner-entered payment information
never creates a ledger entry or verifies receipt.

Internal enquiry conversations remain private to BT38 and the assigned partner.
A customer-facing thread is separate and contains only customer-facing messages.
It is available in Customer Messages and, when the administrator explicitly
permits it, the assigned active 10% partner's Messages. The same customer-facing
thread/message is shared; it is not copied into another message history.
Shared-thread indexes contain pointers only. Every read, reply, PDF and event
projection checks current ownership and current partner permissions. Revocation
or suspension prevents further customer-thread access. An existing application
conversation and the existing customer inbox remain separate.

## Quotations

A 10% partner requests a published offer or bespoke scope. The administrator
creates a draft with an authorised gross price, tax description, delivery,
exclusions, payment arrangements and self-hosting classification. Only an
administrator can approve that exact version. Send Approved Quote is available
to administrators and active assigned 10% partners after approval and verified
customer linking. Delivery also creates an internal portal notification in the
customer conversation. The customer can view the delivered quote, download its
PDF, request revisions, accept or decline. A self-hosted acceptance requires the
hosting acknowledgement. Revised drafts need fresh approval; superseded quotes
cannot be sent or newly accepted. Accepted historical contractual versions are
retained. No partner endpoint changes prices, discounts, scope, tax or rates.

Accepted current quotes can open the existing Revolut checkout. The server
looks up the owned accepted quote and sets the price from it; browser-supplied
amounts are ignored. Its order links to the original enquiry rather than creating
a replacement. Verified receipts use the existing referral snapshot and ledger;
refunds, partial receipts, clearance and payout checks remain governed by the
existing APIs. Online payments remain disabled without real merchant, seller,
tax and webhook configuration. Portal invoices no longer require external email:
optional existing email delivery is preserved only if already configured.

## Confirmed audit and support offer

The £99 one-off Business Systems Audit includes a 60-minute consultation and
written findings/recommendations within 3 working days of that consultation.
One month of basic clarification support starts when the written audit is
delivered. Development, integrations, implementation, managed services, unlimited
technical support and continuous availability are excluded unless separately
agreed. The administrator can record actual delivery, which records the support
start and end dates. No audit duration or provider promise was invented.

The existing three pricing offers now sit together in one desktop row and stack
on smaller screens. The duplicate/misplaced audit presentation is removed while
its description, inclusions and checkout link are retained. Support As You Go
sits below them. The main system includes three months of fault/issue support
from handover for agreed delivered functionality. Later support and one-month
minor-issue monitoring are scoped and priced in advance; there is no automatic
recurring subscription. New workflows and development are quoted separately.
The previously advertised unscoped fixed £99 support purchase is withdrawn from
the live catalogue; historical orders remain readable. New support purchases use
an approved scoped quote. Monthly Management, Account Management and Bespoke
Services have enquiry actions and no invented monthly prices.

Hosting responsibility wording is included in pricing, checkout and quotation
PDFs. Customers control their hosting/database accounts. BT38's own delivery,
configuration and contractual obligations remain, while solely third-party
infrastructure failures are distinguished subject to law and agreed contract.
Self-hosted purchases and quotation acceptances require acknowledgement.

## Finance remains enquiry-only

No provider, application, lender introduction, finance checkout, credit offer or
repayment promise is activated. The website uses the requested conditional
finance wording and an enquiry action. Administrative provider outcomes require
an actual approved arrangement, a recorded regulatory review and provider/evidence
references. Without those, only enquiry requested, awaiting provider and proceeding
without finance can be recorded. These are tracking records, not credit decisions.

Before any provider introduction, confirm the specific borrower/credit structure,
permissions or exemption/appointed-representative route, provider/broker agreement,
required status/remuneration disclosures, consent to share data, privacy terms,
financial promotions and contractual responsibilities. Requirements can differ
for limited companies, sole traders and smaller partnerships. No conclusion that
BT38 is authorised is implied by this implementation.

Official sources checked on 22 November 2026:
- https://www.fca.org.uk/firms/authorisation/consumer-credit-brokers
- https://www.fca.org.uk/firms/authorisation/consumer-credit-brokers/primary-credit-brokers
- https://handbook.fca.org.uk/handbook/conc2/conc2s5

## Operations and validation

`/api/sales` hydrates the signed-in workspace once. Record selection and filters
use the session-held dataset. Exact enquiry events update only the affected
record, using the existing authenticated outbox/pg_notify/SSE architecture. The browser reuses the existing dashboard event connection for sales and messages; it does not open extra subscription connections. No
polling or scheduled refresh is added. Offline data is loaded at next sign-in.

`npm test` includes `check-sales-workflow.mjs` for model permissions, verified
linking, private/shared messages and revocation, immutable quotation approvals,
PDF ownership, customer decisions, finance gates, scoped support/audit dates,
CSV/XLSX safety, per-row duplicates, pricing and persistence. Existing Google,
portal, upload, payment and commission tests remain in the suite. Tests use
isolated file-store records, not production customer/application data.
