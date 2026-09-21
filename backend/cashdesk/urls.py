from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .reports import ReportsView

router = DefaultRouter()
router.register("insurances", views.InsuranceViewSet)
router.register("services", views.ServiceViewSet)
router.register("benefits", views.BenefitViewSet)
router.register("rules", views.RuleViewSet)
router.register("drafts", views.DraftViewSet, basename="cash-draft")

urlpatterns = [
    path("overview/", views.OverviewView.as_view()),
    path("catalog/", views.CatalogView.as_view()),
    path("patients/", views.PatientsView.as_view()),
    path("patients/<int:pk>/", views.PatientView.as_view()),
    path("visits/<int:pk>/", views.VisitView.as_view()),
    path("bills/", views.BillsView.as_view()),
    path("bills/<int:pk>/", views.BillView.as_view()),
    path("quote/", views.QuoteView.as_view()),
    path("actions/<slug:action>/", views.ActionView.as_view()),
    path("sessions/", views.SessionsView.as_view()),
    path("sessions/<int:pk>/", views.SessionView.as_view()),
    path("claims/", views.ClaimsView.as_view()),
    path("batches/", views.BatchesView.as_view()),
    path("clinic/", views.ClinicView.as_view()),
    path("queue/", views.QueueView.as_view()),
    path("audit/", views.AuditView.as_view()),
    path("reports/", ReportsView.as_view()),
    path("", include(router.urls)),
]
