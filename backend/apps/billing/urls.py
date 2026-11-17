from django.urls import path

from . import views

urlpatterns = [
    path("plan/", views.plan),
    path("checkout/", views.checkout),
    path("return/", views.payment_return),
    path("orders/<uuid:reference>/", views.order_status),
]
