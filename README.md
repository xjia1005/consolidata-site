# ConsoliData Marketing Checkup — B candidate

This branch preserves the existing A reference and builds an assessment-first B journey. A remains live at https://cdatats.com/ until a separately verified B release. See versions/a-20261027.json for immutable A source/release commits. These are journey versions, not an automatically randomized experiment.

## B journey

Start assessment -> ten questions -> review and submit answers -> enter/confirm work email -> review the US$47 one-time report purchase and applicable tax -> secure payment -> signed paid confirmation -> full PDF report by transaction email attachment.

Homepage and action buttons omit prices. The purchase review discloses the amount before payment. Starting does not charge a visitor. Saving an email does not subscribe them to marketing. Syntax validation does not establish mailbox ownership or a business role.

The same ten question definitions and fixed-rule report logic are reused. Notes accompany the answers and do not change findings. The report describes practices, unknowns and next checks; it does not establish causes, validate account data or guarantee sales.

## Private delivery

Submitted answers and email are stored outside the public site tree. Browser responses provide coverage and delivery status only. No public full-report, PDF, print or export endpoint exists. A return URL never proves payment. The server fixes USD4700 and checks the matching signed paid event before queuing a PDF attachment. SMTP acceptance differs from inbox delivery; uncertain sends require review.

No speech recognition, external model, advertisement, outreach, recurring task, post or marketing subscription is enabled by this change.

## Run and verify

```powershell
python -B -m backend.email_service --host 127.0.0.1 --port 4197 --data-dir private/checkup-b-preview --site-dir site --public-origin http://127.0.0.1:4197 --no-worker
node --test tests/*.test.cjs
python -B -m unittest discover -s tests -p test_email_service.py -q
python -B tools/validate-checkup.py
```

Open http://127.0.0.1:4197/. Local preview supports questions, submission and work-email save. Payment stays disabled until real payment and report-mail configuration is verified. No runtime fixture-payment switch exists. Tests inject isolated provider fixtures. See backend/README.md for requirements.

## Release boundary

Do not use the old static-only release script for B: it cannot install the private API, worker, payment callback or mail configuration. Production needs a reviewed dedicated loopback service, private database, restricted same-origin proxy, Stripe key and signed webhook configuration, and authenticated TLS mail sender. No secret belongs in Git or browser code.

Live A, its checkout and /studio/ remain unchanged while B is a candidate. Before production, review the exact service/proxy diff, real fulfillment, attachment receipt and rollback. Source or fixture success does not establish production readiness or demand.

Task: docs/tasks/2026-10-27-assessment-first-b.md. Map: system_registry/codecraft/codebase-map.json.
