"""Ce que le patient voit de son dossier, et ce qu'il peut y faire.

Ce qui lui revient : ses consultations (date, médecin, motif, diagnostic,
traitement, conseils, prochaine consultation), ses ordonnances et leur
posologie, ses rendez-vous, ses allergies et son groupe sanguin.
Ce qui reste interne : les notes et observations cliniques, le formulaire
détaillé du médecin, les propositions de l'assistant IA, et les
consultations confidentielles (VIH), qui ne s'affichent pas dans le portail.
"""
import re
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from appointments.models import Appointment
from consultations.models import Consultation
from prescriptions.models import Prescription

from .models import Conversation, Intake, Message, Reminder

# Spécialités jamais exposées au patient par le portail (confidentialité).
CONFIDENTIELLES = {"vih"}
# Spécialités dont le « diagnostic » est l'intitulé du programme de suivi.
PROGRAMMES = {"cpn", "vaccination", "pf", "planification-familiale", "dialyse", "cpon", "cps"}


def nom_complet(user):
    if user is None:
        return ""
    return f"{user.first_name} {user.last_name.upper()}".strip() or user.username


def docteur(user):
    return f"Dr {nom_complet(user)}" if user else ""


def specialite_de(consultation):
    code = getattr(consultation, "specialite", "") or ""
    try:
        from consultations.specialites import nom
        return code, nom(code)
    except Exception:  # module absent ou code inconnu : on garde le code tel quel
        return code, code.replace("-", " ").capitalize() if code else "Consultation"


def consultations_visibles(patient):
    rows = (Consultation.objects.filter(patient=patient)
            .select_related("doctor").prefetch_related("prescription__items").order_by("-date_time"))
    return [c for c in rows if (getattr(c, "specialite", "") or "") not in CONFIDENTIELLES]


def date_heure(value):
    return timezone.localtime(value).strftime("%d/%m/%Y à %H:%M") if value else ""


def ordonnance(prescription):
    if prescription is None:
        return None
    return {
        "id": prescription.pk,
        "date": prescription.date.strftime("%d/%m/%Y"),
        "status": prescription.get_status_display(),
        "instructions": prescription.instructions,
        "items": [
            {"id": item.pk, "medicine": item.medicine, "dose": item.dose, "frequency": item.frequency,
             "duration": item.duration, "quantity": item.quantity, "route": item.instructions}
            for item in prescription.items.all()
        ],
    }


def dossier(patient):
    consultations = []
    for c in consultations_visibles(patient):
        code, specialite = specialite_de(c)
        consultations.append({
            "id": c.pk,
            "date": date_heure(c.date_time),
            "dateIso": c.date_time.isoformat(),
            "doctor": docteur(c.doctor),
            "doctorId": c.doctor_id,
            "specialite": specialite,
            "programme": code in PROGRAMMES,
            "reason": c.reason,
            "diagnosis": c.diagnosis,
            "treatment": c.treatment,
            "recommendations": c.recommendations,
            "nextConsultation": c.next_consultation.strftime("%d/%m/%Y") if c.next_consultation else "",
            "completed": c.completed_at is not None,
            "prescription": ordonnance(getattr(c, "prescription", None)),
        })
    return {
        "patient": identite(patient),
        "consultations": consultations,
    }


def identite(patient):
    return {
        "code": patient.patient_number,
        "lastName": patient.last_name,
        "firstNames": patient.first_names,
        "fullName": f"{patient.first_names} {patient.last_name}".strip(),
        "sex": patient.get_sex_display(),
        "birthDate": patient.birth_date.strftime("%d/%m/%Y") if patient.birth_date else "",
        "phone": patient.phone,
        "bloodGroup": patient.blood_group,
        "allergies": patient.allergies,
        "insurance": patient.insurance,
        "hospital": patient.hospital.name if patient.hospital_id else "",
        "hospitalPhone": patient.hospital.phone if patient.hospital_id else "",
    }


# ------------------------------------------------------------------ rendez-vous

