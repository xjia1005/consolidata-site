"""Critical privacy/payment/delivery boundary tests; every provider is a fixture."""
import copy
from dataclasses import replace
from email import policy
from email.parser import BytesParser
import hashlib
import hmac
import http.client
import json
import os
from pathlib import Path
import smtplib
import ssl
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs

from backend.email_service import QuietServer, handler_for
from backend.report import DEFINITIONS, build_report, render_pdf
from backend.service import CheckupService, DeliveryError, ServiceError, Settings, SMTPMailer, StripeClient, valid_email


class FakeStripe:
    def __init__(self):
        self.calls = []
        self.response_changes = {}

    def create_session(self, token, email, origin):
        self.calls.append((token, email, origin))
        identifier = "cs_live_" + hashlib.sha256(token.encode()).hexdigest()[:24]
        return {"id": identifier, "url": "https://checkout.stripe.com/c/pay/" + identifier,
                "livemode": True, "amount_subtotal": 4700, "currency": "usd", **self.response_changes}


class FixtureMailer:
    def __init__(self):
        self.messages = []
        self.failures = []

    def send(self, message):
        if self.failures:
            raise self.failures.pop(0)
        self.messages.append(message.as_bytes())


class FixtureCase(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.now = 1000000.0
        self.settings = Settings(self.root / "private", stripe_secret_key="sk_live_" + "k" * 36,
                                 stripe_webhook_secret="whsec_" + "s" * 36, smtp_host="smtp.example.com",
                                 smtp_username="sender", smtp_password="fixture-password", from_email="reports@example.com",
                                 live_enabled=True)
        self.stripe = FakeStripe()
        self.mailer = FixtureMailer()
        self.service = CheckupService(self.settings, stripe=self.stripe, mailer=self.mailer, clock=lambda: self.now)
        self.answers = {item["id"]: item["values"][1] for item in DEFINITIONS}

    def assessment(self, answers=None, notes=None):
        return self.service.create_assessment({"answers": self.answers if answers is None else answers,
                                               "notes": {} if notes is None else notes, "source": "CDTS-CNT-FIXTURE"})

    def ready_checkout(self):
        token = self.assessment()["assessment_id"]
        self.service.save_email({"assessment_id": token, "email": "buyer@example.com"})
        self.service.checkout({"assessment_id": token, "email": "buyer@example.com"})
        return token

    def event(self, token, event_id="evt_fixture000001"):
        with self.service.connect() as db:
            session_id = db.execute("SELECT checkout_id FROM assessments WHERE id=?", (token,)).fetchone()[0]
        return {"id": event_id, "type": "checkout.session.completed", "livemode": True,
                "data": {"object": {"id": session_id, "mode": "payment", "livemode": True,
                        "status": "complete",
                        "client_reference_id": token, "metadata": {"assessment_id": token},
                        "payment_status": "paid", "currency": "usd", "amount_subtotal": 4700,
                        "amount_total": 4700, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0},
                        "customer_details": {"email": "buyer@example.com"}}}}

    def signed(self, event, timestamp=None):
        body = json.dumps(event, separators=(",", ":")).encode()
        stamp = str(int(self.now if timestamp is None else timestamp))
        signature = hmac.new(self.settings.stripe_webhook_secret.encode(), stamp.encode() + b"." + body, hashlib.sha256).hexdigest()
        return body, "t=" + stamp + ",v1=" + signature

    def pay(self, token):
        body, signature = self.signed(self.event(token))
        return self.service.webhook(body, signature)


