from django.contrib import admin
from django.utils import timezone

from .models import Vocabulary


@admin.register(Vocabulary)
class VocabularyAdmin(admin.ModelAdmin):
    list_display = ("user", "sense", "already_known", "needs_review", "created_at")
    list_filter = ("already_known", "needs_review")
    search_fields = ("user__email", "sense__title", "sense__entry__word")
    autocomplete_fields = ("sense",)
    raw_id_fields = ("user",)  # users/admin.py has no search_fields, so no autocomplete

    def save_model(self, request, obj, form, change):
        obj.learned_at = None if obj.already_known else obj.learned_at or timezone.now()
        super().save_model(request, obj, form, change)
