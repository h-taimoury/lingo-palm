from django.contrib import admin

from .models import Entry, Sense


class SenseInline(admin.StackedInline):
    model = Sense
    extra = 0
    show_change_link = True


@admin.register(Entry)
class EntryAdmin(admin.ModelAdmin):
    list_display = ("word", "part_of_speech", "register", "sense_count", "created_at")
    list_filter = ("part_of_speech", "register")
    search_fields = ("word", "senses__title", "senses__definition")
    readonly_fields = ("created_at",)
    inlines = (SenseInline,)

    @admin.display(description="Senses")
    def sense_count(self, obj: Entry) -> int:
        return obj.senses.count()


@admin.register(Sense)
class SenseAdmin(admin.ModelAdmin):
    list_display = ("title", "entry", "sense_number", "register", "geo")
    list_filter = ("entry__part_of_speech", "register", "geo")
    search_fields = ("title", "entry__word", "definition", "lex_unit")
    autocomplete_fields = ("entry",)