class AssessmentAndConfigTests(FixtureCase):
    def test_preview_exposes_coverage_only_and_private_storage(self):
        result = self.assessment(notes={"buying_reason": "<script>private note</script>"})
        self.assertEqual(set(result), {"assessment_id", "preview"})
        self.assertEqual(set(result["preview"]), {"answered", "unknowns", "message"})
        self.assertNotIn("private note", json.dumps(result))
        self.assertNotIn(DEFINITIONS[0]["priority"]["action"], json.dumps(result))
        status = self.service.status(result["assessment_id"])
        self.assertEqual(set(status), {"payment_status", "delivery_status", "masked_email", "can_resume_checkout"})
        self.assertEqual(status["payment_status"], "unpaid")
        self.assertFalse(self.service.database.resolve().is_relative_to(Path(__file__).resolve().parents[1] / "site"))

    def test_invalid_missing_extra_answers_and_oversize_notes_are_rejected(self):
        broken = [[], {}, {**self.answers, "injected": "value"}, {**self.answers, "buying_reason": True},
                  {**self.answers, "buying_reason": "invalid"}]
        for answers in broken:
            with self.subTest(answers=type(answers).__name__), self.assertRaises(ServiceError):
                self.assessment(answers=answers)
        for notes in [[], {"extra": "no"}, {"buying_reason": "a" * 601}, {"buying_reason": "\x00"},
                      {"buying_reason": "😀" * 301}]:
            with self.subTest(notes=str(type(notes))), self.assertRaises(ServiceError):
                self.assessment(notes=notes)

    def test_unknown_and_not_applicable_do_not_become_priorities(self):
        answers = {item["id"]: "na" for item in DEFINITIONS}
        answers["buying_reason"] = "unknown"
        report = build_report(answers, {})
        self.assertEqual(len(report["unknowns"]), 1)
        self.assertEqual(report["priorities"], [])
        self.assertEqual(len(report["answerSummary"]), 10)
        self.assertEqual(self.assessment(answers=answers)["preview"]["unknowns"], 1)

    def test_ordered_three_priorities_are_explicit_and_pdf_is_real(self):
        report = build_report(self.answers, {"buying_reason": "Plain note & markup <safe>"})
        self.assertEqual([item["title"] for item in report["priorities"]],
                         [item["priority"]["title"] for item in DEFINITIONS[:3]])
        pdf = render_pdf(report)
        self.assertTrue(pdf.startswith(b"%PDF-"))
        self.assertGreater(len(pdf), 5000)
        self.assertEqual(report["answerSummary"][0]["note"], "Plain note & markup <safe>")

    def test_settings_fail_closed_and_no_environment_test_mode(self):
        for settings in [replace(self.settings, live_enabled=False), replace(self.settings, smtp_password=""),
                         replace(self.settings, stripe_secret_key="sk_test_fixture"),
                         replace(self.settings, stripe_webhook_secret=""), replace(self.settings, smtp_security="plain"),
                         replace(self.settings, public_origin="http://127.0.0.1:4197"),
                         replace(self.settings, public_origin="https://cdatats.com:bad")]:
            self.assertFalse(settings.purchase_ready())
        with patch.dict(os.environ, {"CHECKUP_TEST_MODE": "1", "CHECKUP_LIVE_ENABLED": "1",
                                    "CHECKUP_STRIPE_SECRET_KEY": "sk_test_fixture"}, clear=True):
            self.assertFalse(Settings.from_environment().purchase_ready())
        with patch("backend.service.pdf_available", return_value=False):
            self.assertFalse(self.settings.purchase_ready())

    def test_unconfigured_checkout_and_worker_make_no_external_call(self):
        service = CheckupService(replace(self.settings, live_enabled=False), stripe=self.stripe, mailer=self.mailer)
        self.assertFalse(service.config()["purchase_enabled"])
        with self.assertRaises(ServiceError) as failure:
            service.checkout({"assessment_id": "a" * 43, "email": "buyer@example.com"})
        self.assertEqual(failure.exception.status, 503)
        self.assertEqual(service.work_once()["status"], "disabled")
        self.assertEqual(self.stripe.calls, [])

    def test_email_header_injection_is_rejected(self):
        for email in ["buyer@example.com\r\nBcc: other@example.com", "buyer@example.com\n", "Name <buyer@example.com>",
                      "a@example.com,other@example.com", "a\x00@example.com", "a b@example.com", ".a@example.com"]:
            with self.subTest(email=repr(email)), self.assertRaises(ServiceError):
                valid_email(email)
        self.assertEqual(valid_email("Buyer+report@EXAMPLE.COM"), "Buyer+report@example.com")

    @unittest.skipIf(os.name == "nt", "POSIX permission-bit assertion; directory remains outside web root on Windows")
    def test_private_database_permissions(self):
        self.assertEqual(self.service.database.stat().st_mode & 0o077, 0)
        self.assertEqual(self.settings.data_dir.stat().st_mode & 0o077, 0)


