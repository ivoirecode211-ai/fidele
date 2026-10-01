from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.OverviewView.as_view()),
    path("interventions/", views.InterventionsView.as_view()),
    path("interventions/<int:pk>/", views.InterventionsPatientView.as_view()),
    path("assistant/", views.AssistantView.as_view()),
]
