import re
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone

from patients.models import Patient

from .models import Admission, VitalSigns

SHORT_NUMBER = re.compile(r"^PAT-(\d+)$")


def next_patient_number():
    """PAT-001, PAT-002… : format attendu par la Caisse (numero = partie après « PAT- »)."""
    numbers = [
        int(match.group(1))
        for value in Patient.objects.filter(patient_number__regex=r"^PAT-[0-9]+$").values_list("patient_number", flat=True)
        if (match := SHORT_NUMBER.match(value))
    ]
    return f"PAT-{max(numbers, default=0) + 1:03d}"


def birth_date_from_age(age):
    """Même calcul que calculateBirthDate() côté Caisse."""
    today = timezone.localdate()
    try:
        return today.replace(year=today.year - age)
    except ValueError:  # 29 février
        return today.replace(year=today.year - age, day=28)


def age_from_birth_date(birth_date):
    today = timezone.localdate()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


def register_patient(*, data, user):
    """Crée le patient et son passage en caisse en une seule transaction."""
    service = data["service"]
    insurance = data.get("assuranceId")
    coverage = insurance.coverage if insurance else Decimal("0")
    price = service.price
    cost = price - price * coverage / Decimal("100")

    for _ in range(5):
        number = next_patient_number()
        try:
            with transaction.atomic():
                patient = Patient.objects.create(
                    patient_number=number,
                    last_name=data["nom"].strip().upper(),
                    first_names=data["prenom"].strip(),
                    sex=data["sexe"],
                    birth_date=data.get("dateNaissance") or birth_date_from_age(data["age"]),
                    phone=data["telephone"].strip(),
                    emergency_phone=data["parentContact"].strip(),
                    locality=data["quartier"].strip(),
                    insurance=insurance.name if insurance else "",
                    insurance_number=data.get("insuranceNumber", "").strip() if insurance else "",
                )
                return Admission.objects.create(
                    patient=patient,
                    service=service,
                    service_name=service.name,
                    service_price=price,
                    insurance=insurance,
                    insurance_name=insurance.name if insurance else "",
                    insurance_number=patient.insurance_number,
                    insurance_coverage=coverage,
                    cost=cost.quantize(Decimal("0.01")),
                    created_by=user,
                )
        except IntegrityError:
            # Deux caissiers ont obtenu le même numéro : on recalcule.
            # Toute autre violation de contrainte remonte telle quelle.
            if not Patient.objects.filter(patient_number=number).exists():
                raise
            continue
    raise IntegrityError("Impossible d'attribuer un numéro de patient.")


def record_vitals(*, admission, fields, user):
    """Enregistre les constantes et envoie le patient en Consultation (bouton « Enregistrer »)."""
    with transaction.atomic():
        admission = Admission.objects.select_for_update().get(pk=admission.pk)
        VitalSigns.objects.create(admission=admission, recorded_by=user, **fields)
        if admission.sent_to_consultation_at is None:
            admission.sent_to_consultation_at = timezone.now()
            admission.save(update_fields=["sent_to_consultation_at"])
    return admission


class WorkflowError(Exception):
    """Action refusée par l'état du parcours (message affiché tel quel)."""


def doctor_label(user):
    """« Dr. NOM Prénom » : format comparé par normalizeDoctorName() dans Consultations.jsx."""
    if user is None:
        return ""
    name = f"{user.last_name.upper()} {user.first_name}".strip()
    return f"Dr. {name or user.username}"


BULLET = re.compile(r"^\s*(?:[-•*]|\d+[.)])\s*")


def medicines_from_treatment(text):
    """Une ligne du champ « Traitement / Prescription » = un médicament."""
    lines = (BULLET.sub("", line).strip() for line in text.splitlines())
    return [line for line in lines if line]


def start_consultation(*, admission, user):
    """Bouton « Consulter » : le médecin prend le patient en charge."""
    from consultations.models import Consultation

    with transaction.atomic():
        admission = Admission.objects.select_for_update().select_related("patient").get(pk=admission.pk)
        if admission.sent_to_consultation_at is None:
            raise WorkflowError("Les constantes du patient n'ont pas encore été prises en Soins infirmiers.")
        consultation = Consultation.objects.filter(admission=admission).select_related("doctor").first()
        if consultation and consultation.doctor_id != user.pk and not user.is_superuser and user.role != "ADMIN":
            raise WorkflowError(f"Ce patient est déjà pris en charge par {doctor_label(consultation.doctor)}.")
        if consultation is None:
            Consultation.objects.create(
                admission=admission, patient=admission.patient, doctor=user, reason=admission.motif
            )
        if admission.statut != "Terminée":
            admission.statut = "En cours"
            admission.save(update_fields=["statut"])
    return admission


