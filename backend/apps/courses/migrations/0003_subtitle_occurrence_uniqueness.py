from django.db import migrations, models
from django.db.models import Count
import django.db.models.deletion


def populate_sections(apps, schema_editor):
    Word = apps.get_model("courses", "SubtitleWord")
    Mapping = apps.get_model("courses", "WordSenseMapping")
    alias = schema_editor.connection.alias
    conflicts = list(
        Word.objects.using(alias)
        .values("mapping__section_id", "cue_id", "word", "position_in_cue")
        .annotate(count=Count("pk")).filter(count__gt=1)[:20]
    )
    if conflicts:
        raise RuntimeError(
            "Resolve overlapping subtitle mappings before migrating; no mappings "
            f"were removed automatically. Conflicts: {conflicts}"
        )
    for mapping_id, section_id in Mapping.objects.using(alias).values_list("id", "section_id"):
        Word.objects.using(alias).filter(mapping_id=mapping_id).update(section_id=section_id)


def install_guards(apps, schema_editor):
    # A normal CHECK cannot reference the mapping table. These guards prevent
    # bypassing the unique constraint with an incorrect denormalized section.
    vendor = schema_editor.connection.vendor
    if vendor == "sqlite":
        for event in ("INSERT", "UPDATE"):
            schema_editor.execute(f"""
                CREATE TRIGGER courses_subtitle_section_{event.lower()}
                BEFORE {event} ON courses_subtitleword
                WHEN NEW.section_id != (
                    SELECT section_id FROM courses_wordsensemapping WHERE id = NEW.mapping_id
                )
                BEGIN
                    SELECT RAISE(ABORT, 'subtitle_mapping_section_mismatch');
                END
            """)
        schema_editor.execute("""
            CREATE TRIGGER courses_mapping_section_update
            BEFORE UPDATE OF section_id ON courses_wordsensemapping
            WHEN NEW.section_id != OLD.section_id AND EXISTS (
                SELECT 1 FROM courses_subtitleword WHERE mapping_id = OLD.id
            )
            BEGIN
                SELECT RAISE(ABORT, 'subtitle_mapping_section_mismatch');
            END
        """)
    elif vendor == "postgresql":
        schema_editor.execute("""
            CREATE FUNCTION courses_check_subtitle_section() RETURNS trigger AS $$
            DECLARE parent_section bigint;
            BEGIN
                SELECT section_id INTO parent_section FROM courses_wordsensemapping
                    WHERE id = NEW.mapping_id FOR SHARE;
                IF NEW.section_id IS DISTINCT FROM parent_section THEN
                    RAISE EXCEPTION 'subtitle_mapping_section_mismatch' USING ERRCODE = '23514';
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            CREATE TRIGGER courses_subtitle_section_guard
                BEFORE INSERT OR UPDATE ON courses_subtitleword
                FOR EACH ROW EXECUTE FUNCTION courses_check_subtitle_section();
            CREATE FUNCTION courses_check_mapping_section() RETURNS trigger AS $$
            BEGIN
                IF NEW.section_id IS DISTINCT FROM OLD.section_id AND EXISTS (
                    SELECT 1 FROM courses_subtitleword WHERE mapping_id = OLD.id
                ) THEN
                    RAISE EXCEPTION 'subtitle_mapping_section_mismatch' USING ERRCODE = '23514';
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            CREATE TRIGGER courses_mapping_section_update
                BEFORE UPDATE OF section_id ON courses_wordsensemapping
                FOR EACH ROW EXECUTE FUNCTION courses_check_mapping_section();
        """)
    else:
        raise NotImplementedError("Subtitle occurrence guards support SQLite and PostgreSQL.")


def remove_guards(apps, schema_editor):
    if schema_editor.connection.vendor == "sqlite":
        for name in ("courses_subtitle_section_insert", "courses_subtitle_section_update", "courses_mapping_section_update"):
            schema_editor.execute(f"DROP TRIGGER IF EXISTS {name}")
    elif schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("""
            DROP TRIGGER IF EXISTS courses_subtitle_section_guard ON courses_subtitleword;
            DROP TRIGGER IF EXISTS courses_mapping_section_update ON courses_wordsensemapping;
            DROP FUNCTION IF EXISTS courses_check_subtitle_section();
            DROP FUNCTION IF EXISTS courses_check_mapping_section();
        """)


class Migration(migrations.Migration):
    dependencies = [("courses", "0002_course_subtitle_folder_alter_section_subtitle_file")]

    operations = [
        migrations.AddField(
            model_name="subtitleword", name="section",
            field=models.ForeignKey(editable=False, null=True, on_delete=django.db.models.deletion.CASCADE, to="courses.section"),
        ),
        migrations.RunPython(populate_sections, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="subtitleword", name="section",
            field=models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, to="courses.section"),
        ),
        migrations.AddConstraint(
            model_name="subtitleword",
            constraint=models.UniqueConstraint(
                fields=("section", "cue_id", "word", "position_in_cue"),
                name="unique_subtitle_occurrence_per_section",
            ),
        ),
        migrations.RunPython(install_guards, remove_guards),
    ]
