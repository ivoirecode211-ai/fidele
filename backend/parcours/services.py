import re
import secrets
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.tenancy import hospital_of
from patients.models import Patient

from .models import Admission, VitalSigns

# Ni I, ni O, ni 0, ni 1 : un numéro se lit au téléphone et se recopie à la main.
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def next_patient_number(hospital):
    """P + année sur 2 chiffres + 3 caractères mêlant lettres et chiffres + code de l'hôpital.

    Exemple : P25F46TSB. Le tirage est aléatoire ; l'unicité reste garantie par
    la contrainte en base, ceci lui évite seulement de rejeter l'enregistrement.
    """
    prefix, suffix = f"P{timezone.localdate():%y}", hospital.code
    for _ in range(200):
        middle = [secrets.choice(ALPHABET) for _ in range(3)]
        # Un vrai mélange : au moins une lettre et au moins un chiffre.
        if not any(c.isdigit() for c in middle) or not any(c.isalpha() for c in middle):
            continue
        number = f"{prefix}{''.join(middle)}{suffix}"
        if not Patient.objects.filter(patient_number=number).exists():
            return number
    raise IntegrityError("Impossible de générer un numéro de dossier libre pour cette année.")


def birth_date_from_age(age):
    """Même calcul que calculateBirthDate() côté Caisse."""
    today = timezone.localdate()
    try:
        return today.replace(year=today.year - age)
    except ValueError:  # 29 février
        return today.replace(year=today.year - age, day=28)


def age_from_birth_date(birth_date):
    if birth_date is None:
        return None
    today = timezone.localdate()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


def open_admission(*, patient, data, user):
    """Passage en caisse d'un patient : « à payer », ou « pris en charge » si l'assurance couvre tout."""
    from .caisse import Duplicate, recent_duplicate, ticket_reference

    service = data["service"]
    duplicate = recent_duplicate(patient, service)
    if duplicate is not None:
        raise Duplicate(duplicate)
    insurance = data.get("assuranceId")
    coverage = insurance.coverage if insurance else Decimal("0")
    quantity = int(data.get("quantite") or 1)
    price = service.price * quantity
    cost = (price - price * coverage / Decimal("100")).quantize(Decimal("0.01"))
    admission = Admission.objects.create(
        patient=patient,
        service=service,
        service_name=service.name,
        service_price=price,
        quantity=quantity,
        notes=data.get("notes", "").strip(),
        insurance=insurance,
        insurance_name=insurance.name if insurance else "",
        insurance_number=data.get("insuranceNumber", "").strip() if insurance else "",
        insurance_coverage=coverage,
        cost=cost,
        payment_status=Admission.INSURED if cost == 0 else Admission.UNPAID,
        created_by=user,
    )
    admission.reference = ticket_reference(admission)
    admission.save(update_fields=["reference"])
    return admission


def register_patient(*, data, user):
    """Nouveau dossier patient et son premier passage, en une seule transaction.
    Pour un patient déjà connu (data["patientId"]), seul un passage est ouvert."""
    insurance = data.get("assuranceId")
    existing = data.get("patientId")
    if existing is not None:
        with transaction.atomic():
            if insurance:
                existing.insurance = insurance.name
                existing.insurance_number = data.get("insuranceNumber", "").strip()
                existing.save(update_fields=["insurance", "insurance_number"])
            return open_admission(patient=existing, data=data, user=user)

    hospital = hospital_of(user)
    for _ in range(5):
        number = next_patient_number(hospital)
        try:
            with transaction.atomic():
                patient = Patient.objects.create(
                    hospital=hospital,
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
                return open_admission(patient=patient, data=data, user=user)
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
        if consultation and consultation.doctor_id != user.pk and not user.has_role("ADMIN"):
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
        from stocks.services import StockError, dispense

        try:
            dispense(prescription=prescription, user=user)
        except StockError as error:
            raise WorkflowError(str(error)) from error
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

    if user.is_platform:
        # La plateforme n'a pas de patients : rien ne l'attend dans un hôpital.
        return {"count": 0, "items": []}
    sees_all = user.has_role("ADMIN", "DIRECTOR")
    hospital = hospital_of(user)
    admissions = Admission.objects.of_hospital(hospital)
    items = []

    if sees_all or user.has_role("NURSE", "AIDE_SOIGNANT"):
        waiting = admissions.parcours_soins().filter(sent_to_consultation_at__isnull=True).count()
        items.append({
            "id": "vitals",
            "count": waiting,
            "label": "patient(s) en attente de constantes",
            "link": "/nursing",
        })

    if sees_all or user.has_role("DOCTOR"):
        if sees_all:
            queue = admissions.filter(sent_to_consultation_at__isnull=False)
        else:
            # La file du médecin : les patients de SES spécialités, et ceux qu'il a déjà pris.
            from consultations.medecine import admissions_du_medecin

            queue = admissions_du_medecin(user)
        queue = queue.exclude(statut="Terminée").exclude(consultation__completed_at__isnull=False)
        items.append({
            "id": "consultations",
            "count": queue.count(),
            "label": "patient(s) en attente de consultation",
            "link": "/consultations",
        })

    if user.has_role("DOCTOR") and not user.is_superuser:
        from portail.models import Message

        items.append({
            "id": "patient-messages",
            "count": Message.objects.filter(conversation__doctor=user, from_patient=True, read_at__isnull=True).count(),
            "label": "message(s) de patients non lu(s)",
            "link": "/consultations?vue=messages",
        })

    if sees_all or user.has_role("PHARMACY"):
        prescriptions = Prescription.objects.filter(consultation__admission__patient__hospital=hospital)
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

    if sees_all or user.has_role("LAB"):
        from laboratory.models import LabRequest

        items.append({
            "id": "lab",
            "count": LabRequest.objects.exclude(status="Terminée").filter(results__isnull=False).distinct().count(),
            "label": "analyse(s) en attente de résultat",
            "link": "/laboratory",
        })

    if sees_all or user.has_role("STOCK", "PHARMACY"):
        from django.db.models import F

        from stocks.models import Product

        items.append({
            "id": "stock",
            "count": Product.objects.filter(hospital=hospital, stock__lte=F("threshold")).count(),
            "label": "produit(s) sous le seuil d'alerte",
            "link": "/stocks",
        })

    items = [item for item in items if item["count"]]
    return {"count": sum(item["count"] for item in items), "items": items}
