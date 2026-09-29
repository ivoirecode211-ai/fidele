from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.OverviewView.as_view()),
    path("interventions/", views.InterventionsView.as_view()),
    path("interventions/<int:pk>/statut/", views.InterventionStatusView.as_view()),
    path("interventions/<int:pk>/cloturer/", views.InterventionCloseView.as_view()),
    # Module QR Code : parc, fiche, étiquettes, scan.
    path("equipements/", views.EquipmentsView.as_view()),
    path("equipements/<int:pk>/", views.EquipmentView.as_view()),
    path("equipements/<int:pk>/nouveau-qr/", views.EquipmentTokenView.as_view()),
    path("scan/<uuid:token>/", views.ScanView.as_view()),
]
