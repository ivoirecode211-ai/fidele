from django.urls import path

from . import accueil_views as views

urlpatterns = [
    path("referentiels/", views.ReferentielsView.as_view()),
    path("patients/", views.PatientsView.as_view()),
    path("fiches/", views.FichesView.as_view()),
    path("fiches/<int:pk>/valider/", views.FicheValiderView.as_view()),
    path("fiches/<int:pk>/annuler/", views.FicheAnnulerView.as_view()),
    path("session/", views.SessionView.as_view()),
    path("sessions/<int:pk>/<str:action>/", views.SessionRegieView.as_view()),
    path("bilan/", views.BilanView.as_view()),
]
