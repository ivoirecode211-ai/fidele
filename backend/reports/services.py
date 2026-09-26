"""Rapports mensuels calculés à partir des données enregistrées.

Un rapport par type et par mois : « En cours » pour le mois courant,
« Disponible » une fois le mois terminé.
"""
import calendar
from collections import Counter
from datetime import date

from django.db.models import Sum
from django.utils import timezone

from consultations.models import Consultation
from hospitalization.models import Hospitalization
from maintenance.models import Intervention
from parcours.models import Admission, VitalSigns
from patients.models import Patient
from prescriptions.models import Prescription, PrescriptionItem

MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août",
          "Septembre", "Octobre", "Novembre", "Décembre"]

# type -> (titre, service, auteur)
TYPES = {
    "Activité": ("Rapport d'activité mensuel", "Tous les services", "Direction Générale"),
    "Consultations": ("Rapport des consultations", "Médecine", "Service Médical"),
    "Finances": ("Rapport financier", "Caisse", "Service Caisse"),
    "Stocks": ("Rapport de la pharmacie", "Pharmacie", "Pharmacie"),
    "Hospitalisation": ("Rapport d'hospitalisation", "Hospitalisation", "Service Hospitalisation"),
    "Maintenance": ("Rapport de maintenance", "Maintenance", "Service Maintenance"),
}


def label(year, month):
    return f"{MONTHS[month - 1]} {year}"


def money(value):
    return f"{int(value or 0):,} FCFA".replace(",", " ")


def month_filter(field, year, month):
    return {f"{field}__year": year, f"{field}__month": month}


def figures(kind, year, month):
    """Les chiffres d'un rapport, dans l'ordre d'affichage."""
    admissions = Admission.objects.filter(**month_filter("created_at", year, month))
    if kind == "Activité":
        return [
            ("Patients enregistrés à la caisse", admissions.count()),
            ("Nouveaux dossiers patients", Patient.objects.filter(**month_filter("created_at", year, month)).count()),
            ("Constantes prises", VitalSigns.objects.filter(**month_filter("recorded_at", year, month)).count()),
            ("Consultations validées", Consultation.objects.filter(**month_filter("completed_at", year, month)).count()),
        ]
    if kind == "Consultations":
        done = Consultation.objects.filter(**month_filter("completed_at", year, month))
        return [
            ("Consultations validées", done.count()),
            ("Ordonnances prescrites", Prescription.objects.filter(consultation__in=done).count()),
            ("Médecins ayant consulté", done.values("doctor").distinct().count()),
        ]
    if kind == "Finances":
        totals = admissions.aggregate(total=Sum("service_price"), patient=Sum("cost"))
        insurance = (totals["total"] or 0) - (totals["patient"] or 0)
        return [
            ("Montant total des prestations", money(totals["total"])),
            ("Encaissé auprès des patients", money(totals["patient"])),
            ("Part des assurances", money(insurance)),
            ("Nombre d'encaissements", admissions.count()),
        ]
    if kind == "Stocks":
        served = Prescription.objects.filter(status="SERVED", **month_filter("served_at", year, month))
        return [
            ("Ordonnances servies", served.count()),
            ("Médicaments délivrés", PrescriptionItem.objects.filter(prescription__in=served).count()),
            ("Ordonnances en attente", Prescription.objects.exclude(status="SERVED").count()),
        ]
    if kind == "Hospitalisation":
        stays = Hospitalization.objects.filter(**month_filter("admission_date", year, month))
        return [
            ("Admissions en hospitalisation", stays.count()),
            ("Sorties", Hospitalization.objects.filter(**month_filter("discharge_date", year, month)).count()),
        ]
    interventions = Intervention.objects.filter(**month_filter("date", year, month))
    return [
        ("Interventions", interventions.count()),
        ("Interventions terminées", interventions.filter(status="Terminée").count()),
        ("Interventions critiques", interventions.filter(priority="Critique").count()),
    ]


def available_months():
    """Du premier mois d'activité enregistrée au mois courant, le plus récent d'abord."""
    today = timezone.localdate()
    first = Admission.objects.order_by("created_at").values_list("created_at", flat=True).first()
    start = timezone.localtime(first).date() if first else today
    months, (year, month) = [], (today.year, today.month)
    while (year, month) >= (start.year, start.month) and len(months) < 24:
        months.append((year, month))
        year, month = (year - 1, 12) if month == 1 else (year, month - 1)
    return months


def build_report(kind, year, month, today):
    current = (year, month) == (today.year, today.month)
    last_day = date(year, month, calendar.monthrange(year, month)[1])
    title, service, author = TYPES[kind]
    return {
        "id": f"{kind}-{year}-{month:02d}",
        "title": title,
        "type": kind,
        "service": service,
        "period": label(year, month),
        "author": author,
        "status": "En cours" if current else "Disponible",
        "date": (today if current else last_day).strftime("%d/%m/%Y"),
        "figures": [{"label": name, "value": value} for name, value in figures(kind, year, month)],
    }


def service_activity(year, month):
    admissions = Admission.objects.filter(**month_filter("created_at", year, month))
    counts = Counter(admissions.values_list("service_name", flat=True))
    total = sum(counts.values())
    return [
        {"service": service, "value": round(100 * n / total), "reports": n}
        for service, n in counts.most_common(6)
    ] if total else []


def overview(period=None):
    today = timezone.localdate()
    months = available_months()
    reports = [build_report(kind, year, month, today) for year, month in months for kind in TYPES]
    available = sum(1 for report in reports if report["status"] == "Disponible")
    periods = [label(year, month) for year, month in months]
    selected = next(((y, m) for y, m in months if label(y, m) == period), months[0])
    return {
        "stats": {
            "total": len(reports),
            "available": available,
            "inProgress": len(reports) - available,
            "rate": round(100 * available / len(reports)) if reports else 0,
        },
        "periods": periods,
        "reports": reports,
        "serviceStats": service_activity(*selected),
    }
