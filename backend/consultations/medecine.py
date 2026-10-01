"""Médecine générale : la consultation en trois étapes, de la file d'attente à l'issue.

    interrogatoire   motif, histoire, antécédents (repris du dossier du patient),
                     et l'examen : état général, chaque appareil « normal » par défaut
    diagnostic       tests rapides, diagnostic retenu, examens au laboratoire
    traitement       ordonnance, conseils, et l'issue de la consultation

Le formulaire est enregistré tel quel dans `Consultation.form_data`, étape par
étape. À la clôture, il est traduit pour le reste de l'application : champs
texte de la consultation, ordonnance pour la Pharmacie, demande pour le
Laboratoire, rendez-vous pour l'Agenda, séjour pour l'Hospitalisation.
"""
import re
from datetime import datetime, time, timedelta

from django.db import transaction
from django.db.models import Prefetch, Q
from django.utils import timezone

from accounts.tenancy import hospital_of
from appointments.models import Appointment
from hospitalization.models import Bed, Room
from laboratory.models import LabExam, LabRequest
from parcours.models import Admission, Department, VitalSigns
from parcours.services import WorkflowError, age_from_birth_date, doctor_label, start_consultation
from prescriptions.models import Prescription, PrescriptionItem
from stocks.models import Product

from . import specialites
from .models import Consultation

ETAPES = ("interrogatoire", "diagnostic", "traitement")

APPAREILS = [
    ("cutane", "Cutanéo-muqueux"),
    ("cardio", "Cardio-vasculaire"),
    ("pulmo", "Pleuro-pulmonaire"),
    ("digestif", "Digestif"),
    ("neuro", "Neurologique"),
    ("osteo", "Ostéo-articulaire"),
    ("orl", "ORL"),
    ("ganglions", "Aires ganglionnaires"),
]

# Ce qui appartient au patient et non à la visite : saisi une fois, repris ensuite.
ANTECEDENTS = (
    "ant_hta", "ant_diabete", "ant_asthme", "ant_drepanocytose", "ant_medicaux", "ant_chirurgicaux",
    "ant_familiaux", "traitements_en_cours", "tabac", "alcool", "mode_vie",
)

ETATS_GENERAUX = {"bon": "Bon", "moyen": "Moyen", "altere": "Altéré"}
TDR = [("tdr_palu", "Paludisme"), ("tdr_vih", "VIH"), ("tdr_dengue", "Dengue"),
       ("tdr_covid", "COVID-19"), ("tdr_grossesse", "Grossesse"), ("goutte_epaisse", "goutte épaisse")]
RESULTATS_TDR = {"positif": "positif", "negatif": "négatif"}
ISSUES = dict(Consultation.OUTCOMES)
ATTENTE_JOURS = 7


class ErreursFormulaire(Exception):
    """Champs à corriger : { id du champ : message }, renvoyés tels quels au formulaire."""

    def __init__(self, erreurs):
        super().__init__("Formulaire incomplet")
        self.erreurs = erreurs


# ------------------------------------------------------------------
# Lecture
# ------------------------------------------------------------------

def age_texte(naissance):
    if naissance is None:
        return "Âge inconnu"
    ans = age_from_birth_date(naissance)
    if ans >= 2:
        return f"{ans} ans"
    aujourd_hui = timezone.localdate()
    mois = (aujourd_hui.year - naissance.year) * 12 + aujourd_hui.month - naissance.month
    mois -= aujourd_hui.day < naissance.day
    return f"{max(mois, 0)} mois"


def nombre(valeur):
    return float(valeur) if valeur is not None else None


def dernieres_constantes(admission):
    prises = list(admission.vitals.all())
    if not prises:
        return None
    v = prises[0]
    imc = None
    if v.weight and v.height:
        imc = round(float(v.weight) / (float(v.height) / 100) ** 2, 1)
    return {
        "temperature": nombre(v.temperature),
        "tension": f"{v.systolic}/{v.diastolic}" if v.systolic and v.diastolic else None,
        "pouls": v.pulse,
        "spo2": v.oxygen,
        "frequenceRespiratoire": v.respiratory_rate,
        "glycemie": nombre(v.glucose),
        "poids": nombre(v.weight),
        "taille": nombre(v.height),
        "imc": imc,
        "notes": v.notes,
        "prisesLe": timezone.localtime(v.recorded_at).isoformat(),
    }


