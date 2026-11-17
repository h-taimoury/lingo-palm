import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

from django.conf import settings


class GatewayUnavailable(Exception):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def gateway_host(sandbox):
    return "https://sandbox.zarinpal.com" if sandbox else "https://payment.zarinpal.com"


def valid_authority(authority, sandbox):
    return isinstance(authority, str) and re.fullmatch(
        ("S" if sandbox else "A") + r"[A-Za-z0-9]{35}", authority,
    ) is not None


def call(order, method, **payload):
    if settings.BILLING_MODE == "disabled" or order.sandbox != (settings.BILLING_MODE == "sandbox"):
        raise GatewayUnavailable
    body = json.dumps({"merchant_id": settings.ZARINPAL_MERCHANT_ID, **payload}).encode()
    request = Request(
        f"{gateway_host(order.sandbox)}/pg/v4/payment/{method}.json",
        data=body, headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with build_opener(NoRedirect).open(request, timeout=8) as response:
            return parse(response)
    except HTTPError as exc:
        with exc:
            if 400 <= exc.code < 500:
                return parse(exc)
        raise GatewayUnavailable from exc
    except (URLError, OSError) as exc:
        raise GatewayUnavailable from exc


def parse(stream):
    try:
        result = json.loads(stream.read(65537))
        if isinstance(result, dict):
            for key in ("data", "errors"):
                value = result.get(key)
                if (isinstance(value, dict) and type(value.get("code")) is int
                        and (key == "data" or value["code"] < 0)):
                    return value
    except (ValueError, OSError):
        pass
    raise GatewayUnavailable


def request_payment(order):
    metadata = {"order_id": str(order.reference)}
    if not order.sandbox:
        metadata["auto_verify"] = False
    return call(order, "request", amount=order.amount, currency="IRR",
                description="LingoPalm: 30 days of course access", metadata=metadata,
                callback_url=f"{settings.BILLING_CALLBACK_ORIGIN}/api/billing/return/")


def verify(order):
    return call(order, "verify", authority=order.authority, amount=order.amount)


def inquiry(order):
    return call(order, "inquiry", authority=order.authority)
