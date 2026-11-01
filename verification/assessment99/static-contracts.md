# US$99 / 30-question static-contract verification

Date: 2026-11-01. Worker: public_static_contracts. Result: **PASS for this source-contract slice.** No payment, mail, account, remote deployment or marketing action was performed by this worker.

## Scope and reason for change

The owner changed the initial offer to US$99, requested 30 questions and asked for the price on the homepage. The earlier B tests deliberately expected US$47, ten questions and price-free entry. Retaining those expectations would test the superseded offer. The update changes these facts while preserving readiness, private-report, recipient, return-flag and source-link safeguards.

Owned changes: the two checkout/entry test files; static validator; root/backend instructions; capability map version 4; a small current-design addendum; this receipt; and cache-query references in site HTML. The cache normalization changed only `assessment.html`, because the other pages already used `20261101-growth99`. No HTML copy or runtime behavior was changed by this worker.

## Starting failures and repair

The initial integrated Node run had 33 tests: 29 passed and four failed. The observed failures were:

1. A ready fixture still supplied price47 to the updated99-price guard.
2. The assessment purchase-view assertion still expected US$47.
3. The homepage assertion still required the old headline, absent prices and old asset identities.
4. The manifest assertion still expected amount47 and the earlier B version.

The tests now require99USD, reject both historical27 and47 prices, verify the separate email and purchase views, require the homepage price and30-question purpose, check the assessment as the primary action, and retain private-report/return-flag boundaries. Asset identity and metadata expectations reflect the current candidate. The first-run evidence remains in the integrator's ignored `private/node-public-suite.txt`; repaired-run output is in `private/node-static-contracts.txt`.

## Actual checks

| Command or check | Result | Scope |
|---|---|---|
| `node --test tests/*.test.cjs` |33 passed,0 failed;149.8095ms | Current JavaScript tests, including question/choice/input and pending-request regressions |
| `python -B tools/validate-checkup.py` |PASS | English HTML, local links and fragments, price/structure/metadata agreement, current cache identities, private-report boundary, public/private bank parity and map references |
| `node --check` for each site JavaScript file |8 files passed | Syntax only |
| `git diff --check` |PASS | Whitespace/error check; existing line-ending notices do not indicate behavior verification |

The public bank exposes exactly the five agreed fields and matches those fields in the private bank. It has30unique question identifiers, six common questions, six branches of four, and the four qualitative value directions. The capability map references existing files and valid dependency nodes. No static assertion claims customer results or provider readiness.

The root integrator separately reported41Python tests passing with one expected platform-specific skip. This worker did not rerun or independently certify that suite. Real browser, document rendering, independent code/security review and actual provider/deployment checks remain separate gates.

## Current operational limits

The inspected production reference remains the47USD release `2d8d23e3a8a9c4d4c92b695324754ed5b12eca42`. The integrator reports creating live99USD price `price_1UX4UORpzjXsSjtTi0POceqC`, exclusive of tax, under the existing product. Source docs distinguish that action from actual bound checkout, signed payment and report delivery. No99USD production activation, completed purchase, inbox arrival, customer usefulness or growth outcome is established by this slice.

The static-only release script cannot deploy the new private backend. The new99USD data directory and price/session binding must remain separate from earlier orders. Secrets, private customer/operational data and actual owner-company assessment records do not belong in public Git. Marketing emails, posts and follow-ups remain outside this verification.
