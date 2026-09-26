from django.urls import path
from rest_framework.routers import DefaultRouter

from . import ward
from .views import BedViewSet, HospitalizationViewSet, RoomViewSet

router = DefaultRouter()
router.register("rooms", RoomViewSet, basename="room")
router.register("beds", BedViewSet, basename="bed")
router.register("", HospitalizationViewSet, basename="hospitalization")

urlpatterns = [
    path("service/", ward.OverviewView.as_view()),
    path("service/lits/", ward.BedsView.as_view()),
    path("service/sejours/", ward.StaysView.as_view()),
    path("service/sejours/<int:pk>/sortie/", ward.DischargeView.as_view()),
] + router.urls
