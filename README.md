# CONSOLIDATA Marketing Checkup

Static dependency-free website for owners of already-selling consumer businesses in the United States. Canonical URL: https://cdatats.com/.

## Offer and delivery
USD27 one time plus applicable tax, paid through hosted Stripe checkout. Ten questions and optional notes produce a fixed-rule, answer-based marketing report: described strengths, unknowns, up to three priorities, practical actions, discussion prompts and a full answer summary. Optional notes appear as written and do not change findings. Account audits, customer interviews, campaign testing and ongoing work require a separate agreement. No commercial outcome is guaranteed.

The user approved a lightweight edition: Stripe returns to a shareable questionnaire URL. No account, per-order access authentication, server payment verification or cloud report storage is provided. Public config selects checkout presentation only; a return URL/session parameter never proves payment. Save/download/print the report before closing. Assessment answers are not transmitted or persisted by site code. Support can supply the questionnaire link but cannot recover unsaved answers. No external AI model is connected.

## Run and verify
- Preview: `python -m http.server 4197 --bind 127.0.0.1 --directory site`
- Unit checks: `node --test tests/*.test.cjs`
- Static checks: `python tools/validate-checkup.py`
- Syntax: `node --check` for each site JavaScript file.
- Verify actual desktop/phone questionnaire, back/edit/reset, downloads, print and contact-request behavior in a real browser.

Machine contract: `system_registry/codecraft/codebase-map.json`; public discovery: `robots.txt`, `sitemap.xml`, `llms.txt`, `site-manifest.json`. Assessment is noindex and excluded from the sitemap, which is not an access-control mechanism.

## Release
The user authorized this lightweight launch. Only reviewed commits on origin/main may release. On the existing configured host, from the dedicated CONSOLIDATA repository, use `bash deploy/checkup-release.sh release <full-reviewed-sha>`; rollback uses `bash deploy/checkup-release.sh rollback <previous-full-sha>`. The script validates static source, creates an immutable release and changes only this site's current symlink. It does not edit nginx, DNS, credentials, payment settings or other websites. Stripe return configuration and link activation are separate authorized account actions; no real charge is part of code QA. Record deployment verification separately; source readiness is not proof of a successful charge or market demand.

The contact-request builder only prepares text; the visitor reviews and sends manually from their email app. No calendar slot is booked or marketing email subscription inferred. USD is the charge currency; payout/bank currency is not configured or verified by this site.

## Source boundary
Private prospect lists, recordings, customer data, credentials and internal business records do not belong in this source repository. Operational evidence is retained separately; no marketing post or email is sent by publishing this code.

Copyright 2026 CONSOLIDATA. All rights reserved.
