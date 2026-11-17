from collections.abc import Mapping
from datetime import datetime, timezone
from hashlib import sha256
from time import time

from django.db.models import F
from rest_framework.throttling import BaseThrottle

from .models import AuthRateLimit


class AuthThrottle(BaseThrottle):
    """Database counters keep limits shared across web workers and restarts."""

    def allow_request(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        now = int(time())
        rules = [("ip", self.get_ident(request), 30, 60), ("ip", self.get_ident(request), 200, 3600)]
        email = request.data.get("email") if isinstance(request.data, Mapping) else None
        if isinstance(email, str):
            if getattr(view, "email_cooldown", False):
                rules += [("mail", email.strip().lower(), 1, 60), ("mail", email.strip().lower(), 5, 3600)]
            else:
                rules += [("account", email.strip().lower(), 10, 60)]
        AuthRateLimit.objects.filter(expires_at__lte=datetime.fromtimestamp(now, timezone.utc)).delete()
        allowed = True
        self.wait_seconds = 1
        for scope, identity, limit, seconds in rules:
            key = sha256(f"{scope}:{identity}:{seconds}".encode()).hexdigest()
            counter, _ = AuthRateLimit.objects.get_or_create(
                key=key, defaults={"expires_at": datetime.fromtimestamp(now + seconds, timezone.utc)},
            )
            if not AuthRateLimit.objects.filter(key=key, attempts__lt=limit).update(attempts=F("attempts") + 1):
                allowed = False
                self.wait_seconds = max(self.wait_seconds, int(counter.expires_at.timestamp()) - now)
        return allowed

    def wait(self):
        return self.wait_seconds
