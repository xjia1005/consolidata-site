"""Private assessments, verified Stripe payment and attachment-only SMTP outbox.

No browser/API response contains the complete report. No fixture mode, test
payment override or development sender is exposed through runtime settings.
"""
from __future__ import annotations

from dataclasses import dataclass
from contextlib import contextmanager
from email.message import EmailMessage
from email.policy import SMTP
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import smtplib
import sqlite3
import ssl
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener, HTTPSHandler

from .report import AnswerError, build_report, coverage, pdf_available, render_pdf, validate_answers

PRICE_CENTS = 4700
STRIPE_PRICE_ID = "price_1UVJbpRpzjXsSjtTqCDsy6Sp"
TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{43}$")
STRIPE_ID_RE = re.compile(r"^cs_live_[A-Za-z0-9]{8,200}$")
SOURCE_RE = re.compile(r"^[A-Za-z0-9._:-]{0,96}$")
MAX_ATTEMPTS = 3


class ServiceError(Exception):
    def __init__(self, code, message, status=400):
        self.code, self.message, self.status = code, message, status
        super().__init__(code)


class DeliveryError(Exception):
    def __init__(self, code, retryable=False, uncertain=False):
        self.code, self.retryable, self.uncertain = code, retryable, uncertain
        super().__init__(code)


