from django.contrib import admin

from .models import Vocabulary


@admin.register(Vocabulary)
class VocabularyAdmin(admin.ModelAdmin):
    list_display = ("user", "sense", "already_known", "mastered", "created_at")
    list_filter = ("already_known", "mastered")
    search_fields = ("user__email", "sense__title", "sense__entry__word")
    autocomplete_fields = ("sense",)
    raw_id_fields = ("user",)  # users/admin.py has no search_fields, so no autocomplete
