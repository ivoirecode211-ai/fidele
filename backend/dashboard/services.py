from collections import Counter
from datetime import timedelta

from django.db.models import F, Sum
from django.utils import timezone

from appointments.models import Appointment
from billing.models import Invoice
from consultations.models import Consultation
from hospitalization.models import Bed, Hospitalization
from hygiene.models import CleaningTask
from hygiene.services import task_status
from laboratory.models import LabRequest
from maintenance.models import Equipment
from maintenance.services import equipment_state
from parcours.models import Admission
from patients.models import Patient
from prescriptions.models import PrescriptionItem
from stocks.models import Product

DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
SERVICE_COLORS = ["#0a4979", "#1671b7", "#368ad1", "#67aae9", "#98caf9", "#c2e0ff"]


def ago(moment):
    """« Il y a 20 min », « Il y a 3 h », « Il y a 2 j »."""
    minutes = int((timezone.now() - moment).total_seconds() // 60)
    if minutes < 60:
        return f"Il y a {max(minutes, 1)} min"
    if minutes < 24 * 60:
        return f"Il y a {minutes // 60} h"
    return f"Il y a {minutes // (24 * 60)} j"


def alerts():
    """Points d'attention réels, du plus grave au moins grave."""
    now = timezone.now()
    rows = []
    for product in Product.objects.filter(stock__lte=F("threshold")).order_by("stock")[:3]:
        rows.append({"type": "critical", "icon": "AlertTriangle", "title": f"Stock critique : {product.name}",
                     "text": f"Il reste {product.stock} unité(s) (seuil : {product.threshold})", "at": now})
    for equipment in Equipment.objects.prefetch_related("interventions"):
        state, cause = equipment_state(equipment)
        if cause:
            rows.append({"type": "critical" if state == "Critique" else "warning", "icon": "Wrench",
                         "title": f"Maintenance : {equipment.name}", "text": cause.description or state,
                         "at": cause.created_at})
    late = [t for t in CleaningTask.objects.filter(date__gte=timezone.localdate() - timedelta(days=7))
            if task_status(t) == "En retard"]
    if late:
        rows.append({"type": "warning", "icon": "AlertTriangle", "title": f"{len(late)} tâche(s) d'hygiène en retard",
                     "text": ", ".join(sorted({t.zone for t in late}))[:120], "at": now})
    waiting = Admission.objects.filter(sent_to_consultation_at__lte=now - timedelta(hours=2)).exclude(statut="Terminée")
    if waiting.exists():
        rows.append({"type": "info", "icon": "Siren", "title": f"{waiting.count()} patient(s) en attente depuis plus de 2 h",
                     "text": "Consultation à prévoir", "at": waiting.order_by("sent_to_consultation_at").first().sent_to_consultation_at})
    pending_lab = LabRequest.objects.exclude(status="Terminée").filter(results__isnull=False).distinct()
    if pending_lab.exists():
        rows.append({"type": "success", "icon": "CheckCircle2", "title": f"{pending_lab.count()} analyse(s) en attente de résultat",
                     "text": "", "at": pending_lab.order_by("requested_at").first().requested_at})
    return [{**{k: v for k, v in row.items() if k != "at"}, "time": ago(row["at"])} for row in rows]


def get_summary():
    today = timezone.localdate()
    return {
        "patients": Patient.objects.count(),
        "new_patients": Patient.objects.filter(created_at__date=today).count(),
        "consultations_today": Consultation.objects.filter(completed_at__date=today).count(),
        "appointments_today": Appointment.objects.filter(date_time__date=today).exclude(status="CANCELLED").count(),
        "beds_available": Bed.objects.filter(status="AVAILABLE").count(),
        "beds_occupied": Bed.objects.filter(status="OCCUPIED").count(),
        "beds_reserved": Bed.objects.filter(status="RESERVED").count(),
        "beds_cleaning": Bed.objects.filter(status="CLEANING").count(),
        "unpaid_invoices": Invoice.objects.filter(status__in=["UNPAID", "PARTIAL"]).count(),
        "revenue_today": Admission.objects.filter(created_at__date=today).aggregate(total=Sum("cost"))["total"] or 0,
        "alerts": [f"{row['title']}{' — ' + row['text'] if row['text'] else ''}" for row in alerts()],
    }


def variation(today_value, yesterday_value):
    if not yesterday_value:
        return "Nouveau" if today_value else "Stable"
    change = round(100 * (today_value - yesterday_value) / yesterday_value)
    return f"{'+' if change >= 0 else '−'}{abs(change)}%"


def fr_number(value):
    return f"{int(value):,}".replace(",", " ")


def direction_overview():
    today = timezone.localdate()
    yesterday = today - timedelta(days=1)

    def per_day(day):
        admissions = Admission.objects.filter(created_at__date=day)
        return {
            "patients": admissions.count(),
            "consultations": Consultation.objects.filter(completed_at__date=day).count(),
            "revenue": admissions.aggregate(total=Sum("cost"))["total"] or 0,
            "analyses": LabRequest.objects.filter(status="Terminée", completed_at__date=day).count(),
            "medicines": PrescriptionItem.objects.filter(prescription__served_at__date=day).count(),
        }

    now_, before = per_day(today), per_day(yesterday)
    beds = Bed.objects.count()
    occupied = Bed.objects.filter(status="OCCUPIED").count()
    critical_stock = Product.objects.filter(stock__lte=F("threshold")).count()
    hospitalized = Hospitalization.objects.filter(discharge_date__isnull=True).count()

    week = [today - timedelta(days=offset) for offset in range(6, -1, -1)]
    chart = []
    for day in week:
        counts = per_day(day)
        chart.append({"day": DAYS[day.weekday()], "consultations": counts["consultations"], "patients": counts["patients"]})

    since = today - timedelta(days=30)
    by_service = Counter(Admission.objects.filter(created_at__date__gte=since).values_list("service_name", flat=True))
    total = sum(by_service.values())
    ranked = by_service.most_common()
    rows = ranked[:5] + ([("Autres", sum(n for _, n in ranked[5:]))] if len(ranked) > 5 else [])
    services = [{"name": name, "percentage": round(100 * n / total), "color": SERVICE_COLORS[index]}
                for index, (name, n) in enumerate(rows)] if total else []

    return {
        "statistics": [
            {"title": "Patients aujourd'hui", "value": fr_number(now_["patients"]), "variation": variation(now_["patients"], before["patients"]), "icon": "Users", "color": "blue"},
            {"title": "Consultations", "value": fr_number(now_["consultations"]), "variation": variation(now_["consultations"], before["consultations"]), "icon": "Stethoscope", "color": "blue"},
            {"title": "Recettes du jour", "value": fr_number(now_["revenue"]), "unit": "FCFA", "variation": variation(now_["revenue"], before["revenue"]), "icon": "Database", "color": "green"},
            {"title": "Lits disponibles", "value": fr_number(beds - occupied), "unit": f"/ {beds}", "variation": f"{round(100 * occupied / beds) if beds else 0}% occupés", "icon": "BedDouble", "color": "blue"},
            {"title": "Analyses réalisées", "value": fr_number(now_["analyses"]), "variation": variation(now_["analyses"], before["analyses"]), "icon": "FlaskConical", "color": "green"},
            {"title": "Médicaments délivrés", "value": fr_number(now_["medicines"]), "variation": variation(now_["medicines"], before["medicines"]), "icon": "Pill", "color": "red"},
            {"title": "Stock critiques", "value": fr_number(critical_stock), "action": "Voir détails", "icon": "Box", "color": "orange"},
            {"title": "Patients hospitalisés", "value": fr_number(hospitalized), "action": "En cours", "icon": "BedDouble", "color": "red"},
        ],
        "consultationData": chart,
        "services": services,
        "servicesTotal": total,
        "alerts": alerts(),
    }
