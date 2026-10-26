from django.test import TestCase
from apps.dictionary.models import Entry
from apps.dictionary.serializers import EntrySerializer, EntrySummarySerializer


class VariantTests(TestCase):
    def test_storage_and_nested_representation(self):
        variant = {"kind": "general", "word": "toward", "pronunciation": "/təˈwɔːd $ tɔːrd/", "region": "especially American English"}
        serializer = EntrySerializer(data={"word": "towards", "variant": variant})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        entry = serializer.save()
        entry.refresh_from_db()
        self.assertEqual(entry.variant, variant)
        self.assertEqual(EntrySummarySerializer(entry).data["variant"], variant)
        self.assertEqual(Entry.objects.create(word="test").variant, {})

    def test_invalid_shapes(self):
        for variant in ([], None, {"word": "x"}, {"kind": "unknown", "word": "x", "pronunciation": "", "region": ""}):
            serializer = EntrySerializer(data={"word": "test", "variant": variant})
            self.assertFalse(serializer.is_valid())
            self.assertIn("variant", serializer.errors)
