from django.db.models import Sum
from django.utils import timezone

from appointments.models import Appointment
from billing.models import Invoice
from consultations.models import Consultation
from hospitalization.models import Bed
from patients.models import Patient


def get_summary():
    today = timezone.localdate()

    revenue_today = (
        Invoice.objects.filter(date=today).aggregate(total=Sum("amount_paid"))["total"]
        or 0
    )

    return {
        "patients": Patient.objects.count(),
        "new_patients": Patient.objects.filter(created_at__date=today).count(),
        "consultations_today": Consultation.objects.filter(date_time__date=today).count(),
        "appointments_today": Appointment.objects.filter(date_time__date=today).count(),
        "beds_available": Bed.objects.filter(status="AVAILABLE").count(),
        "beds_occupied": Bed.objects.filter(status="OCCUPIED").count(),
        "beds_reserved": Bed.objects.filter(status="RESERVED").count(),
        "beds_cleaning": Bed.objects.filter(status="CLEANING").count(),
        "unpaid_invoices": Invoice.objects.filter(status__in=["UNPAID", "PARTIAL"]).count(),
        "revenue_today": revenue_today,
        "alerts": [
            "Surveillez les stocks critiques.",
            "Vérifiez les maintenances prévues.",
            "Consultez les résultats de laboratoire disponibles.",
        ],
    }
