# ConsoliData Website

Static source for the ConsoliData public website intended for
[cdatats.com](https://cdatats.com).
`www.cdatats.com`, `consolidatats.com`, and `www.consolidatats.com` are legacy
or convenience entry points that will redirect one way to the same path and
query string on `https://cdatats.com`; the domains never redirect to each other.

Status: pre-launch source review. The public domain has not been cut over to
this version.

## What the site explains

ConsoliData offers a fixed-scope Buyer Evidence & Revenue Message Sprint for
established physical-product companies. The site explains the customer
problem, deliverables, evidence limits, fit criteria, price, and next action.

## Technology

The website uses dependency-free HTML, CSS, and JavaScript. Public assets live
under `site/`.

## Local preview

```powershell
python -m http.server 4175 --directory site
```

Open `http://127.0.0.1:4175/`.

## Repository boundary

This public repository contains only website source. It does not contain:

- prospect or customer records;
- contact lists or outreach history;
- interview recordings or transcripts;
- internal research, pricing economics, or validation ledgers;
- production infrastructure, Domain Name System, or deployment records;
- credentials, secrets, payment data, or private files.

Do not submit confidential information, credentials, customer data, or security
reports through public GitHub issues.

## Copyright

Copyright © 2026 ConsoliData. All rights reserved.