class EmailCaptureTests(FixtureCase):
    def test_email_is_persisted_without_providers_and_does_not_start_payment_or_mail(self):
        service = CheckupService(Settings(self.settings.data_dir), stripe=self.stripe, mailer=self.mailer,
                                 clock=lambda: self.now)
        assessment = service.create_assessment({"answers": self.answers, "notes": {}})
        token = assessment["assessment_id"]
        self.assertFalse(service.config()["purchase_enabled"])
        self.assertEqual(set(assessment["preview"]), {"answered", "unknowns", "message"})
        result = service.save_email({"assessment_id": token, "email": "Buyer+report@EXAMPLE.COM"})
        self.assertEqual(result, {"masked_email": "B***@example.com"})
        with service.connect() as db:
            row = db.execute("SELECT * FROM assessments WHERE id=?", (token,)).fetchone()
            self.assertEqual(row["email"], "Buyer+report@example.com")
            self.assertEqual(row["payment_status"], "unpaid")
            self.assertEqual(row["delivery_status"], "not_requested")
            self.assertEqual(row["checkout_state"], "none")
            self.assertIsNone(row["checkout_id"])
            self.assertEqual(db.execute("SELECT COUNT(*) FROM outbox").fetchone()[0], 0)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM stripe_events").fetchone()[0], 0)
        reopened = CheckupService(Settings(self.settings.data_dir), stripe=self.stripe, mailer=self.mailer)
        self.assertEqual(reopened.status(token)["masked_email"], result["masked_email"])
        self.assertEqual(self.stripe.calls, [])
        self.assertEqual(self.mailer.messages, [])

    def test_invalid_email_payload_and_missing_or_wrong_token_do_not_persist(self):
        token = self.assessment()["assessment_id"]
        payloads = [None, [], {}, {"assessment_id": token}, {"email": "buyer@example.com"},
                    {"assessment_id": token, "email": "buyer@example.com", "marketing_consent": True}]
        for payload in payloads:
            with self.subTest(payload=type(payload).__name__), self.assertRaises(ServiceError) as failure:
                self.service.save_email(payload)
            self.assertEqual(failure.exception.status, 422)
        for email in [None, "", "invalid", "buyer@example.com\r\nBcc: other@example.com", "Name <buyer@example.com>"]:
            with self.subTest(email=repr(email)), self.assertRaises(ServiceError) as failure:
                self.service.save_email({"assessment_id": token, "email": email})
            self.assertEqual(failure.exception.status, 422)
        for missing in [None, "", "short", "a" * 42, "a" * 43 + "\n", "a" * 43]:
            with self.subTest(token=repr(missing)), self.assertRaises(ServiceError) as failure:
                self.service.save_email({"assessment_id": missing, "email": "buyer@example.com"})
            self.assertEqual(failure.exception.status, 404)
        self.assertIsNone(self.service.status(token)["masked_email"])
        self.assertEqual(self.stripe.calls, [])
        self.assertEqual(self.mailer.messages, [])

    def test_same_email_is_idempotent_and_correction_before_checkout_is_allowed(self):
        token = self.assessment()["assessment_id"]
        first = self.service.save_email({"assessment_id": token, "email": "Buyer@EXAMPLE.COM"})
        again = self.service.save_email({"assessment_id": token, "email": "buyer@example.com"})
        self.assertEqual(first, again)
        with self.service.connect() as db:
            self.assertEqual(db.execute("SELECT email FROM assessments WHERE id=?", (token,)).fetchone()[0],
                             "Buyer@example.com")
        self.assertEqual(self.service.save_email({"assessment_id": token, "email": "correct@example.com"}),
                         {"masked_email": "c***@example.com"})
        self.service.checkout({"assessment_id": token, "email": "correct@EXAMPLE.COM"})
        self.assertEqual(self.stripe.calls[0][1], "correct@example.com")
        self.assertEqual(len(self.stripe.calls), 1)

    def test_different_email_is_rejected_during_checkout_and_after_open_or_paid(self):
        token = self.assessment()["assessment_id"]
        payload = {"assessment_id": token, "email": "buyer@example.com"}
        self.service.save_email(payload)
        create_session = self.stripe.create_session
        def during_checkout(*args):
            with self.assertRaises(ServiceError) as failure:
                self.service.save_email({"assessment_id": token, "email": "other@example.com"})
            self.assertEqual(failure.exception.code, "email_already_bound")
            self.assertEqual(self.service.save_email(payload), {"masked_email": "b***@example.com"})
            return create_session(*args)
        with patch.object(self.stripe, "create_session", side_effect=during_checkout):
            self.service.checkout(payload)
        for paid in [False, True]:
            if paid:
                self.pay(token)
            with self.subTest(paid=paid), self.assertRaises(ServiceError) as failure:
                self.service.save_email({"assessment_id": token, "email": "other@example.com"})
            self.assertEqual(failure.exception.status, 409)
            self.assertEqual(self.service.save_email(payload), {"masked_email": "b***@example.com"})
        self.assertEqual(len(self.stripe.calls), 1)
        self.assertEqual(self.mailer.messages, [])

    def test_failed_provider_response_keeps_recipient_bound_to_idempotency_key(self):
        token = self.assessment()["assessment_id"]
        payload = {"assessment_id": token, "email": "buyer@example.com"}
        self.service.save_email(payload)
        self.stripe.response_changes = {"url": "https://untrusted.example/checkout"}
        with self.assertRaises(ServiceError):
            self.service.checkout(payload)
        with self.assertRaises(ServiceError) as failure:
            self.service.save_email({"assessment_id": token, "email": "other@example.com"})
        self.assertEqual(failure.exception.code, "email_already_bound")
        self.assertEqual(self.service.save_email(payload), {"masked_email": "b***@example.com"})
        self.stripe.response_changes = {}
        self.service.checkout(payload)
        self.assertEqual(self.stripe.calls[0], self.stripe.calls[1])

    def test_checkout_requires_saved_matching_email_without_silent_recipient_change(self):
        token = self.assessment()["assessment_id"]
        with self.assertRaises(ServiceError) as failure:
            self.service.checkout({"assessment_id": token, "email": "buyer@example.com"})
        self.assertEqual(failure.exception.code, "report_email_required")
        self.assertEqual(failure.exception.status, 422)
        self.assertIsNone(self.service.status(token)["masked_email"])
        self.service.save_email({"assessment_id": token, "email": "Buyer@example.com"})
        with self.assertRaises(ServiceError) as failure:
            self.service.checkout({"assessment_id": token, "email": "other@example.com"})
        self.assertEqual(failure.exception.code, "email_already_bound")
        self.assertEqual(self.stripe.calls, [])
        result = self.service.checkout({"assessment_id": token, "email": "buyer@EXAMPLE.COM"})
        self.assertEqual(self.stripe.calls[0][1], "Buyer@example.com")
        self.assertEqual(self.service.checkout({"assessment_id": token, "email": "Buyer@example.com"}), result)
        self.assertEqual(len(self.stripe.calls), 1)


