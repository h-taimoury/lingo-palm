from pathlib import Path
from tempfile import TemporaryDirectory

from django.test import SimpleTestCase, override_settings


@override_settings(
    DEBUG=False,
    ROOT_URLCONF="config.urls",
    ALLOWED_HOSTS=["testserver"],
    MIDDLEWARE=[
        "django.middleware.security.SecurityMiddleware",
        "config.static_files.BundledFilesMiddleware",
    ],
    SECURE_SSL_REDIRECT=True,
    SECURE_REDIRECT_EXEMPT=[r"^healthz/$"],
    WHITENOISE_AUTOREFRESH=False,
    WHITENOISE_USE_FINDERS=False,
    WHITENOISE_MIMETYPES={".vtt": "text/vtt"},
)
class DeploymentFileTests(SimpleTestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        root = Path(directory.name)
        (root / "static").mkdir()
        assets = {
            "static/admin.css": b"body { color: black; }",
            "media/course_thumbnails/course.jpg": b"thumbnail",
            "media/section_subtitles/course/section.vtt": b"WEBVTT\n\n",
            "media/pronunciation_audios/word.mp3": b"0123456789",
            "media/private.txt": b"must not be exposed",
        }
        for name, content in assets.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        overrides = override_settings(STATIC_ROOT=root / "static", MEDIA_ROOT=root / "media")
        overrides.enable()
        self.addCleanup(overrides.disable)

    def test_static_and_bundled_files_are_served_with_debug_off(self):
        for url, expected in (
            ("/static/admin.css", b"body { color: black; }"),
            ("/media/course_thumbnails/course.jpg", b"thumbnail"),
            ("/media/section_subtitles/course/section.vtt", b"WEBVTT\n\n"),
            ("/media/pronunciation_audios/word.mp3", b"0123456789"),
        ):
            with self.subTest(url=url):
                response = self.client.get(url, secure=True)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(b"".join(response.streaming_content), expected)
                if url.endswith(".vtt"):
                    self.assertTrue(response["Content-Type"].startswith("text/vtt"))

    def test_audio_supports_range_head_and_conditional_requests(self):
        url = "/media/pronunciation_audios/word.mp3"
        head = self.client.head(url, secure=True)
        self.assertEqual(head.status_code, 200)
        self.assertEqual(head["Content-Length"], "10")
        cached = self.client.get(url, secure=True, HTTP_IF_NONE_MATCH=head["ETag"])
        self.assertEqual(cached.status_code, 304)
        partial = self.client.get(url, secure=True, HTTP_RANGE="bytes=0-3")
        self.assertEqual(partial.status_code, 206)
        self.assertEqual(b"".join(partial.streaming_content), b"0123")

    def test_missing_private_and_traversal_paths_are_not_exposed(self):
        for url in (
            "/media/private.txt",
            "/media/section_subtitles/missing.vtt",
            "/media/course_thumbnails/../private.txt",
            "/media/course_thumbnails/%2e%2e/private.txt",
        ):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url, secure=True).status_code, 404)

    def test_health_needs_no_database_or_https_redirect(self):
        # SimpleTestCase disallows DB queries, so this also verifies no DB wakeup.
        response = self.client.get("/healthz/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
        self.assertEqual(self.client.post("/healthz/", secure=True).status_code, 405)

    def test_other_http_requests_redirect_to_https(self):
        response = self.client.get("/media/course_thumbnails/course.jpg")
        self.assertEqual(response.status_code, 301)
        self.assertTrue(response["Location"].startswith("https://"))
