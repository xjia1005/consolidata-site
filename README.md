# ConsoliData Growth Decision Assessment — US$99 candidate

The homepage describes a startup's growth decision, an initial assessment and one action: start the assessment. It discloses **US$99 one time, plus applicable tax**, before the visitor begins. The 30 questions help preserve the current situation, compare plausible explanations and identify a bounded next evidence check. They do not establish one proven growth constraint or guarantee growth.

Current audience: US-first and Canadian startup leaders, with a working focus on companies funded in the previous three years, existing users or customers, reported product fit and growth below expectations. Funding and willingness to pay alone do not establish suitability, urgency or budget.

## Candidate and production status

This branch implements theUS$99 / 30-question candidate. The integrator verified that the existing production site still points to theUS$47 A release, `2d8d23e3a8a9c4d4c92b695324754ed5b12eca42`. The canonical old-main US$27 checkout was not current production evidence. Preserve the earlier release and its order records during any later rollout.

The integrator created the live, one-time, exclusive-of-tax US$99 price `price_1UX4UORpzjXsSjtTi0POceqC`, on product `prod_VT2svoLk60Wjcp`. Price creation does not activate this website, bind its checkout, verify report email delivery or establish a completed payment. The backend requires the configured price identifier and verifies the actual provider price before opening checkout; it has no US$47 fallback.

The dedicated backend was subsequently staged on the verified host with99USD configuration and purchases disabled. Its actual process identity, loopback/proxy, private state permissions and unchanged47USD static release were checked. The company report sender authenticated successfully; one explicitly approved internal report email was accepted and found in the company mailbox, and its downloaded12-page attachment matched the approved bytes and all30answers. This manual internal transport check does not establish signed paid fulfillment. The frontend remains the existing47USD release pending the coordinated99USD activation and Stripe key verification.

## Assessment and report journey

Homepage with US$99 disclosure → 30 questions → answer review and explicit server-submission acknowledgment → limited coverage preview → save and confirm work email → separate US$99 purchase review → secure hosted payment when ready → matching signed payment confirmation → private report attachment by transaction email.

The question bank contains six common questions plus six groups of four: reach, response, first useful result, purchase, continued use and evidence. Written answers, multiple selections, unknowns and deferred answers are supported. The report preserves those answers, offers alternatives for selected symptom areas, reviews outcome/belief/delay/effort, and proposes one evidence check with limits. It is assembled by explicit question-bank rules; no external model interprets the text, no customer records are independently audited and no human advisory review is included. Follow-on research or services require a separate agreement.

The complete portable document format (PDF) report is generated privately and sent only after verified payment. The browser has no full-report display, print, download or export endpoint. Email save is a separate step and creates no charge, payment session, subscription or marketing consent. Email-server acceptance is recorded separately from inbox arrival.

## Local preview and verification

```powershell
python -B -m backend.email_service --host 127.0.0.1 --port 4198 --data-dir private/growth99-preview --site-dir site --public-origin http://127.0.0.1:4198 --no-worker
node --test tests/*.test.cjs
python -B -m unittest discover -s tests -p "test*.py" -v
python -B tools/validate-checkup.py
```

The preview has no email worker and no chargeable checkout when unconfigured. The startup service is loopback-only. Use a fresh private US$99 data directory; the new schema deliberately refuses an earlier database instead of rewriting previous orders.

Run `node --check` for each site JavaScript file. Static validation covers local references, question-bank parity,US$99 / 30-question facts, cache identities and the capability map. These checks do not establish actual provider or production readiness. Actual desktop/mobile interactions, screenshots, report rendering, independent review and separate real-provider checks remain necessary. See `verification/assessment99/static-contracts.md` for this slice's results.

## Public and private data boundary

Raw draft answers remain in page memory until submission. Submitted answers, notes, email, report and payment/delivery state are stored privately. Browser session storage holds only the opaque assessment reference for status recovery; a returned page or fragment never proves payment. Keep tokens out of URLs, analytics and logs. Do not put operational records, credentials or actual customer answers into this repository or its public `site/` tree.

## Release and rollback

The existing static-only release script cannot deploy this private assessment service. Do not use it alone for this branch. A release needs the reviewed source revision, dedicated loopback service, private data/configuration, restricted same-origin proxy, correct live price, signed payment endpoint and authenticated report sender. Enter secrets through the approved secure configuration route; never commit or print them. See `backend/README.md`.

Keep purchases disabled until the exact price, payment matching, report attachment receipt, failure recovery and rollback have been verified. The earlier US$47 release and data remain the rollback reference. Publishing code and changing a Stripe price are separate from a working paid delivery or validated customer demand. No marketing posts, outreach, follow-ups, advertising or subscriptions are started by this source change.

Canonical public URL: https://cdatats.com/. Machine contract: `system_registry/codecraft/codebase-map.json`, version 6. Public discovery files remain `robots.txt`, `sitemap.xml`, `llms.txt` and `site-manifest.json`. The assessment is noindex and excluded from the sitemap; this is not access control. Search indexing is not established by source validation.

Copyright 2026 CONSOLIDATA. All rights reserved.
