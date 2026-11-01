# Private US$99 assessment and report-delivery backend

The service stores submitted answers and complete reports outside the public site tree. Browser responses expose answer coverage and purchase/delivery status only. The complete portable document format (PDF) report is attached to a transaction email after a signed, matching paid Stripe session. There is no public report-access, PDF, print or download endpoint.

The 30-question report preserves written context and notes, presents alternatives for selected symptom areas, reviews four customer-value questions and proposes one bounded evidence check. Version3.1 frontloads a source-linked worksheet: the respondent's decision, customer, comparison, measurement, reconsideration criterion and proposed check. That proposal is distinguished from the rule-selected starting point. Owner/source/window/cost/stop and support/weaken/inconclusive conditions still require agreement; blank fields are never invented. The report does not rank measured causes, independently verify records or certify one growth constraint. Its source-bank hash and version are retained in the stored report. No external model or human advisory review is included.

## Isolated local preview

Install the pinned PDF dependency from `requirements.txt` if needed, then run from the repository root:

```powershell
python -B -m backend.email_service --host 127.0.0.1 --port 4198 --data-dir private/growth99-preview --site-dir site --public-origin http://127.0.0.1:4198 --no-worker
python -B -m unittest discover -s tests -p "test*.py" -v
```

Local HTTP origins never enable paid checkout. Keep the fresh data directory excluded from Git and outside `site/`. Do not point this version at the earlier US$47 database; the schema check fails closed instead of migrating or reinterpreting its orders. The preview server rejects traversal, dot paths, outside symlinks and PDF files. `--site-dir` is a loopback preview convenience, not the production static server.

Tests inject isolated payment/mail fixtures into service objects. Runtime configuration has no fake-paid switch, test checkout endpoint or return-URL entitlement. Fixture success does not prove real payment, email acceptance or inbox arrival.

## HTTP contract

All writes require bounded same-origin JSON and per-address rate limits. Assessment submissions accept up to 262,144 bytes; the 30 answers and optional notes have their own length/type/option checks. Use the opaque secret assessment reference only as specified below, not in query parameters, analytics or logs.

- `GET /api/checkup/config`: US$99 price, purchase readiness, delivery and voice availability. Readiness affects payment, not email save.
- `POST /api/checkup/assessments` with `{answers, notes, source?}`: stores the private answer/report snapshot and returns `{assessment_id, preview}` with coverage only. Exactly 30 known question identifiers are required; unknown or deferred answers remain valid.
- `POST /api/checkup/email` with `{assessment_id, email}`: saves a confirmed recipient and returns `{masked_email}`. It creates no payment session, outbox job, subscription or marketing consent. Syntax validation does not establish ownership or business role.
- `POST /api/checkup/checkout` with `{assessment_id, email}`: requires the same saved recipient and purchase prerequisites, then returns `{checkout_url}`. The browser cannot choose an amount or substitute a price.
- `GET /api/checkup/status` with `Authorization: Bearer <assessment_id>`: returns payment/delivery state, masked email and explicit checkout-resume permission. Query-token parameters are rejected.
- `POST /api/checkup/stripe/webhook`: verifies the raw signed payment event before queuing a private report attachment. Returning from checkout does not prove payment.

The email can be corrected before any checkout attempt. Once checkout starts, a different recipient returns 409; the identity stays locked even after a failed or uncertain provider response because a session may already exist. Same-email save remains idempotent. Invalid answers/email return 422; absent or invalid tokens return 404; unconfigured purchase returns 503.

The server's `can_resume_checkout` value controls resumption. Before checkout, after a definite creation failure or for an existing open session, the saved recipient can continue through email confirmation and purchase review. Open sessions reuse the stored URL. An active creation lease waits 60 seconds; subsequent attempts use the same idempotency key. Processing, paid, expired, over 24-hour-old or uncertain-delivery records do not invite another purchase. Late unpaid/expiry events cannot downgrade a paid record.

## Exact price and order binding

`PRICE_CENTS` is 9900. `CHECKUP_STRIPE_PRICE_ID` is required; it has no historical US$47 default. The integrator's newly created price reference is `price_1UX4UORpzjXsSjtTi0POceqC` on product `prod_VT2svoLk60Wjcp`. These are public identifiers, not credentials or evidence of an actual customer payment.

Before creating a session, the real Stripe adapter retrieves the configured price and requires live mode, active status, one-time/per-unit billing, USD9900, exclusive-of-tax behavior and the intended product. Wrong amount, currency, product, recurring/custom/transformed price or inactive status is rejected before a checkout session is created. Quantity is one; automatic tax is enabled. The browser never supplies a price or creates inline products.

