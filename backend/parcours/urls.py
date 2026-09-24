from django.urls import path

from . import views

urlpatterns = [
    path("catalogue/", views.CatalogueView.as_view()),
    path("caisse/patients/", views.CaissePatientsView.as_view()),
    path("soins/patients/", views.NursingPatientsView.as_view()),
    path("soins/patients/<int:pk>/constantes/", views.NursingVitalsView.as_view()),
    path("consultations/", views.ConsultationPatientsView.as_view()),
    path("consultations/<int:pk>/consulter/", views.ConsultationStartView.as_view()),
    path("consultations/<int:pk>/valider/", views.ConsultationValidateView.as_view()),
    path("pharmacie/ordonnances/", views.PharmacyPrescriptionsView.as_view()),
    path("pharmacie/ordonnances/<int:code>/preparer/", views.PharmacyPrepareView.as_view()),
    path("pharmacie/ordonnances/<int:code>/servir/", views.PharmacyServeView.as_view()),
    path("pharmacie/historique/", views.PharmacyHistoryView.as_view()),
    path("comptabilite/paiements/", views.PaymentsView.as_view()),
    path("notifications/", views.NotificationsView.as_view()),
]
