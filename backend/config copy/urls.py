from django.contrib import admin
from django.urls import include, path

from config.views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/dictionary/", include("apps.dictionary.urls")),
    path("api/courses/", include("apps.courses.urls")),
]

# The users app is intentionally not wired here yet because its URL module and
# cookie-based JWT views depend on the code you will add to apps/users.