class PaymentAndOutboxTests(FixtureCase):
    def test_checkout_idempotency_email_binding_and_no_client_amount(self):
        token = self.assessment()["assessment_id"]
        self.service.save_email({"assessment_id": token, "email": "buyer@example.com"})
        first = self.service.checkout({"assessment_id": token, "email": "buyer@example.com"})
        second = self.service.checkout({"assessment_id": token, "email": "buyer@example.com"})
        self.assertEqual(first, second)
        self.assertEqual(len(self.stripe.calls), 1)
        with self.assertRaises(ServiceError):
            self.service.checkout({"assessment_id": token, "email": "different@example.com"})
        with self.assertRaises(ServiceError):
            self.service.checkout({"assessment_id": token, "email": "buyer@example.com", "amount": 1})

    def test_live_checkout_rejects_test_session_wrong_amount_or_untrusted_url(self):
        for changes in [{"livemode": False}, {"amount_subtotal": 2700}, {"currency": "cad"},
                        {"url": "https://attacker.example/checkout"}, {"id": "cs_test_fixture000"}]:
            token = self.assessment()["assessment_id"]
            self.service.save_email({"assessment_id": token, "email": "buyer@example.com"})
            self.stripe.response_changes = changes
            with self.subTest(changes=changes), self.assertRaises(ServiceError):
                self.service.checkout({"assessment_id": token, "email": "buyer@example.com"})
            self.assertEqual(self.service.status(token)["payment_status"], "unpaid")

    def test_forged_expired_future_and_modified_raw_webhooks_rejected(self):
        token = self.ready_checkout()
        event = self.event(token)
        for timestamp in [self.now - 301, self.now + 301]:
            body, signature = self.signed(event, timestamp)
            with self.assertRaises(ServiceError):
                self.service.webhook(body, signature)
        body, signature = self.signed(event)
        for altered_body, altered_signature in [(body + b" ", signature), (body, "t=1000000,v1=" + "0" * 64), (body, None)]:
            with self.assertRaises(ServiceError):
                self.service.webhook(altered_body, altered_signature)
        self.assertEqual(self.service.status(token)["payment_status"], "pending")
        self.assertEqual(self.mailer.messages, [])

    def test_unpaid_or_wrong_session_currency_amount_email_mode_cannot_unlock(self):
        token = self.ready_checkout()
        unpaid = self.event(token)
        unpaid["data"]["object"]["payment_status"] = "unpaid"
        body, signature = self.signed(unpaid)
        self.assertTrue(self.service.webhook(body, signature)["received"])
        self.assertFalse(self.service.status(token)["can_resume_checkout"])
        changes = [{"id": "cs_live_different0000"}, {"currency": "cad"}, {"amount_subtotal": 2700},
                   {"amount_total": 9999}, {"livemode": False}, {"mode": "subscription"},
                   {"customer_details": {"email": "wrong@example.com"}},
                   {"total_details": {"amount_tax": -1}}, {"total_details": {"amount_tax": 0, "amount_discount": 100}}]
        for index, change in enumerate(changes):
            event = self.event(token, "evt_invalidmatch" + str(index))
            event["data"]["object"].update(change)
            body, signature = self.signed(event)
            with self.subTest(change=change), self.assertRaises(ServiceError):
                self.service.webhook(body, signature)
        self.assertEqual(self.service.status(token)["payment_status"], "pending")
        self.assertEqual(self.service.work_once()["status"], "idle")

    def test_resume_status_reuses_open_session_and_blocks_actual_processing(self):
        token = self.assessment()["assessment_id"]
        self.assertFalse(self.service.status(token)["can_resume_checkout"])
        payload = {"assessment_id": token, "email": "buyer@example.com"}
        self.service.save_email(payload)
        self.assertTrue(self.service.status(token)["can_resume_checkout"])
        original = self.service.checkout(payload)
        status = self.service.status(token)
        self.assertEqual(status["payment_status"], "pending")
        self.assertIs(status["can_resume_checkout"], True, "an open checkout can be resumed after browser cancel")
        self.assertEqual(self.service.checkout(payload), original)
        self.assertEqual(len(self.stripe.calls), 1, "cancel/resume must reuse the same session")
        event = self.event(token, "evt_processing0001")
        event["data"]["object"]["payment_status"] = "unpaid"
        body, signature = self.signed(event)
        self.service.webhook(body, signature)
        self.assertFalse(self.service.status(token)["can_resume_checkout"])
        self.assertTrue(self.service.webhook(body, signature)["duplicate"])
        with self.assertRaises(ServiceError) as failure:
            self.service.checkout(payload)
        self.assertEqual(failure.exception.code, "payment_processing")
        with self.service.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM outbox").fetchone()[0], 0)
        paid = self.event(token, "evt_paidafterasync0001")
        paid["type"] = "checkout.session.async_payment_succeeded"
        body, signature = self.signed(paid)
        self.service.webhook(body, signature)
        self.assertEqual(self.service.status(token)["payment_status"], "paid")
        self.assertFalse(self.service.status(token)["can_resume_checkout"])
        self.assertEqual(len(self.stripe.calls), 1)
        self.assertEqual(self.mailer.messages, [])

    def test_signed_expiry_is_terminal_for_resume_and_stale_events_do_not_downgrade_paid(self):
        token = self.ready_checkout()
        event = self.event(token, "evt_expired0001")
        event["type"] = "checkout.session.expired"
        event["data"]["object"].update(status="expired", payment_status="unpaid")
        body, signature = self.signed(event)
        self.service.webhook(body, signature)
        self.assertFalse(self.service.status(token)["can_resume_checkout"])
        with self.assertRaises(ServiceError) as failure:
            self.service.checkout({"assessment_id": token, "email": "buyer@example.com"})
        self.assertEqual(failure.exception.status, 410)
        self.assertTrue(self.service.webhook(body, signature)["duplicate"])
        with self.service.connect() as db:
            self.assertEqual(db.execute("SELECT checkout_state FROM assessments WHERE id=?", (token,)).fetchone()[0], "expired")
            self.assertEqual(db.execute("SELECT COUNT(*) FROM outbox").fetchone()[0], 0)
        self.assertEqual(len(self.stripe.calls), 1)
        paid_token = self.ready_checkout()
        self.pay(paid_token)
        for event_type, session_status in [("checkout.session.completed", "complete"), ("checkout.session.expired", "expired")]:
            stale = self.event(paid_token, "evt_stale" + session_status + "0001")
            stale["type"] = event_type
            stale["data"]["object"].update(status=session_status, payment_status="unpaid")
            body, signature = self.signed(stale)
            self.service.webhook(body, signature)
            self.assertEqual(self.service.status(paid_token)["payment_status"], "paid")
            self.assertFalse(self.service.status(paid_token)["can_resume_checkout"])

    def test_nonpaid_lifecycle_events_still_require_matching_signature_session_email_and_amount(self):
        token = self.ready_checkout()
        for event_type, session_status in [("checkout.session.completed", "complete"), ("checkout.session.expired", "expired")]:
            event = self.event(token, "evt_matching" + session_status + "0001")
            event["type"] = event_type
            event["data"]["object"].update(status=session_status, payment_status="unpaid")
            body, signature = self.signed(event)
            with self.assertRaises(ServiceError):
                self.service.webhook(body + b" ", signature)
            for changes in [{"id": "cs_live_different0000"}, {"amount_subtotal": 2700}, {"amount_total": 0},
                            {"customer_details": {"email": "other@example.com"}}, {"status": "open"}]:
                altered = copy.deepcopy(event)
                altered["data"]["object"].update(changes)
                body, signature = self.signed(altered)
                with self.subTest(event_type=event_type, changes=changes), self.assertRaises(ServiceError):
                    self.service.webhook(body, signature)
                self.assertTrue(self.service.status(token)["can_resume_checkout"])
        with self.service.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM stripe_events").fetchone()[0], 0)

    def test_failed_creation_expiry_and_uncertain_delivery_have_authoritative_resume_flags(self):
        token = self.assessment()["assessment_id"]
        payload = {"assessment_id": token, "email": "buyer@example.com"}
        self.service.save_email(payload)
        self.stripe.response_changes = {"url": "https://untrusted.example/checkout"}
        with self.assertRaises(ServiceError):
            self.service.checkout(payload)
        self.assertTrue(self.service.status(token)["can_resume_checkout"])
        self.stripe.response_changes = {}
        self.service.checkout(payload)
        with self.service.connect() as db:
            db.execute("UPDATE assessments SET delivery_status='delivery_uncertain' WHERE id=?", (token,))
        self.assertFalse(self.service.status(token)["can_resume_checkout"])
        with self.assertRaises(ServiceError) as failure:
            self.service.checkout(payload)
        self.assertEqual(failure.exception.code, "delivery_review_required")
        fresh_token = self.assessment()["assessment_id"]
        fresh_payload = {"assessment_id": fresh_token, "email": "buyer@example.com"}
        self.service.save_email(fresh_payload)
        self.now += 86401
        self.assertFalse(self.service.status(fresh_token)["can_resume_checkout"])
        with self.assertRaises(ServiceError) as failure:
            self.service.checkout(fresh_payload)
        self.assertEqual(failure.exception.status, 410)

    def test_paid_tax_duplicate_webhooks_queue_once_and_fixture_smtp_gets_attachment(self):
        token = self.ready_checkout()
        event = self.event(token)
        event["data"]["object"]["amount_total"] = 4935
        event["data"]["object"]["total_details"]["amount_tax"] = 235
        body, signature = self.signed(event)
        self.service.webhook(body, signature)
        self.assertEqual(self.mailer.messages, [], "webhook must not send synchronously")
        self.assertTrue(self.service.webhook(body, signature)["duplicate"])
        second = copy.deepcopy(event)
        second["id"] = "evt_fixture000002"
        body2, signature2 = self.signed(second)
        self.service.webhook(body2, signature2)
        self.assertEqual(self.service.work_once()["status"], "sent_accepted")
        self.assertEqual(self.service.work_once()["status"], "idle")
        self.assertEqual(len(self.mailer.messages), 1)
        parsed = BytesParser(policy=policy.default).parsebytes(self.mailer.messages[0])
        self.assertEqual(parsed["To"], "buyer@example.com")
        attachments = list(parsed.iter_attachments())
        self.assertEqual(len(attachments), 1)
        self.assertEqual(attachments[0].get_content_type(), "application/pdf")
        self.assertTrue(attachments[0].get_payload(decode=True).startswith(b"%PDF-"))
        self.assertNotIn(token, parsed["Message-ID"])
        status = self.service.status(token)
        self.assertEqual(status["masked_email"], "b***@example.com")
        self.assertEqual(status["delivery_status"], "sent_accepted")
        with self.assertRaises(ServiceError):
            self.service.checkout({"assessment_id": token, "email": "buyer@example.com"})

    def test_definite_pre_send_transient_failure_retries_at_most_three(self):
        token = self.ready_checkout()
        self.pay(token)
        self.mailer.failures = [DeliveryError("mail_connection_failed", retryable=True)] * 3
        self.assertEqual(self.service.work_once()["status"], "retry_pending")
        self.assertEqual(self.service.work_once()["status"], "idle")
        self.now += 61
        self.assertEqual(self.service.work_once()["status"], "retry_pending")
        self.now += 121
        self.assertEqual(self.service.work_once()["status"], "failed")
        self.now += 1000
        self.assertEqual(self.service.work_once()["status"], "idle")
        self.assertEqual(self.mailer.messages, [])

    def test_uncertain_data_and_abandoned_worker_never_auto_resend(self):
        token = self.ready_checkout()
        self.pay(token)
        self.mailer.failures = [DeliveryError("delivery_uncertain", uncertain=True)]
        self.assertEqual(self.service.work_once()["status"], "delivery_uncertain")
        self.now += 1000
        self.assertEqual(self.service.work_once()["status"], "idle")
        with self.service.connect() as db:
            db.execute("UPDATE outbox SET status='sending',lease_until=? WHERE assessment_id=?", (self.now - 1, token))
            db.execute("UPDATE assessments SET delivery_status='sending' WHERE id=?", (token,))
        self.assertEqual(self.service.work_once()["status"], "idle")
        self.assertEqual(self.service.status(token)["delivery_status"], "delivery_uncertain")


