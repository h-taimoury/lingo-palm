from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
import uuid

from apps.billing.services import grant_access

from .models import User


class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ("email", "first_name", "last_name")


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = User

    list_display = ("email", "first_name", "last_name", "email_verified", "is_staff", "is_active", "subscription_ends_at")
    readonly_fields = ("subscription_ends_at", "email_verified", "pending_email")
    actions = ("grant_week", "grant_month")
    list_filter = ("is_staff", "is_active", "email_verified")
    ordering = ("email",)
    search_fields = ("email", "first_name", "last_name")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal information",
            {"fields": ("first_name", "last_name", "email_verified", "pending_email")},
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "subscription_ends_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )

    filter_horizontal = ("groups", "user_permissions")

    def get_readonly_fields(self, request, obj=None):
        fields = super().get_readonly_fields(request, obj)
        if request.user.is_superuser and obj and obj.pk != request.user.pk and not obj.email_verified:
            return tuple(field for field in fields if field != "email_verified")
        return fields

    def save_model(self, request, obj, form, change):
        if change:
            obj.subscription_ends_at = User.objects.select_for_update().get(pk=obj.pk).subscription_ends_at
            if "email" in form.changed_data:
                obj.email = obj.email.lower()
                obj.email_verified = False
                obj.pending_email = ""
                obj.verification_id = uuid.uuid4()
            if (request.user.is_superuser and obj.pk != request.user.pk
                    and "email_verified" in form.changed_data and form.cleaned_data.get("email_verified")):
                obj.email_verified = True
                obj.pending_email = ""
                obj.verification_id = uuid.uuid4()
        super().save_model(request, obj, form, change)

    def grant_days(self, request, queryset, days):
        count = 0
        for learner_id in queryset.values_list("pk", flat=True):
            grant_access(user_id=learner_id, staff=request.user, days=days)
            count += 1
        self.message_user(request, f"Added {days} days of course access to {count} account(s).")

    @admin.action(permissions=["change"], description="Add 7 days of course access")
    def grant_week(self, request, queryset):
        self.grant_days(request, queryset, 7)

    @admin.action(permissions=["change"], description="Add 30 days of course access")
    def grant_month(self, request, queryset):
        self.grant_days(request, queryset, 30)
