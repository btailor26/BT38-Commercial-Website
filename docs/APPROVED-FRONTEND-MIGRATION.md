# Approved public frontend migration

Rollback source: `26154661c13d79ab2e5acb8c8985770f8dfe1d4c` on `sites-full-source-handover`. Existing production application: `bt38-commercial-website`. This update must not be deployed without owner approval.

## Confirmed cause of the previous mismatch

The 27 November migration commits changed `commercial-content.js` and `portal-ui.js` around the original `PAGES` templates in `worker/index.js`. The public request path continued to serve `portalPage(PAGES[path], path)`. There were no committed public image assets, no approved homepage hero/slideshow source, and no complete approved public HTML page replacement. The old tests checked HTTP success and selected original CSS selectors; they could pass while the approved design was absent.

## Source and actual files

The latest complete eight-page preview is `BT38-separate-customer-login-preview.html` (27 November). The ninth page is the later `BT38-FAQ-monthly-management-preview.html`. Original source SHA-256 values and Library identities are recorded in `frontend/manifest.json`. All eight mains, both full CSS cascades in original order, the original manual slideshow script, and all 18 distinct embedded image files are retained. The extracted image bytes total 1,020,115 bytes; no image was substituted or re-encoded. Repeated embedded images are now deduplicated, content-addressed, independently cached files.

`frontend/pages/*.html` are the actual editable page sources. `frontend/public.css`, `frontend/faqs.css`, `frontend/carousel.js` and `frontend/assets/` are actual source/assets. `frontend/approved/` holds independently rendered original previews with only embedded data URLs externalised to the same original image bytes, for visual regression. Preview-only routing/submission scripts are never served in the production application.

`npm test` and `npm run build` reproducibly create `.generated/public-frontend.json` from these source files. The existing Worker bundle includes those bytes; it has no new hosting, storage service, external font, polling loop or runtime database dependency for the public pages. Generated output is ignored by git. A clean install remains `npm ci`, `npm test`, `npm run build`, `npm run validate`, `npm start`.

## Page and functional binding map

| Page | Existing route | Approved source / live bindings |
|---|---|---|
| Home | `/` | Exact approved hero, original branding and imagery, five-slide manual carousel, arrows, indicators, keyboard and touch controls; package and features links |
| Services | `/services` | Complete approved services cards, banner images and existing `/contact?service=...` action links |
| Price | `/integrations`, alias `/price` | Four approved cards; complete 72-row comparison; approved delivery/support table; existing audit checkout and scoped enquiry actions |
| Solutions | `/solutions` | Complete approved solution cards and original image assets; existing scoped enquiry links |
| About | `/about` | Complete approved banner/content/imagery; existing package link |
| Work With Us | `/work-with-us` | Approved layout; dedicated existing `/partner/signup`, `/partner/login` and `/referral-terms`; no public account duplication |
| Contact | `/contact` | Approved form layout, field order and labels; existing `quote-form`, `data-kind=enquiry`, `/app.js` → `/api/submit`; original server validation, origin controls, spam timing, honeypot, duplicate rules, CRM persistence and referral attribution |
| Customer Login | `/login` | Approved customer-only panel → `/auth/google?returnTo=%2Faccount`; existing `/signup`; no partner access added to the customer panel |
| FAQs | `/faqs` | Exact later approved 27 native expandable questions and monthly-management wording |

Global hash routes were converted to the existing application paths; FAQs navigation follows the later approved FAQ source. Team sign-in points to the protected `/admin` route. The callback action fills the existing enquiry description with the existing callback prompt. The homepage's framework-independent script makes no API calls. The shared `/app.js` menu initialisation now tolerates a page without the old `.menu` element; all existing form and backend code is retained.

## Explicit commercial alignment

The Price page's third-party-cost paragraph is aligned with the owner's new instruction: monthly management chosen from the outset includes hosting within the agreed fee, with no separate BT38 hosting charge; scope, support and responsibilities are agreed individually. Self-managed/self-hosted customers remain responsible for their own hosting. This paragraph is the only intentional content adjustment inside an approved main, apart from functional attributes/route bindings. The FAQ source already includes the requested management clarification. Existing commercial terms and checkout handlers are unchanged.

No Google secret, database/schema/record, Revolut integration, authentication permission, partner agreement, dashboard, CRM, document store, message workflow or API handler is migrated or replaced. No production data is written by the tests. No real payment is created.

## Required verification and deployment gate

- `npm test`: full existing backend suite plus exact approved runtime HTML/CSS, 18 original image byte hashes, cache responses, contact field bindings and zero public-page DB reads.
- `npm run build` and `npm run validate`: independent deployment bundle.
- `npm run test:ui`: existing authenticated customer/partner/admin workflow regression.
- `node scripts/check-public-ui.mjs`: all nine pages at 1440px and 390px; rendered approved-source main-region pixel comparison; desktop/mobile full-page actual/reference screenshots; every internal link; all FAQ accordions; arrows/dots/keyboard/touch; isolated invalid/valid form submissions and callback; authentication and audit checkout destinations without payment execution; representative local usable-time measurements.
- GitHub verification retains `approved-public-frontend-evidence`. The governed production workflow now runs the same public visual/functional suite before its existing deployment job.

Do not treat a build/HTTP response as visual verification. Do not deploy on a failing visual test. The owner must approve deployment of the exact final verified SHA. Production is unchanged until the governed workflow is explicitly dispatched.