class StripeAdapterTests(FixtureCase):
    def test_transport_uses_original_product_price_without_inline_product_or_client_amount(self):
        token = self.assessment()["assessment_id"]
        payload = {"assessment_id": token, "email": "buyer@example.com"}
        self.service.save_email(payload)
        captured = []
        session = {"id": "cs_live_transportfixture0001", "url": "https://checkout.stripe.com/c/pay/fixture",
                   "livemode": True, "currency": "usd", "amount_subtotal": 4700}
        class FixtureResponse:
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self, maximum): return json.dumps(session).encode()
        class FixtureTransport:
            def open(self, request, timeout):
                captured.append((request.full_url, request.get_method(), parse_qs(request.data.decode("ascii")),
                                 request.get_header("Idempotency-key"), timeout))
                return FixtureResponse()
        self.service.stripe = StripeClient(self.settings.stripe_secret_key)
        with patch("backend.service.build_opener", return_value=FixtureTransport()):
            result = self.service.checkout(payload)
            for injected in [{"amount": 1}, {"price": "price_other"}, {"currency": "cad"}]:
                with self.subTest(injected=injected), self.assertRaises(ServiceError):
                    self.service.checkout({**payload, **injected})
        self.assertEqual(result, {"checkout_url": session["url"]})
        self.assertEqual(len(captured), 1)
        url, method, fields, idempotency, timeout = captured[0]
        self.assertEqual(url, "https://api.stripe.com/v1/checkout/sessions")
        self.assertEqual(method, "POST")
        self.assertEqual(fields["line_items[0][price]"], ["price_1UVJbpRpzjXsSjtTqCDsy6Sp"])
        self.assertEqual(fields["line_items[0][quantity]"], ["1"])
        self.assertFalse(any("price_data" in key or "product_data" in key or "unit_amount" in key for key in fields))
        self.assertNotIn("amount", fields)
        self.assertNotIn("currency", fields)
        self.assertEqual(fields["automatic_tax[enabled]"], ["true"])
        self.assertEqual(fields["customer_email"], ["buyer@example.com"])
        self.assertEqual(idempotency, "checkup47-" + token)
        self.assertEqual(timeout, 22)
        self.assertEqual(self.mailer.messages, [])


