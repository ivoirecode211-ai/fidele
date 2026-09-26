from django.urls import path

from .views import DashboardView, DirectionView

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("direction/", DirectionView.as_view(), name="dashboard-direction"),
]
