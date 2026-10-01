"""Détail d'un rapport : chaque événement de la période, ligne par ligne."""
from collections import Counter

from django.utils import timezone

from administration.models import AuditLog
from appointments.models import Appointment
from consultations.models import Consultation
from hospitalization.models import Hospitalization
from hygiene.models import CleaningTask
from laboratory.models import LabRequest
from maintenance.models import Intervention
from parcours.models import Admission, VitalSigns
from parcours.services import doctor_label
from prescriptions.models import Prescription
from stocks.models import Movement

from .services import MONTHS, TYPES, figures, label, month_filter


def when(value):
    return timezone.localtime(value).strftime("%d/%m/%Y %H:%M") if value else "—"


def name(patient):
    return f"{patient.last_name} {patient.first_names}"


def person(user):
    if user is None:
        return "—"
    return f"{user.last_name.upper()} {user.first_name}".strip() or user.username


def money(value):
    return f"{int(value or 0):,}".replace(",", " ")


def value(v, unit=""):
    return "—" if v is None else f"{v:g}{unit}" if isinstance(v, float) else f"{v}{unit}"


def section(title, columns, rows):
    return {"title": title, "columns": columns, "rows": rows}


def admissions_section(year, month, hospital):
    rows = [[when(a.created_at), a.reference or "—", name(a.patient), a.service_name,
             a.insurance_name or "—", money(a.service_price), money(a.cost),
             "Annulé" if a.cancelled_at else a.get_payment_status_display(), person(a.created_by)]
            for a in Admission.objects.of_hospital(hospital).filter(**month_filter("created_at", year, month))
            .select_related("patient", "created_by").order_by("created_at")]
    return section("Passages en caisse", ["Date", "Ticket", "Patient", "Prestation", "Assurance",
                                          "Tarif (FCFA)", "Part patient (FCFA)", "Paiement", "Agent"], rows)


def vitals_section(year, month, hospital):
    rows = []
    for v in (VitalSigns.objects.filter(admission__patient__hospital=hospital, **month_filter("recorded_at", year, month))
              .select_related("admission__patient", "recorded_by").order_by("recorded_at")):
        tension = f"{v.systolic}/{v.diastolic}" if v.systolic and v.diastolic else "—"
        rows.append([when(v.recorded_at), name(v.admission.patient),
                     value(float(v.temperature), " °C") if v.temperature is not None else "—", tension,
                     value(v.pulse, " bpm"), value(v.oxygen, " %"), value(v.respiratory_rate, "/min"),
                     value(float(v.glucose), " g/L") if v.glucose is not None else "—",
                     value(float(v.weight), " kg") if v.weight is not None else "—", v.notes or "—",
                     person(v.recorded_by)])
    return section("Prises de constantes", ["Date", "Patient", "Température", "Tension", "Pouls", "SpO₂",
                                            "Respiration", "Glycémie", "Poids", "Note", "Infirmier"], rows)


def consultations_section(year, month, hospital):
    rows = [[when(c.completed_at), name(c.patient), doctor_label(c.doctor), c.symptoms or "—",
             c.diagnosis or "—", (c.treatment or "—").replace("\n", " ; ")]
            for c in Consultation.objects.filter(patient__hospital=hospital, **month_filter("completed_at", year, month))
            .select_related("patient", "doctor").order_by("completed_at")]
    return section("Consultations validées", ["Date", "Patient", "Médecin", "Symptômes", "Diagnostic",
                                              "Traitement"], rows)


def prescriptions_section(year, month, hospital):
    status = dict(Prescription.STATUS_CHOICES)
    rows = [[when(p.consultation.completed_at if p.consultation_id else None), name(p.patient),
             doctor_label(p.doctor), " ; ".join(i.medicine for i in p.items.all()), status[p.status],
             when(p.served_at), person(p.served_by)]
            for p in Prescription.objects.filter(consultation__isnull=False, patient__hospital=hospital,
                                                 **month_filter("consultation__completed_at", year, month))
            .select_related("patient", "doctor", "consultation", "served_by").prefetch_related("items")]
    return section("Ordonnances", ["Prescrite le", "Patient", "Médecin", "Médicaments", "Statut",
                                   "Servie le", "Pharmacien"], rows)


def lab_section(year, month, hospital):
    rows = []
    for r in (LabRequest.objects.filter(admission__patient__hospital=hospital, **month_filter("requested_at", year, month))
              .select_related("admission__patient", "completed_by").prefetch_related("results__exam")):
        results = " ; ".join(f"{x.exam.name} : {x.result or '—'} {x.exam.unit}".strip() for x in r.results.all())
        rows.append([when(r.requested_at), name(r.admission.patient), results or "—", r.status,
                     when(r.completed_at), person(r.completed_by)])
    return section("Analyses de laboratoire", ["Demandée le", "Patient", "Examens et résultats", "Statut",
                                               "Terminée le", "Laborantin"], rows)


