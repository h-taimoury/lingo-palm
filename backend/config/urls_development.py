from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from django.views.static import serve

from config.urls import urlpatterns as base_urlpatterns

urlpatterns = [
    *base_urlpatterns,
    path("api/scraper/", include("apps.scraper_admin.urls")),
]

if settings.DEBUG:
    if settings.COURSE_SUBSCRIPTIONS_ENABLED:
        for folder in ("course_thumbnails", "pronunciation_audios"):
            urlpatterns += static(f"{settings.MEDIA_URL}{folder}/", document_root=settings.MEDIA_ROOT / folder)
    else:
        urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
        urlpatterns += [path("sample-courses/<path:path>", serve, {"document_root": settings.MEDIA_ROOT / "sample-courses"})]
