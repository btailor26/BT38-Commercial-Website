# Administrator dashboard and internal messages

Sign in to `/admin` using the existing Google authentication. Only the existing
server-configured `ADMIN_EMAIL` account is an administrator. No new administrator
is inferred from a customer or partner profile. No email provider is needed.

The dashboard provides Overview, Partner Applications, Messages, Referrals &
Commission, Enquiries, Customers & Support, and Programme Settings. Existing
commercial, customer-support, payment and programme settings controls are retained.
Application search, date/category/status filters and cached record selection run
in the browser. All saved fields, including contacts, answers, extra metadata and
complete review history, are available. The decision form offers only transitions
from the existing server policy. Approval requires an explicit assigned model and
confirmation. The existing published terms-acceptance gate remains authoritative.
Private document downloads and quarantine rules are unchanged.

## Messaging and records

`/api/admin/messages` is the administrator inbox. `/api/portal/messages` is scoped
by `workspace=partner` or `workspace=customer`. Their `/read` endpoints advance the
signed-in reader's receipt, and `/events` opens an authenticated push stream.
A single canonical application has one deterministic conversation. Existing
applications are projected as virtual conversations on initial reads; merely
opening the dashboard does not modify their application records or create history.
The first reply creates the thread. Customers can start separate titled customer
conversations. A dual-role identity cannot fetch its partner thread through the
customer workspace or vice versa.

The existing `website.records` table holds:

- `messages/threads/<workspace>/<owner hash>/<conversation>.json`: participants,
  workspace, reference, subject, application status and last-message metadata.
- `messages/items/<conversation>/<message UUID>.json`: one immutable message,
  content, actual sender identity, sender role, authorised participants, reference,
  workspace, type and timestamp. Idempotent retries never replace content.
- `messages/read/<conversation>/<reader hash>.json`: individual reader receipt,
  read timestamp and acknowledged message cursor. This records read status without
  overwriting a message or its original creation information.

Message content is limited to 6000 characters and rendered as escaped plain text.
There is no public message API, attachment bypass, message-edit or message-delete
operation. Customers cannot nominate another owner. Administrator message routes
and application review routes check administrator permissions on the server.
Read acknowledgements verify ownership and the exact saved message.

Application creation/resubmission and administrator review commit the application,
conversation, immutable message and outbox events in one conditional Neon
statement. An information request or decision therefore cannot save without its
internal message. The transaction supports inserts plus revision-checked updates;
concurrent conflicts roll back instead of replacing a previous message.
No migration or existing-record rewrite is required.

Initial workspace entry hydrates only authorised conversation history. Switching
already-loaded threads and applying filters use session-held arrays. Private
supporting-document results are cached by owner until a document event or an
explicit refresh. New message/read events use existing `pg_notify` and authenticated
SSE infrastructure, project only authorised workspace records and update the
message in memory. Heartbeat comments keep a stream alive without querying Neon.
A failed stream stops and exposes a manual Refresh action. Offline messages are
loaded at the next sign-in. This feature adds no timer-based refresh, polling job,
external email service or separate administration platform.

## Verification and configuration

`npm test` includes `scripts/check-messaging.mjs`: administrator denials, complete
application data, decision messages, information requests/replies, UUID retry
protection, ownership/workspace isolation, read receipts, live push, persistence
across store reopen, concurrent writes, legacy application visibility and no
writes on GET. Other existing tests still cover Google sessions, document security,
commission gates, customer accounts, checkout and independent Node HTTP operation.
Browser QA uses isolated local fixtures; the real saved application is not changed.

Existing Google, restricted website Neon credentials and ADMIN_EMAIL are reused.
No extra messaging service, external email key, database schema or application is
required. Published commission terms and explicit approval still govern activation.
Office/PDF/RTF downloads still require a configured malware scanner to clear
quarantine. Existing payment/email configuration is unaffected; this feature does
not configure or send external email.
