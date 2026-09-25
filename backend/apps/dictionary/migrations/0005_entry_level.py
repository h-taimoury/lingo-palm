from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("dictionary", "0004_alter_entry_options_entry_homonym_num_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="entry",
            name="level",
            field=models.JSONField(blank=True, default=None, null=True),
        ),
    ]
