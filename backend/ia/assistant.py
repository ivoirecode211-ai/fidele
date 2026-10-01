"""Assistant du module IA : questions sur le logiciel, et « où en est ce patient ? ».

Deux règles tenues ici :

  - la recherche d'un patient et sa localisation dans le parcours sont
    calculées par le serveur, dans l'hôpital de l'utilisateur ; elles ne
    partent jamais chez le fournisseur d'IA (aucun nom, aucun numéro) ;
  - l'IA ne répond qu'à partir du guide ci-dessous : ce qu'il ne décrit pas,
    elle dit ne pas le savoir au lieu de l'inventer.
"""
import re
import unicodedata

from django.db.models import Q
from django.utils import timezone

from accounts.tenancy import hospital_of
from appointments.models import Appointment
from hospitalization.models import Hospitalization
from parcours.models import Admission, MedicalService
from patients.models import Patient
from prescriptions.models import Prescription

from .groq import IaIndisponible, completer

GUIDE = """
MA SANTÉ est le logiciel de gestion de l'établissement. Chaque module s'ouvre depuis la page « Modules ».

PARCOURS D'UN PATIENT
1. Caisse (/caisse) : l'agent d'accueil enregistre le patient (ou le retrouve), choisit le service et la
   prestation ; le ticket est créé « à payer ». Le caissier encaisse dans sa caisse ouverte ; le reçu
   s'imprime en plusieurs souches sur une feuille A5. Un patient assuré ne paie que sa part.
2. Soins infirmiers (/nursing) : « Patients en attente » liste les patients encaissés ; l'infirmier ou
   l'aide-soignant prend les constantes (température, tension, pouls, SpO2, respiration, glycémie,
   poids, taille). Le patient passe alors dans « Patients reçus » et dans la Consultation.
3. Consultation (/consultations) : le médecin ouvre le patient, remplit le formulaire de sa spécialité
   (médecine générale, pédiatrie, prénatale, dentaire…), pose le diagnostic et peut demander l'aide de
   l'assistant IA (diagnostic, examens, ordonnance, conseils, questions). En terminant, il décide :
   ordonnance (envoyée à la Pharmacie), analyses (Laboratoire), rendez-vous de contrôle, hospitalisation.
4. Laboratoire (/laboratory) : les demandes d'analyses arrivent « En attente », passent « En cours »
   puis « Terminée » avec les résultats ; le compte rendu s'imprime en PDF.
5. Pharmacie (/pharmacy) : l'ordonnance arrive « À préparer », devient « Prête » puis « Servie » ;
   la délivrance sort les médicaments du stock et le reçu de dispensation s'imprime.
6. Hospitalisation (/hospitalization) : séjours, chambres et lits, sorties.
7. Rendez-vous (/appointments) : agenda des rendez-vous par praticien.

AUTRES MODULES
- Dossier patient (/dossiers) : tout le parcours d'un patient au même endroit (passages en caisse,
  constantes, consultations, ordonnances, analyses, séjours, rendez-vous, documents).
- Espace patients (/patient-space) : activer l'accès du patient (code patient + PIN) à son espace
  personnel et répondre à ses messages ; le patient se connecte sur /patient.
- Régie (dans la Caisse, rôle régisseur) : clôturer une caisse restée ouverte, valider les clôtures,
  annuler un ticket avec un motif (il va dans la corbeille).
- Comptabilité (/billing) : encaissements, factures et paiements.
- Gestion des stocks (/stocks) : produits, entrées et sorties, alertes de stock faible, rapport imprimable.
- Ressources humaines (/employees) : personnel, congés, plannings.
- Direction (/direction) : tableau de bord de l'activité de l'établissement.
- Rapports et statistiques (/reports) : rapports d'activité, de maternité, par praticien, financiers.
- Maintenance (/maintenance) et QR Code équipements (/equipements) : interventions sur les appareils ;
  chaque appareil a une étiquette QR qui ouvre sa fiche (connexion obligatoire).
- GED (/ged) : documents numérisés et indexés (patients, personnel, administration).
- Hygiène et sécurité (/hygiene), Archives (/archives).
- Administration (/administration) : utilisateurs et rôles, paramètres généraux de l'hôpital (nom,
  coordonnées, logo imprimé sur les documents, nombre de souches, validité d'un reçu), prestations,
  journal d'audit.
- Intelligence artificielle (/ia) : cet assistant, le journal des interventions de l'IA par patient,
  et les alertes cliniques calculées sur les constantes.

NUMÉRO DE DOSSIER : P + deux chiffres de l'année + trois caractères + code de l'hôpital (ex. P26F46MAS).
Chaque hôpital ne voit que ses propres patients et données.
""".strip()