def valid_email(value):
    if not isinstance(value, str) or len(value) > 254 or any(ord(c) <= 32 or ord(c) >= 127 for c in value):
        raise ServiceError("invalid_email", "Enter a plain email address without spaces or control characters.", 422)
    if value.count("@") != 1:
        raise ServiceError("invalid_email", "Enter a valid email address.", 422)
    local, domain = value.rsplit("@", 1)
    if not re.fullmatch(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}", local) or local.startswith(".") or local.endswith(".") or ".." in local:
        raise ServiceError("invalid_email", "Enter a valid email address.", 422)
    if len(domain) > 253 or "." not in domain or any(not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?", part) for part in domain.split(".")):
        raise ServiceError("invalid_email", "Enter a valid email address.", 422)
    return local + "@" + domain.lower()


def masked_email(email):
    if not email:
        return None
    local, domain = email.rsplit("@", 1)
    return local[:1] + "***@" + domain


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    public_origin: str = "https://cdatats.com"
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_security: str = "starttls"
    smtp_username: str = ""
    smtp_password: str = ""
    from_email: str = ""
    live_enabled: bool = False

    @classmethod
    def from_environment(cls):
        try:
            port = int(os.environ.get("CHECKUP_SMTP_PORT", "587"))
        except ValueError:
            port = 0
        return cls(data_dir=Path(os.environ.get("CHECKUP_DATA_DIR", "/var/lib/consolidata-checkup")),
                   public_origin=os.environ.get("CHECKUP_PUBLIC_ORIGIN", "https://cdatats.com").rstrip("/"),
                   stripe_secret_key=os.environ.get("CHECKUP_STRIPE_SECRET_KEY", ""),
                   stripe_webhook_secret=os.environ.get("CHECKUP_STRIPE_WEBHOOK_SECRET", ""),
                   smtp_host=os.environ.get("CHECKUP_SMTP_HOST", ""), smtp_port=port,
                   smtp_security=os.environ.get("CHECKUP_SMTP_SECURITY", "starttls"),
                   smtp_username=os.environ.get("CHECKUP_SMTP_USERNAME", ""),
                   smtp_password=os.environ.get("CHECKUP_SMTP_PASSWORD", ""),
                   from_email=os.environ.get("CHECKUP_FROM_EMAIL", ""),
                   live_enabled=os.environ.get("CHECKUP_LIVE_ENABLED") == "1")

    def mail_ready(self):
        try:
            valid_email(self.from_email)
        except ServiceError:
            return False
        host_ok = bool(re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?", self.smtp_host))
        return bool(host_ok and self.smtp_username and self.smtp_password and
                    ((self.smtp_security == "starttls" and self.smtp_port == 587) or
                     (self.smtp_security == "ssl" and self.smtp_port == 465)))

    def purchase_ready(self):
        try:
            origin = urlsplit(self.public_origin)
            origin_ok = (origin.scheme == "https" and origin.hostname == "cdatats.com" and
                         origin.port in (None, 443) and origin.path == "" and not origin.query and not origin.fragment and
                         not origin.username and not origin.password)
        except ValueError:
            origin_ok = False
        return bool(self.live_enabled and self.stripe_secret_key.startswith("sk_live_") and
                    len(self.stripe_secret_key) >= 24 and self.stripe_webhook_secret.startswith("whsec_") and
                    len(self.stripe_webhook_secret) >= 24 and self.mail_ready() and pdf_available() and
                    origin_ok)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class StripeClient:
    def __init__(self, secret_key):
        self.secret_key = secret_key

    def create_session(self, assessment_id, email, origin):
        fields = {"mode": "payment", "customer_email": email,
                  "payment_method_types[0]": "card", "client_reference_id": assessment_id,
                  "metadata[assessment_id]": assessment_id,
                  "payment_intent_data[metadata][assessment_id]": assessment_id,
                  "line_items[0][price]": STRIPE_PRICE_ID,
                  "line_items[0][quantity]": "1", "automatic_tax[enabled]": "true",
                  "billing_address_collection": "auto",
                  "success_url": origin + "/assessment.html#assessment=" + assessment_id + "&payment=success",
                  "cancel_url": origin + "/assessment.html#assessment=" + assessment_id + "&payment=cancel"}
        request = Request("https://api.stripe.com/v1/checkout/sessions", data=urlencode(fields).encode("ascii"), method="POST",
                          headers={"Authorization": "Bearer " + self.secret_key,
                                   "Idempotency-Key": "checkup47-" + assessment_id,
                                   "Content-Type": "application/x-www-form-urlencoded"})
        try:
            opener = build_opener(NoRedirect, HTTPSHandler(context=ssl.create_default_context()))
            with opener.open(request, timeout=22) as response:
                raw = response.read(150001)
                if len(raw) > 150000:
                    raise ValueError()
                result = json.loads(raw)
            if not isinstance(result, dict):
                raise ValueError()
            return result
        except (HTTPError, URLError, TimeoutError, OSError, ValueError):
            # Upstream bodies may include addresses, identifiers, or configuration.
            raise ServiceError("checkout_unavailable", "Checkout could not be opened. Please try again later.", 503) from None


class SMTPMailer:
    def __init__(self, settings):
        self.settings = settings

    def send(self, message):
        settings = self.settings
        if not settings.mail_ready():
            raise DeliveryError("mail_not_configured")
        client = None
        sending = False
        try:
            context = ssl.create_default_context()
            if settings.smtp_security == "ssl":
                client = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=25, context=context)
            else:
                client = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=25)
                client.ehlo()
                client.starttls(context=context)
                client.ehlo()
            client.login(settings.smtp_username, settings.smtp_password)
            sending = True
            refused = client.send_message(message, from_addr=settings.from_email, to_addrs=[str(message["To"])])
            if refused:
                raise DeliveryError("recipient_rejected")
        except smtplib.SMTPAuthenticationError:
            raise DeliveryError("mail_authentication_failed") from None
        except (smtplib.SMTPRecipientsRefused, smtplib.SMTPSenderRefused):
            raise DeliveryError("recipient_or_sender_rejected") from None
        except smtplib.SMTPDataError as error:
            raise DeliveryError("mail_temporarily_rejected" if error.smtp_code < 500 else "mail_rejected",
                                retryable=error.smtp_code < 500) from None
        except DeliveryError:
            raise
        except (smtplib.SMTPException, TimeoutError, OSError):
            raise DeliveryError("delivery_uncertain" if sending else "mail_connection_failed",
                                retryable=not sending, uncertain=sending) from None
        finally:
            if client is not None:
                try:
                    client.close()
                except (OSError, smtplib.SMTPException):
                    pass


