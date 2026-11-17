from django.db import migrations, models
from django.db.models import F


def backfill_learned_at(apps, schema_editor):
    Vocabulary = apps.get_model("my_vocabulary", "Vocabulary")
    # shortcut: historical learning dates use creation dates, exact dates start with this migration.
    Vocabulary.objects.using(schema_editor.connection.alias).filter(already_known=False).update(
        learned_at=F("created_at")
    )


class Migration(migrations.Migration):
    dependencies = [
        ("my_vocabulary", "0003_review_scheduling"),
    ]

    operations = [
        migrations.AddField(
            model_name="vocabulary",
            name="learned_at",
            field=models.DateTimeField(blank=True, editable=False, null=True),
        ),
        migrations.RunPython(backfill_learned_at, migrations.RunPython.noop),
    ]
