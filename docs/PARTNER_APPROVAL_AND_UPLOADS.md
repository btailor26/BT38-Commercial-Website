# Partner application, private documents and commission models

This change is prepared on `sites-full-source-handover`. It is not approved for
production deployment. No production deployment, new database, repository,
credential change or customer/partner data migration is performed.

## Approval and separate journeys

Main Sign Up/Log In remain the customer journey. Work With Us leads to a separate
Google-authenticated partner application. Professional categories are multi-select;
fit, added value, business model, existing network/pipeline and experience are
captured. Application fields and review history live under the existing dedicated
`website.records` store, using `referrals/applications/<identity hash>.json`.
The existing partner profile remains at its original key. Reading it never
submits or approves an application. Existing records are not rewritten by this
source update. Supporting document keys are separate and survive application edits.

Statuses: Submitted, Under review, More information required, Approved, Rejected,
Suspended. Only administrator review can approve, reject, suspend or assign a
commission model. More-information responses resubmit for review; editing a
suspended application cannot lift suspension. Concurrent reviews use revisions.
Legacy referral APIs, referral-link resolution, direct introductions, training,
earnings responses and live data projections all enforce the approval boundary.
Customer identity and ownership remain unchanged, including dual-role users.

An approved applicant must separately accept the current published programme terms
for the assigned model. Terms must define eligible calculation, VAT, refunds,
third-party costs and partial-payment treatment, as well as clearance/payment
periods. Approval is not an automatic commission entitlement. A model change
requires administrator approval and fresh acceptance. The canonical model is
recorded against the identity's application/profile projection and snapshotted
on each new eligible referral and ledger event; historical percentages are not
rewritten. A partner cannot send a percentage to change it.

## Alternative rates and realistic expectations

5% is the Lead Introduction Partner model: BT38 experts handle discovery,
technical discussions, scope, quotes, negotiation and delivery. 10% is the
administrator-approved Full Sales Process model, with agreed commercial work
through customer commitment. They are alternatives, never stacked. BT38 retains
technical scope, authorised pricing, contract approval and delivery unless
separately agreed. Existing receipt, completion, customer acceptance, clearance,
refund and payout controls remain in force.

Work With Us explains considered purchases, longer sales cycles, no guaranteed
customers or income, starting with an existing network, and not risking a whole
marketing budget. Approved partners receive practical product, qualification,
referral, dashboard, pipeline and commission guidance in Training. No certification,
unlimited coaching or paid advertising is promised. Public and in-dashboard FAQs
cover the eight requested questions.

## Compact dashboard

Overview has exactly six indicators: referrals, active opportunities, completed
projects, pending commission, approved commission, paid commission. Approved model
is a text heading. Detailed financial figures stay in Earnings; each referral and
ledger row displays its applicable percentage. Unapproved applicants see status,
application/profile, supporting documents and help rather than an active dashboard.
On narrow screens a select menu replaces the sidebar, cards use two columns and
fall to one column on very narrow screens. No 14-card overview remains.

## Private uploads

Optional supported files: PDF, DOCX, DOC, TXT, RTF, JPEG and PNG. Default limits are
10 MiB per file and five attachments, configurable up to bounded maxima. The upload
route streams with a byte cap; the independent Node adapter has a separate bounded
file limit instead of its small JSON body limit. Type checks inspect actual bytes,
not browser MIME claims. ZIP structure/expanded-size limits are checked for DOCX;
OLE Word structure and unsafe macro/object paths for DOC; active/embedded PDF and
RTF constructs are rejected; TXT must be UTF-8; image structure/dimensions are
checked. Executable signatures, unsafe formats and mismatched extensions are rejected.

These checks are not represented as a malware scan. PDF/DOC/DOCX/RTF remain
quarantined until a configured trusted scanner reports clean. Scanner errors and
unrecognised verdicts never release a file. Infected uploads are rejected and not
stored; a later infected scan removes access and contents. Validated text/images
may be downloaded with `scan_status=not_configured` when no scanner exists; this
status is visible. With a scanner configured they also require a clean verdict.
There is no administrator button to bypass quarantine.

Neon stores only filename, size, MIME, owner, object key, hash, scan/retention state
and version. Binary contents go to the existing private R2 binding on Sites, or a
private S3-compatible bucket in independent deployment. Local development uses an
ignored private filesystem store. No files are exposed through public object URLs.
Downloads require authentication, ownership/admin checks and an identity-bound
five-minute signed token. Tokens are origin-, file- and version-bound. Responses
force attachment download, no sniffing, no caching and a sandbox policy. Removing,
replacing or expiring a document invalidates previous links. Concurrent uploads
use insert-only operation IDs and revision-protected slots to enforce limits.

Default retained contents: 180 days; quarantined files: seven days; rejection or
suspension shortens future retention to at most 30 days. Values are configurable.
Owner document actions and admin review enforce expiry. Deleted/expired object
contents are purged; minimal owner-restricted audit metadata remains. Failed
physical deletions are retried. Object versions cannot be reused for a new file.
Optional scheduled cleanup is implemented in the Worker entrypoint and declared
in the independent Wrangler config (03:00 UTC daily). It takes effect only after
an approved deployment. Node hosts can schedule the operator-configured command:

```
node --env-file-if-exists=.env scripts/purge-partner-documents.mjs
```

## Required configuration before production activation

- Use a private bucket. For Sites the existing R2 binding is reused. Independent
  deployment needs PRIVATE_S3_ENDPOINT/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY (and
  region if required). The uploader does not create a bucket or change its policy.
- Configure an HTTPS malware-scanner gateway using UPLOAD_SCAN_URL and optional
  UPLOAD_SCAN_TOKEN. It receives raw file bytes server-to-server and must return
  only an authoritative clean/infected verdict, treating unscannable/encrypted
  content as failure. No scanner provider, account or credentials are invented.
- Download tokens use UPLOAD_DOWNLOAD_SIGNING_KEY, or a domain-separated derivative
  of the existing Google session key. All values remain runtime secrets.
- BT38 must review applications, assign models and publish the actual calculation
  basis/operator/clearance/payment terms. No existing test profile is auto-approved.
- No live Google login, external object storage, real scanner delivery or production
  upload is claimed by local mocks. Existing Neon records are audited read-only.

Automated tests include approval/information-request/suspension transitions,
professional answers, legacy bypass denial, model-change reacceptance and immutable
referral rates, dual roles, type rejection, quarantine, mocked scanning, ownership,
expired/wrong-user tokens, replacement, concurrent quotas/idempotency, retention,
Node upload handling and the original referral/financial/event tests. New package
runtime dependencies are fflate, cfb and aws4fetch; registry audit is recorded at
verification time. Production deployment remains explicitly withheld.