class SMTPAdapterTests(FixtureCase):
    def test_smtp_fixture_requires_tls_auth_and_accepts_pdf_mime(self):
        calls = []
        class FixtureSMTP:
            def __init__(self, host, port, timeout):
                calls.append(("connect", host, port, timeout))
            def ehlo(self):
                calls.append(("ehlo",))
            def starttls(self, context):
                assert context.verify_mode == ssl.CERT_REQUIRED
                assert context.check_hostname
                calls.append(("tls",))
            def login(self, username, password):
                calls.append(("authenticated",))
            def send_message(self, message, from_addr, to_addrs):
                parsed = BytesParser(policy=policy.default).parsebytes(message.as_bytes())
                assert next(parsed.iter_attachments()).get_content_type() == "application/pdf"
                calls.append(("accepted", from_addr, to_addrs))
                return {}
            def close(self):
                calls.append(("closed",))
        report = build_report(self.answers, {})
        message = self.service._message("a" * 43, "buyer@example.com", report)
        with patch("backend.service.smtplib.SMTP", FixtureSMTP):
            SMTPMailer(self.settings).send(message)
        names = [item[0] for item in calls]
        self.assertLess(names.index("tls"), names.index("authenticated"))
        self.assertLess(names.index("authenticated"), names.index("accepted"))

    def test_smtp_data_timeout_is_uncertain_not_retryable(self):
        class FixtureSMTP:
            def __init__(self, *args, **kwargs): pass
            def ehlo(self): pass
            def starttls(self, **kwargs): pass
            def login(self, *args): pass
            def close(self): pass
            def send_message(self, *args, **kwargs): raise TimeoutError()
        message = self.service._message("a" * 43, "buyer@example.com", build_report(self.answers, {}))
        with patch("backend.service.smtplib.SMTP", FixtureSMTP), self.assertRaises(DeliveryError) as failure:
            SMTPMailer(self.settings).send(message)
        self.assertTrue(failure.exception.uncertain)
        self.assertFalse(failure.exception.retryable)


