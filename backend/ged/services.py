"""GED : recherche de patients, dépôt de documents, dossier patient consolidé."""
import mimetypes
import re
import unicodedata
from difflib import SequenceMatcher

from django.utils import timezone

from consultations.models import Consultation
from laboratory.models import LabRequest
from parcours.models import Admission
from parcours.services import age_from_birth_date, doctor_label
from patients.models import Patient
from prescriptions.models import Prescription

from .connecteurs import ConnecteurIndisponible, connecteur
from .models import Document, IdentiteArchive

TAILLE_MAX = 25 * 1024 * 1024  # 25 Mo par fichier
EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".doc", ".docx", ".xls", ".xlsx", ".txt"}
TYPES = dict(Document.TYPES)


class RefusGed(Exception):
    """Demande refusée : { champ: message }, ou un message simple."""

    def __init__(self, erreurs):
        super().__init__(str(erreurs))
        self.erreurs = erreurs if isinstance(erreurs, dict) else {"detail": erreurs}


# ------------------------------------------------------------------
# Recherche tolérante : accents, casse, fautes de frappe, ordre des noms
# ------------------------------------------------------------------

def normaliser(texte):
    sans_accents = unicodedata.normalize("NFKD", str(texte or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]+", " ", sans_accents.lower()).split()


PHONETIQUE = [("ou", "w"), ("ph", "f"), ("qu", "k"), ("ck", "k"), ("c", "k"), ("y", "i"), ("dj", "j"), ("gu", "g"), ("h", "")]


def phonetique(mot):
    """Les noms d'ici s'écrivent de plusieurs façons : Kouassi, Kwasi, Kouasi → « kwasi »."""
    for avant, apres in PHONETIQUE:
        mot = mot.replace(avant, apres)
    mot = re.sub(r"(.)\1+", r"\1", mot)       # lettres doublées
    return mot[:-1] if len(mot) > 3 and mot.endswith("e") else mot


def score(terme, *champs):
    """0 à 1 : chaque mot cherché doit ressembler à un mot de la fiche (« kwasi » ≈ « kouassi »)."""
    mots = normaliser(terme)
    cibles = [m for champ in champs for m in normaliser(champ)]
    if not mots or not cibles:
        return 0
    total = 0
    for mot in mots:
        meilleur = 0
        for cible in cibles:
            if cible == mot:
                meilleur = 1
            elif cible.startswith(mot) and len(mot) >= 2:
                meilleur = max(meilleur, .9)
            elif len(mot) >= 3:
                sons = (phonetique(mot), phonetique(cible))
                meilleur = max(meilleur, .95 if sons[0] == sons[1] else SequenceMatcher(None, *sons).ratio())
        if meilleur < .72:
            return 0
        total += meilleur
    return total / len(mots)


def rechercher(hospital, terme, limite=30):
    """Patients du logiciel et identités d'archive qui répondent à un nom ou à un numéro."""
    terme = str(terme or "").strip()
    if len(terme) < 2:
        return []
    resultats = []
    for p in Patient.objects.filter(hospital=hospital).only(
        "pk", "patient_number", "last_name", "first_names", "birth_date", "sex", "phone",
    ):
        note = 1.2 if terme.upper().replace(" ", "") in p.patient_number.upper() else score(terme, p.last_name, p.first_names)
        if note:
            resultats.append((note, {
                "sorte": "patient", "id": p.pk, "numero": p.patient_number,
                "nom": f"{p.last_name} {p.first_names}", "sexe": p.sex,
                "age": age_from_birth_date(p.birth_date), "telephone": p.phone,
            }))
    for i in IdentiteArchive.objects.filter(hospital=hospital).select_related("patient"):
        numero = i.numero_registre or ""
        note = 1.2 if numero and terme.lower() in numero.lower() else score(terme, i.nom, i.prenoms)
        if note:
            resultats.append((note, fiche_identite(i)))
    resultats.sort(key=lambda r: -r[0])
    return [r for _, r in resultats[:limite]]


def fiche_identite(i):
    return {
        "sorte": "archive", "id": i.pk, "nom": str(i), "sexe": i.sexe,
        "naissance": i.date_naissance.isoformat() if i.date_naissance else (str(i.annee_naissance) if i.annee_naissance else ""),
        "numeroRegistre": i.numero_registre, "anneeRegistre": i.annee_registre, "service": i.service,
        "notes": i.notes,
        "patient": {"id": i.patient_id, "numero": i.patient.patient_number,
                    "nom": f"{i.patient.last_name} {i.patient.first_names}"} if i.patient_id else None,
        "documents": i.documents.filter(supprime_le__isnull=True).count(),
    }


# ------------------------------------------------------------------
# Documents
# ------------------------------------------------------------------

def fiche_document(d):
    return {
        "id": d.id,
        "titre": d.titre,
        "type": d.type,
        "typeLibelle": TYPES.get(d.type, d.type),
        "date": d.date_document.isoformat() if d.date_document else None,
        "patient": {"id": d.patient_id, "numero": d.patient.patient_number,
                    "nom": f"{d.patient.last_name} {d.patient.first_names}"} if d.patient_id else None,
        "identite": {"id": d.identite_id, "nom": str(d.identite), "numeroRegistre": d.identite.numero_registre}
        if d.identite_id else None,
        "service": d.service,
        "motsCles": d.mots_cles,
        "description": d.description,
        "stockage": d.stockage,
        "synchronisation": d.synchronisation,
        "nomFichier": d.nom_fichier,
        "taille": d.taille,
        "typeMime": d.type_mime,
        "ajouteLe": timezone.localtime(d.created_at).isoformat(),
        "ajoutePar": doctor_label(d.created_by).removeprefix("Dr. ") if d.created_by_id else "",
        "supprimeLe": timezone.localtime(d.supprime_le).isoformat() if d.supprime_le else None,
    }


def documents(hospital):
    return Document.objects.filter(hospital=hospital).select_related("patient", "identite", "created_by")


def rattacher(hospital, donnees):
    """Le patient ou l'identité d'archive d'un document, vérifiés dans l'hôpital."""
    patient = identite = None
    if donnees.get("patient"):
        patient = Patient.objects.filter(hospital=hospital, pk=donnees["patient"]).first()
        if patient is None:
            raise RefusGed({"patient": "Patient inconnu dans cet hôpital."})
    if donnees.get("identite"):
        identite = IdentiteArchive.objects.filter(hospital=hospital, pk=donnees["identite"]).first()
        if identite is None:
            raise RefusGed({"identite": "Identité d'archive inconnue."})
        patient = patient or identite.patient
    return patient, identite


def deposer(*, hospital, user, fichier, donnees):
    """Enregistre un fichier et sa fiche. Le fichier reste sur le serveur tant qu'aucun logiciel n'est branché."""
    if fichier is None:
        raise RefusGed({"fichier": "Choisissez un fichier."})
    extension = ("." + fichier.name.rsplit(".", 1)[-1].lower()) if "." in fichier.name else ""
    if extension not in EXTENSIONS:
        raise RefusGed({"fichier": "Format non accepté. PDF, images, Word, Excel ou texte."})
    if fichier.size > TAILLE_MAX:
        raise RefusGed({"fichier": "Fichier trop lourd : 25 Mo au plus."})
    titre = str(donnees.get("titre") or "").strip() or fichier.name.rsplit(".", 1)[0]
    type_ = donnees.get("type") if donnees.get("type") in TYPES else "autre"
    patient, identite = rattacher(hospital, donnees)
    distant = connecteur().actif
    return Document.objects.create(
        hospital=hospital, titre=titre[:200], type=type_,
        date_document=donnees.get("date") or None,
        patient=patient, identite=identite,
        service=str(donnees.get("service") or "")[:120],
        mots_cles=str(donnees.get("motsCles") or "")[:255],
        description=str(donnees.get("description") or ""),
        fichier=fichier, nom_fichier=fichier.name[:255], taille=fichier.size,
        type_mime=fichier.content_type or mimetypes.guess_type(fichier.name)[0] or "",
        synchronisation="a_envoyer" if distant else "local",
        created_by=user,
    )


def filtrer(queryset, params):
    corbeille = params.get("corbeille") in ("1", "true")
    queryset = queryset.filter(supprime_le__isnull=not corbeille)
    if params.get("type") in TYPES:
        queryset = queryset.filter(type=params["type"])
    if params.get("patient"):
        queryset = queryset.filter(patient_id=params["patient"])
    if params.get("identite"):
        queryset = queryset.filter(identite_id=params["identite"])
    terme = str(params.get("q") or "").strip()
    if terme:
        garde = [
            d.pk for d in queryset
            if score(terme, d.titre, d.mots_cles, d.service, d.nom_fichier,
                     d.patient and d.patient.last_name, d.patient and d.patient.first_names,
                     d.identite and d.identite.nom, d.identite and d.identite.prenoms)
            or (d.patient and terme.upper() in d.patient.patient_number)
            or (d.identite and d.identite.numero_registre and terme.lower() in d.identite.numero_registre.lower())
        ]
        queryset = queryset.filter(pk__in=garde)
    return queryset


# ------------------------------------------------------------------
# Dossier patient : tout ce que l'hôpital sait d'une personne
# ------------------------------------------------------------------

def dossier(*, hospital, patient_id=None, identite_id=None):
    """La frise d'un patient : registres papier, documents GED, consultations, ordonnances, analyses, passages en caisse,
    et documents du logiciel externe. Une identité d'archive reliée à un patient ramène tout son dossier."""
    identites = IdentiteArchive.objects.filter(hospital=hospital)
    patient = None
    if identite_id:
        identite = identites.select_related("patient").filter(pk=identite_id).first()
        if identite is None:
            raise RefusGed("Identité d'archive inconnue.")
        patient = identite.patient
        identites = identites.filter(pk=identite.pk) if patient is None else identites.filter(patient=patient)
    else:
        patient = Patient.objects.filter(hospital=hospital, pk=patient_id).first()
        if patient is None:
            raise RefusGed("Patient inconnu dans cet hôpital.")
        identites = identites.filter(patient=patient)

    identites = list(identites)
    evenements = []

    docs = documents(hospital).filter(supprime_le__isnull=True)
    docs = docs.filter(patient=patient) | docs.filter(identite__in=identites) if patient else docs.filter(identite__in=identites)
    for d in docs.distinct():
        evenements.append({"date": (d.date_document.isoformat() if d.date_document else timezone.localtime(d.created_at).date().isoformat()),
                           "sorte": "document", "titre": d.titre, "detail": TYPES.get(d.type, d.type),
                           "source": "Registre papier" if d.type == "registre" else "GED", "document": fiche_document(d)})

    if patient:
        for c in Consultation.objects.filter(patient=patient, completed_at__isnull=False).select_related("doctor"):
            evenements.append({"date": timezone.localtime(c.completed_at).date().isoformat(), "sorte": "consultation",
                               "titre": c.diagnosis or c.reason or "Consultation",
                               "detail": " · ".join(filter(None, [c.reason, doctor_label(c.doctor)])), "source": "Consultation"})
        for o in Prescription.objects.filter(patient=patient).prefetch_related("items"):
            evenements.append({"date": o.date.isoformat(), "sorte": "ordonnance", "titre": "Ordonnance",
                               "detail": " ; ".join(i.medicine for i in o.items.all()), "source": "Pharmacie"})
        for l in LabRequest.objects.filter(admission__patient=patient).prefetch_related("results__exam"):
            evenements.append({"date": timezone.localtime(l.requested_at).date().isoformat(), "sorte": "laboratoire",
                               "titre": "Analyses : " + ", ".join(r.exam.name for r in l.results.all()),
                               "detail": " | ".join(f"{r.exam.name} {r.result}" for r in l.results.all() if r.result) or l.status,
                               "source": "Laboratoire"})
        for a in Admission.objects.filter(patient=patient).actives():
            evenements.append({"date": timezone.localtime(a.created_at).date().isoformat(), "sorte": "passage",
                               "titre": a.service_name, "detail": a.get_payment_status_display(), "source": "Caisse"})

    distants, erreur_distante = [], ""
    try:
        for identite in identites or [None]:
            distants += connecteur().rechercher(
                numero=patient.patient_number if patient else "",
                nom=(patient.last_name if patient else identite.nom) if (patient or identite) else "",
                prenoms=(patient.first_names if patient else identite.prenoms) if (patient or identite) else "",
            )
    except ConnecteurIndisponible as erreur:
        erreur_distante = str(erreur)
    for d in distants:
        evenements.append({"date": d.get("date") or "", "sorte": "distant", "titre": d.get("titre") or "Document",
                           "detail": d.get("type") or "", "source": "Logiciel d'archivage", "reference": d.get("reference")})

    evenements.sort(key=lambda e: e["date"] or "", reverse=True)
    return {
        "patient": {"id": patient.pk, "numero": patient.patient_number, "nom": f"{patient.last_name} {patient.first_names}",
                    "sexe": patient.sex, "age": age_from_birth_date(patient.birth_date),
                    "naissance": patient.birth_date.isoformat() if patient.birth_date else "",
                    "telephone": patient.phone} if patient else None,
        "identites": [fiche_identite(i) for i in identites],
        "evenements": evenements,
        "connecteur": {"nom": connecteur().nom, "actif": connecteur().actif, "erreur": erreur_distante},
    }
