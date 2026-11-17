import logging
from smtplib import SMTPException
from urllib.parse import urlencode

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)
VERIFICATION_SALT = "users.verify-email"


class EmailUnavailable(APIException):
    status_code = 503
    default_detail = "Email could not be sent. Please try again shortly."


def deliver_email(subject, message, recipient):
    try:
        if send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [recipient]) != 1:
            raise EmailUnavailable()
    except (SMTPException, OSError):
        logger.warning("Authentication email delivery failed.")
        raise EmailUnavailable() from None


def verification_token(user):
    return signing.dumps({
        "uid": user.pk,
        "email": user.pending_email or user.email,
        "nonce": str(user.verification_id),
        "session": user.get_session_auth_hash(),
    }, salt=VERIFICATION_SALT)


def send_verification_email(user):
    link = f"{settings.FRONTEND_ORIGIN}/verify-email?{urlencode({'token': verification_token(user)})}"
    deliver_email(
        "Verify your LingoPalm email",
        f"Confirm your email address using this link (valid for 24 hours):\n\n{link}\n\n"
        "If you didn't request this, you can ignore this email.",
        user.pending_email or user.email,
    )


def send_password_reset_email(user):
    params = {"uid": urlsafe_base64_encode(force_bytes(user.pk)), "token": default_token_generator.make_token(user)}
    link = f"{settings.FRONTEND_ORIGIN}/reset-password?{urlencode(params)}"
    deliver_email(
        "Reset your LingoPalm password",
        f"Choose a new password using this link (valid for 30 minutes):\n\n{link}\n\n"
        "If you didn't request this, your password has not changed and you can ignore this email.",
        user.email,
    )