CONSIGNES = """
Tu es l'assistant de MA SANTÉ, pour le personnel de l'établissement. Réponds en français, simplement,
en quelques phrases ou une courte liste d'étapes. Appuie-toi uniquement sur le GUIDE : si la réponse
n'y est pas, dis-le et oriente vers l'administrateur. Ne donne aucun avis médical sur un patient ici :
pour cela, le médecin utilise l'assistant dans la Consultation. Quand le serveur a affiché des fiches
de patients, ne cite aucun nom : renvoie à ces fiches.
""".strip()

NUMERO = re.compile(r"\bP\d{2}[A-Z0-9]{3}[A-Z]{3}\b", re.IGNORECASE)

# Mots d'une question qui ne sont jamais des noms de patients.
MOTS_COURANTS = set("""
ou est se trouve trouver cherche chercher retrouver patient patiente patients le la les un une des de du
au aux et en dans sur pour par avec qui que quoi quel quelle quels quelles comment est-ce mon ma mes son sa
ses il elle ils elles je tu nous vous on a ai as avons avez ont etait sont suis etre avoir faire fait
dossier numero logiciel module modules caisse soins infirmiers infirmerie consultation consultations
laboratoire labo pharmacie hospitalisation rendez-vous rendez vous rdv ticket recu actuellement maintenant
encore deja aujourd hui hier demain parcours etape etapes situation statut monsieur madame mademoiselle
mr mme mlle docteur dr bonjour bonsoir merci svp stp plait peux pouvez dire montre montrer voir savoir
""".split())


def sans_accents(texte):
    return "".join(c for c in unicodedata.normalize("NFKD", texte) if not unicodedata.combining(c)).lower()


def rechercher_patients(message, hospital, limite=5):
    """Patients de CET hôpital nommés dans la question : par numéro de dossier, sinon par nom."""
    patients = Patient.objects.filter(hospital=hospital)
    numeros = [n.upper() for n in NUMERO.findall(message)]
    if numeros:
        return list(patients.filter(patient_number__in=numeros)[:limite])
    mots = [m for m in re.findall(r"[a-zA-ZÀ-ÿ'-]{3,}", message) if sans_accents(m) not in MOTS_COURANTS]
    if not mots:
        return []
    filtre = Q()
    for mot in mots:
        filtre |= Q(last_name__iexact=mot) | Q(first_names__iregex=rf"(^|[\s-]){re.escape(mot)}($|[\s-])")
    trouves = list(patients.filter(filtre)[:50])
    # Les patients qui portent le plus de mots de la question d'abord (nom ET prénom).
    def score(p):
        noms = sans_accents(f"{p.last_name} {p.first_names}").replace("-", " ").split()
        return sum(sans_accents(m) in noms for m in mots)
    trouves.sort(key=score, reverse=True)
    meilleur = score(trouves[0]) if trouves else 0
    return [p for p in trouves if score(p) == meilleur][:limite]


def anonymiser(texte, hospital):
    """Remplace par « [patient] » le nom et le numéro des patients reconnus : ils ne partent pas chez l'IA."""
    texte = NUMERO.sub("[patient]", texte)
    for patient in rechercher_patients(texte, hospital):
        for mot in f"{patient.last_name} {patient.first_names}".replace("-", " ").split():
            if len(mot) >= 2:
                texte = re.sub(rf"(?<![\wÀ-ÿ]){re.escape(mot)}(?![\wÀ-ÿ])", "[patient]", texte, flags=re.IGNORECASE)
    return re.sub(r"(\[patient\][\s,]*)+", "[patient] ", texte).strip()


def quand(moment):
    return timezone.localtime(moment).strftime("%d/%m/%Y à %H:%M") if moment else ""