class CheckupService:
    def __init__(self, settings, stripe=None, mailer=None, clock=time.time, pdf_renderer=render_pdf):
        self.settings, self.clock = settings, clock
        self.stripe = stripe if stripe is not None else StripeClient(settings.stripe_secret_key)
        self.mailer = mailer if mailer is not None else SMTPMailer(settings)
        self.pdf_renderer = pdf_renderer
        root = settings.data_dir.expanduser()
        site = Path(__file__).resolve().parents[1] / "site"
        if root.is_symlink() or root.resolve().is_relative_to(site.resolve()):
            raise ValueError("The checkup data directory must be private and outside the public site tree.")
        root.mkdir(parents=True, exist_ok=True, mode=0o700)
        if os.name != "nt":
            root.chmod(0o700)
        self.database = root / "checkup.sqlite3"
        if self.database.is_symlink():
            raise ValueError("A symlinked database is not permitted.")
        if not self.database.exists():
            descriptor = os.open(self.database, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            os.close(descriptor)
        if os.name != "nt":
            self.database.chmod(0o600)
        with self.connect() as db:
            db.executescript("""
              PRAGMA journal_mode=WAL;
              CREATE TABLE IF NOT EXISTS assessments(
                id TEXT PRIMARY KEY,created REAL NOT NULL,answers TEXT NOT NULL,notes TEXT NOT NULL,
                source TEXT NOT NULL,report TEXT NOT NULL,email TEXT,checkout_id TEXT UNIQUE,checkout_url TEXT,
                checkout_state TEXT NOT NULL DEFAULT 'none',checkout_started REAL,
                payment_status TEXT NOT NULL DEFAULT 'unpaid',paid_at REAL,
                delivery_status TEXT NOT NULL DEFAULT 'not_requested',delivery_error TEXT);
              CREATE TABLE IF NOT EXISTS stripe_events(id TEXT PRIMARY KEY,body_hash TEXT NOT NULL,received REAL NOT NULL);
              CREATE TABLE IF NOT EXISTS outbox(assessment_id TEXT PRIMARY KEY REFERENCES assessments(id),
                status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,next_attempt REAL NOT NULL,
                lease_until REAL,accepted_at REAL,last_error TEXT);
            """)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.database, timeout=15)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA busy_timeout=15000")
        try:
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    def config(self):
        return {"price": 47, "currency": "USD", "purchase_enabled": self.settings.purchase_ready(),
                "voice_available": False, "delivery": "email-pdf-attachment"}

    def create_assessment(self, payload):
        if not isinstance(payload, dict) or not set(payload).issubset({"answers", "notes", "source"}):
            raise ServiceError("invalid_assessment", "Use the ten-question assessment form.", 422)
        try:
            answers, notes = validate_answers(payload.get("answers"), payload.get("notes", {}))
        except AnswerError as error:
            raise ServiceError("invalid_answers", str(error), 422) from None
        source = payload.get("source", "")
        if not isinstance(source, str) or not SOURCE_RE.fullmatch(source):
            raise ServiceError("invalid_source", "The source identifier is not valid.", 422)
        assessment_id = secrets.token_urlsafe(32)
        report = build_report(answers, notes)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            if db.execute("SELECT COUNT(*) FROM assessments").fetchone()[0] >= 5000:
                raise ServiceError("capacity_reached", "The assessment is temporarily unavailable. Please try later.", 503)
            db.execute("INSERT INTO assessments(id,created,answers,notes,source,report) VALUES(?,?,?,?,?,?)",
                       (assessment_id, self.clock(), json.dumps(answers), json.dumps(notes), source, json.dumps(report)))
        return {"assessment_id": assessment_id, "preview": coverage(answers)}

    def _token(self, value):
        if not isinstance(value, str) or not TOKEN_RE.fullmatch(value):
            raise ServiceError("assessment_not_found", "This assessment could not be found.", 404)
        return value

    def save_email(self, payload):
        """Save the transaction recipient without initiating payment or mail.

        A checkout attempt fixes its recipient even if the provider response is
        lost: the stable Stripe idempotency key may already refer to a session.
        """
        if not isinstance(payload, dict) or set(payload) != {"assessment_id", "email"}:
            raise ServiceError("invalid_email_request", "Enter and confirm the report email address.", 422)
        token, email = self._token(payload["assessment_id"]), valid_email(payload["email"])
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT email,checkout_id,checkout_state,checkout_started,payment_status FROM assessments WHERE id=?",
                             (token,)).fetchone()
            if not row:
                raise ServiceError("assessment_not_found", "This assessment could not be found.", 404)
            if row["email"] and row["email"].casefold() == email.casefold():
                return {"masked_email": masked_email(row["email"])}
            if (row["checkout_id"] or row["checkout_started"] is not None or
                    row["checkout_state"] != "none" or row["payment_status"] == "paid"):
                raise ServiceError("email_already_bound", "This checkout already uses a report email address. Please contact support to correct it.", 409)
            db.execute("UPDATE assessments SET email=? WHERE id=?", (email, token))
        return {"masked_email": masked_email(email)}

    def checkout(self, payload):
        if not self.settings.purchase_ready():
            raise ServiceError("purchase_unavailable", "Purchases are not available yet. No payment has been taken.", 503)
        if not isinstance(payload, dict) or set(payload) != {"assessment_id", "email"}:
            raise ServiceError("invalid_checkout", "Enter and confirm the report email address.", 422)
        token, email = self._token(payload["assessment_id"]), valid_email(payload["email"])
        now = self.clock()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT * FROM assessments WHERE id=?", (token,)).fetchone()
            if not row:
                raise ServiceError("assessment_not_found", "This assessment could not be found.", 404)
            if row["payment_status"] == "paid":
                raise ServiceError("already_paid", "This assessment has already been paid for. Check its delivery status.", 409)
            if now - row["created"] > 86400 or row["checkout_state"] == "expired":
                raise ServiceError("assessment_expired", "Please start a new assessment before purchasing.", 410)
            if row["checkout_state"] == "processing":
                raise ServiceError("payment_processing", "Payment confirmation is pending. Please do not purchase again.", 409)
            if row["delivery_status"] == "delivery_uncertain":
                raise ServiceError("delivery_review_required", "Delivery needs review. Please contact support and do not purchase again.", 409)
            if not row["email"]:
                raise ServiceError("report_email_required", "Save and confirm the report email address before opening checkout.", 422)
            if row["email"].casefold() != email.casefold():
                raise ServiceError("email_already_bound", "This checkout already uses a report email address. Please contact support to correct it.", 409)
            email = row["email"]
            if row["checkout_state"] == "open" and row["checkout_url"]:
                return {"checkout_url": row["checkout_url"]}
            if row["checkout_state"] == "creating" and now - row["checkout_started"] < 60:
                raise ServiceError("checkout_pending", "Checkout is opening. Please try again shortly.", 409)
            if not self._can_resume_checkout(row, now):
                raise ServiceError("checkout_not_resumable", "This checkout cannot be reopened. Please contact support before purchasing again.", 409)
            db.execute("UPDATE assessments SET checkout_state='creating',checkout_started=?,payment_status='pending' WHERE id=?",
                       (now, token))
        try:
            session = self.stripe.create_session(token, email, self.settings.public_origin)
            url = urlsplit(session.get("url", ""))
            if not STRIPE_ID_RE.fullmatch(str(session.get("id", ""))) or session.get("livemode") is not True or session.get("amount_subtotal") != PRICE_CENTS or session.get("currency") != "usd" or url.scheme != "https" or url.hostname != "checkout.stripe.com" or url.username or url.password or url.port not in (None, 443) or url.fragment:
                raise ServiceError("checkout_unavailable", "Checkout could not be verified. No new checkout will be opened until it is checked.", 503)
            with self.connect() as db:
                db.execute("UPDATE assessments SET checkout_id=?,checkout_url=?,checkout_state='open' WHERE id=?",
                           (session["id"], session["url"], token))
            return {"checkout_url": session["url"]}
        except (ServiceError, ValueError, KeyError, TypeError):
            with self.connect() as db:
                db.execute("UPDATE assessments SET checkout_state='failed',payment_status='unpaid' WHERE id=? AND payment_status!='paid'", (token,))
            raise ServiceError("checkout_unavailable", "Checkout could not be opened. Please try again later.", 503) from None

    @staticmethod
    def _can_resume_checkout(row, now):
        if (row["payment_status"] == "paid" or row["checkout_state"] in {"processing", "expired", "complete"} or
                row["delivery_status"] == "delivery_uncertain" or now - row["created"] > 86400 or not row["email"]):
            return False
        if row["checkout_state"] == "open":
            return bool(row["checkout_id"] and row["checkout_url"])
        if row["checkout_id"]:
            return False
        if row["checkout_state"] in {"none", "failed"}:
            return True
        # A lost provider response can be retried under the SAME idempotency
        # key once the active creation lease has elapsed, never concurrently.
        return bool(row["checkout_state"] == "creating" and row["checkout_started"] is not None and
                    now - row["checkout_started"] >= 60)

    def status(self, token):
        token = self._token(token)
        with self.connect() as db:
            row = db.execute("SELECT * FROM assessments WHERE id=?", (token,)).fetchone()
        if not row:
            raise ServiceError("assessment_not_found", "This assessment could not be found.", 404)
        return {"payment_status": row["payment_status"], "delivery_status": row["delivery_status"],
                "masked_email": masked_email(row["email"]), "can_resume_checkout": self._can_resume_checkout(row, self.clock())}

    def _verify_signature(self, body, signature):
        secret = self.settings.stripe_webhook_secret
        if not secret.startswith("whsec_") or len(secret) < 24:
            raise ServiceError("webhook_unavailable", "The payment receiver is not configured.", 503)
        if not isinstance(signature, str) or len(signature) > 4096:
            raise ServiceError("invalid_signature", "Invalid payment signature.", 400)
        parts = [part.partition("=") for part in signature.split(",")]
        timestamps = [value for key, _, value in parts if key == "t" and value.isdigit()]
        signatures = [value for key, _, value in parts if key == "v1" and re.fullmatch(r"[0-9a-f]{64}", value)]
        if len(timestamps) != 1 or not signatures or abs(self.clock() - int(timestamps[0])) > 300:
            raise ServiceError("invalid_signature", "Invalid or expired payment signature.", 400)
        expected = hmac.new(secret.encode("utf-8"), timestamps[0].encode("ascii") + b"." + body, hashlib.sha256).hexdigest()
        if not any(hmac.compare_digest(value, expected) for value in signatures):
            raise ServiceError("invalid_signature", "Invalid payment signature.", 400)

    def webhook(self, body, signature):
        if not isinstance(body, bytes) or len(body) > 262144:
            raise ServiceError("invalid_event", "Invalid payment event.", 400)
        self._verify_signature(body, signature)
        try:
            event = json.loads(body)
            if not isinstance(event, dict):
                raise ValueError()
            event_type = event.get("type")
            if event_type not in {"checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.expired"}:
                return {"received": True, "ignored": True}
            if not re.fullmatch(r"evt_[A-Za-z0-9]{8,200}", str(event.get("id", ""))) or event.get("livemode") is not True:
                raise ValueError()
            session = event["data"]["object"]
            token = self._token(session["metadata"]["assessment_id"])
            details = session.get("total_details") or {}
            tax = details.get("amount_tax", 0)
            if (session.get("livemode") is not True or session.get("mode") != "payment" or
                not STRIPE_ID_RE.fullmatch(str(session.get("id", ""))) or
                session.get("client_reference_id") != token or session.get("currency") != "usd" or
                type(session.get("amount_subtotal")) is not int or session["amount_subtotal"] != PRICE_CENTS or
                type(tax) is not int or tax < 0 or type(session.get("amount_total")) is not int or
                session["amount_total"] != PRICE_CENTS + tax or details.get("amount_discount", 0) != 0 or
                details.get("amount_shipping", 0) != 0):
                raise ValueError()
            payment = session.get("payment_status")
            if event_type == "checkout.session.expired":
                if payment != "unpaid" or session.get("status") != "expired":
                    raise ValueError()
                outcome = "expired"
            elif event_type == "checkout.session.completed" and payment == "unpaid":
                if session.get("status") != "complete":
                    raise ValueError()
                outcome = "processing"
            elif payment == "paid":
                outcome = "paid"
            else:
                return {"received": True, "ignored": True}
            customer_email = valid_email((session.get("customer_details") or {}).get("email") or session.get("customer_email"))
        except (KeyError, TypeError, ValueError, RecursionError, ServiceError):
            raise ServiceError("invalid_event", "The payment event could not be verified.", 400) from None
        digest = hashlib.sha256(body).hexdigest()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            previous = db.execute("SELECT body_hash FROM stripe_events WHERE id=?", (event["id"],)).fetchone()
            if previous:
                if previous["body_hash"] != digest:
                    raise ServiceError("event_conflict", "Conflicting payment event.", 400)
                return {"received": True, "duplicate": True}
            row = db.execute("SELECT checkout_id,email,payment_status,checkout_state FROM assessments WHERE id=?", (token,)).fetchone()
            if not row or row["checkout_id"] != session["id"] or not row["email"] or row["email"].casefold() != customer_email.casefold():
                raise ServiceError("payment_mismatch", "The payment does not match this assessment.", 400)
            db.execute("INSERT INTO stripe_events(id,body_hash,received) VALUES(?,?,?)", (event["id"], digest, self.clock()))
            if row["payment_status"] != "paid":
                if outcome == "paid":
                    db.execute("UPDATE assessments SET payment_status='paid',checkout_state='complete',paid_at=?,delivery_status='pending' WHERE id=?", (self.clock(), token))
                    db.execute("INSERT OR IGNORE INTO outbox(assessment_id,status,next_attempt) VALUES(?,'pending',?)", (token, self.clock()))
                elif outcome == "expired":
                    db.execute("UPDATE assessments SET checkout_state='expired',payment_status='unpaid' WHERE id=?", (token,))
                elif row["checkout_state"] != "expired":
                    db.execute("UPDATE assessments SET checkout_state='processing',payment_status='pending' WHERE id=?", (token,))
        return {"received": True}

    def _message(self, token, email, report):
        pdf = self.pdf_renderer(report)
        if not isinstance(pdf, bytes) or not pdf.startswith(b"%PDF-") or len(pdf) > 3000000:
            raise DeliveryError("report_generation_failed")
        message = EmailMessage(policy=SMTP)
        message["From"] = "ConsoliData <" + valid_email(self.settings.from_email) + ">"
        message["To"] = valid_email(email)
        message["Reply-To"] = valid_email(self.settings.from_email)
        message["Subject"] = "Your ConsoliData marketing checkup report"
        digest = hashlib.sha256(token.encode("ascii")).hexdigest()[:28]
        message["Message-ID"] = "<checkup." + digest + "@" + self.settings.from_email.rsplit("@", 1)[1] + ">"
        message.set_content("Your complete marketing checkup report is attached as a PDF.\n\nIt is based on your selected answers. Notes are included as written; the report does not independently verify your records or campaign results.\n\nIf the attachment is missing or you need help with this report, reply to this email.\n\nConsoliData")
        message.add_attachment(pdf, maintype="application", subtype="pdf", filename="ConsoliData-Marketing-Checkup.pdf")
        return message

    def work_once(self):
        if not self.settings.live_enabled or not self.settings.mail_ready() or not pdf_available():
            return {"status": "disabled"}
        now = self.clock()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            # A process may have stopped after SMTP accepted DATA. Never resend
            # an abandoned sending lease automatically.
            stale = db.execute("SELECT assessment_id FROM outbox WHERE status='sending' AND lease_until<?", (now,)).fetchall()
            for item in stale:
                db.execute("UPDATE outbox SET status='delivery_uncertain',last_error='sending_interrupted' WHERE assessment_id=?", (item["assessment_id"],))
                db.execute("UPDATE assessments SET delivery_status='delivery_uncertain',delivery_error='sending_interrupted' WHERE id=?", (item["assessment_id"],))
            row = db.execute("SELECT a.id,a.email,a.report,o.attempts FROM outbox o JOIN assessments a ON a.id=o.assessment_id WHERE o.status IN ('pending','retry_pending') AND o.next_attempt<=? AND a.payment_status='paid' ORDER BY o.next_attempt LIMIT 1", (now,)).fetchone()
            if not row:
                return {"status": "idle"}
            db.execute("UPDATE outbox SET status='sending',attempts=attempts+1,lease_until=? WHERE assessment_id=?", (now + 180, row["id"]))
            db.execute("UPDATE assessments SET delivery_status='sending' WHERE id=?", (row["id"],))
        attempts = row["attempts"] + 1
        error_code, state = None, "sent_accepted"
        try:
            message = self._message(row["id"], row["email"], json.loads(row["report"]))
            self.mailer.send(message)
        except DeliveryError as error:
            error_code = error.code
            state = "delivery_uncertain" if error.uncertain else "retry_pending" if error.retryable and attempts < MAX_ATTEMPTS else "failed"
        except Exception:
            error_code, state = "report_generation_failed", "failed"
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("UPDATE outbox SET status=?,next_attempt=?,lease_until=NULL,accepted_at=?,last_error=? WHERE assessment_id=?",
                       (state, self.clock() + 60 * attempts, self.clock() if state == "sent_accepted" else None, error_code, row["id"]))
            db.execute("UPDATE assessments SET delivery_status=?,delivery_error=? WHERE id=?", (state, error_code, row["id"]))
        return {"status": state}