def rendez_vous(patient):
    now = timezone.now()
    rows = Appointment.objects.filter(patient=patient).select_related("professional").order_by("date_time")
    def ligne(a):
        return {
            "id": a.pk,
            "date": timezone.localtime(a.date_time).strftime("%d/%m/%Y"),
            "time": timezone.localtime(a.date_time).strftime("%H:%M"),
            "dateIso": a.date_time.isoformat(),
            "doctor": docteur(a.professional),
            "service": a.service,
            "reason": a.reason,
            "status": a.get_status_display().capitalize(),
            "cancelled": a.status in ("CANCELLED", "ABSENT"),
        }
    upcoming = [ligne(a) for a in rows if a.date_time >= now and a.status not in ("CANCELLED", "DONE", "ABSENT")]
    past = [ligne(a) for a in rows.reverse() if a.date_time < now or a.status in ("CANCELLED", "DONE", "ABSENT")][:30]
    return {"upcoming": upcoming, "past": past}


# ------------------------------------------------------------------ médicaments et rappels

HEURES_PAR_PRISES = {
    1: ["08:00"],
    2: ["08:00", "20:00"],
    3: ["07:00", "13:00", "20:00"],
    4: ["06:00", "12:00", "18:00", "22:00"],
}


def prises_par_jour(texte):
    """« 1 comprimé / 2x / jour », « 3 fois par jour », « matin et soir » -> 2, 3, 2…"""
    t = (texte or "").lower()
    trouve = re.search(r"(\d+)\s*(?:x|fois)", t)
    if trouve:
        return max(1, min(int(trouve.group(1)), 6))
    moments = sum(mot in t for mot in ("matin", "midi", "soir", "nuit", "coucher"))
    if moments:
        return moments
    if re.search(r"toutes les\s*(\d+)\s*h", t):
        return max(1, min(24 // int(re.search(r"toutes les\s*(\d+)\s*h", t).group(1)), 6))
    return 1


def duree_jours(texte):
    trouve = re.search(r"(\d+)\s*(jour|j\b|semaine|mois)", (texte or "").lower())
    if not trouve:
        return None
    n, unite = int(trouve.group(1)), trouve.group(2)
    return n * 7 if unite.startswith("semaine") else n * 30 if unite == "mois" else n


def heures_proposees(item):
    n = prises_par_jour(f"{item.dose} {item.frequency}")
    return HEURES_PAR_PRISES.get(n) or [f"{6 + i * (16 // n):02d}:00" for i in range(n)]


def rappel_data(reminder, today=None):
    today = today or timezone.localdate()
    pris = {(i.date, i.time) for i in reminder.intakes.all() if i.taken_at}
    return {
        "id": reminder.pk,
        "medicine": reminder.medicine,
        "dose": reminder.dose,
        "times": reminder.times,
        "startDate": reminder.start_date.isoformat(),
        "endDate": reminder.end_date.isoformat() if reminder.end_date else "",
        "active": reminder.active,
        "itemId": reminder.prescription_item_id,
        "today": [{"time": t, "taken": (today, t) in pris} for t in reminder.times]
        if reminder.active and reminder.start_date <= today and (not reminder.end_date or reminder.end_date >= today)
        else [],
    }


def medicaments(patient):
    """Les ordonnances en cours et récentes, avec la posologie et le rappel de chaque médicament."""
    visibles = {c.pk for c in consultations_visibles(patient)}
    prescriptions = (Prescription.objects.filter(patient=patient)
                     .filter(Q(consultation__isnull=True) | Q(consultation__in=visibles))
                     .select_related("doctor").prefetch_related("items").order_by("-date", "-id")[:20])
    reminders = {r.prescription_item_id: r for r in
                 Reminder.objects.filter(patient=patient).prefetch_related("intakes")}
    today = timezone.localdate()
    ordonnances = []
    for p in prescriptions:
        items = []
        for item in p.items.all():
            jours = duree_jours(item.duration)
            reminder = reminders.get(item.pk)
            items.append({
                "id": item.pk, "medicine": item.medicine, "dose": item.dose, "frequency": item.frequency,
                "duration": item.duration, "quantity": item.quantity, "route": item.instructions,
                "suggestedTimes": heures_proposees(item),
                "endDate": (p.date + timedelta(days=jours)).isoformat() if jours else "",
                "reminder": rappel_data(reminder, today) if reminder else None,
            })
        ordonnances.append({"id": p.pk, "date": p.date.strftime("%d/%m/%Y"), "doctor": docteur(p.doctor),
                            "status": p.get_status_display(), "instructions": p.instructions, "items": items})
    libres = [rappel_data(r, today) for r in reminders.values() if r.prescription_item_id is None]
    return {"ordonnances": ordonnances, "rappelsLibres": libres}


def heures_valides(times):
    propres = sorted({t for t in times if re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", str(t))})
    if not propres:
        raise ValueError("Choisissez au moins une heure de prise.")
    return propres[:8]


@transaction.atomic
def programmer_rappel(*, patient, item, times, end_date=None, active=True):
    reminder, _ = Reminder.objects.update_or_create(
        patient=patient, prescription_item=item,
        defaults={"medicine": item.medicine, "dose": item.dose, "times": heures_valides(times),
                  "end_date": end_date or None, "active": active},
    )
    return reminder


def marquer_prise(*, reminder, time):
    intake, _ = Intake.objects.get_or_create(reminder=reminder, date=timezone.localdate(), time=time)
    intake.taken_at = intake.taken_at or timezone.now()
    intake.save(update_fields=["taken_at"])
    return intake


def prises_du_jour(patient):
    today = timezone.localdate()
    reminders = (Reminder.objects.filter(patient=patient, active=True, start_date__lte=today)
                 .filter(Q(end_date__isnull=True) | Q(end_date__gte=today)).prefetch_related("intakes"))
    return sorted(
        ({"reminderId": r.pk, "medicine": r.medicine, "dose": r.dose, **prise}
         for r in reminders for prise in rappel_data(r, today)["today"]),
        key=lambda row: row["time"],
    )


def rappels_a_envoyer(now=None):
    """Prises dont l'heure est venue (dans les 10 dernières minutes) et pas encore notifiées."""
    now = timezone.localtime(now or timezone.now())
    today = now.date()
    window = {(now - timedelta(minutes=m)).strftime("%H:%M") for m in range(0, 10)}
    reminders = (Reminder.objects.filter(active=True, start_date__lte=today)
                 .filter(Q(end_date__isnull=True) | Q(end_date__gte=today)).select_related("patient"))
    for reminder in reminders:
        for time in reminder.times:
            if time not in window:
                continue
            intake, _ = Intake.objects.get_or_create(reminder=reminder, date=today, time=time)
            if intake.notified_at is None and intake.taken_at is None:
                yield reminder, intake


# ------------------------------------------------------------------ messagerie

def medecins_du_patient(patient):
    """Les médecins qui l'ont consulté : ce sont eux qu'il peut écrire."""
    doctors = {}
    for c in consultations_visibles(patient):
        doctors.setdefault(c.doctor_id, c)
    return doctors  # {doctor_id: dernière consultation}


def message_data(message):
    return {
        "id": message.pk,
        "fromPatient": message.from_patient,
        "text": message.text,
        "sentAt": date_heure(message.sent_at),
        "sentAtIso": message.sent_at.isoformat(),
        "read": message.read_at is not None,
    }


def fils_du_patient(patient):
    conversations = {c.doctor_id: c for c in
                     Conversation.objects.filter(patient=patient).prefetch_related("messages")}
    fils = []
    for doctor_id, derniere in medecins_du_patient(patient).items():
        conv = conversations.get(doctor_id)
        messages = list(conv.messages.all()) if conv else []
        dernier = messages[-1] if messages else None
        _, specialite = specialite_de(derniere)
        fils.append({
            "doctorId": doctor_id,
            "doctor": docteur(derniere.doctor),
            "specialite": specialite,
            "lastConsultation": timezone.localtime(derniere.date_time).strftime("%d/%m/%Y"),
            "lastMessage": message_data(dernier) if dernier else None,
            "unread": sum(1 for m in messages if not m.from_patient and m.read_at is None),
        })
    return sorted(fils, key=lambda f: (f["lastMessage"] or {}).get("sentAtIso", ""), reverse=True)


def conversation(patient, doctor_id):
    if doctor_id not in medecins_du_patient(patient):
        return None
    conv, _ = Conversation.objects.get_or_create(patient=patient, doctor_id=doctor_id)
    return conv


@transaction.atomic
def ecrire(*, conversation, text, from_patient):
    text = (text or "").strip()
    if not text:
        raise ValueError("Le message est vide.")
    message = Message.objects.create(conversation=conversation, text=text[:2000], from_patient=from_patient)
    conversation.updated_at = message.sent_at
    conversation.save(update_fields=["updated_at"])
    return message


def lire(conversation, *, by_patient):
    """Marque lus les messages reçus par celui qui ouvre le fil."""
    conversation.messages.filter(from_patient=not by_patient, read_at__isnull=True).update(read_at=timezone.now())