Checkout uses the `checkup99-` idempotency prefix and durably binds the assessment to its configured price. The returned session must match its assessment/price metadata, exact expanded line item, quantity, currency and subtotal, with an allowed hosted checkout URL. Signed payment events must match the stored session, assessment, price metadata, recipient, live mode, USD9900 subtotal and total including only explicit nonnegative tax. Discounts and shipping are not enabled. Earlier US$47 sessions cannot fulfill US$99 orders.

Register `https://cdatats.com/api/checkup/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`. Signature verification uses the raw body and a five-minute timestamp window. Accepted paid events queue work atomically and return before document/mail work. Duplicate events cannot create duplicate fulfillment. Success/cancel fragments are removed before status requests and never grant entitlement.

## Production prerequisites and configuration

Use a dedicated service bound to `127.0.0.1`, with a separately allocated port, fresh private data such as `/var/lib/consolidata-growth99` (0700), and a reviewed root-owned environment file outside the repository/public tree. Do not reuse another project's keys, the Studio identity database or the47USD order database. `.env.example` documents the variable names; its blank values cannot enable purchases.

Required configuration includes the canonical HTTPS origin, live Stripe secret key, US$99 price identifier, exact endpoint-signing secret, authenticated mail-server host/port/security/username/password and sender, ReportLab, and `CHECKUP_LIVE_ENABLED=1`. The owner selected `alvinj@consolidatats.com` as the report sender; selecting an address does not configure or verify its mail authorization. Keep the live gate off until actual credentials, provider amount, tax behavior, attachment receipt and failure handling are verified. Configuration presence alone is insufficient.

Use authenticated Simple Mail Transfer Protocol (SMTP) over verified Transport Layer Security (TLS): STARTTLS on 587 or TLS on 465. Never send or commit credentials through chat, browser bundles or logs. The current implementation has no public administrative configuration form.

The usual service includes one outbox worker. `--worker-only` runs that worker; `--no-worker` disables automatic delivery for preview/audit. Workers send only paid records while the live gate remains enabled. `CHECKUP_CHECKOUT_PAUSED=1` disables new checkout and resumption without disabling signed payment processing or the paid outbox. Keep `CHECKUP_LIVE_ENABLED=1` in this recovery mode; live-off disables delivery too. Once any hosted session exists, preserve fulfillment until it has been reconciled or expired, even if the website is rolled back. No marketing follow-up, upsell, subscription or campaign is started.

`sent_accepted` means the configured mail server accepted the message, not that it reached the inbox. Definite temporary pre-send or SMTP4xx failures retry at most three times. Interrupted sending leases and uncertain timeouts become `delivery_uncertain` and are never automatically retried. An operator must investigate and obtain the applicable resend/correction authorization. There is no unauthenticated resend or recipient-change endpoint.

The existing static-only deployment script is insufficient for this version. Review the exact service/proxy diff, private file permissions, backup and rollback before production. Proxy controls must preserve the same origin, overwrite the real-client-address header, bound bodies/timeouts and keep token-bearing API access logs disabled. The service does not print answers, addresses, payment bodies, credentials or mail exception details. Existing unrelated sites and `/studio/` routes stay outside this release scope.

Database persistence is not offsite backup. Retention, deletion requests, delivery reputation, real refunds and recovery remain operator responsibilities. No current production activation, real payment, actual attachment receipt or customer-effectiveness claim follows from these source/tests.


## Staged execution update2026-11-01

The dedicated backend/API proxy has been installed with live delivery off and checkout paused. Actual canonical HTTPS configuration reads99USD/purchase disabled. Root/service-group configuration permissions and the unchanged47USD static release were read back. Company-sender authentication succeeded. One separately approved manual internal email, using the production mail transport, reached the exact company mailbox with a byte-identical12-page report; all30source answers and the worksheet survived extraction. This did not create a paid event, outbox job or customer result, and does not prove paid callback fulfillment.

Shared merchant accounts generate callbacks for other products. The follow-up source acknowledges clearly foreign signed checkout events without database/outbox writes. A known checkout, assessment or recorded event, or a claim to the configured assessment price, retains all strict amount/session/email checks. Invalid signatures and malformed structures still fail. This repair prevents unrelated callback retry noise; it is not evidence of a previous entitlement bypass. Actual backend release details are recorded separately from frontend release and account activation.