def localiser(patient):
    """Où se trouve le patient dans le parcours, du plus actuel au plus ancien, avec le lien du module."""
    etapes = []
    admission = (Admission.objects.actives().filter(patient=patient).select_related("service")
                 .order_by("-created_at").first())
    if admission:
        examen = admission.service.category not in MedicalService.PARCOURS_SOINS
        consultation = getattr(admission, "consultation", None)
        if admission.payment_status == Admission.UNPAID:
            etapes.append(("Caisse", f"ticket {admission.reference or ''} « {admission.service_name} » en attente "
                                     f"de paiement depuis le {quand(admission.created_at)}", "/caisse"))
        elif examen:
            etapes.append(("Examen", f"« {admission.service_name} » réglé le {quand(admission.paid_at)}", "/caisse"))
        elif admission.sent_to_consultation_at is None:
            etapes.append(("Soins infirmiers", "en attente de prise des constantes (Patients en attente)", "/nursing"))
        elif admission.statut != "Terminée" and not (consultation and consultation.completed_at):
            # La consultation n'existe qu'une fois ouverte par le médecin.
            etapes.append(("Consultation", f"consultation en cours ({consultation.doctor.get_full_name()})"
                           if consultation else
                           f"constantes prises, en attente du médecin depuis le {quand(admission.sent_to_consultation_at)}",
                           "/consultations"))
        else:
            fin = consultation.completed_at if consultation else None
            etapes.append(("Consultation", f"consultation terminée{f' le {quand(fin)}' if fin else ''}", "/consultations"))
        demande = getattr(admission, "lab_request", None)
        if demande is not None and demande.status != "Terminée":
            etapes.append(("Laboratoire", f"analyses « {demande.status} »", "/laboratory"))

    ordonnance = Prescription.objects.filter(patient=patient).exclude(status="SERVED").order_by("-pk").first()
    if ordonnance:
        etapes.append(("Pharmacie", f"ordonnance « {ordonnance.get_status_display()} »", "/pharmacy"))

    sejour = (Hospitalization.objects.filter(patient=patient, discharge_date__isnull=True)
              .select_related("bed__room").order_by("-admission_date").first())
    if sejour:
        etapes.append(("Hospitalisation", f"hospitalisé depuis le {quand(sejour.admission_date)}, chambre "
                                          f"{sejour.bed.room.name}, lit {sejour.bed.number}", "/hospitalization"))

    rdv = (Appointment.objects.filter(patient=patient, date_time__gte=timezone.now())
           .exclude(status__in=("CANCELLED", "DONE", "ABSENT")).order_by("date_time").first())
    if rdv:
        etapes.append(("Rendez-vous", f"prochain rendez-vous le {quand(rdv.date_time)}"
                                      f"{f' ({rdv.service})' if rdv.service else ''}", "/appointments"))

    if not etapes:
        etapes.append(("Dossier patient", "aucun passage en cours : le patient n'est dans aucune file", f"/dossiers/{patient.pk}"))
    return {
        "id": patient.pk,
        "nom": f"{patient.last_name} {patient.first_names}".strip(),
        "numero": patient.patient_number,
        "dossier": f"/dossiers/{patient.pk}",
        "dernierPassage": quand(admission.created_at) if admission else "",
        "etapes": [{"module": m, "etat": e, "lien": lien} for m, e, lien in etapes],
    }


MAX_ECHANGES = 10
MAX_CARACTERES = 1500


def repondre(*, user, question, historique=None):
    """Une question du personnel : fiches des patients nommés (serveur) et réponse de l'IA (guide)."""
    question = str(question or "").strip()[:MAX_CARACTERES]
    if not question:
        raise IaIndisponible("Posez une question à l'assistant.")
    hopital = hospital_of(user)
    fiches = [localiser(p) for p in rechercher_patients(question, hopital)]

    systeme = [CONSIGNES, f"GUIDE :\n{GUIDE}"]
    if fiches:
        systeme.append(f"Le serveur a trouvé et affiché {len(fiches)} fiche(s) de patient avec leur situation "
                       "dans le parcours. Dis simplement de consulter la ou les fiches ci-dessous.")
    echanges = [
        {"role": m.get("role"), "content": anonymiser(str(m.get("content", ""))[:MAX_CARACTERES], hopital)}
        for m in (historique or [])[-MAX_ECHANGES:]
        if isinstance(m, dict) and m.get("role") in ("user", "assistant")
    ]
    try:
        texte = completer([{"role": "system", "content": "\n\n".join(systeme)}, *echanges,
                           {"role": "user", "content": anonymiser(question, hopital)}], temperature=0.3, max_tokens=700)
    except IaIndisponible as erreur:
        if not fiches:
            raise
        # Sans l'IA, les fiches calculées par le serveur restent la réponse.
        texte = f"Voici ce que le logiciel sait de ce patient. ({erreur})"
    return {"reponse": texte, "patients": fiches}
