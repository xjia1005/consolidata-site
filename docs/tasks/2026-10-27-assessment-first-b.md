# Assessment-first B version

Date: 2026-10-27 America/Edmonton. Integrator: /root.

## Intent and versions

User requests preserving the current price-first A version and creating B:
homepage Start assessment -> ten questions -> work email -> clear US$47
purchase review -> secure payment -> verified payment -> PDF email attachment.
No price in homepage or action-button text. The final purchase review states
US$47 one time plus applicable tax before opening payment. Starting does not
charge or subscribe the visitor to marketing.

A is preserved by immutable reviewed commit
`2d8d23e3a8a9c4d4c92b695324754ed5b12eca42`, source/closeout commit
`3a5cb0148fe96dc5027a46732bdd378cfd004058`, and its existing production release.
B starts from the latter commit in this fresh worktree on
`codex/assessment-first-b-20261027`. A remains production while B is reviewed.
Existing LinkedIn and other accounts are outside this task.

## Reuse and scope

Reuse source-reviewed email-only candidate from
`E:/consolidata-marketing/.worktrees/2026-10-27-checkup-47-email`.
Its frontend and server adapters were local and were never deployed.
Do not import private data, credentials, virtual environments or caches.

- Frontend worker owns site/**, tests/*.test.cjs, tools/validate-checkup.py,
  DESIGN.md, design.tokens.json, docs/design/**. Change order/copy and source
  cache identities; preserve actual question definitions. Add explicit work
  email step, then separate purchase review. No price in public home/buttons.
- Backend worker owns backend/** and tests/test_email_service.py. Add an
  email-save step independent of checkout readiness, preserving matching paid
  session, outbox, signature and private PDF boundaries. No marketing mailing.
- Integrator owns this packet, README, versions/**, codebase map and integration.
- Independent reviewer is read-only. No worker may deploy, commit, touch accounts,
  create credentials, charge, send external mail or change proxy/service config.

## Frozen additive HTTP contract v1.2

Reuse /api/checkup v1.1 assessment/config/checkout/status/webhook contract.
Add POST /api/checkup/email with {assessment_id,email} -> {masked_email}.
The secret assessment token authorizes it. Save a valid work email before any
payment/SMTP prerequisite; never create a Stripe session or send email from
this endpoint. Syntax validation does not prove ownership or business role.
Reject changes once a session has been created or payment is verified; same
email resubmission is idempotent. Existing checkout still validates/reuses
that same email, fixes USD4700, and requires real providers. No fake paid mode.

Only opaque token in sessionStorage; no answers/email in query or logs.
Editing answers invalidates prior assessment and saved-email state; pending
requests lock navigation. Resume/cancel must allow only legitimate payment
retry without duplicate charge or email identity change.

### Integrated resume correction — v1.3

Independent review found that an open Stripe session was labelled pending and
the UI could not resume after cancel. Add boolean `can_resume_checkout` to GET
status as the server's authority: true for an eligible unpaid pre-checkout or
failed creation, and for an existing open checkout that can only reuse its same
session/URL. False after paid, actual payment processing, expiry or uncertain
delivery. The UI must use this explicit flag, not infer it from a raw browser
cancel marker or coarse payment status. A signed completed-but-unpaid event
must protect real delayed processing; a signed matching session-expired event
must close the expired session. No new session for a paid/processing/expired
assessment. Add backend-to-UI contract regression using real status output.

Stripe session creation reuses the same verified one-off price
`price_1UVJbpRpzjXsSjtTqCDsy6Sp` on existing product
`prod_VT2svoLk60Wjcp`, as a server-owned constant. Do not create new inline
products/prices on every checkout. Independently verify USD4700 subtotal,
tax, session identity and signed paid event. B changes order and delivery,
preserving the underlying product identity used by A.

## Acceptance and verification

- Real browser can start without payment, finish ten questions, enter/confirm
  work email, and then see US$47 purchase review. All buttons omit prices.
- No full report/findings/download/print route before or after payment;
  full report is a transaction PDF attachment after signed paid verification.
- Invalid email, lost service, back/edit, resume/cancel, delayed requests,
  server-not-configured and forged return remain safe and understandable.
- Existing backend/payment/email tests and meaningful new email-stage tests pass;
  frontend tests/static/syntax, desktop/mobile browser, independent scope review.
- All facts distinguish local candidate, deployed A, real payment and inbox.

## Release boundary

Build and review B now. Do not replace A or activate a public B purchase until
real Stripe/signed webhook and report-mail sender are configured and verified.
No secret values in chat, logs, Git or browser source. An unconfigured preview
can demonstrate flow while disabling the final payment action honestly.
Root may publish a reviewable B only after exact runtime/deployment review.
No ad, automatic marketing follow-up, contact import or social publication.

## Closeout

Record tests, actual browser steps, missing integrations, preserved A reference,
B commit/local URL, independent verdict, CodeCraft status and next concrete
activation step. Do not claim either version converts better without real data.

## Verified local closeout

Independent `/root/handoff_execution_audit` verdict: LOCAL SHIP, scope PASS.
It reran the final 25 JavaScript tests and 32 Python tests (31 passed, one
POSIX-only assertion skipped on Windows), static validation and source review.
It checked real backend status against frontend handling: an open checkout
reuses its exact URL with only one Stripe creation; signed processing, expired
and paid states cannot create another checkout. The fixed existing price is
used, with no inline per-checkout product creation.

Integrator actual Chrome checks at `http://127.0.0.1:4197/`:

- Homepage has Start assessment actions and no visible price. A headline and
  budget-decision subheading are preserved.
- Completed all ten questions using clearly fictional unknown answers. Review
  without the data-use acknowledgment displayed an error without submitting.
- After acknowledgment, the real local API stored the assessment and displayed
  the work-email step, with no price or payment action.
- Two different email entries displayed "The email addresses must match."
- Confirming the fictional `example.invalid` address saved it without a payment
  provider and displayed a separate US$47 one-time purchase review, plus tax.
- The payment control is disabled while the actual service is unconfigured.
- Restarted the backend process and refreshed the page: server status recovered
  the saved assessment and masked email; its explicit resume permission led
  back through email confirmation and purchase review. No full report appeared.
- Narrow browser layout: actual 469 CSS-pixel viewport, no horizontal overflow
  on homepage or first question; starting an unanswered question showed the
  visible choose-an-answer error. Temporary viewport override was reset.
  Physical phone testing and exact 390-pixel rendering are not claimed.

The running preview service is loopback-only on port4197, no worker, with private
fictional records in `private/checkup-b-preview/`, excluded from Git. It is kept
running so the owner can inspect B. The branch/worktree remain open intentionally
for this review and the real-provider activation gate; owner is /root. No
canonical-root cleanup is authorized or needed.

Actual production read-only check still resolves A to
`/srv/www/cdatats/releases/2d8d23e3a8a9c4d4c92b695324754ed5b12eca42`.
No B production service or B mail/payment configuration was present. No
production files, Stripe settings, actual customer data or public posts were
changed for B. No purchase, SMTP transaction or advertisement was performed.

CodeCraft map version3 matches the B route/API/report boundary. This local
candidate has no production discovery submission. Next activation work is a
reviewed private service/proxy deployment and secure real payment/signature/
mail-sender configuration, followed by actual attachment receipt verification.
Do not send paid traffic to this unconfigured B preview.

The reusable review lesson is retained in this task and the targeted regression:
use real server payment states when testing cancellation, not a fabricated
client-only canceled state. No global Skill or memory files were changed.
