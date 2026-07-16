from rest_framework.routers import DefaultRouter

from .views import EntryViewSet, SenseViewSet

router = DefaultRouter()
router.register("entries", EntryViewSet, basename="entry")
router.register("senses", SenseViewSet, basename="sense")

urlpatterns = router.urls
