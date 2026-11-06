from django.db import migrations, models


def group_sense_levels(apps, schema_editor):
    Sense = apps.get_model("dictionary", "Sense")
    senses = Sense.objects.using(schema_editor.connection.alias)
    known_levels = ["", "A", "B", "C", "A1", "A2", "B1", "B2", "C1", "C2"]
    unexpected = list(
        senses.filter(level__isnull=False)
        .exclude(level__in=known_levels)
        .order_by()
        .values_list("level", flat=True)
        .distinct()
    )
    if unexpected:
        raise ValueError(f"Cannot group unexpected sense levels: {unexpected!r}")
    for level in ("A", "B", "C"):
        senses.filter(level__in=[f"{level}1", f"{level}2"]).update(level=level)


class Migration(migrations.Migration):
    dependencies = [
        ("dictionary", "0012_sense_level"),
    ]

    operations = [
        # The original subdivisions cannot be recovered from the broad groups.
        migrations.RunPython(group_sense_levels),
        migrations.AlterField(
            model_name="sense",
            name="level",
            field=models.CharField(
                max_length=1,
                choices=[("A", "A"), ("B", "B"), ("C", "C")],
                null=True,
                blank=True,
                default=None,
            ),
        ),
    ]
