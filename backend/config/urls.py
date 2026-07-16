from django.contrib import admin
from django.urls import include, path

from config.views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/users/", include("apps.users.urls")),
    path("api/dictionary/", include("apps.dictionary.urls")),
    path("api/courses/", include("apps.courses.urls")),
]
