"""Loopback HTTP/API service and private attachment worker.

Production serves only /api/checkup. --site-dir is an explicit loopback-only
preview convenience and can never serve the private database directory.
"""
from __future__ import annotations

import argparse
from collections import deque
from dataclasses import replace
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import ipaddress
import json
import mimetypes
from pathlib import Path
import threading
import time
from urllib.parse import unquote, urlsplit

from .service import CheckupService, ServiceError, Settings


class RateLimit:
    def __init__(self):
        self.rows = {}
        self.lock = threading.Lock()

    def allow(self, key, limit, now):
        with self.lock:
            for old_key in list(self.rows):
                if not self.rows[old_key] or self.rows[old_key][-1] < now - 60:
                    del self.rows[old_key]
            if key not in self.rows and len(self.rows) >= 2048:
                return False
            window = self.rows.setdefault(key, deque())
            while window and window[0] < now - 60:
                window.popleft()
            if len(window) >= limit:
                return False
            window.append(now)
            return True


class QuietServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        # Default tracebacks or request logging could include private payloads.
        return


def handler_for(service, site_dir=None):
    limiter = RateLimit()
    site = Path(site_dir).resolve() if site_dir is not None else None
    if site is not None and (not site.is_dir() or service.database.resolve().is_relative_to(site)):
        raise ValueError("Preview files must be separate from private data.")

    class Handler(BaseHTTPRequestHandler):
        server_version = "ConsoliDataCheckup"
        sys_version = ""

        def log_message(self, format, *args):
            return

        def _headers(self, status, size, kind="application/json; charset=utf-8", static=False):
            self.send_response(status)
            self.send_header("Content-Type", kind)
            self.send_header("Content-Length", str(size))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'" if static else "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
            self.end_headers()

        def _json(self, status, value):
            body = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            self._headers(status, len(body))
            self.wfile.write(body)

        def _error(self, error):
            self._json(error.status, {"error": {"code": error.code, "message": error.message}})

        def _request_limit(self, action, limit):
            peer = self.client_address[0]
            forwarded = self.headers.get("X-Real-IP", "")
            try:
                if ipaddress.ip_address(peer).is_loopback and forwarded and ipaddress.ip_address(forwarded):
                    peer = forwarded
            except ValueError:
                pass
            if not limiter.allow((peer, action), limit, time.time()):
                raise ServiceError("rate_limited", "Please wait a minute before trying again.", 429)

        def _body(self, maximum):
            if self.headers.get("Transfer-Encoding"):
                raise ServiceError("invalid_request", "Use a bounded JSON request.", 400)
            length = self.headers.get("Content-Length", "")
            if not length.isdigit() or not 0 < int(length) <= maximum:
                raise ServiceError("request_too_large", "The request size is not valid.", 413)
            if self.headers.get("Content-Type", "").partition(";")[0].strip().lower() != "application/json":
                raise ServiceError("invalid_content_type", "Use JSON for this request.", 415)
            body = self.rfile.read(int(length))
            if len(body) != int(length):
                raise ServiceError("invalid_request", "The request was incomplete.", 400)
            return body

        def do_GET(self):
            try:
                location = urlsplit(self.path)
                if location.path == "/api/checkup/config":
                    self._request_limit("read", 180)
                    return self._json(200, service.config())
                if location.path == "/api/checkup/status":
                    self._request_limit("read", 180)
                    if location.query:
                        raise ServiceError("invalid_status_request", "Use the assessment authorization header.", 400)
                    auth = self.headers.get("Authorization", "")
                    if not auth.startswith("Bearer ") or auth.count(" ") != 1:
                        raise ServiceError("authorization_required", "The assessment authorization is missing.", 401)
                    return self._json(200, service.status(auth[7:]))
                if location.path.startswith("/api/") or site is None:
                    raise ServiceError("not_found", "This page could not be found.", 404)
                pathname = unquote(location.path)
                if "\x00" in pathname or "\\" in pathname or any(part.startswith(".") for part in pathname.split("/") if part):
                    raise ServiceError("not_found", "This page could not be found.", 404)
                candidate = site / (pathname.lstrip("/") or "index.html")
                if candidate.is_symlink() or not candidate.resolve().is_relative_to(site) or not candidate.is_file():
                    raise ServiceError("not_found", "This page could not be found.", 404)
                if candidate.suffix.lower() not in {".html", ".js", ".css", ".json", ".txt", ".xml", ".ico", ".png", ".jpg", ".jpeg", ".svg", ".webp"}:
                    raise ServiceError("not_found", "This page could not be found.", 404)
                body = candidate.read_bytes()
                kind = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
                if kind.startswith("text/") or kind in {"application/javascript", "application/json"}:
                    kind += "; charset=utf-8"
                self._headers(200, len(body), kind, static=True)
                self.wfile.write(body)
            except ServiceError as error:
                self._error(error)
            except Exception:
                self._error(ServiceError("service_error", "The service is temporarily unavailable.", 503))

        def do_POST(self):
            try:
                location = urlsplit(self.path)
                if location.query:
                    raise ServiceError("invalid_request", "Query parameters are not accepted here.", 400)
                if location.path == "/api/checkup/stripe/webhook":
                    self._request_limit("webhook", 300)
                    body = self._body(262144)
                    return self._json(200, service.webhook(body, self.headers.get("Stripe-Signature")))
                if location.path not in {"/api/checkup/assessments", "/api/checkup/email", "/api/checkup/checkout"}:
                    raise ServiceError("not_found", "This page could not be found.", 404)
                if self.headers.get("Origin") != service.settings.public_origin:
                    raise ServiceError("origin_rejected", "Open the checkup on its company website.", 403)
                action = location.path.rsplit("/", 1)[-1]
                self._request_limit(action, 8 if action == "assessments" else 15)
                try:
                    payload = json.loads(self._body(32768))
                except (ValueError, UnicodeError, RecursionError):
                    raise ServiceError("invalid_json", "The JSON request is not valid.", 400) from None
                if location.path.endswith("assessments"):
                    return self._json(201, service.create_assessment(payload))
                if location.path.endswith("email"):
                    return self._json(200, service.save_email(payload))
                return self._json(200, service.checkout(payload))
            except ServiceError as error:
                self._error(error)
            except Exception:
                self._error(ServiceError("service_error", "The service is temporarily unavailable.", 503))

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1", choices=["127.0.0.1"])
    parser.add_argument("--port", type=int, default=4190)
    parser.add_argument("--data-dir", type=Path)
    parser.add_argument("--public-origin")
    parser.add_argument("--site-dir", type=Path, help="Optional loopback-only static preview; omit in production")
    parser.add_argument("--no-worker", action="store_true")
    parser.add_argument("--worker-only", action="store_true")
    args = parser.parse_args()
    settings = Settings.from_environment()
    if args.data_dir:
        settings = replace(settings, data_dir=args.data_dir)
    if args.public_origin:
        settings = replace(settings, public_origin=args.public_origin.rstrip("/"))
    service = CheckupService(settings)
    stop = threading.Event()
    def run_worker():
        while not stop.is_set():
            try:
                result = service.work_once()
            except Exception:
                # Preserve the outbox lease for manual uncertainty review; never
                # include addresses, report text or upstream errors in logs.
                result = {"status": "service_error"}
            stop.wait(2 if result["status"] in {"idle", "disabled", "service_error"} else 0.25)
    if args.worker_only:
        try:
            run_worker()
        except KeyboardInterrupt:
            stop.set()
        return
    thread = None
    if not args.no_worker:
        thread = threading.Thread(target=run_worker, name="checkup-outbox", daemon=True)
        thread.start()
    server = QuietServer((args.host, args.port), handler_for(service, args.site_dir))
    print("ConsoliData checkup service listening on loopback; purchase_enabled=" + str(service.config()["purchase_enabled"]).lower(), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
        server.server_close()
        if thread:
            thread.join(timeout=30)


if __name__ == "__main__":
    main()
