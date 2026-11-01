"""Stop new purchases while preserving already-open payment fulfillment."""
from dataclasses import replace
from unittest.mock import patch
import unittest
from backend.service import ServiceError, Settings
from test_email_service import FixtureCase


class CheckoutPause(FixtureCase):
    def test_pause_blocks_checkout_but_keeps_signed_payment_and_worker(self):
        existing = self.ready_checkout()
        event = self.event(existing)
        self.service.settings = replace(self.settings, checkout_paused=True)
        self.assertFalse(self.service.config()["purchase_enabled"])
        self.assertFalse(self.service.status(existing)["can_resume_checkout"])
        new = self.assessment()["assessment_id"]
        self.service.save_email({"assessment_id": new, "email": "buyer@example.com"})
        with self.assertRaises(ServiceError) as rejected:
            self.service.checkout({"assessment_id": new, "email": "buyer@example.com"})
        self.assertEqual(rejected.exception.status, 503)
        self.assertEqual(len(self.stripe.calls), 1)
        self.service.webhook(*self.signed(event))
        self.assertEqual(self.service.work_once()["status"], "sent_accepted")
        self.assertEqual(len(self.mailer.messages), 1)
        self.assertEqual(self.service.status(existing)["payment_status"], "paid")

    def test_environment_pause_is_explicit(self):
        with patch.dict("os.environ", {"CHECKUP_CHECKOUT_PAUSED": "1"}):
            self.assertTrue(Settings.from_environment().checkout_paused)


if __name__ == "__main__":
    unittest.main()
