from django.contrib import admin

from .models import PaymentOrder, StaffGrant
from .services import recheck


class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PaymentOrder)
class PaymentOrderAdmin(ReadOnlyAdmin):
    list_display = ("reference", "buyer", "amount", "state", "sandbox", "created_at")
    list_filter = ("state", "sandbox")
    search_fields = ("=reference", "=authority", "=receipt", "buyer__email")
    actions = ("recheck_orders",)

    @admin.action(permissions=["view"], description="Recheck unresolved payments")
    def recheck_orders(self, request, queryset):
        count = 0
        for order in queryset.filter(state=PaymentOrder.State.PENDING)[:20]:
            recheck(order)
            count += 1
        self.message_user(request, f"Rechecked {count} pending order(s).")


@admin.register(StaffGrant)
class StaffGrantAdmin(ReadOnlyAdmin):
    list_display = ("learner", "staff", "days", "created_at", "resulting_expiry")
    search_fields = ("learner__email", "staff__email")
