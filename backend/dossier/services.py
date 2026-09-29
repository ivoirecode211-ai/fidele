"""Le dossier patient : ce que tous les modules savent d'un même patient.

Rien n'est recopié : chaque section est lue dans le module qui la tient
(Caisse, Soins infirmiers, Consultation, Pharmacie, Laboratoire,
Hospitalisation, Rendez-vous, Espace patient, GED). Le dossier est donc
toujours à jour, et une correction faite dans un module s'y voit aussitôt.

Chacun n'y voit que ce que son métier exige : l'accueil ne lit pas les
diagnostics, le laboratoire ne lit que ses analyses, et les consultations
confidentielles (VIH) restent réservées aux médecins.
"""
from django.apps import apps
from django.utils import timezone

from appointments.models import Appointment
from consultations.models import Consultation
from hospitalization.models import Hospitalization
from laboratory.models import LabRequest
from parcours.models import Admission, VitalSigns
from prescriptions.models import Prescription

CLINIQUE = {"ADMIN", "DIRECTOR", "DOCTOR", "NURSE"}
SECTIONS = {
    # section: rôles qui la voient
    "passages": {"ADMIN", "DIRECTOR", "DOCTOR", "NURSE", "RECEPTION", "ACCOUNTING", "REGISSEUR"},
    "rendezVous": {"ADMIN", "DIRECTOR", "DOCTOR", "NURSE", "RECEPTION"},
    "constantes": CLINIQUE,
    "consultations": CLINIQUE,
    "ordonnances": CLINIQUE | {"PHARMACY"},
    "laboratoire": CLINIQUE | {"LAB"},
    "hospitalisations": CLINIQUE,
    "documents": CLINIQUE | {"RECEPTION"},
    "espacePatient": {"ADMIN", "DIRECTOR", "DOCTOR", "RECEPTION"},
}
# Consultations dont le contenu n'est montré qu'aux médecins (et à l'administration).
CONFIDENTIELLES = {"vih"}
LECTEURS_CONFIDENTIELS = {"ADMIN", "DOCTOR"}
# Qui peut corriger quoi dans l'identité.
MODIFIER_IDENTITE = {"ADMIN", "RECEPTION", "DIRECTOR"}
MODIFIER_MEDICAL = {"ADMIN", "DOCTOR", "NURSE"}
CHAMPS_IDENTITE = ["last_name", "first_names", "birth_date", "sex", "phone", "email", "address", "city", "locality",
                   "profession", "nationality", "marital_status", "emergency_contact", "emergency_phone",
                   "emergency_relationship", "insurance", "insurance_number"]
CHAMPS_MEDICAUX = ["blood_group", "allergies", "history"]


def sections_visibles(user):
    if user.is_superuser or "ADMIN" in user.role_codes:
        return set(SECTIONS)
    return {nom for nom, roles in SECTIONS.items() if user.role_codes & roles}


def quand(value):
    return timezone.localtime(value).strftime("%d/%m/%Y %H:%M") if value else ""


def iso(value):
    return value.isoformat() if value else ""


def personne(user):
    if user is None:
        return ""
    return f"{user.first_name} {user.last_name.upper()}".strip() or user.username


def age(birth_date):
    if not birth_date:
        return None
    today = timezone.localdate()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


# ------------------------------------------------------------------ recherche

def ligne(patient):
    return {
        "id": patient.pk,
        "code": patient.patient_number,
        "name": f"{patient.last_name} {patient.first_names}".strip(),
        "sex": patient.get_sex_display(),
        "age": age(patient.birth_date),
        "phone": patient.phone,
        "insurance": patient.insurance,
        "allergies": bool(patient.allergies.strip()),
        "createdAt": patient.created_at.strftime("%d/%m/%Y"),
    }


# ------------------------------------------------------------------ dossier

