from rest_framework.routers import DefaultRouter
from django.urls import path
from .bulk_mappings_views import BulkMappingsView

from .views import (
    CourseViewSet,
    SectionViewSet,
    SubtitleWordViewSet,
    WordSenseMappingViewSet,
)

router = DefaultRouter()
router.register("courses", CourseViewSet, basename="course")
router.register("sections", SectionViewSet, basename="section")
router.register("word-sense-mappings", WordSenseMappingViewSet, basename="word-sense-mapping")
router.register("subtitle-words", SubtitleWordViewSet, basename="subtitle-word")

urlpatterns = [
    path("sections/<int:section_id>/bulk-mappings/<str:operation>/", BulkMappingsView.as_view(), name="bulk-mappings"),
] + router.urls
