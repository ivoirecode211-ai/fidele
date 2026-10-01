from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.OverviewView.as_view()),
    path("praticiens/", views.PraticiensView.as_view()),
    path("praticien/", views.PraticienView.as_view()),
    path("etats/", views.EtatsView.as_view()),
    path("etats/filtres-praticien/", views.FiltresPraticienView.as_view()),
    path("etats/<str:etat>/", views.EtatView.as_view()),
    path("<str:report_id>/", views.DetailView.as_view()),
]