def identite(patient):
    data = {champ: getattr(patient, champ) or "" for champ in CHAMPS_IDENTITE + CHAMPS_MEDICAUX}
    data.update({
        "id": patient.pk,
        "code": patient.patient_number,
        "birth_date": patient.birth_date.isoformat() if patient.birth_date else "",
        "age": age(patient.birth_date),
        "sexLabel": patient.get_sex_display(),
        "hospital": patient.hospital.name if patient.hospital_id else "",
        "createdAt": patient.created_at.strftime("%d/%m/%Y"),
        # Antécédents structurés du formulaire de médecine générale, s'il existe.
        "antecedents": getattr(patient, "antecedents", None) or {},
    })
    return data


def passages(patient):
    rows = (Admission.objects.filter(patient=patient).select_related("created_by", "session__cashier")
            .order_by("-created_at"))
    return [{
        "id": a.pk,
        "date": quand(a.created_at), "iso": iso(a.created_at),
        "reference": a.reference,
        "prestation": a.service_name,
        "montant": float(a.service_price),
        "aPayer": float(a.cost),
        "assurance": a.insurance_name,
        "paiement": "Annulé" if a.cancelled_at else a.get_payment_status_display(),
        "statut": a.statut,
        "par": personne(a.created_by),
    } for a in rows]


def constantes(patient):
    rows = (VitalSigns.objects.filter(admission__patient=patient).select_related("recorded_by")
            .order_by("-recorded_at")[:50])
    return [{
        "id": v.pk,
        "date": quand(v.recorded_at), "iso": iso(v.recorded_at),
        "temperature": float(v.temperature) if v.temperature is not None else None,
        "tension": f"{v.systolic}/{v.diastolic}" if v.systolic and v.diastolic else "",
        "pouls": v.pulse, "spo2": v.oxygen, "frequenceRespiratoire": v.respiratory_rate,
        "glycemie": float(v.glucose) if v.glucose is not None else None,
        "poids": float(v.weight) if v.weight is not None else None,
        "taille": float(v.height) if v.height is not None else None,
        "notes": v.notes,
        "par": personne(v.recorded_by),
    } for v in rows]


def specialite(consultation):
    code = getattr(consultation, "specialite", "") or ""
    try:
        from consultations.specialites import nom
        return code, nom(code)
    except Exception:
        return code, code.replace("-", " ").capitalize() if code else "Consultation"


def consultations(patient, user):
    rows = Consultation.objects.filter(patient=patient).select_related("doctor").order_by("-date_time")
    peut_confidentiel = user.is_superuser or bool(user.role_codes & LECTEURS_CONFIDENTIELS)
    result = []
    for c in rows:
        code, nom_specialite = specialite(c)
        masque = code in CONFIDENTIELLES and not peut_confidentiel
        result.append({
            "id": c.pk,
            "date": quand(c.date_time), "iso": iso(c.date_time),
            "medecin": personne(c.doctor),
            "specialite": nom_specialite,
            "confidentiel": code in CONFIDENTIELLES,
            "masque": masque,
            "motif": "" if masque else c.reason,
            "symptomes": "" if masque else c.symptoms,
            "diagnostic": "" if masque else c.diagnosis,
            "traitement": "" if masque else c.treatment,
            "observations": "" if masque else c.observations,
            "recommandations": "" if masque else c.recommendations,
            "prochaineConsultation": c.next_consultation.strftime("%d/%m/%Y") if c.next_consultation else "",
            "terminee": c.completed_at is not None,
            "issue": c.get_outcome_display() if getattr(c, "outcome", "") else "",
        })
    return result


def ordonnances(patient):
    rows = (Prescription.objects.filter(patient=patient).select_related("doctor", "served_by")
            .prefetch_related("items").order_by("-date", "-id"))
    return [{
        "id": p.pk,
        "date": p.date.strftime("%d/%m/%Y"), "iso": iso(p.date),
        "medecin": personne(p.doctor),
        "statut": p.get_status_display(),
        "serviePar": personne(p.served_by),
        "servieLe": quand(p.served_at),
        "medicaments": [{"nom": i.medicine, "posologie": i.dose, "duree": i.duration, "quantite": i.quantity,
                         "voie": i.instructions} for i in p.items.all()],
    } for p in rows]


