from django.db import migrations, models


def mark_unreviewed(apps, schema_editor):
    Sense = apps.get_model("dictionary", "Sense")
    Sense.objects.using(schema_editor.connection.alias).filter(
        short_translation=""
    ).update(short_translation=None)


def restore_empty_defaults(apps, schema_editor):
    Sense = apps.get_model("dictionary", "Sense")
    Sense.objects.using(schema_editor.connection.alias).filter(
        short_translation__isnull=True
    ).update(short_translation="")


class Migration(migrations.Migration):
    dependencies = [
        ("dictionary", "0010_sense_short_translation"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sense",
            name="short_translation",
            field=models.CharField(
                max_length=100, null=True, blank=True, default=None
            ),
        ),
        migrations.RunPython(mark_unreviewed, restore_empty_defaults),
    ]
