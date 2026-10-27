from django.contrib import admin
from django.urls import include, path

from .health import health

urlpatterns = [
    path("healthz/", health, name="health"),
    path("admin/", admin.site.urls),
    path("api/users/", include("apps.users.urls")),
    path("api/dictionary/", include("apps.dictionary.urls")),
    path("api/courses/", include("apps.courses.urls")),
    path("api/my-vocabulary/", include("apps.my_vocabulary.urls")),
]