def laboratoire(patient):
    rows = (LabRequest.objects.filter(admission__patient=patient)
            .select_related("requested_by", "completed_by").prefetch_related("results__exam")
            .order_by("-requested_at"))
    return [{
        "id": r.pk,
        "date": quand(r.requested_at), "iso": iso(r.requested_at),
        "statut": r.status, "priorite": r.priority, "observation": r.observation,
        "demandePar": personne(r.requested_by), "terminePar": personne(r.completed_by),
        "resultats": [{"examen": res.exam.name, "resultat": res.result, "unite": res.exam.unit,
                       "reference": res.exam.reference} for res in r.results.all()],
    } for r in rows]


def hospitalisations(patient):
    rows = (Hospitalization.objects.filter(patient=patient).select_related("bed__room", "doctor")
            .order_by("-admission_date"))
    return [{
        "id": h.pk,
        "entree": quand(h.admission_date), "iso": iso(h.admission_date),
        "sortie": quand(h.discharge_date),
        "enCours": h.discharge_date is None,
        "service": h.service or h.bed.room.department,
        "lit": f"{h.bed.room.name} — lit {h.bed.number}",
        "motif": h.reason, "notes": h.notes,
        "medecin": personne(h.doctor),
        "sortiePrevue": h.planned_discharge.strftime("%d/%m/%Y") if h.planned_discharge else "",
    } for h in rows]


def rendez_vous(patient):
    rows = Appointment.objects.filter(patient=patient).select_related("professional").order_by("-date_time")
    now = timezone.now()
    return [{
        "id": a.pk,
        "date": quand(a.date_time), "iso": iso(a.date_time),
        "aVenir": a.date_time >= now and a.status not in ("CANCELLED", "DONE", "ABSENT"),
        "professionnel": personne(a.professional),
        "service": a.service, "motif": a.reason,
        "statut": a.get_status_display().capitalize(),
    } for a in rows]


def espace_patient(patient):
    access = getattr(patient, "portal_access", None) if apps.is_installed("portail") else None
    if access is None:
        return {"statut": "Aucun accès", "derniereConnexion": "", "messages": 0}
    from portail.models import Message

    return {
        "statut": "Désactivé" if not access.active else "Bloqué" if access.locked
        else "PIN provisoire" if access.must_change_pin else "Actif",
        "derniereConnexion": quand(access.last_login),
        "messages": Message.objects.filter(conversation__patient=patient).count(),
    }


def documents(patient):
    """Documents de la GED rattachés au patient, directement ou par son identité d'archive.

    Un document mis en corbeille (suppression logique) n'y figure jamais.
    Le module GED est lu s'il est installé ; sinon, la section est vide.
    """
    if not apps.is_installed("ged"):
        return []
    try:
        Document = apps.get_model("ged", "Document")
    except LookupError:
        return []
    champs = {f.name for f in Document._meta.get_fields()}
    if "patient" not in champs:
        return []
    from django.db.models import Q

    filtre = Q(patient=patient)
    if "identite" in champs:
        filtre |= Q(identite__patient=patient)
    qs = Document.objects.filter(filtre)
    if "supprime_le" in champs:
        qs = qs.filter(supprime_le__isnull=True)
    ordre = [c for c in ("-date_document", "-created_at") if c.lstrip("-") in champs] or ["-pk"]
    rows = []
    for d in qs.distinct().order_by(*ordre)[:100]:
        date = getattr(d, "date_document", None) or getattr(d, "created_at", None)
        type_ = d.get_type_display() if hasattr(d, "get_type_display") else str(getattr(d, "type", "") or "")
        rows.append({
            "id": d.pk,
            "titre": getattr(d, "titre", "") or getattr(d, "title", "") or f"Document {d.pk}",
            "type": type_,
            "date": date.strftime("%d/%m/%Y") if date else "",
            "iso": iso(date),
        })
    return rows