class HTTPBoundaryTests(FixtureCase):
    def setUp(self):
        super().setUp()
        self.static = self.root / "site"
        self.static.mkdir()
        (self.static / "index.html").write_text("<h1>Fixture preview</h1>")
        (self.static / "report.pdf").write_bytes(b"%PDF-fixture-must-not-serve")
        self.server = QuietServer(("127.0.0.1", 0), handler_for(self.service, self.static))
        thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(self.stop_server, thread)

    def stop_server(self, thread):
        self.server.shutdown()
        self.server.server_close()
        thread.join(timeout=3)

    def request(self, method, path, body=None, headers=None):
        client = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=4)
        try:
            client.request(method, path, body=body, headers=headers or {})
            response = client.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            client.close()

    def test_no_report_or_data_endpoint_and_no_query_token_authorization(self):
        token = self.ready_checkout()
        self.pay(token)
        for path in ["/api/checkup/report", "/api/checkup/report/" + token, "/report.pdf",
                     "/../private/checkup.sqlite3", "/%2e%2e/private/checkup.sqlite3", "/backend/service.py"]:
            self.assertEqual(self.request("GET", path)[0], 404, path)
        self.assertEqual(self.request("GET", "/api/checkup/status?assessment_id=" + token)[0], 400)
        self.assertEqual(self.request("GET", "/api/checkup/status")[0], 401)
        code, headers, body = self.request("GET", "/api/checkup/status", headers={"Authorization": "Bearer " + token})
        self.assertEqual(code, 200)
        self.assertEqual(set(json.loads(body)), {"payment_status", "delivery_status", "masked_email", "can_resume_checkout"})
        self.assertNotIn("Access-Control-Allow-Origin", headers)
        self.assertNotIn(token.encode(), body)
        self.assertEqual(headers["Cache-Control"], "no-store")

    def test_real_status_response_tells_ui_whether_cancel_resume_is_safe(self):
        token = self.ready_checkout()
        headers = {"Authorization": "Bearer " + token}
        code, _, raw = self.request("GET", "/api/checkup/status", headers=headers)
        self.assertEqual(code, 200)
        self.assertIs(json.loads(raw)["can_resume_checkout"], True)
        processing = self.event(token, "evt_httpprocessing0001")
        processing["data"]["object"]["payment_status"] = "unpaid"
        body, signature = self.signed(processing)
        self.service.webhook(body, signature)
        code, _, raw = self.request("GET", "/api/checkup/status", headers=headers)
        self.assertEqual(code, 200)
        self.assertIs(json.loads(raw)["can_resume_checkout"], False)
        self.assertEqual(json.loads(raw)["payment_status"], "pending")

    def test_origin_json_size_and_preview_bounds(self):
        body = json.dumps({"answers": self.answers, "notes": {}}).encode()
        base = {"Content-Type": "application/json", "Origin": "https://cdatats.com"}
        self.assertEqual(self.request("POST", "/api/checkup/assessments", body, {**base, "Origin": "https://attacker.example"})[0], 403)
        self.assertEqual(self.request("POST", "/api/checkup/assessments", b"{", base)[0], 400)
        self.assertEqual(self.request("POST", "/api/checkup/assessments", body, {**base, "Content-Length": "100000"})[0], 413)
        code, headers, result = self.request("POST", "/api/checkup/assessments", body, base)
        self.assertEqual(code, 201)
        self.assertEqual(set(json.loads(result)), {"assessment_id", "preview"})
        self.assertNotIn(b"priorities\":", result)

    def test_email_route_persists_without_providers_and_rejects_unsafe_requests(self):
        self.service.settings = Settings(self.settings.data_dir)
        token = self.assessment()["assessment_id"]
        base = {"Content-Type": "application/json", "Origin": "https://cdatats.com"}
        payload = json.dumps({"assessment_id": token, "email": "buyer@example.com"}).encode()
        self.assertEqual(self.request("POST", "/api/checkup/email", payload, {**base, "Origin": "https://attacker.example"})[0], 403)
        self.assertEqual(self.request("POST", "/api/checkup/email?assessment_id=" + token, payload, base)[0], 400)
        self.assertEqual(self.request("POST", "/api/checkup/email", b"{", base)[0], 400)
        self.assertEqual(self.request("POST", "/api/checkup/email", b"{}", base)[0], 422)
        self.assertEqual(self.request("POST", "/api/checkup/email", payload, {**base, "Content-Length": "100000"})[0], 413)
        invalid = json.dumps({"assessment_id": token, "email": "buyer@example.com\nBcc:other@example.com"}).encode()
        self.assertEqual(self.request("POST", "/api/checkup/email", invalid, base)[0], 422)
        wrong = json.dumps({"assessment_id": "a" * 43, "email": "buyer@example.com"}).encode()
        self.assertEqual(self.request("POST", "/api/checkup/email", wrong, base)[0], 404)
        for _ in range(2):
            code, headers, result = self.request("POST", "/api/checkup/email", payload, base)
            self.assertEqual(code, 200)
            self.assertEqual(json.loads(result), {"masked_email": "b***@example.com"})
            self.assertEqual(headers["Cache-Control"], "no-store")
            self.assertNotIn(token.encode(), result)
            self.assertNotIn(b"buyer@example.com", result)
            self.assertNotIn("Access-Control-Allow-Origin", headers)
        self.assertEqual(self.request("POST", "/api/checkup/checkout", payload, base)[0], 503)
        self.assertEqual(self.service.status(token)["masked_email"], "b***@example.com")
        self.assertEqual(self.stripe.calls, [])
        self.assertEqual(self.mailer.messages, [])


if __name__ == "__main__":
    unittest.main()
