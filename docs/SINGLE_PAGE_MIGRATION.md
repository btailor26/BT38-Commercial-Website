# Approved single-page migration — 28 November 2026

Source of truth: `BT38-chat-aligned-preview.html` (source hash in `frontend/manifest.json`). Its full HTML and CSS cascade are preserved in `frontend/approved/single-page.html`. Inline images are externalised byte-for-byte into the existing hashed assets. No replacement imagery or mock backend is introduced.

Production rollback was audited read-only: Fly release **v30**, image `deployment-01M8EXZWHR349BSDHDE1V37HE8`, matches governed deployment run **46035173010**, commit **1e42fd95899a8a13bb07657c92d43a67ae9c08f1**. This migration must not deploy automatically. No production records were written during verification.

## Routes and bindings

| Public route | Existing production binding |
| --- | --- |
| `/` | Six slides, ecosystem, six illustrative services, four packages/72 comparison rows, About, 27 FAQs |
| `/services`, `/about`, `/faqs` | 308 to matching homepage section; query string retained |
| `/price`, `/pricing`, `/integrations` | 308 to `/#price`; query string retained |
| `/solutions` | Approved separate page; existing enquiry links |
| `/contact` | Existing `quote-form`, `/app.js`, `/api/submit`, validation/anti-spam/duplicate protection |
| `/login`, `/signup` | Existing Google customer journey and `/account` |
| `/work-with-us` | Footer-only navigation; existing partner sign-up/login |
| Audit purchase | Existing `/checkout?product=audit`, existing Revolut integration |
| Protected workspaces | Existing account, partner, admin, messaging, agreements and CRM modules |

Referral code and agreement attribution are carried through public links. Legacy route redirects retain all query parameters. No acceptance, financial or authentication logic is replaced.

## Mobile failure audit

Runs `46042117847`, `46042095824`, `46042089272` passed backend/build/protected UI checks and failed slideshow assertions. Some earlier assertions used a gesture point obscured by the sticky header. On the current baseline and initial repair, the failing assertion was the native tap on dot 3, after successful native swipes. The old coarse-pointer pseudo-elements enlarged neighbouring dot hit areas. The new approved source uses explicit 28px controls without that expansion. Tests verify the actual element under every dot centre and native tap, not merely synthetic clicks. Gestures use one primary pointer, cancel vertical movement, advance once per horizontal gesture and leave vertical scrolling to the browser (`pan-y pinch-zoom`). Arrows are removed as requested.

## Automated public assistant

`build-public-frontend.mjs` extracts the 27 visible approved FAQ questions/answers from the actual served homepage using a build-only HTML parser. No manually copied answer database, external AI, calls, live-agent service or management dashboard exists. Exact approved answers are returned conservatively; bespoke requests, demonstrations, unknown questions and private-account questions go to `/contact`. Website content changes update answers on the next normal build.

The interface imports `chat.js` only after launcher interaction. Opening the page or chat performs no chat API/database request. Each submitted message uses POST `/api/public-chat`; existing customer and partner messaging remains separate.

Anonymous access uses an unguessable 256-bit Secure/HttpOnly/SameSite=Strict cookie; only its hash identifies a conversation in existing `website.records`. Conversation IDs are never accepted from request bodies. Responses and logs do not contain the capability. Same-origin JSON, strict length/control-character validation, sensitive credential/card rejection, idempotent message IDs, bounded history, atomic per-network limits and text-only rendering protect the endpoint. Production uses the Fly-controlled `Fly-Client-IP`, hashed before storage; missing proxy identity shares a conservative anonymous limit.

Storage is isolated under `public-chat/`; no new table, schema, database or service is required. A submitted message performs exact-key conversation/rate reads and an atomic write. No broad record listing, polling, CRM events, dataset rebuild or background AI occurs. Expiry cleanup is limited to 20 expired public-chat records per submitted message. SQL wipes bodies and tombstones records, preserving all unrelated records.

Access expires 30 days from the first message. Expired content is removed during subsequent message-triggered cleanup; during completely idle periods physical erasure waits for that activity. The privacy page states this limitation. The visitor can explicitly erase the current conversation immediately; this privacy action is the only write action besides message submission. Clearing browser cookies alone removes access, not stored content. No sensitive information should be entered.

## Verification and deployment gate

`npm test` covers the complete existing regression suite plus source integrity, all legacy redirects, zero public opening queries, chat isolation/CSRF/input limits/idempotency/rate limits/erasure/retention, and scoped Neon SQL. `npm run build` and `npm run validate` verify the independent Node application.

`check-public-ui.mjs` compares the rendered page against the independent original approved source at 1440px, 1024px, 390px and 360px. It captures all public pages and all six slides, checks image decoding/containment, shared slide height, keyboard controls, genuine CDP swipes/taps/cancellation/vertical scroll, sticky anchors, 27 accordions, lazy chat, safe message rendering, isolated valid/invalid contact submissions and actual checkout/auth destinations. `check-partner-ui.mjs` retains the existing full authenticated partner/admin desktop/mobile coverage. All test data is disposable local storage. No real payment or production account mutation is performed.

The executor's Chromium wrapper has no browser binary and the browser CDN returns HTTP 403 here; browser verification runs in the existing GitHub Actions gate, with screenshots/results retained as artifacts. A successful local build alone is not a visual verification claim.

After all checks pass, use the existing governed `deploy-fly.yml` with the exact verified **current branch head** and explicit owner approval. Keep this branch unmerged; target only `bt38-commercial-website`. The inventory application is outside this work.