CONSTRUCTEURS = {
    "passages": lambda p, u: passages(p),
    "constantes": lambda p, u: constantes(p),
    "consultations": consultations,
    "ordonnances": lambda p, u: ordonnances(p),
    "laboratoire": lambda p, u: laboratoire(p),
    "hospitalisations": lambda p, u: hospitalisations(p),
    "rendezVous": lambda p, u: rendez_vous(p),
    "documents": lambda p, u: documents(p),
    "espacePatient": lambda p, u: espace_patient(p),
}


def chronologie(sections):
    """Tous les événements du patient, du plus récent au plus ancien."""
    events = []
    for a in sections.get("passages", []):
        events.append({"iso": a["iso"], "date": a["date"], "type": "passage", "titre": f"Passage en caisse — {a['prestation']}",
                       "detail": f"Ticket {a['reference']} · {a['paiement']}"})
    for v in sections.get("constantes", []):
        mesures = [f"{v['temperature']} °C" if v["temperature"] else "", f"TA {v['tension']}" if v["tension"] else "",
                   f"Pouls {v['pouls']}" if v["pouls"] else "", f"SpO₂ {v['spo2']} %" if v["spo2"] else ""]
        events.append({"iso": v["iso"], "date": v["date"], "type": "constantes", "titre": "Constantes prises",
                       "detail": " · ".join(m for m in mesures if m) or v["notes"], "par": v["par"]})
    for c in sections.get("consultations", []):
        events.append({"iso": c["iso"], "date": c["date"], "type": "consultation",
                       "titre": f"Consultation — {c['specialite']}",
                       "detail": "Consultation confidentielle" if c["masque"] else c["diagnostic"] or c["motif"],
                       "par": c["medecin"]})
    for o in sections.get("ordonnances", []):
        events.append({"iso": o["iso"], "date": o["date"], "type": "ordonnance", "titre": f"Ordonnance — {o['statut']}",
                       "detail": ", ".join(m["nom"] for m in o["medicaments"]), "par": o["medecin"]})
    for r in sections.get("laboratoire", []):
        events.append({"iso": r["iso"], "date": r["date"], "type": "laboratoire", "titre": f"Analyses — {r['statut']}",
                       "detail": ", ".join(x["examen"] for x in r["resultats"])})
    for h in sections.get("hospitalisations", []):
        events.append({"iso": h["iso"], "date": h["entree"], "type": "hospitalisation",
                       "titre": "Hospitalisation" + (" en cours" if h["enCours"] else ""),
                       "detail": f"{h['service']} · {h['lit']}", "par": h["medecin"]})
    for a in sections.get("rendezVous", []):
        events.append({"iso": a["iso"], "date": a["date"], "type": "rendez-vous", "titre": f"Rendez-vous — {a['statut']}",
                       "detail": " · ".join(x for x in (a["service"], a["motif"]) if x), "par": a["professionnel"]})
    for d in sections.get("documents", []):
        events.append({"iso": d["iso"], "date": d["date"], "type": "document", "titre": f"Document — {d['titre']}",
                       "detail": d["type"]})
    return sorted(events, key=lambda e: e["iso"] or "", reverse=True)


def dossier(patient, user):
    visibles = sections_visibles(user)
    sections = {nom: construire(patient, user) for nom, construire in CONSTRUCTEURS.items() if nom in visibles}
    listes = {k: v for k, v in sections.items() if isinstance(v, list)}
    rdv = sections.get("rendezVous", [])
    hospit = sections.get("hospitalisations", [])
    return {
        "identite": identite(patient),
        "sections": sorted(visibles),
        "peutModifierIdentite": user.is_superuser or bool(user.role_codes & MODIFIER_IDENTITE),
        "peutModifierMedical": user.is_superuser or bool(user.role_codes & MODIFIER_MEDICAL),
        "resume": {
            "passages": len(sections.get("passages", [])),
            "derniereVisite": (sections.get("passages") or [{}])[0].get("date", ""),
            "prochainRendezVous": next((r["date"] for r in reversed(rdv) if r["aVenir"]), ""),
            "hospitaliseLe": next((h["entree"] for h in hospit if h["enCours"]), ""),
        },
        **sections,
        "chronologie": chronologie(listes),
    }
