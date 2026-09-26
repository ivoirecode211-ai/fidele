from django.urls import path
from rest_framework.routers import DefaultRouter

from . import agenda
from .views import AppointmentViewSet

router = DefaultRouter()
router.register("", AppointmentViewSet, basename="appointment")

urlpatterns = [
    path("agenda/", agenda.AgendaView.as_view()),
    path("agenda/<int:pk>/", agenda.AgendaItemView.as_view()),
    path("agenda/<int:pk>/statut/", agenda.AgendaStatusView.as_view()),
] + router.urls
