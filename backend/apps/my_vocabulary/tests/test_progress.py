from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.dictionary.models import Entry, Sense
from apps.my_vocabulary.models import Vocabulary


class ProgressTests(APITestCase):
    url = "/api/my-vocabulary/vocabulary/progress/"

    def setUp(self):
        self.user = get_user_model().objects.create(email="progress@example.com")
        self.other = get_user_model().objects.create(email="other-progress@example.com")
        self.client.force_authenticate(self.user)
        self.entry = Entry.objects.create(word="book", part_of_speech="noun")
        self.now = datetime(2026, 11, 18, 0, 30, tzinfo=dt_timezone.utc)
        clock = patch("apps.my_vocabulary.services.timezone.now", return_value=self.now)
        clock.start()
        self.addCleanup(clock.stop)

    def vocabulary(self, learned_at, **fields):
        sense = Sense.objects.create(
            entry=self.entry, title=f"progress-{Sense.objects.count()}", definition="A new meaning",
        )
        fields.setdefault("user", self.user)
        fields.setdefault("needs_review", False)
        return Vocabulary.objects.create(sense=sense, learned_at=learned_at, **fields)

    def test_summary_excludes_known_other_users_undated_and_future_senses(self):
        self.vocabulary(self.now - timedelta(hours=1))
        self.vocabulary(self.now - timedelta(hours=2))
        self.vocabulary(self.now - timedelta(days=40))
        self.vocabulary(self.now, already_known=True)
        self.vocabulary(self.now, user=self.other)
        self.vocabulary(None)
        self.vocabulary(self.now + timedelta(hours=1))
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual((data["days"], data["timezone"]), (30, "UTC"))
        self.assertEqual(data["total_learned"], 3)
        self.assertEqual(data["period_learned"], 2)
        self.assertEqual(data["learning_days"], 1)
        self.assertEqual(len(data["daily_counts"]), 30)
        self.assertEqual(data["daily_counts"][0], {"date": "2026-10-20", "count": 0})
        self.assertEqual(data["daily_counts"][-2], {"date": "2026-11-17", "count": 2})
        self.assertEqual(data["daily_counts"][-1], {"date": "2026-11-18", "count": 0})
        self.assertEqual(len(data["recently_learned"]), 3)

    def test_local_day_boundaries_use_learning_date_instead_of_creation_date(self):
        start = datetime(2026, 10, 19, 20, 30, tzinfo=dt_timezone.utc)
        self.vocabulary(start - timedelta(microseconds=1))
        self.vocabulary(start)
        latest = self.vocabulary(datetime(2026, 11, 17, 20, 45, tzinfo=dt_timezone.utc))
        Vocabulary.objects.filter(pk=latest.pk).update(created_at=self.now - timedelta(days=100))
        data = self.client.get(self.url, {"timezone": "Asia/Tehran"}).json()
        self.assertEqual(data["period_learned"], 2)
        self.assertEqual(data["learning_days"], 2)
        self.assertEqual(data["daily_counts"][0], {"date": "2026-10-20", "count": 1})
        self.assertEqual(data["daily_counts"][-1], {"date": "2026-11-18", "count": 1})
        self.assertEqual(data["recently_learned"][0]["id"], latest.pk)

    def test_period_ends_on_the_users_today_and_handles_dst(self):
        self.vocabulary(datetime(2026, 11, 1, 5, 30, tzinfo=dt_timezone.utc))
        self.vocabulary(datetime(2026, 11, 1, 6, 30, tzinfo=dt_timezone.utc))
        with patch("apps.my_vocabulary.services.timezone.now", return_value=datetime(2026, 11, 3, 4, tzinfo=dt_timezone.utc)):
            data = self.client.get(self.url, {"days": 7, "timezone": "America/New_York"}).json()
        self.assertEqual(data["end_date"], "2026-11-02")
        self.assertEqual(data["start_date"], "2026-10-27")
        self.assertEqual(data["learning_days"], 1)
        self.assertIn({"date": "2026-11-01", "count": 2}, data["daily_counts"])

    def test_all_periods_have_zero_filled_days_for_new_learners(self):
        for days in (7, 30, 90):
            with self.subTest(days=days):
                response = self.client.get(self.url, {"days": days})
                self.assertEqual(response.status_code, 200)
                data = response.json()
                self.assertEqual(len(data["daily_counts"]), days)
                self.assertTrue(all(day["count"] == 0 for day in data["daily_counts"]))
                self.assertEqual(data["total_learned"], 0)
                self.assertEqual(data["learning_days"], 0)
                self.assertEqual(data["recently_learned"], [])

    def test_recent_senses_are_limited_and_review_count_matches_actual_queue(self):
        rows = [self.vocabulary(self.now - timedelta(days=index)) for index in range(8)]
        self.vocabulary(None, already_known=True, needs_review=True, review_due_at=self.now)
        self.vocabulary(self.now, needs_review=True, review_due_at=self.now + timedelta(hours=1))
        self.vocabulary(self.now, needs_review=True, review_due_at=self.now - timedelta(hours=1))
        self.vocabulary(self.now, needs_review=True, review_due_at=self.now, user=self.other)
        data = self.client.get(self.url).json()
        self.assertEqual(data["review_due_count"], 2)
        self.assertEqual(len(data["recently_learned"]), 5)
        self.assertEqual([row["id"] for row in data["recently_learned"]][-3:], [row.pk for row in rows[:3]])

    def test_invalid_periods_and_timezones_are_rejected(self):
        for params in ({"days": "31"}, {"days": "abc"}, {"days": "-7"}, {"timezone": "invalid/zone"}, {"timezone": "/etc/passwd"}, {"timezone": ""}):
            with self.subTest(params=params):
                self.assertEqual(self.client.get(self.url, params).status_code, 400)

    def test_authentication_is_required(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, 401)
