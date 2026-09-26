from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from parcours.models import Admission
from parcours.services import doctor_label

from .models import LabExam, LabRequest, LabResult

WORKLIST_DAYS = 7


def lab_code(admission):
    return f"LAB-{admission.pk:03d}"


def serialize_exam(exam, result=None):
    return {
        "id": exam.code,
        "name": exam.name,
        "category": exam.category,
        "price": float(result.price if result else exam.price),
        "result": result.result if result else "",
        "unit": exam.unit,
        "reference": exam.reference,
    }


def serialize_analysis(admission):
    request = getattr(admission, "lab_request", None)
    results = list(request.results.select_related("exam")) if request else []
    consultation = getattr(admission, "consultation", None)
    when = timezone.localtime(request.requested_at if request else admission.created_at)
    total = sum(float(item.price) for item in results)
    summary = " | ".join(
        f"{item.exam.name}: {item.result} {item.exam.unit}".strip() for item in results if item.result
    )
    return {
        "id": lab_code(admission),
        "admissionId": admission.pk,
        "patient": f"{admission.patient.last_name} {admission.patient.first_names}",
        "type": "—" if not results else results[0].exam.name if len(results) == 1 else f"{len(results)} examens",
        "date": when.strftime("%d/%m/%Y"),
        "heure": when.strftime("%H:%M"),
        "medecin": doctor_label(consultation.doctor) if consultation else "—",
        "statut": request.status if request else "En attente",
        "priorite": request.priority if request else "Normale",
        "resultat": summary,
        "observation": request.observation if request else "",
        "caisse": {
            "numero": f"FAC-{timezone.localtime(admission.created_at):%Y}-{admission.pk:05d}",
            "date": timezone.localtime(admission.created_at).strftime("%d/%m/%Y"),
            "montant": total,
            "montantPaye": 0,
            "reste": total,
            "modePaiement": "À régler en caisse",
        },
        "examens": [serialize_exam(item.exam, item) for item in results],
    }


def worklist():
    since = timezone.now() - timedelta(days=WORKLIST_DAYS)
    admissions = (
        Admission.objects.encaissees().filter(created_at__gte=since)
        | Admission.objects.filter(lab_request__isnull=False)
    ).distinct().select_related("patient", "consultation__doctor", "lab_request").order_by("-created_at")
    return [serialize_analysis(admission) for admission in admissions]


@transaction.atomic
def save_request(*, admission, exam_codes, user):
    """Choix des examens : les résultats déjà saisis sont conservés."""
    exams = list(LabExam.objects.filter(code__in=exam_codes, active=True))
    request, _ = LabRequest.objects.get_or_create(admission=admission, defaults={"requested_by": user})
    request.results.exclude(exam__in=exams).delete()
    existing = set(request.results.values_list("exam_id", flat=True))
    LabResult.objects.bulk_create(
        LabResult(request=request, exam=exam, price=exam.price) for exam in exams if exam.pk not in existing
    )
    request.status = "En attente"
    request.completed_at = None
    request.save(update_fields=["status", "completed_at"])
    return request


@transaction.atomic
def save_results(*, request, values, observation, user):
    for item in request.results.select_related("exam"):
        item.result = str(values.get(item.exam.code, "")).strip()
        item.save(update_fields=["result"])
    request.observation = observation.strip()
    request.status = "Terminée"
    request.completed_by = user
    request.completed_at = timezone.now()
    request.save()
    return request
