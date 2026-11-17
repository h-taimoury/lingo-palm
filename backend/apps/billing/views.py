from uuid import UUID

from django.conf import settings
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from . import services, zarinpal
from .models import PaymentOrder


def order_data(order):
    return {
        "reference": order.reference, "state": order.state, "amount_tomans": order.amount // 10,
        "expiry": order.resulting_expiry, "support_email": settings.BILLING_SUPPORT_EMAIL,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def plan(request):
    return Response({
        "price_tomans": services.PRICE_TOMANS, "days": services.DAYS,
        "checkout_available": services.checkout_allowed(request.user),
        "expiry": getattr(request.user, "subscription_ends_at", None),
        "sandbox": settings.BILLING_MODE == "sandbox",
    }, headers={"Cache-Control": "private, no-store"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def checkout(request):
    if not services.checkout_allowed(request.user):
        return Response({"detail": "Checkout is currently unavailable."}, status=503)
    try:
        reference = UUID(str(request.data.get("reference", "")))
    except (ValueError, AttributeError) as exc:
        raise ValidationError({"reference": "A valid order reference is required."}) from exc
    order = services.begin_checkout(request.user, reference)
    if order.buyer_id != request.user.pk or order.sandbox != (settings.BILLING_MODE == "sandbox"):
        return Response({"detail": "Start a new checkout attempt."}, status=409)
    data = order_data(order)
    if order.state == PaymentOrder.State.PENDING and not order.checked_at and order.authority:
        data["checkout_url"] = f"{zarinpal.gateway_host(order.sandbox)}/pg/StartPay/{order.authority}"
    return Response(data, headers={"Cache-Control": "private, no-store"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_status(request, reference):
    orders = PaymentOrder.objects.all()
    if not request.user.is_staff:
        orders = orders.filter(buyer=request.user)
    return Response(order_data(get_object_or_404(orders, reference=reference)),
                    headers={"Cache-Control": "private, no-store"})


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def payment_return(request):
    authority = request.query_params.get("Authority")
    sandbox = settings.BILLING_MODE == "sandbox"
    if not zarinpal.valid_authority(authority, sandbox):
        return HttpResponseRedirect("/plans", headers={"Cache-Control": "no-store"})
    order = PaymentOrder.objects.filter(authority=authority, sandbox=sandbox).first()
    if order is None:
        return HttpResponseRedirect("/plans", headers={"Cache-Control": "no-store"})
    status = request.query_params.get("Status")
    services.recheck(order, returned_ok=status == "OK")
    # The browser return can explain an interruption, but only the gateway can close the order.
    suffix = "?checkout=incomplete" if status == "NOK" else ""
    return HttpResponseRedirect(f"/payments/{order.reference}{suffix}", headers={"Cache-Control": "no-store"})
