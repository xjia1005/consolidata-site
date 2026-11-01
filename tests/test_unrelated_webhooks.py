"""Shared-account events are acknowledged without relaxing owned payments."""
import copy
import unittest

from backend.service import ServiceError
from test_email_service import FIXTURE_PRICE_ID, FixtureCase


class UnrelatedWebhookTests(FixtureCase):
    def foreign_event(self, token, event_id="evt_foreignfixture0001"):
        event = self.event(token, event_id)
        event["data"]["object"].update(
            id="cs_live_foreignfixture0001", client_reference_id=None,
            metadata={}, amount_subtotal=4700, amount_total=4700,
            customer_details={"email": "foreign@example.invalid"})
        return event

    def assert_no_fulfillment(self, token):
        with self.service.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM stripe_events").fetchone()[0], 0)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM outbox").fetchone()[0], 0)
        self.assertEqual(self.service.status(token)["payment_status"], "pending")
        self.assertEqual(self.mailer.messages, [])

    def test_signed_foreign_sessions_ignore_without_events_or_outbox(self):
        token = self.ready_checkout()
        variants = []
        no_metadata = self.foreign_event(token)
        del no_metadata["data"]["object"]["metadata"]
        variants.append(("missing_metadata", no_metadata))
        variants.append(("empty_metadata", self.foreign_event(token)))
        nullable_metadata = self.foreign_event(token)
        nullable_metadata["data"]["object"]["metadata"] = None
        variants.append(("nullable_metadata", nullable_metadata))
        other_metadata = self.foreign_event(token)
        other_metadata["data"]["object"]["metadata"] = {
            "assessment_id": "B" * 43, "price_id": "price_foreignfixture0001"}
        variants.append(("foreign_assessment_and_price", other_metadata))
        foreign99 = self.foreign_event(token)
        foreign99["data"]["object"].update(amount_subtotal=9900, amount_total=9900)
        variants.append(("unrelated_same_amount", foreign99))
        subscription = self.foreign_event(token)
        subscription["data"]["object"].update(mode="subscription", currency="cad")
        variants.append(("unrelated_subscription", subscription))
        for index, (name, event) in enumerate(variants):
            event["id"] = "evt_foreignfixture%04d" % index
            with self.subTest(case=name):
                self.assertEqual(self.service.webhook(*self.signed(event)), {"received": True, "ignored": True})
        self.assert_no_fulfillment(token)

    def test_foreign_lifecycle_events_ignore_without_mutating_owned_order(self):
        token = self.ready_checkout()
        for index, (event_type, status, payment) in enumerate([
            ("checkout.session.completed", "complete", "unpaid"),
            ("checkout.session.async_payment_succeeded", "complete", "paid"),
            ("checkout.session.expired", "expired", "unpaid"),
        ]):
            event = self.foreign_event(token, "evt_foreignlifecycle%04d" % index)
            event["type"] = event_type
            event["data"]["object"].update(status=status, payment_status=payment)
            with self.subTest(event_type=event_type):
                self.assertEqual(self.service.webhook(*self.signed(event)), {"received": True, "ignored": True})
        self.assert_no_fulfillment(token)

    def test_foreign_events_still_require_valid_fresh_raw_signature(self):
        token = self.ready_checkout()
        event = self.foreign_event(token)
        body, signature = self.signed(event)
        attempts = [(body, "t=1000000,v1=" + "0" * 64), (body + b" ", signature),
                    self.signed(event, self.now - 301), self.signed(event, self.now + 301)]
        for index, (raw, signed) in enumerate(attempts):
            with self.subTest(signature_case=index), self.assertRaises(ServiceError) as failed:
                self.service.webhook(raw, signed)
            self.assertEqual(failed.exception.code, "invalid_signature")
        self.assert_no_fulfillment(token)

    def test_malformed_foreign_envelope_or_metadata_is_not_ignored(self):
        token = self.ready_checkout()
        variants = []
        for metadata in ([], "invalid", {"price_id": []}):
            event = self.foreign_event(token)
            event["data"]["object"]["metadata"] = metadata
            variants.append(event)
        bad_id = self.foreign_event(token)
        bad_id["data"]["object"]["id"] = "cs_test_wrongmode0001"
        variants.append(bad_id)
        bad_live = self.foreign_event(token)
        bad_live["data"]["object"]["livemode"] = False
        variants.append(bad_live)
        bad_mode = self.foreign_event(token)
        bad_mode["data"]["object"]["mode"] = "invalid"
        variants.append(bad_mode)
        for index, event in enumerate(variants):
            event["id"] = "evt_malformedforeign%04d" % index
            with self.subTest(case=index), self.assertRaises(ServiceError) as failed:
                self.service.webhook(*self.signed(event))
            self.assertEqual(failed.exception.code, "invalid_event")
        self.assert_no_fulfillment(token)

    def test_known_session_or_assessment_retains_strict_payment_checks(self):
        token = self.ready_checkout()
        variants = []
        missing = self.event(token)
        missing["data"]["object"]["metadata"] = {}
        variants.append(missing)
        unknown_token = self.event(token)
        unknown_token["data"]["object"].update(client_reference_id="B" * 43,
            metadata={"assessment_id": "B" * 43, "price_id": "price_foreignfixture0001"})
        variants.append(unknown_token)
        wrong_price = self.event(token)
        wrong_price["data"]["object"].update(id="cs_live_unknownsession0001",
            metadata={"assessment_id": token, "price_id": "price_foreignfixture0001"})
        variants.append(wrong_price)
        for index, event in enumerate(variants):
            event["id"] = "evt_ownedstrictfixture%04d" % index
            with self.subTest(case=index), self.assertRaises(ServiceError):
                self.service.webhook(*self.signed(event))
        self.assert_no_fulfillment(token)

    def test_orphan_our_price_and_early_known_assessment_are_not_ignored(self):
        token = self.ready_checkout()
        orphan = self.foreign_event(token)
        orphan["data"]["object"].update(amount_subtotal=9900, amount_total=9900,
            client_reference_id="B" * 43, metadata={"assessment_id": "B" * 43, "price_id": FIXTURE_PRICE_ID})
        early_token = self.assessment()["assessment_id"]
        early = copy.deepcopy(orphan)
        early["data"]["object"].update(client_reference_id=early_token,
            metadata={"assessment_id": early_token, "price_id": "price_foreignfixture0001"})
        for index, event in enumerate((orphan, early)):
            event["id"] = "evt_unboundownedfixture%04d" % index
            with self.subTest(case=index), self.assertRaises(ServiceError) as failed:
                self.service.webhook(*self.signed(event))
            self.assertEqual(failed.exception.code, "payment_mismatch")
        self.assert_no_fulfillment(token)

    def test_recorded_event_id_remains_owned_and_valid_payment_stays_idempotent(self):
        token = self.ready_checkout()
        event = self.event(token, "evt_ownedpaidfixture0001")
        body, signature = self.signed(event)
        self.assertEqual(self.service.webhook(body, signature), {"received": True})
        self.assertEqual(self.service.webhook(body, signature), {"received": True, "duplicate": True})
        conflicting = self.foreign_event(token, event["id"])
        with self.assertRaises(ServiceError):
            self.service.webhook(*self.signed(conflicting))
        with self.service.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM stripe_events").fetchone()[0], 1)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM outbox").fetchone()[0], 1)
        self.assertEqual(self.service.status(token)["payment_status"], "paid")
        self.assertEqual(self.mailer.messages, [])


if __name__ == "__main__":
    unittest.main()
