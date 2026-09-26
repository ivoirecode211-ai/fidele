"""Analyse automatique : règles cliniques appliquées aux constantes réelles.

Ce n'est pas un modèle d'apprentissage : chaque alerte correspond à un seuil
médical explicite, ce qui la rend vérifiable par le soignant.
"""
from datetime import timedelta

from django.utils import timezone

from parcours.models import Admission, VitalSigns
from parcours.services import age_from_birth_date

WINDOW_DAYS = 7
LONG_WAIT = timedelta(hours=2)


def patient_label(patient):
    return f"Patient : {patient.last_name} {patient.first_names} ({age_from_birth_date(patient.birth_date)} ans)"


def rules(vitals):
    """(type, titre) pour chaque seuil dépassé, du plus grave au moins grave."""
    alerts = []
    if vitals.oxygen is not None and vitals.oxygen < 92:
        alerts.append(("danger", "Désaturation en oxygène"))
    if vitals.glucose is not None and vitals.glucose > 1.26:
        alerts.append(("danger", "Suspicion de diabète"))
    if (vitals.systolic or 0) >= 140 or (vitals.diastolic or 0) >= 90:
        alerts.append(("warning", "Risque d'hypertension détecté"))
    if vitals.temperature is not None and vitals.temperature >= 38.5:
        alerts.append(("warning", "Fièvre élevée"))
    return alerts


def suggestions():
    since = timezone.now() - timedelta(days=WINDOW_DAYS)
    rows, seen = [], set()
    latest = VitalSigns.objects.filter(recorded_at__gte=since).select_related("admission__patient")
    for vitals in latest:  # du plus récent au plus ancien
        if vitals.admission_id in seen:
            continue
        seen.add(vitals.admission_id)
        for kind, title in rules(vitals):
            rows.append({"type": kind, "title": title, "patient": patient_label(vitals.admission.patient),
                         "at": vitals.recorded_at})
    waiting = Admission.objects.filter(
        sent_to_consultation_at__lte=timezone.now() - LONG_WAIT,
    ).exclude(statut="Terminée").select_related("patient")
    for admission in waiting:
        rows.append({"type": "info", "title": "Attente prolongée avant consultation",
                     "patient": patient_label(admission.patient), "at": admission.sent_to_consultation_at})
    order = {"danger": 0, "warning": 1, "info": 2, "success": 3}
    rows.sort(key=lambda row: (order[row["type"]], -row["at"].timestamp()))
    return [{"id": index, "type": row["type"], "title": row["title"], "patient": row["patient"]}
            for index, row in enumerate(rows, start=1)]


def analysis():
    """Patients analysés par jour ; la prédiction est la moyenne des 3 jours précédents."""
    today = timezone.localdate()
    days = [today - timedelta(days=offset) for offset in range(WINDOW_DAYS + 2, -1, -1)]
    counts = {day: 0 for day in days}
    for recorded in VitalSigns.objects.filter(recorded_at__date__gte=days[0]).values_list("recorded_at", flat=True):
        day = timezone.localtime(recorded).date()
        if day in counts:
            counts[day] += 1
    series = [counts[day] for day in days]
    rows = []
    for index in range(3, len(days)):
        rows.append({
            "date": days[index].strftime("%d/%m"),
            "reel": series[index],
            "prediction": round(sum(series[index - 3:index]) / 3, 1),
        })
    return rows[-WINDOW_DAYS:]


MODELS = [
    {"id": 1, "name": "Diagnostic médical", "status": "Actif", "icon": "Stethoscope"},
    {"id": 2, "name": "Prédiction des risques", "status": "Actif", "icon": "TrendingUp"},
    {"id": 3, "name": "Analyse d'images", "status": "Non disponible", "icon": "ImageIcon"},
    {"id": 4, "name": "Assistant conversationnel", "status": "Non disponible", "icon": "MessageCircle"},
]


def overview():
    return {"suggestions": suggestions(), "analysis": analysis(), "models": MODELS}
