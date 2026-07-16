from rest_framework.routers import DefaultRouter

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

urlpatterns = router.urls
