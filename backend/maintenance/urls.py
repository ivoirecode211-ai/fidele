from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.OverviewView.as_view()),
    path("interventions/", views.InterventionsView.as_view()),
    path("interventions/<int:pk>/statut/", views.InterventionStatusView.as_view()),
]
