from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("courses", "0004_section_video_urls")]

    operations = [
        migrations.AddField(
            model_name="wordsensemapping",
            name="translation",
            field=models.TextField(blank=True, default=None, null=True),
        ),
    ]
