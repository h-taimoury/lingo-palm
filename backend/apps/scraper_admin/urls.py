from django.urls import path

from .views import RejectScrapeView, ScrapeWordView

urlpatterns = [
    path("scrape/", ScrapeWordView.as_view(), name="scrape-word"),
    path("reject/", RejectScrapeView.as_view(), name="reject-scrape"),
]
