from django.contrib.auth import get_user_model
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

from apps.dictionary.models import Entry, Sense


class LearningDateMigrationTests(TransactionTestCase):
    def test_backfill_only_dates_senses_learned_on_platform(self):
        old_target = [("my_vocabulary", "0003_review_scheduling")]
        new_target = [("my_vocabulary", "0004_vocabulary_learned_at")]
        executor = MigrationExecutor(connection)
        executor.migrate(old_target)
        try:
            apps = executor.loader.project_state(old_target).apps
            Vocabulary = apps.get_model("my_vocabulary", "Vocabulary")
            user = get_user_model().objects.create(email="migration@example.com")
            entry = Entry.objects.create(word="book")
            learned_sense = Sense.objects.create(entry=entry, title="learned", definition="pages")
            known_sense = Sense.objects.create(entry=entry, title="known", definition="reserve")
            learned = Vocabulary.objects.create(user_id=user.pk, sense_id=learned_sense.pk)
            known = Vocabulary.objects.create(user_id=user.pk, sense_id=known_sense.pk, already_known=True)

            executor = MigrationExecutor(connection)
            executor.migrate(new_target)
            Vocabulary = executor.loader.project_state(new_target).apps.get_model("my_vocabulary", "Vocabulary")
            self.assertEqual(Vocabulary.objects.get(pk=learned.pk).learned_at, learned.created_at)
            self.assertIsNone(Vocabulary.objects.get(pk=known.pk).learned_at)
            self.assertEqual(Vocabulary.objects.count(), 2)
        finally:
            executor = MigrationExecutor(connection)
            executor.migrate(executor.loader.graph.leaf_nodes())