def alertes(admission):
    from ia.services import rules

    prises = list(admission.vitals.all())
    return [{"niveau": niveau, "titre": titre} for niveau, titre in rules(prises[0])] if prises else []


def patient_de(admission):
    p = admission.patient
    return {
        "id": p.pk,
        "numero": p.patient_number,
        "nom": p.last_name,
        "prenoms": p.first_names,
        "nomComplet": f"{p.last_name} {p.first_names}",
        "sexe": p.sex,
        "age": age_from_birth_date(p.birth_date),
        "ageTexte": age_texte(p.birth_date),
        "naissance": p.birth_date.isoformat() if p.birth_date else "",
        "telephone": p.phone,
        "profession": p.profession,
        "groupeSanguin": p.blood_group,
        "allergies": p.allergies,
        "assurance": admission.insurance_name,
    }


def admissions_du_medecin(user):
    """Patients envoyés par les Soins infirmiers : la file commune, et les patients de ce médecin."""
    admissions = Admission.objects.of_hospital(hospital_of(user)).parcours_soins().filter(
        sent_to_consultation_at__isnull=False,
    ).select_related("patient", "service", "consultation__doctor").prefetch_related(
        Prefetch("vitals", queryset=VitalSigns.objects.order_by("-recorded_at", "-id"))
    )
    if user.has_role("DIRECTOR"):
        return admissions
    # La file du praticien : les patients envoyés vers ses spécialités, et ceux qu'il a déjà pris.
    codes = user.specialites or [specialites.GENERALE]
    de_ses_specialites = Q(service__specialite__in=codes)
    if specialites.GENERALE in codes:
        de_ses_specialites |= Q(service__specialite="")
    return admissions.filter(Q(consultation__doctor=user) | (Q(consultation__isnull=True) & de_ses_specialites))


def specialite_de(admission):
    """Le formulaire du patient : celui de la prestation payée en caisse."""
    code = admission.service.specialite
    return code if code in specialites.SPECIALITES else specialites.GENERALE


def a_des_donnees(consultation, admission):
    """Le médecin a-t-il déjà saisi quelque chose ? (« Poursuivre » plutôt que « Consulter »)."""
    if consultation is None or not consultation.form_data:
        return False
    initiales = valeurs_initiales(admission)
    return any(
        not cle.startswith("__") and valeur not in ("", None, [], {}) and initiales.get(cle) != valeur
        for cle, valeur in consultation.form_data.items()
    )


