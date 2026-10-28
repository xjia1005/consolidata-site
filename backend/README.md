# Private email-only checkup backend

The service keeps answers and full reports outside the static site tree. Public
responses provide a coverage preview and delivery status only. Full PDF reports
are attached to transaction emails after a signed, matching live Stripe payment.
No PDF/download/report-access endpoint exists. Question notes are retained as
written; the fixed-rule findings use the confirmed choices only. Priorities are
the first three applicable topics in questionnaire order, not measured causes.

## Local preview (no credentials or purchases)

From the repository root, install the pinned PDF dependency if absent, then run:

```powershell
python -B -m backend.email_service --host 127.0.0.1 --port 4197 --data-dir private/checkup-preview --site-dir site --public-origin http://127.0.0.1:4197 --no-worker
```

Open `http://127.0.0.1:4197/`. The questionnaire, coverage preview and report
email capture work; purchase is disabled. Local HTTP origins never enable paid checkout. The local
data directory is private operational data and must remain excluded from Git.
Do not put it in `site/`. The preview server serves only the selected static
directory and rejects traversal, dot paths, outside symlinks and PDF files.

```powershell
python -B -m unittest discover -s tests -p test_email_service.py -v
```

Tests inject local fixtures directly into service objects. Runtime configuration
has no test-mode switch, fake checkout endpoint or paid-by-return-URL shortcut.
The command-line server always constructs the real Stripe and SMTP adapters.

## Assessment-first HTTP contract v1.3

All writes use same-origin JSON with bounded request bodies and per-IP rate
limits. The secret assessment token authorizes the email and checkout steps;
keep it out of query parameters, analytics and logs.

- `GET /api/checkup/config`: price, currency, purchase readiness, delivery type
  and voice availability. Readiness affects checkout, not email capture.
- `POST /api/checkup/assessments` with `{answers, notes, source?}`: stores the
  private assessment and returns `{assessment_id, preview}` with coverage only.
- `POST /api/checkup/email` with `{assessment_id, email}`: saves the recipient
  privately and returns only `{masked_email}`. Works before payment/SMTP are
  configured; creates no Stripe session, outbox job, subscription or marketing
  consent. Syntax validation does not verify ownership or business role.
- `POST /api/checkup/checkout` with `{assessment_id, email}`: requires the same
  previously saved recipient and all purchase prerequisites, then returns
  `{checkout_url}`. No amount comes from the browser. It cannot silently save
  or replace a recipient.
- `GET /api/checkup/status` with `Authorization: Bearer <assessment_id>`:
  returns `{payment_status, delivery_status, masked_email, can_resume_checkout}` only. Query
  parameters are rejected.
- `POST /api/checkup/stripe/webhook`: signed payment evidence only; queues the
  attachment after verifying the paid session. Return fragments do not pay.

The recipient can be corrected before any checkout attempt. Same-email capture
is idempotent, including after payment; once checkout starts, a different email
gets `email_already_bound` (409). The identity stays locked after an uncertain
or failed provider response because Stripe may already have created a session
under the stable idempotency key. Invalid/missing email gives 422; a missing or
invalid token gives 404. Checkout without a saved email gives
`report_email_required` (422); unconfigured purchase still gives
`purchase_unavailable` (503). No full-report endpoint exists.

`can_resume_checkout` is the authoritative resume decision, independent of a
browser cancel fragment. It is true for a saved recipient before checkout or
after failed creation, and for an open session whose exact stored URL is reused.
The active creation lease is not resumable until 60 seconds elapse; any retry
uses the same idempotency key and recipient. Paid, signed actual processing,
signed expiry, assessment age over 24 hours or uncertain delivery return false.
Provider readiness is separately reported by configuration. A signed matching
completed-but-unpaid event records processing without delivering a report; a
matching session-expired event closes checkout without creating a replacement.
Both retain the same amount, identity and signature checks as payment events.
Late unpaid/expiry events never downgrade an already-paid record.

## Production operator prerequisites

Run under a dedicated service user bound to `127.0.0.1:4190`, with private data in
`/var/lib/consolidata-checkup` (0700) and private environment configuration under
`/etc/consolidata-checkup/`. See `.env.example` for variable names; enter secrets
through the approved secure configuration route, never in chat or command logs.
Do not reuse or expose the Studio identity database or provider keys.

Purchases remain disabled until all of these are present: a live Stripe secret
key, the exact endpoint signing secret, authenticated SMTP over verified TLS,
a valid sender, ReportLab, canonical HTTPS origin, and the explicit
`CHECKUP_LIVE_ENABLED=1` release gate. Set that gate only after the owner/operator
has verified the exact live account, USD47 product scope, tax behavior and real
attachment delivery. Configuration presence alone does not prove credentials,
deliverability, correct taxes or customer demand. Stripe automatic tax is
enabled; required tax configuration and applicable customer details must be
verified on the merchant account before enabling purchases.

Checkout is bound server-side to existing one-time USD47 price
`price_1UVJbpRpzjXsSjtTqCDsy6Sp` on the original product
`prod_VT2svoLk60Wjcp`, verified in the live Stripe UI by the integrator on
2026-10-27. It uses `line_items[0][price]` and quantity one; it never creates an
inline product or accepts a price/amount from the browser. Independent USD4700
subtotal, currency, tax and matching-session checks remain required. These
identifiers are public references, not credentials; presence does not activate
purchases or prove an actual customer payment.

Register `https://cdatats.com/api/checkup/stripe/webhook` for the live
`checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`
events. The receiver checks the raw-body signature and five-minute timestamp,
live mode, matching session/assessment/email, USD4700 subtotal and exact total
including only explicit nonnegative automatic tax. Discounts/shipping are not
enabled. It queues work atomically and responds before PDF/SMTP work.

The success/cancel URLs use a fragment, not query parameters. Status requests
use `Authorization: Bearer <assessment_id>`; the service rejects token query
parameters and never treats a returned page or fragment as payment evidence.
The opaque assessment ID must not be placed in analytics or logs.

Normal process includes one outbox worker. `--worker-only` runs just that worker;
`--no-worker` stops automatic delivery in a preview or controlled audit. Workers
send only already-paid records, with `CHECKUP_LIVE_ENABLED=1` still required.
No marketing follow-up, subscriptions or automatic upsell messages are sent.

`sent_accepted` means the configured SMTP server accepted the message; it does
not claim inbox placement. Definite temporary pre-send or SMTP4xx failures retry
at most three times. An interrupted sending lease or uncertain DATA timeout is
`delivery_uncertain` and never retried automatically, avoiding a second message
when the first might already have been accepted. An operator must investigate
uncertain/failed delivery and agree any resend or email correction with the
owner; there is no unauthenticated retry or recipient-change endpoint.

Keep access logs off for this API at the reverse proxy, bound request sizes and
timeouts, overwrite X-Real-IP at the trusted proxy, and preserve same-origin
headers. The service itself does not log request URLs, tokens, addresses,
answers, Stripe bodies or SMTP exception details. Static public CSP must allow
same-origin API connections; the existing private `/studio/` routes remain
unchanged. Voice remains unavailable in this slice.

Stripe's [Checkout Session reference](https://docs.stripe.com/api/checkout/sessions/object)
distinguishes an open session from a complete session that can still be
processing, and an expired session that cannot continue. The UI uses the
server decision rather than treating every pending payment as resumable.

Database persistence is not an offsite backup. Operational backup, retention,
customer deletion requests, sender reputation, actual refunds and production
recovery are separate operator responsibilities; do not claim them from tests.
