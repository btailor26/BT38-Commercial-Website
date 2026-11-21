# Source handover audit

- Exact destination: `btailor26/BT38-Commercial-Website`.
- Development branch: `sites-full-source-handover`.
- Source: existing Sites project `appgprj_6afc5af8e130819182c14b48bb7593e0`,
  version 11, source commit `1c0468615e7d98e06e644b139a0e49aacf6435de`.
- Original file SHA-256 inventory: `source-manifest.json`.
- Destination was empty, with no branches or content. A README-only initial
  commit was required to permit branch creation. Application code stays on the
  development branch; main is not merged.

## Preservation and bounded portability changes

All original tracked paths are present. All four worker source modules and both
SQL migrations are retained. No bank, customer or production data is exported.
The original README is preserved separately in full. Package scripts, package
metadata, lockfile and ignore rules are updated for independent operation.
One application adjustment makes email notification admin links use PUBLIC_ORIGIN,
with the original Sites origin retained as a backward-compatible fallback.
No commercial content, design, page layout or workflow was rebuilt.

The standalone wrapper authenticates every protected route using the existing
Google session verifier instead of Sites' injected identity. It rejects spoofed
identity headers and adds admin authentication to the previously platform-gated
one-time storage import. HTML/JS sign-in wording and the old sign-in route are
adapted at response time; other page/script content is preserved. The original
Sites manifest/build/preview scripts are retained for provenance, not required
by the default installation, build, test, runtime or deployment.

## Functionality carried over

Existing marketing, pricing, integrations and bespoke enquiry pages; partnership
application form; Google sign-up/login; partner profile and referral portal;
lead attribution, terms and commission ledger; customer profiles, onboarding,
billing and support; administrator lead/status/assignment/notes/export tools;
checkout, provider webhook and invoice/email code; Neon schemas and adapters.

## Dependencies and unresolved external configuration

- npm runtime dependencies: @neondatabase/serverless and jose. esbuild is build-only.
- Live services: Google Identity Services/JWKs, dedicated Neon website database,
  optional Resend, configured Revolut merchant. No external CRM connector exists.
- Live Google login and authorized-origin setup were not verified. Crypto/session
  tests use test keys and do not prove browser provider configuration.
- Tests use in-memory/temp stores and mocked provider/SQL clients. No production
  Neon write, real charge, mail delivery, payout or live data migration is run.
- Original `check-neon-live.mjs` writes verification data; it is preserved but
  deliberately excluded from npm test to avoid touching production records.
- Browser/mobile visual QA and Docker/Cloudflare deployment are not verified in
  this handover. Page/source equivalence is covered by code checks.
- No separate CRM files, React/component directories or image asset directories
  existed in source; the frontend and assets are embedded in worker/index.js.
- Live runtime secret **values** are intentionally excluded. All required key
  names are in .env.example. An operator must transfer them securely to the host.
- Legacy Sites-only account ownership cannot be changed by email matching.
  Those identities need a separately reviewed mapping if any exist.
