from django.urls import path

from . import caisse_views, views

urlpatterns = [
    path("catalogue/", views.CatalogueView.as_view()),
    path("caisse/patients/", views.CaissePatientsView.as_view()),
    path("caisse/recherche/", caisse_views.PatientSearchView.as_view()),
    path("caisse/patients/<int:pk>/encaisser/", caisse_views.PayView.as_view()),
    path("caisse/patients/<int:pk>/annuler/", caisse_views.CancelView.as_view()),
    path("caisse/patients/<int:pk>/ticket/", caisse_views.TicketView.as_view()),
    path("caisse/session/", caisse_views.SessionView.as_view()),
    path("caisse/regie/", caisse_views.RegieView.as_view()),
    path("caisse/regie/sessions/<int:pk>/<str:action>/", caisse_views.RegieSessionView.as_view()),
    path("soins/patients/", views.NursingPatientsView.as_view()),
    path("soins/patients/<int:pk>/constantes/", views.NursingVitalsView.as_view()),
    path("consultations/", views.ConsultationPatientsView.as_view()),
    path("consultations/<int:pk>/consulter/", views.ConsultationStartView.as_view()),
    path("consultations/<int:pk>/valider/", views.ConsultationValidateView.as_view()),
    path("pharmacie/ordonnances/", views.PharmacyPrescriptionsView.as_view()),
    path("pharmacie/ordonnances/<int:code>/preparer/", views.PharmacyPrepareView.as_view()),
    path("pharmacie/ordonnances/<int:code>/servir/", views.PharmacyServeView.as_view()),
    path("pharmacie/ordonnances/<int:code>/recu/", views.PharmacyReceiptView.as_view()),
    path("pharmacie/historique/", views.PharmacyHistoryView.as_view()),
    path("comptabilite/paiements/", views.PaymentsView.as_view()),
    path("comptabilite/sessions/", views.CaisseSessionsView.as_view()),
    path("comptabilite/annules/", views.TicketsAnnulesView.as_view()),
    path("notifications/", views.NotificationsView.as_view()),
    path("notifications/vues/", views.NotificationsVuesView.as_view()),
    path("notifications/push/", views.NotificationsPushView.as_view()),
]