def validate_consultation(*, admission, data, user):
    """Bouton « VALIDER » : clôture la consultation et transmet l'ordonnance à la Pharmacie."""
    from prescriptions.models import Prescription, PrescriptionItem

    start_consultation(admission=admission, user=user)
    with transaction.atomic():
        admission = Admission.objects.select_for_update(of=("self",)).select_related("consultation").get(pk=admission.pk)
        consultation = admission.consultation
        treatment = data["traitement"].strip()
        prescription = Prescription.objects.filter(consultation=consultation).first()

        if prescription and prescription.status == "SERVED" and treatment != prescription.instructions:
            raise WorkflowError("L'ordonnance a déjà été servie par la Pharmacie : le traitement ne peut plus être modifié.")

        consultation.symptoms = data["symptomes"].strip()
        consultation.diagnosis = data["diagnostic"].strip()
        consultation.treatment = treatment
        consultation.observations = data["observations"].strip()
        consultation.completed_at = consultation.completed_at or timezone.now()
        consultation.save()

        # Traitement inchangé : l'ordonnance (et sa préparation éventuelle) reste telle quelle.
        if prescription is None or prescription.instructions != treatment:
            if prescription is not None:
                prescription.items.all().delete()
            medicines = medicines_from_treatment(treatment)
            if medicines:
                if prescription is None:
                    prescription = Prescription.objects.create(
                        consultation=consultation, patient=admission.patient, doctor=consultation.doctor
                    )
                prescription.instructions = treatment
                prescription.status = "TO_PREPARE"
                prescription.prepared_by = prescription.prepared_at = None
                prescription.save()
                PrescriptionItem.objects.bulk_create(
                    PrescriptionItem(prescription=prescription, medicine=medicine[:180]) for medicine in medicines
                )
            elif prescription is not None:
                prescription.delete()

        admission.statut = "Terminée"
        admission.save(update_fields=["statut"])
    return admission


def prepare_prescription(*, prescription, user):
    with transaction.atomic():
        prescription = type(prescription).objects.select_for_update().get(pk=prescription.pk)
        if prescription.status == "SERVED":
            raise WorkflowError("Cette ordonnance est déjà servie.")
        prescription.status = "READY"
        prescription.prepared_by = user
        prescription.prepared_at = timezone.now()
        prescription.save(update_fields=["status", "prepared_by", "prepared_at"])
    return prescription


def serve_prescription(*, prescription, user):
    with transaction.atomic():
        prescription = type(prescription).objects.select_for_update().get(pk=prescription.pk)
        if prescription.status == "SERVED":
            raise WorkflowError("Cette ordonnance est déjà servie.")
        prescription.status = "SERVED"
        prescription.served_by = user
        prescription.served_at = timezone.now()
        prescription.save(update_fields=["status", "served_by", "served_at"])
    return prescription


def notifications_for(user):
    """Ce qui attend une action de l'utilisateur, selon son rôle.

    Rien n'est stocké : les compteurs sont lus dans l'état réel du parcours.
    """
    from django.db.models import Q
    from prescriptions.models import Prescription

    role = "ADMIN" if user.is_superuser else user.role
    sees_all = role in {"ADMIN", "DIRECTOR"}
    items = []

    if sees_all or role == "NURSE":
        waiting = Admission.objects.filter(sent_to_consultation_at__isnull=True).count()
        items.append({
            "id": "vitals",
            "count": waiting,
            "label": "patient(s) en attente de constantes",
            "link": "/nursing",
        })

    if sees_all or role == "DOCTOR":
        queue = Admission.objects.filter(sent_to_consultation_at__isnull=False).exclude(statut="Terminée")
        if not sees_all:
            queue = queue.filter(
                Q(consultation__isnull=True) | Q(consultation__doctor=user)
            )
        items.append({
            "id": "consultations",
            "count": queue.count(),
            "label": "patient(s) en attente de consultation",
            "link": "/consultations",
        })

    if sees_all or role == "PHARMACY":
        prescriptions = Prescription.objects.filter(consultation__isnull=False)
        items.append({
            "id": "to-prepare",
            "count": prescriptions.filter(status="TO_PREPARE").count(),
            "label": "ordonnance(s) à préparer",
            "link": "/pharmacy",
        })
        items.append({
            "id": "ready",
            "count": prescriptions.filter(status="READY").count(),
            "label": "ordonnance(s) prête(s) à servir",
            "link": "/pharmacy",
        })

    items = [item for item in items if item["count"]]
    return {"count": sum(item["count"] for item in items), "items": items}
