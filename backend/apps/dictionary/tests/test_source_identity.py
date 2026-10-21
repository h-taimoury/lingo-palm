from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.dictionary.models import Entry
from apps.dictionary.serializers import EntrySerializer, SenseSerializer


class SourceIdentityTests(TestCase):
    def test_distinct_unnumbered_entries_and_duplicate_constraint(self):
        first = Entry.objects.create(word="Junior", source_entry_id="entry:junior__12")
        Entry.objects.create(word="Junior", source_entry_id="entry:junior__14")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Entry.objects.create(word=" Junior ", source_entry_id="entry:junior__12", part_of_speech="noun")
        # The anchor need not be globally unique across different headwords.
        Entry.objects.create(word="Another", source_entry_id=first.source_entry_id)
        self.assertEqual(Entry.objects.count(), 3)

    def test_serializer_allows_distinct_source_ids_and_preserves_on_edit(self):
        first = Entry.objects.create(word="Junior", source_entry_id="entry:junior__12")
        serializer = EntrySerializer(data={"word": "Junior", "source_entry_id": "entry:junior__14"})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        duplicate = EntrySerializer(data={"word": "Junior", "source_entry_id": first.source_entry_id})
        self.assertFalse(duplicate.is_valid())
        update = EntrySerializer(first, data={"register": "spoken"}, partial=True)
        self.assertTrue(update.is_valid(), update.errors)
        update.save()
        first.refresh_from_db()
        self.assertEqual(first.source_entry_id, "entry:junior__12")
        sense = first.senses.create(title="Junior_", definition="a boy")
        self.assertEqual(SenseSerializer(sense).data["entry"]["source_entry_id"], first.source_entry_id)

    def test_legacy_conflicts_are_guarded_in_both_directions(self):
        Entry.objects.create(word="old", part_of_speech="noun")
        new = EntrySerializer(data={"word": "old", "part_of_speech": "noun", "source_entry_id": "entry:old__1"})
        self.assertFalse(new.is_valid())
        Entry.objects.create(word="new", part_of_speech="noun", source_entry_id="entry:new__1")
        legacy = EntrySerializer(data={"word": "new", "part_of_speech": "noun"})
        self.assertFalse(legacy.is_valid())
