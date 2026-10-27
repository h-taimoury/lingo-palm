"""Serve public, version-controlled course assets in production.

These files are bundled at deploy time, not uploaded by users at runtime.
Development continues to use Django's existing media URL configuration.
"""
from pathlib import Path

from django.conf import settings
from whitenoise.middleware import WhiteNoiseMiddleware


class BundledFilesMiddleware(WhiteNoiseMiddleware):
    def __init__(self, get_response):
        super().__init__(get_response)
        for directory in (
            "course_thumbnails",
            "section_subtitles",
            "pronunciation_audios",
        ):
            root = Path(settings.MEDIA_ROOT) / directory
            if root.is_dir():
                self.add_files(root, prefix=f"{settings.MEDIA_URL.rstrip('/')}/{directory}/")
