"""The dedicated website can use a live restricted key; test keys stay disabled."""
from dataclasses import replace
from pathlib import Path
import unittest
from backend.service import Settings


class PaymentKeyTypes(unittest.TestCase):
    def test_live_restricted_key_ready_and_test_publishable_keys_rejected(self):
        config = Settings(Path("unused-fixture-directory"), stripe_secret_key="rk_live_" + "r" * 36,
                          stripe_price_id="price_fixture99000001", stripe_webhook_secret="whsec_" + "s" * 36,
                          smtp_host="smtp.example.com", smtp_username="sender", smtp_password="fixture",
                          from_email="reports@example.com", live_enabled=True)
        self.assertTrue(config.purchase_ready())
        self.assertTrue(replace(config, stripe_secret_key="sk_live_" + "s" * 36).purchase_ready())
        for key in ("rk_test_" + "t" * 36, "pk_live_" + "p" * 36, "", "rk_live_short"):
            with self.subTest(key_type=key[:8]):
                self.assertFalse(replace(config, stripe_secret_key=key).purchase_ready())


if __name__ == "__main__":
    unittest.main()
