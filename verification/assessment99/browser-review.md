# Independent local browser review

Date: 2026-11-01. Target: `http://127.0.0.1:4198` (root-owned preview, no worker, no live providers). Browser: installed Chromium on Windows, headless. Viewports: 1440 × 1000 and 390 × 844.

## Result

Passed **89 assertions**, including **30 exact question-prompt comparisons**, across **two browser journeys**. These counts do not represent 89 independent journeys or real customer validation. No application defect was found in the tested scope.

- Desktop: English homepage and interactive example → all 30 questions → back/edit → review → consent → private submission → mismatched and matching email → separate US$99 purchase review → reload/status recovery → forged payment-return flag.
- Mobile: homepage navigation → all 30 questions explicitly deferred → review → consent/private submission → email → disabled purchase review.

The actual local service reported purchase unavailable. Checkout remained disabled and no checkout request was issued. Submission returned coverage only; no personalized report appeared in the browser response. Status recovery used an authorization header, and a user-controlled success fragment could not verify payment. Four public report/private-file URL probes returned 404.

## Evidence and observations

`browser-receipt.json` records the exact checks and local API methods/paths without assessment tokens. It finished at 2026-11-01T19:45:50.913469+00:00. There were zero failed assertions, zero page JavaScript exceptions, and zero attempted external page requests in the completed run.

The public question bank matched all five permitted backend fields semantically. Text over 1,500 Unicode codepoints was visibly rejected; 1,500 supplementary Unicode codepoints were accepted and preserved by Back. Mixed selections and explicit unknowns survived review. Inert HTML entered as an answer stayed literal text. Submission required the data acknowledgment; an unchecked attempt produced a visible error without a submission request. Email mismatch produced a visible error.

No horizontal overflow was observed at either viewport in the checked homepage, question, review, email and purchase states. Keyboard navigation reached the visible Skip to content link with a 3 px focus outline. Theme contrast calculations passed for the checked body text (14.793:1), secondary text (6.199:1), focus indicator (6.128:1) and control boundary (4.040:1). These are bounded checks, not a complete accessibility audit.

Visually reviewed: `browser-home-desktop.png`, `browser-sample-desktop.png`, `browser-question-mobile.png`, and `browser-purchase-mobile.png`. The mobile screenshots show viewport crops; automated checks exercised the controls farther down the page. All screenshot files use the `browser-` prefix.

## Harness correction retained

The initial run passed 69 assertions, then timed out because the harness navigated only to a new fragment in the same document and expected application startup to rerun. No paid entitlement appeared. The corrected harness first verifies no immediate upgrade, then reloads the document to exercise actual return initialization and server verification. This was a test harness issue, not an application repair. Initial evidence remains in `browser-failure-124550.json` and `browser-failure.png`.

## Limits and next gate

No purchase, live provider callback, report email, inbox delivery, production deployment, external communication or account change was attempted. Only fictional inputs and `example.invalid` addresses were saved to the local preview.

The all-unknown journey proves preservation and honest unknown coverage. It does not prove that a customer with no substantive answers would receive a useful US$99 report. Report usefulness, buyer qualification and willingness to pay remain separate business validation tasks. The technical result does not establish a main growth constraint or validated marketing outcome.

Full launch still needs the parent task's independently verified payment and report delivery gates. CSS viewport checks do not replace physical-phone or ambient-light testing.
