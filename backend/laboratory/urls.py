from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.OverviewView.as_view()),
    path("analyses/<int:pk>/demande/", views.RequestView.as_view()),
    path("analyses/<int:pk>/resultat/", views.ResultView.as_view()),
]
