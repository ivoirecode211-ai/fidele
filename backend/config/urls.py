from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/patients/", include("patients.urls")),
    path("api/appointments/", include("appointments.urls")),
    path("api/consultations/", include("consultations.urls")),
    path("api/prescriptions/", include("prescriptions.urls")),
    path("api/hospitalization/", include("hospitalization.urls")),
    path("api/billing/", include("billing.urls")),
    path("api/dashboard/", include("dashboard.urls")),
    path("api/forms/", include("formengine.urls")),
    path("api/cashdesk/", include("cashdesk.urls")),
    path("api/parcours/", include("parcours.urls")),
    path("api/administration/", include("administration.urls")),
    path("api/maintenance/", include("maintenance.urls")),
    path("api/hygiene/", include("hygiene.urls")),
    path("api/archives/", include("archives.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/ia/", include("ia.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
