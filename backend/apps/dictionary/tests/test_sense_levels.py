from django.test import TestCase

from apps.dictionary.models import Entry
from apps.dictionary.serializers import SenseSerializer, SenseSummarySerializer


class SenseLevelSerializerTests(TestCase):
    def test_sense_level_is_in_full_and_summary_payloads(self):
        entry = Entry.objects.create(word="book")
        for index, level in enumerate(("A", "B", "C", None)):
            sense = entry.senses.create(title=f"book_{index}", definition="a meaning", level=level)
            self.assertEqual(SenseSerializer(sense).data["level"], level)
            self.assertEqual(SenseSummarySerializer(sense).data["level"], level)

    def test_sense_level_can_be_updated_and_invalid_grades_are_rejected(self):
        entry = Entry.objects.create(word="book")
        sense = entry.senses.create(title="book_1", definition="a meaning")
        for level in ("A", "B", "C", None):
            serializer = SenseSerializer(sense, data={"level": level}, partial=True)
            self.assertTrue(serializer.is_valid(), serializer.errors)
            serializer.save()
            sense.refresh_from_db()
            self.assertEqual(sense.level, level)
        for level in ("A1", "B2", "C1", "D"):
            serializer = SenseSerializer(sense, data={"level": level}, partial=True)
            self.assertFalse(serializer.is_valid())
            self.assertIn("level", serializer.errors)
