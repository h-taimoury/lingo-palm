from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db.models import F, Q
from django.utils import timezone

from ...models import PaymentOrder
from ...services import recheck


class Command(BaseCommand):
    help = "Recheck outstanding payments without creating a new charge."

    def handle(self, *args, **options):
        if settings.BILLING_MODE == "disabled":
            raise CommandError("Billing is disabled.")
        now = timezone.now()
        orders = PaymentOrder.objects.filter(state=PaymentOrder.State.PENDING, sandbox=settings.BILLING_MODE == "sandbox")
        orders.filter(authority__isnull=True, created_at__lt=now - timedelta(minutes=10)).update(state=PaymentOrder.State.FAILED)
        due = orders.filter(authority__isnull=False).filter(Q(checked_at__isnull=True) | Q(checked_at__lt=now - timedelta(seconds=30)))
        for order in due.order_by(F("checked_at").asc(nulls_first=True), "created_at")[:50]:
            recheck(order)
        for reference in orders.filter(created_at__lt=now - timedelta(minutes=30)).order_by("created_at").values_list("reference", flat=True)[:50]:
            self.stderr.write(f"Payment still unresolved: {reference}")