def hospitalization_section(year, month, hospital):
    rows = [[when(h.admission_date), name(h.patient), f"{h.bed.room.name} / {h.bed.number}",
             h.reason or "—", doctor_label(h.doctor) if h.doctor else "—",
             h.planned_discharge.strftime("%d/%m/%Y") if h.planned_discharge else "—", when(h.discharge_date)]
            for h in Hospitalization.objects.filter(patient__hospital=hospital, **month_filter("admission_date", year, month))
            .select_related("patient", "bed__room", "doctor")]
    return section("Hospitalisations", ["Admission", "Patient", "Chambre / lit", "Motif", "Médecin",
                                        "Sortie prévue", "Sortie"], rows)


def appointments_section(year, month, hospital):
    labels = dict(Appointment.STATUS)
    rows = [[when(a.date_time), name(a.patient), doctor_label(a.professional), a.service, a.reason,
             labels.get(a.status, a.status).capitalize()]
            for a in Appointment.objects.filter(patient__hospital=hospital, **month_filter("date_time", year, month))
            .select_related("patient", "professional")]
    return section("Rendez-vous", ["Date", "Patient", "Médecin", "Service", "Motif", "Statut"], rows)


def stock_section(year, month, hospital):
    rows = [[m.date.strftime("%d/%m/%Y"), m.reference, m.product.name, m.type, m.quantity, m.stock_after,
             m.motif, m.patient or m.supplier or "—", person(m.user)]
            for m in Movement.objects.filter(product__hospital=hospital, **month_filter("date", year, month))
            .select_related("product", "user").order_by("date", "id")]
    return section("Mouvements de stock", ["Date", "Référence", "Produit", "Type", "Quantité", "Stock après",
                                           "Motif", "Patient / fournisseur", "Utilisateur"], rows)


def maintenance_section(year, month, hospital):
    rows = [[i.date.strftime("%d/%m/%Y"), i.equipment.name, i.type, i.priority, i.status, i.technician,
             i.description or "—"]
            for i in Intervention.objects.filter(equipment__hospital=hospital, **month_filter("date", year, month)).select_related("equipment")]
    return section("Interventions de maintenance", ["Date", "Équipement", "Type", "Priorité", "Statut",
                                                    "Technicien", "Description"], rows)


def hygiene_section(year, month, hospital):
    rows = [[t.date.strftime("%d/%m/%Y"), t.hour.strftime("%H:%M"), t.zone, t.type, t.responsible, t.status]
            for t in CleaningTask.objects.filter(hospital=hospital, **month_filter("date", year, month)).order_by("date", "hour")]
    return section("Tâches d'hygiène", ["Date", "Heure", "Zone", "Type", "Responsable", "Statut"], rows)


def audit_section(year, month, hospital):
    logs = AuditLog.objects.filter(user__hospital=hospital, **month_filter("created_at", year, month))
    by_user = Counter((log.username or "Anonyme", log.module) for log in logs)
    rows = [[user, module, count] for (user, module), count in by_user.most_common()]
    failures = logs.filter(success=False).count()
    return section(f"Journal d'audit — actions par utilisateur ({failures} échec(s))",
                   ["Utilisateur", "Module", "Actions"], rows)


SECTIONS = {
    "Activité": [admissions_section, vitals_section, consultations_section, prescriptions_section, lab_section,
                 hospitalization_section, appointments_section, stock_section, maintenance_section,
                 hygiene_section, audit_section],
    "Consultations": [vitals_section, consultations_section, prescriptions_section, lab_section],
    "Finances": [admissions_section],
    "Stocks": [prescriptions_section, stock_section],
    "Hospitalisation": [hospitalization_section],
    "Maintenance": [maintenance_section],
}


def parse(report_id):
    """« Activité-2026-09 » -> (« Activité », 2026, 9)."""
    kind, year, month = report_id.rsplit("-", 2)
    if kind not in TYPES:
        raise ValueError(report_id)
    return kind, int(year), int(month)


def report_detail(report_id, hospital):
    kind, year, month = parse(report_id)
    title, service, author = TYPES[kind]
    return {
        "id": report_id,
        "title": title,
        "period": label(year, month),
        "service": service,
        "author": author,
        "generatedAt": timezone.localtime().strftime("%d/%m/%Y %H:%M"),
        "figures": [{"label": n, "value": v} for n, v in figures(kind, year, month, hospital)],
        "sections": [build(year, month, hospital) for build in SECTIONS[kind]],
    }
