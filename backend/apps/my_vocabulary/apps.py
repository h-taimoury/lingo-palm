from django.apps import AppConfig


class MyVocabularyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.my_vocabulary"
    verbose_name = "My Vocabulary"