"""Rapport d'activité d'un praticien : ce qu'il a fait, sur la période choisie.

Chacun voit le sien ; la direction et l'administrateur voient celui de tout
praticien de leur hôpital. Le contenu suit ce que la personne a réellement
fait : consultations pour le médecin, constantes pour l'infirmier, analyses
pour le laborantin, ordonnances servies pour le pharmacien.

Les consultations VIH restent confidentielles : leur diagnostic n'apparaît
que dans le rapport du praticien lui-même.
"""
from collections import Counter
from datetime import date

from django.contrib.auth import get_user_model
from django.utils import timezone

from appointments.models import Appointment
from consultations import specialites
from consultations.models import Consultation
from hospitalization.models import Hospitalization
from laboratory.models import LabRequest
from parcours.models import VitalSigns
from prescriptions.models import Prescription

from .detail import name, section, when

User = get_user_model()

ROLES_PRATICIENS = ("DOCTOR", "NURSE", "AIDE_SOIGNANT", "LAB", "PHARMACY")
DIRECTION = ("ADMIN", "DIRECTOR")
ISSUES = {"sortie": "Retour à domicile", "rdv": "Rendez-vous de contrôle", "hospitalisation": "Hospitalisation",
          "reference": "Référé", "deces": "Décès"}


def nom(user):
    return f"{user.last_name.upper()} {user.first_name}".strip() or user.username


def fiche(user):
    codes = user.specialites or ([specialites.GENERALE] if user.role == "DOCTOR" else [])
    return {
        "id": user.pk,
        "nom": nom(user),
        "role": user.get_role_display(),
        "poste": user.job_title,
        "specialites": [specialites.nom(c) for c in codes],
    }


def praticiens(hospital):
    """Les soignants de l'hôpital, ceux dont on peut sortir un rapport."""
    users = User.objects.filter(hospital=hospital, is_active=True, role__in=ROLES_PRATICIENS)
    return [fiche(u) for u in users.order_by("last_name", "first_name")]


def periode(du, au):
    """Dates reçues en AAAA-MM-JJ ; par défaut, le mois en cours jusqu'à aujourd'hui."""
    today = timezone.localdate()
    try:
        debut = date.fromisoformat(du) if du else today.replace(day=1)
        fin = date.fromisoformat(au) if au else today
    except ValueError:
        debut, fin = today.replace(day=1), today
    return (fin, debut) if debut > fin else (debut, fin)


def rapport(praticien, du, au, *, lecteur):
    debut, fin = periode(du, au)
    dans = lambda champ: {f"{champ}__date__range": (debut, fin)}  # noqa: E731
    soi = lecteur.pk == praticien.pk
    hopital = praticien.hospital

    consultations = list(Consultation.objects.filter(doctor=praticien, completed_at__isnull=False, **dans("completed_at"))
                         .select_related("patient").order_by("-completed_at"))
    ordonnances = Prescription.objects.filter(consultation__in=consultations)
    examens = LabRequest.objects.filter(admission__consultation__in=consultations)
    rdv = Appointment.objects.filter(professional=praticien, **dans("created_at"))
    sejours = Hospitalization.objects.filter(doctor=praticien, **dans("admission_date"))
    constantes = list(VitalSigns.objects.filter(recorded_by=praticien, **dans("recorded_at"))
                      .select_related("admission__patient").order_by("-recorded_at"))
    analyses = list(LabRequest.objects.filter(completed_by=praticien, **dans("completed_at"))
                    .select_related("admission__patient").prefetch_related("results__exam").order_by("-completed_at"))
    servies = list(Prescription.objects.filter(served_by=praticien, **dans("served_at"))
                   .select_related("patient").prefetch_related("items").order_by("-served_at"))
    messages = 0
    try:
        from portail.models import Message

        messages = Message.objects.filter(conversation__doctor=praticien, from_patient=True, **dans("sent_at")).count()
    except ImportError:
        pass

    def diagnostic(c):
        if c.specialite == "vih" and not soi:
            return "Confidentiel"
        return c.diagnosis or "—"

    figures, sections = [], []
    if consultations or praticien.role == "DOCTOR":
        figures += [
            ("Consultations", len(consultations)),
            ("Patients vus", len({c.patient_id for c in consultations})),
            ("Ordonnances prescrites", ordonnances.count()),
            ("Examens demandés", examens.count()),
            ("Rendez-vous fixés", rdv.count()),
            ("Hospitalisations décidées", sejours.count()),
        ]
        if messages:
            figures.append(("Messages de patients reçus", messages))
        par_specialite = Counter(specialites.nom(c.specialite or specialites.GENERALE) for c in consultations)
        diagnostics = Counter(diagnostic(c) for c in consultations if diagnostic(c) not in ("—", "Confidentiel"))
        if len(par_specialite) > 1:
            sections.append(section("Consultations par spécialité", ["Spécialité", "Consultations"],
                                     [[s, n] for s, n in par_specialite.most_common()]))
        if diagnostics:
            sections.append(section("Diagnostics les plus fréquents", ["Diagnostic", "Nombre"],
                                    [[d, n] for d, n in diagnostics.most_common(10)]))
        sections.append(section("Consultations", ["Date", "Patient", "Spécialité", "Diagnostic", "Issue"], [
            [when(c.completed_at), name(c.patient), specialites.nom(c.specialite or specialites.GENERALE),
             diagnostic(c), ISSUES.get(c.outcome, c.outcome or "—")] for c in consultations]))
    if constantes or praticien.role in ("NURSE", "AIDE_SOIGNANT"):
        figures += [("Prises de constantes", len(constantes)),
                    ("Patients reçus", len({v.admission.patient_id for v in constantes}))]
        sections.append(section("Constantes prises", ["Date", "Patient", "Température", "Tension", "Pouls", "SpO₂"], [
            [when(v.recorded_at), name(v.admission.patient),
             f"{v.temperature} °C" if v.temperature is not None else "—",
             f"{v.systolic}/{v.diastolic}" if v.systolic and v.diastolic else "—",
             f"{v.pulse} bpm" if v.pulse else "—", f"{v.oxygen} %" if v.oxygen else "—"] for v in constantes]))
    if analyses or praticien.role == "LAB":
        figures += [("Analyses rendues", len(analyses)),
                    ("Examens réalisés", sum(len(a.results.all()) for a in analyses))]
        sections.append(section("Analyses rendues", ["Date", "Patient", "Examens"], [
            [when(a.completed_at), name(a.admission.patient), " ; ".join(r.exam.name for r in a.results.all())]
            for a in analyses]))
    if servies or praticien.role == "PHARMACY":
        figures += [("Ordonnances servies", len(servies)),
                    ("Médicaments délivrés", sum(len(p.items.all()) for p in servies))]
        sections.append(section("Ordonnances servies", ["Date", "Patient", "Médicaments"], [
            [when(p.served_at), name(p.patient), " ; ".join(i.medicine for i in p.items.all())] for p in servies]))

    return {
        "praticien": fiche(praticien),
        "hopital": hopital.name if hopital else "",
        "du": debut.isoformat(),
        "au": fin.isoformat(),
        "periode": f"du {debut:%d/%m/%Y} au {fin:%d/%m/%Y}",
        "generatedAt": timezone.localtime().strftime("%d/%m/%Y %H:%M"),
        "figures": [{"label": n, "value": v} for n, v in figures],
        "sections": sections,
    }
