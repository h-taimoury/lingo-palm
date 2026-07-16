from django.contrib import admin

from .models import Course, Section, SubtitleWord, WordSenseMapping


class SectionInline(admin.TabularInline):
    model = Section
    extra = 0
    show_change_link = True


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "level", "is_published", "section_count", "created_at")
    list_filter = ("is_published", "level")
    search_fields = ("title", "description")
    inlines = (SectionInline,)

    @admin.display(description="Sections")
    def section_count(self, obj: Course) -> int:
        return obj.sections.count()


class SubtitleWordInline(admin.TabularInline):
    model = SubtitleWord
    extra = 0
    show_change_link = True


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "order", "is_published")
    list_filter = ("is_published", "course")
    search_fields = ("title", "course__title")
    autocomplete_fields = ("course",)


@admin.register(WordSenseMapping)
class WordSenseMappingAdmin(admin.ModelAdmin):
    list_display = ("id", "word_list", "sense_list", "created_at")
    search_fields = ("subtitle_words__word", "senses__title")
    filter_horizontal = ("senses",)
    inlines = (SubtitleWordInline,)

    @admin.display(description="Words")
    def word_list(self, obj: WordSenseMapping) -> str:
        return ", ".join(obj.subtitle_words.values_list("word", flat=True))

    @admin.display(description="Senses")
    def sense_list(self, obj: WordSenseMapping) -> str:
        return ", ".join(obj.senses.values_list("title", flat=True))


@admin.register(SubtitleWord)
class SubtitleWordAdmin(admin.ModelAdmin):
    list_display = ("word", "section", "cue_id", "position_in_cue", "mapping")
    list_filter = ("section__course", "section")
    search_fields = ("word", "section__title", "section__course__title")
    autocomplete_fields = ("section", "mapping")