def ligne_de_file(admission):
    consultation = getattr(admission, "consultation", None)
    constantes = dernieres_constantes(admission)
    arrivee = admission.sent_to_consultation_at
    if consultation is None:
        statut = "attente"
    elif consultation.completed_at is None:
        statut = "en_cours"
    else:
        statut = "terminee"
    return {
        "admissionId": admission.pk,
        "patient": {
            "numero": admission.patient.patient_number,
            "nom": f"{admission.patient.last_name} {admission.patient.first_names}",
            "sexe": admission.patient.sex,
            "age": age_texte(admission.patient.birth_date),
        },
        "service": admission.service_name,
        "specialite": specialites.nom(consultation.specialite if consultation else specialite_de(admission)),
        "motif": (consultation.reason if consultation and consultation.reason else admission.motif),
        "arrivee": timezone.localtime(arrivee).isoformat(),
        "attenteMinutes": int((timezone.now() - arrivee).total_seconds() // 60),
        "temperature": constantes["temperature"] if constantes else None,
        "alertes": alertes(admission),
        "statut": statut,
        "medecin": doctor_label(consultation.doctor) if consultation else "",
        "diagnostic": consultation.diagnosis if consultation else "",
        "issue": ISSUES.get(consultation.outcome, "") if consultation else "",
        "termineeLe": timezone.localtime(consultation.completed_at).isoformat()
        if consultation and consultation.completed_at else None,
        "etape": consultation.current_step if consultation else "",
        "aDesDonnees": a_des_donnees(consultation, admission),
    }


def file_attente(user, du, au):
    recents = timezone.now() - timedelta(days=ATTENTE_JOURS)
    admissions = admissions_du_medecin(user)
    attente = admissions.filter(consultation__isnull=True, sent_to_consultation_at__gte=recents).exclude(
        statut="Terminée"
    ).order_by("sent_to_consultation_at", "id")
    en_cours = admissions.filter(consultation__isnull=False, consultation__completed_at__isnull=True).order_by(
        "sent_to_consultation_at", "id"
    )
    consultes = admissions.filter(
        consultation__completed_at__date__gte=du, consultation__completed_at__date__lte=au,
    ).order_by("-consultation__completed_at")
    en_cours = [ligne_de_file(a) for a in en_cours]
    # Une consultation commencée reste dans la file, à sa place d'arrivée, avec « Poursuivre ».
    a_voir = sorted([ligne_de_file(a) for a in attente] + en_cours, key=lambda l: l["arrivee"])
    return {
        "attente": a_voir,
        "enCours": en_cours,
        "consultes": [ligne_de_file(a) for a in consultes],
    }


def historique(patient, sauf):
    anciennes = Consultation.objects.filter(patient=patient, completed_at__isnull=False).exclude(pk=sauf).select_related(
        "doctor"
    ).order_by("-completed_at")[:5]
    return [{
        "date": timezone.localtime(c.completed_at).date().isoformat(),
        "motif": c.reason,
        "diagnostic": c.diagnosis,
        "traitement": c.treatment,
        "medecin": doctor_label(c.doctor),
    } for c in anciennes]


def valeurs_initiales(admission):
    """Premier affichage : le motif de la caisse, les antécédents du dossier, un examen « normal »."""
    patient = admission.patient
    valeurs = {"motif": "" if admission.motif == "Consultation générale" else admission.motif}
    valeurs.update({cle: patient.antecedents[cle] for cle in ANTECEDENTS if cle in (patient.antecedents or {})})
    if patient.allergies:
        valeurs["allergies"] = patient.allergies
    valeurs.update({f"ex_{appareil}": "normal" for appareil, _ in APPAREILS})
    valeurs.update({cle: "non_fait" for cle, _ in TDR})
    valeurs.update({"examens": [], "examens_priorite": "Normale", "ordonnance": []})
    return valeurs


def dossier(admission):
    admission = Admission.objects.select_related("patient", "service", "consultation__doctor").prefetch_related(
        Prefetch("vitals", queryset=VitalSigns.objects.order_by("-recorded_at", "-id"))
    ).get(pk=admission.pk)
    consultation = getattr(admission, "consultation", None)
    valeurs = {**valeurs_initiales(admission), **(consultation.form_data if consultation else {})}
    code = consultation.specialite if consultation else specialite_de(admission)
    return {
        "admissionId": admission.pk,
        "specialite": code,
        "specialiteNom": specialites.nom(code),
        "carnet": carnet(admission.patient, code, consultation.pk if consultation else None),
        "patient": patient_de(admission),
        "constantes": dernieres_constantes(admission),
        "alertes": alertes(admission),
        "service": admission.service_name,
        "motifCaisse": admission.motif,
        "historique": historique(admission.patient, consultation.pk if consultation else None),
        "medecin": doctor_label(consultation.doctor) if consultation else "",
        "valeurs": valeurs,
        "etapeCourante": (consultation.current_step if consultation else "") or ETAPES[0],
        "etapesFaites": consultation.completed_steps if consultation else [],
        "terminee": bool(consultation and consultation.completed_at),
        "enregistreLe": timezone.localtime(consultation.completed_at).isoformat()
        if consultation and consultation.completed_at else None,
        "ia": consultation.ai_trace if consultation else {},
    }


def carnet(patient, code, sauf=None):
    """Carnet de suivi d'un programme (CPN, vaccination, VIH…) : les visites précédentes de la même spécialité,
    de la plus récente à la plus ancienne, avec ce qui a été saisi. Le formulaire en tire ce qui se reprend
    (DDR, vaccins déjà faits, traitement ARV…)."""
    visites = Consultation.objects.filter(patient=patient, specialite=code, completed_at__isnull=False).exclude(
        pk=sauf).order_by("-completed_at")[:30]
    return [{"date": timezone.localtime(c.completed_at).date().isoformat(),
             "valeurs": {k: v for k, v in c.form_data.items() if not k.startswith("__")}} for c in visites]


def references(user):
    """Listes du formulaire : examens, médicaments, lits libres, services."""
    chambres = []
    for chambre in Room.objects.prefetch_related("beds").order_by("name"):
        libres = [lit.number for lit in chambre.beds.all() if lit.status != "OCCUPIED"]
        if libres:
            chambres.append({"nom": chambre.name, "service": chambre.department, "lits": libres})
    return {
        "examens": [{"code": e.code, "nom": e.name, "categorie": e.category, "prix": float(e.price)}
                    for e in LabExam.objects.filter(active=True)],
        "medicaments": [{"nom": p.name, "stock": p.stock, "unite": p.unit, "classe": p.therapeutic_class}
                        for p in Product.objects.filter(category="Médicament").order_by("name")],
        "chambres": chambres,
        "services": list(Department.objects.filter(active=True).values_list("name", flat=True)),
        "issues": [{"code": code, "libelle": libelle} for code, libelle in Consultation.OUTCOMES],
        "specialites": specialites.liste(),
        "mesSpecialites": user.specialites or [specialites.GENERALE],
    }


def suivi(user):
    """Ce que ce médecin a prescrit, demandé ou décidé : ordonnances, examens, rendez-vous, séjours."""
    from appointments.agenda import serialize as rendez_vous
    from hospitalization.ward import serialize_stay, stays
    from laboratory.services import serialize_analysis
    from parcours.serializers import PRESCRIPTION_STATUS, prescription_code

    hopital = hospital_of(user)
    tous = user.has_role("DIRECTOR")
    depuis = timezone.now() - timedelta(days=30)

    ordonnances = Prescription.objects.filter(
        consultation__admission__patient__hospital=hopital, consultation__completed_at__gte=depuis,
    ).select_related("patient", "consultation").prefetch_related("items").order_by("-consultation__completed_at")
    demandes = Admission.objects.of_hospital(hopital).filter(
        lab_request__isnull=False, lab_request__requested_at__gte=depuis,
    ).select_related("patient", "consultation__doctor", "lab_request").order_by("-lab_request__requested_at")
    agenda = Appointment.objects.filter(
        patient__hospital=hopital, date_time__gte=timezone.now() - timedelta(days=1),
    ).exclude(status="CANCELLED").select_related("patient", "professional").order_by("date_time")
    sejours = stays().filter(patient__hospital=hopital, discharge_date__isnull=True)
    if not tous:
        ordonnances = ordonnances.filter(doctor=user)
        demandes = demandes.filter(consultation__doctor=user)
        agenda = agenda.filter(professional=user)
        sejours = sejours.filter(doctor=user)

    return {
        "ordonnances": [{
            "code": prescription_code(o),
            "patient": f"{o.patient.last_name} {o.patient.first_names}",
            "numero": o.patient.patient_number,
            "date": timezone.localtime(o.consultation.completed_at).isoformat(),
            "lignes": [{"medicament": i.medicine, "posologie": i.dose, "duree": i.duration,
                        "quantite": i.quantity, "voie": i.instructions} for i in o.items.all()],
            "statut": PRESCRIPTION_STATUS[o.status][0],
            "statutCode": o.status,
        } for o in ordonnances],
        "examens": [serialize_analysis(a) for a in demandes],
        "rendezVous": [rendez_vous(r) for r in agenda],
        "sejours": [serialize_stay(s) for s in sejours],
    }


# ------------------------------------------------------------------
# Écriture
# ------------------------------------------------------------------

def ouvrir(*, admission, user):
    """Le médecin prend le patient : la consultation existe dès cet instant (brouillon)."""
    start_consultation(admission=admission, user=user)
    consultation = Consultation.objects.get(admission=admission)
    if not consultation.current_step:
        # Première ouverture : le formulaire est celui de la prestation payée, et il ne change plus.
        consultation.current_step = ETAPES[0]
        consultation.specialite = specialite_de(admission)
        consultation.save(update_fields=["current_step", "specialite"])
    return consultation


def reporter_antecedents(patient, valeurs):
    antecedents = dict(patient.antecedents or {})
    antecedents.update({cle: valeurs[cle] for cle in ANTECEDENTS if cle in valeurs})
    champs = []
    if antecedents != patient.antecedents:
        patient.antecedents = antecedents
        champs.append("antecedents")
    if "allergies" in valeurs and (valeurs["allergies"] or "") != patient.allergies:
        patient.allergies = valeurs["allergies"] or ""
        champs.append("allergies")
    if champs:
        patient.save(update_fields=champs)


@transaction.atomic
def enregistrer_etape(*, admission, user, etape, valeurs, complete):
    """Sauvegarde progressive : une étape, ou l'enregistrement automatique pendant la saisie."""
    # Le tronc commun, ou une étape propre à la spécialité (schéma dentaire, partogramme…).
    if not isinstance(etape, str) or not re.fullmatch(r"[a-z][a-z0-9-]{1,39}", etape):
        raise WorkflowError("Étape inconnue.")
    if not isinstance(valeurs, dict):
        raise WorkflowError("Données du formulaire illisibles.")
    consultation = ouvrir(admission=admission, user=user)
    consultation = Consultation.objects.select_for_update().get(pk=consultation.pk)
    liens = consultation.form_data.get("__liens")
    consultation.form_data = {**consultation.form_data, **valeurs, **({"__liens": liens} if liens else {})}
    consultation.current_step = etape
    if complete and etape not in consultation.completed_steps:
        consultation.completed_steps = [*consultation.completed_steps, etape]
    consultation.save(update_fields=["form_data", "current_step", "completed_steps"])
    reporter_antecedents(admission.patient, valeurs)
    return consultation


def texte(valeurs, cle):
    valeur = valeurs.get(cle)
    if isinstance(valeur, list):   # liste déroulante à choix multiples (pathologies associées…)
        return ", ".join(str(v).strip() for v in valeur if str(v).strip())
    return valeur.strip() if isinstance(valeur, str) else ""


def valider(valeurs, specialite=specialites.GENERALE):
    """Ce qui rend une consultation valable, selon la spécialité. Tout le reste est facultatif."""
    obligatoires = {
        **specialites.SPECIALITES.get(specialite, specialites.SPECIALITES[specialites.GENERALE])["obligatoires"],
        "issue": "Veuillez choisir l'issue de la consultation.",
    }
    erreurs = {cle: message for cle, message in obligatoires.items() if not texte(valeurs, cle)}
    issue = texte(valeurs, "issue")
    if issue and issue not in ISSUES:
        erreurs["issue"] = "Issue inconnue."
    if issue == "rdv" and not texte(valeurs, "rdv_date"):
        erreurs["rdv_date"] = "Veuillez fixer la date du rendez-vous."
    if issue in ("hospitalisation", "observation"):
        if not texte(valeurs, "chambre"):
            erreurs["chambre"] = "Veuillez choisir la chambre."
        if not texte(valeurs, "lit"):
            erreurs["lit"] = "Veuillez choisir le lit."
    if issue == "refere_interne" and not texte(valeurs, "refere_service"):
        erreurs["refere_service"] = "Veuillez choisir le service."
    if issue == "refere_externe" and not texte(valeurs, "refere_structure"):
        erreurs["refere_structure"] = "Veuillez indiquer la structure d'accueil."
    for index, ligne in enumerate(lignes_ordonnance(valeurs)):
        if not ligne["posologie"]:
            erreurs["ordonnance"] = f"Ligne {index + 1} : veuillez préciser la posologie de {ligne['medicament']}."
            break
    return erreurs


def lignes_ordonnance(valeurs):
    lignes = []
    for ligne in valeurs.get("ordonnance") or []:
        if not isinstance(ligne, dict) or not str(ligne.get("medicament") or "").strip():
            continue
        try:
            quantite = max(int(ligne.get("quantite") or 1), 1)
        except (TypeError, ValueError):
            quantite = 1
        duree = str(ligne.get("duree") or "").strip()
        lignes.append({
            "medicament": str(ligne["medicament"]).strip()[:180],
            "posologie": str(ligne.get("posologie") or "").strip()[:80],
            "duree": f"{duree} jours" if duree.isdigit() else duree[:100],
            "quantite": quantite,
            "voie": str(ligne.get("voie") or "").strip(),
        })
    return lignes


def texte_ordonnance(lignes):
    return "\n".join(
        " — ".join(part for part in (
            ligne["medicament"], ligne["posologie"], ligne["duree"],
            f"Qté {ligne['quantite']}", ligne["voie"],
        ) if part)
        for ligne in lignes
    )


def synthese_examen(valeurs):
    """« État général bon. Appareils normaux : … Anomalies : … » — le résumé que le DPI fait saisir."""
    phrases = []
    etat = ETATS_GENERAUX.get(texte(valeurs, "etat_general"))
    if etat:
        phrases.append(f"État général {etat.lower()}.")
    normaux, anomalies = [], []
    for appareil, libelle in APPAREILS:
        if valeurs.get(f"ex_{appareil}") == "anormal":
            details = [*(valeurs.get(f"ex_{appareil}_signes") or []), texte(valeurs, f"ex_{appareil}_detail")]
            anomalies.append(f"{libelle} : {', '.join(d for d in details if d) or 'anormal'}")
        else:
            normaux.append(libelle.lower())
    if normaux:
        phrases.append(f"Examen {', '.join(normaux)} normal.")
    phrases.extend(f"{a}." for a in anomalies)
    if texte(valeurs, "ex_autres"):
        phrases.append(texte(valeurs, "ex_autres"))
    return " ".join(phrases)


def resultats_tdr(valeurs):
    return [f"TDR {libelle} {RESULTATS_TDR[valeurs[cle]]}" for cle, libelle in TDR
            if valeurs.get(cle) in RESULTATS_TDR]


def enregistrer_ordonnance(consultation, lignes):
    """L'ordonnance part à la Pharmacie ; une ordonnance déjà servie ne se modifie plus."""
    instructions = texte_ordonnance(lignes)
    prescription = Prescription.objects.filter(consultation=consultation).first()
    if prescription and prescription.instructions == instructions:
        return prescription
    if prescription and prescription.status == "SERVED":
        raise ErreursFormulaire({"ordonnance": "L'ordonnance a déjà été servie par la Pharmacie : elle ne peut plus être modifiée."})
    if not lignes:
        if prescription:
            prescription.delete()
        return None
    if prescription is None:
        prescription = Prescription(consultation=consultation, patient=consultation.patient, doctor=consultation.doctor)
    prescription.instructions = instructions
    prescription.status = "TO_PREPARE"
    prescription.prepared_by = prescription.prepared_at = None
    prescription.save()
    prescription.items.all().delete()
    PrescriptionItem.objects.bulk_create(PrescriptionItem(
        prescription=prescription, medicine=l["medicament"], dose=l["posologie"], frequency="",
        duration=l["duree"], quantity=l["quantite"], instructions=l["voie"],
    ) for l in lignes)
    return prescription


def enregistrer_examens(admission, valeurs, user):
    """Les examens cochés partent au Laboratoire, sur le même passage. On n'efface jamais son travail."""
    from laboratory.services import save_request

    codes = [c for c in valeurs.get("examens") or [] if isinstance(c, str)]
    codes = list(LabExam.objects.filter(code__in=codes, active=True).values_list("code", flat=True))
    if not codes:
        return None
    demande = LabRequest.objects.filter(admission=admission).first()
    actuels = set(demande.results.values_list("exam__code", flat=True)) if demande else set()
    if set(codes) != actuels:
        demande = save_request(admission=admission, exam_codes=codes, user=user)
    priorite = "Urgente" if valeurs.get("examens_priorite") == "Urgente" else "Normale"
    if demande.priority != priorite:
        demande.priority = priorite
        demande.save(update_fields=["priority"])
    return demande


def appliquer_issue(*, admission, valeurs, liens, user):
    """Rendez-vous dans l'agenda, séjour en hospitalisation ; les autres issues sont consignées."""
    from hospitalization.ward import BedTaken, StayInputSerializer, open_stay

    issue = valeurs["issue"]
    liens = dict(liens)
    if issue == "rdv":
        try:
            jour = datetime.strptime(texte(valeurs, "rdv_date"), "%Y-%m-%d").date()
            heure = datetime.strptime(texte(valeurs, "rdv_heure"), "%H:%M").time() if texte(valeurs, "rdv_heure") else time(9)
        except ValueError:
            raise ErreursFormulaire({"rdv_date": "Date ou heure du rendez-vous illisible."})
        moment = timezone.make_aware(datetime.combine(jour, heure))
        if moment < timezone.now():
            raise ErreursFormulaire({"rdv_date": "Le rendez-vous ne peut pas être fixé dans le passé."})
        rdv = Appointment.objects.filter(pk=liens.get("rdv")).first() or Appointment(
            patient=admission.patient, professional=user, service=admission.service_name,
        )
        rdv.date_time = moment
        rdv.reason = texte(valeurs, "rdv_motif") or "Consultation de contrôle"
        rdv.save()
        liens["rdv"] = rdv.pk

    if issue in ("hospitalisation", "observation") and not admission.hospitalizations.filter(
        discharge_date__isnull=True
    ).exists():
        aujourd_hui = timezone.localdate()
        demande = StayInputSerializer(data={
            "admissionId": admission.pk,
            "chambre": texte(valeurs, "chambre"),
            "lit": texte(valeurs, "lit"),
            "dateAdmission": aujourd_hui.isoformat(),
            "dateSortie": texte(valeurs, "sortie_prevue") or aujourd_hui.isoformat(),
        })
        if not demande.is_valid():
            noms = {"chambre": "chambre", "lit": "lit", "dateSortie": "sortie_prevue"}
            raise ErreursFormulaire({
                noms.get(champ, "issue"): str(messages[0]) for champ, messages in demande.errors.items()
            })
        try:
            sejour = open_stay(data=demande.validated_data, user=user,
                               service="Mise en observation" if issue == "observation" else None)
        except BedTaken as pris:
            raise ErreursFormulaire({"lit": str(pris)})
        liens["sejour"] = sejour.pk
    return liens


@transaction.atomic
def terminer(*, admission, user, valeurs):
    """Bouton « Terminer la consultation » : tout part vers les autres modules, ou rien."""
    if not isinstance(valeurs, dict):
        raise WorkflowError("Données du formulaire illisibles.")
    consultation = ouvrir(admission=admission, user=user)
    erreurs = valider(valeurs, consultation.specialite)
    if erreurs:
        raise ErreursFormulaire(erreurs)

    admission = Admission.objects.select_for_update(of=("self",)).select_related("patient").get(pk=admission.pk)
    consultation = Consultation.objects.select_for_update().get(pk=consultation.pk)
    liens = consultation.form_data.get("__liens") or {}

    lignes = lignes_ordonnance(valeurs)
    signes = ", ".join(valeurs.get("signes") or [])
    histoire = texte(valeurs, "histoire")
    diagnostic = texte(valeurs, "diagnostic")
    # L'examen de la médecine générale se résume ici ; chaque autre spécialité envoie sa propre synthèse.
    examen = synthese_examen(valeurs) if consultation.specialite == specialites.GENERALE else texte(valeurs, "__synthese")
    observations = " ".join(filter(None, [
        examen, " · ".join(resultats_tdr(valeurs)),
        f"Actes posés : {texte(valeurs, 'actes')}." if texte(valeurs, "actes") else "",
    ]))
    orientation = {
        "refere_interne": texte(valeurs, "refere_service"), "refere_externe": texte(valeurs, "refere_structure"),
    }.get(valeurs["issue"])
    conseils = texte(valeurs, "conseils")
    if orientation:
        motif = texte(valeurs, "refere_motif")
        conseils = "\n".join(filter(None, [conseils, f"Référé vers {orientation}{f' : {motif}' if motif else ''}."]))
    elif texte(valeurs, "issue_note"):
        conseils = "\n".join(filter(None, [conseils, texte(valeurs, "issue_note")]))

    # Un programme (CPN, vaccination…) n'a pas toujours de motif ni de diagnostic : on garde son nom.
    consultation.reason = texte(valeurs, "motif") or specialites.nom(consultation.specialite)
    consultation.symptoms = f"{histoire}\nSignes : {signes}" if signes else histoire
    consultation.observations = observations
    consultation.diagnosis = diagnostic or texte(valeurs, "__diagnostic_programme") or specialites.nom(consultation.specialite)
    consultation.treatment = texte_ordonnance(lignes)
    consultation.recommendations = conseils
    consultation.outcome = valeurs["issue"]
    consultation.next_consultation = valeurs.get("rdv_date") if valeurs["issue"] == "rdv" else None
    consultation.completed_at = consultation.completed_at or timezone.now()
    consultation.save()

    reporter_antecedents(admission.patient, valeurs)
    enregistrer_ordonnance(consultation, lignes)
    enregistrer_examens(admission, valeurs, user)
    liens = appliquer_issue(admission=admission, valeurs=valeurs, liens=liens, user=user)

    consultation.form_data = {**valeurs, "__liens": liens}
    consultation.current_step = ETAPES[-1]
    consultation.completed_steps = list(ETAPES)
    consultation.save(update_fields=["form_data", "current_step", "completed_steps"])

    admission.statut = "Terminée"
    admission.save(update_fields=["statut"])
    return consultation
