from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("courses", "0003_subtitle_occurrence_uniqueness")]

    operations = [
        migrations.RenameField(
            model_name="section", old_name="video_url", new_name="local_video_url",
        ),
        migrations.AlterField(
            model_name="section", name="local_video_url",
            field=models.URLField("Local video URL", max_length=1000, blank=True),
        ),
        migrations.AddField(
            model_name="section", name="hosted_video_url",
            field=models.URLField("Hosted video URL", max_length=1000, blank=True),
        ),
    ]
