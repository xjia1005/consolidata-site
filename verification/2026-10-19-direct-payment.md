# Direct payment release — October 19, 2026

Published website revision: e6100beb71242644eed7f99f5cae7f6bdf971eeb.
Canonical entry: https://cdatats.com/

All six priced purchase links now open the existing hosted product-and-payment form directly in the same tab. The obsolete checkout.html route automatically replaces its history entry with the configured payment URL. A labelled fallback remains available without JavaScript. Redirect scripts have a fresh cache identity for returning visitors; destination parameters are never taken from the query string.

Price remains USD27 once, plus applicable tax. Payment account, banks, legal entity, report engine, questionnaire and delivery configuration are unchanged. No embedded checkout backend, dependencies, analytics or external send was added. No real charge was made.

Verification: test-first reproduction failed for the old extra-click flow, then all27unit tests passed, including a separate failing/passing cache regression. Static link/discovery validation and JavaScript syntax pass. Independent Chrome desktop1440x900 and phone390x844 tests covered exact anchors, same-tab click, phone menu, legacy redirect/history, query stripping, invalid configuration and working no-JavaScript fallback. Source scope/simplification review found no P1/P2 issues. Protected report/config/shared-UI files remain unchanged.

After deployment, actual public homepage purchase click opened the hosted form directly. Desktop1440x1000 shows product summary and payment form side by side; phone390x844 shows a contained stacked form. Actual product name, USD27 and available Link/Apple Pay controls were observed; no form was submitted. Production discovery endpoints and versioned scripts returned200. Questionnaire remains noindex. Search Console submission and indexing are not claimed.

The dedicated immutable site release preserves the prior version for rollback. The shared server configuration was verified unchanged; no unrelated website was modified. This removes one required purchase interaction. Any resulting conversion change is unmeasured and must be evaluated with real customer behavior.
