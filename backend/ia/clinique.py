"""Assistant clinique : propositions pour la consultation en cours, et conversation.

Les règles de l'assistant sont dans regles.py : la charte qu'il lit avant chaque
réponse, et les garde-fous que le serveur applique à ce qu'il propose.
Règles tenues ici, pas dans l'interface :

  - seules les données de CE patient sont envoyées, sans son nom ni ses
    coordonnées (âge, sexe, constantes, clinique) ;
  - l'assistant propose, le médecin décide : tout ce qui revient remplit
    des champs que le médecin peut effacer ou réécrire ;
  - l'examen physique n'est jamais rempli par l'IA : ce qui n'a pas été
    constaté ne s'invente pas.
"""
from django.utils import timezone

from consultations.medecine import (
    ANTECEDENTS, ETATS_GENERAUX, dernieres_constantes, lignes_ordonnance, resultats_tdr,
    synthese_examen, texte,
)
from laboratory.models import LabExam
from parcours.services import age_from_birth_date
from stocks.models import Product

from .groq import IaIndisponible, completer
from .regles import CHARTE, CONSIGNES, dossier_balise, verifier_ordonnance

LIBELLES_ANTECEDENTS = {
    "ant_hta": "HTA", "ant_diabete": "diabète", "ant_asthme": "asthme", "ant_drepanocytose": "drépanocytose",
    "ant_medicaux": "Autres antécédents médicaux", "ant_chirurgicaux": "Antécédents chirurgicaux",
    "ant_familiaux": "Antécédents familiaux", "traitements_en_cours": "Traitements en cours",
    "tabac": "tabac", "alcool": "alcool", "mode_vie": "Mode de vie",
}


def contexte(admission, valeurs):
    """Le dossier du patient, tel que l'assistant le lit. Aucune donnée d'identité."""
    patient = admission.patient
    age = age_from_birth_date(patient.birth_date)
    sexe = {"F": "femme", "M": "homme"}.get(patient.sex, "patient")
    lignes = [f"Patient : {sexe}, {f'{age} ans' if age is not None else 'âge inconnu'}."]

    c = dernieres_constantes(admission)
    if c:
        mesures = [
            f"température {c['temperature']} °C" if c["temperature"] is not None else "",
            f"TA {c['tension']} mmHg" if c["tension"] else "",
            f"pouls {c['pouls']}/min" if c["pouls"] else "",
            f"SpO2 {c['spo2']} %" if c["spo2"] else "",
            f"FR {c['frequenceRespiratoire']}/min" if c["frequenceRespiratoire"] else "",
            f"glycémie {c['glycemie']} g/L" if c["glycemie"] is not None else "",
            f"poids {c['poids']} kg" if c["poids"] is not None else "",
            f"taille {c['taille']} cm" if c["taille"] is not None else "",
            f"IMC {c['imc']}" if c["imc"] else "",
        ]
        lignes.append("Constantes (infirmerie) : " + ", ".join(m for m in mesures if m) + ".")
        if c["notes"]:
            lignes.append(f"Note infirmière : {c['notes']}")

    presents = [LIBELLES_ANTECEDENTS[cle] for cle in ("ant_hta", "ant_diabete", "ant_asthme", "ant_drepanocytose", "tabac", "alcool")
                if valeurs.get(cle) is True]
    if presents:
        lignes.append("Antécédents / facteurs : " + ", ".join(presents) + ".")
    for cle in ANTECEDENTS:
        if isinstance(valeurs.get(cle), str) and texte(valeurs, cle):
            lignes.append(f"{LIBELLES_ANTECEDENTS[cle]} : {texte(valeurs, cle)}")
    lignes.append(f"Allergies : {texte(valeurs, 'allergies') or 'aucune connue'}.")
    if valeurs.get("grossesse") == "oui":
        lignes.append("Grossesse en cours.")
    if texte(valeurs, "ddr"):
        lignes.append(f"Date des dernières règles : {texte(valeurs, 'ddr')}.")

    for cle, titre in (("motif", "Motif"), ("histoire", "Histoire de la maladie")):
        if texte(valeurs, cle):
            lignes.append(f"{titre} : {texte(valeurs, cle)}")
    if valeurs.get("signes"):
        lignes.append("Signes rapportés : " + ", ".join(valeurs["signes"]) + ".")

    if ETATS_GENERAUX.get(texte(valeurs, "etat_general")):
        lignes.append("Examen physique : " + synthese_examen(valeurs))
    else:
        lignes.append("Examen physique : pas encore renseigné.")
    tdr = resultats_tdr(valeurs)
    lignes.append("Tests rapides : " + (", ".join(tdr) if tdr else "aucun réalisé") + ".")

    for cle, titre in (("diagnostic", "Diagnostic retenu par le médecin"), ("hypotheses", "Hypothèses"),
                       ("pathologies", "Pathologies associées")):
        if texte(valeurs, cle):
            lignes.append(f"{titre} : {texte(valeurs, cle)}")
    if valeurs.get("examens"):
        noms = LabExam.objects.filter(code__in=valeurs["examens"]).values_list("name", flat=True)
        lignes.append("Examens demandés : " + ", ".join(noms) + ".")
    ordonnance = lignes_ordonnance(valeurs)
    if ordonnance:
        lignes.append("Ordonnance : " + " ; ".join(f"{l['medicament']} {l['posologie']} {l['duree']}".strip() for l in ordonnance))
    return "\n".join(lignes)


def exiger(condition, message):
    if not condition:
        raise IaIndisponible(message)


def demander(admission, valeurs, cible, annexe=""):
    """Charte + dossier balisé + consigne de la rubrique ; la réponse est un objet JSON."""
    return completer([
        {"role": "system", "content": CHARTE},
        {"role": "user", "content": "\n\n".join(filter(None, [
            dossier_balise(contexte(admission, valeurs)), annexe, CONSIGNES[cible],
        ]))},
    ], format_json=True)


def chaine(reponse, cle):
    return str(reponse.get(cle) or "").strip()


def proposer_diagnostic(admission, valeurs):
    exiger(texte(valeurs, "motif") or texte(valeurs, "histoire"),
           "Renseignez d'abord le motif ou l'histoire de la maladie : l'assistant n'a rien sur quoi raisonner.")
    reponse = demander(admission, valeurs, "diagnostic")
    return {
        "diagnostic": chaine(reponse, "diagnostic").rstrip(".")[:120],
        "hypotheses": [str(h).strip() for h in reponse.get("hypotheses") or [] if str(h).strip()][:2],
        "justification": chaine(reponse, "justification"),
        "gravite": chaine(reponse, "gravite"),
    }


def proposer_examens(admission, valeurs):
    catalogue = {e.code: e.name for e in LabExam.objects.filter(active=True)}
    exiger(catalogue, "Le catalogue du laboratoire est vide.")
    liste = "Examens disponibles au laboratoire (code : nom) :\n" + "\n".join(
        f"{code} : {nom}" for code, nom in catalogue.items())
    reponse = demander(admission, valeurs, "examens", liste)
    # Un code inventé par le modèle ne passe pas : seul le catalogue existe.
    codes = [c for c in reponse.get("examens") or [] if c in catalogue]
    return {"examens": codes, "justification": chaine(reponse, "justification")}


def proposer_ordonnance(admission, valeurs):
    exiger(texte(valeurs, "diagnostic"), "Posez d'abord le diagnostic : l'ordonnance en découle.")
    stock = list(Product.objects.filter(category="Médicament", stock__gt=0).order_by("name"))
    disponibles = {p.name.lower(): p.name for p in stock}
    liste = "Médicaments en stock à la pharmacie :\n" + (
        "\n".join(f"- {p.name} ({p.therapeutic_class or 'médicament'}, {p.stock} {p.unit})" for p in stock) or "- aucun")
    reponse = demander(admission, valeurs, "ordonnance", liste)

    lignes = []
    for ligne in reponse.get("lignes") or []:
        if not isinstance(ligne, dict) or not str(ligne.get("medicament") or "").strip():
            continue
        nom = str(ligne["medicament"]).strip()
        lignes.append({
            "medicament": disponibles.get(nom.lower(), nom),
            "posologie": str(ligne.get("posologie") or "").strip(),
            "duree": str(ligne.get("duree") or "").strip(),
            "quantite": str(ligne.get("quantite") or "1").strip(),
            "voie": str(ligne.get("voie") or "Orale").strip(),
            "horsStock": nom.lower() not in disponibles,
        })
    # Garde-fous : ce que le modèle a pu laisser passer, le serveur le retire.
    lignes, retraits = verifier_ordonnance(
        lignes,
        age=age_from_birth_date(admission.patient.birth_date),
        grossesse=valeurs.get("grossesse") == "oui",
        allergies=texte(valeurs, "allergies") or admission.patient.allergies,
        diagnostic=texte(valeurs, "diagnostic"),
    )
    return {
        "ordonnance": lignes,
        "retraits": retraits,
        "precautions": chaine(reponse, "precautions"),
        "conseils": chaine(reponse, "conseils"),
    }


def proposer_conseils(admission, valeurs):
    exiger(texte(valeurs, "diagnostic"), "Posez d'abord le diagnostic : les conseils en découlent.")
    return {"conseils": chaine(demander(admission, valeurs, "conseils"), "conseils")}


PROPOSITIONS = {
    "diagnostic": proposer_diagnostic,
    "examens": proposer_examens,
    "ordonnance": proposer_ordonnance,
    "conseils": proposer_conseils,
}


def proposer(*, consultation, cible, valeurs):
    """Calcule la proposition et en garde la trace sur la consultation."""
    if cible not in PROPOSITIONS:
        raise IaIndisponible("Rubrique inconnue pour l'assistant.")
    proposition = PROPOSITIONS[cible](consultation.admission, valeurs)
    consultation.ai_trace = {**consultation.ai_trace, cible: {"le": timezone.now().isoformat(), **proposition}}
    consultation.save(update_fields=["ai_trace"])
    return proposition


MAX_MESSAGES = 16
MAX_CARACTERES = 2000


def discuter(*, consultation, question, valeurs=None):
    """Une question du médecin sur CE patient : la réponse s'ajoute à la conversation enregistrée."""
    question = str(question or "").strip()[:MAX_CARACTERES]
    exiger(question, "Posez une question à l'assistant.")
    admission = consultation.admission
    valeurs = valeurs if isinstance(valeurs, dict) and valeurs else consultation.form_data
    trace = consultation.ai_trace or {}

    medecin = consultation.doctor
    nom = (medecin.last_name or medecin.first_name or "").strip()
    systeme = [CHARTE, CONSIGNES["conversation"], dossier_balise(contexte(admission, valeurs))]
    if nom:
        systeme.append(f"Le médecin qui te parle : Docteur {nom.title()}.")
    if consultation.completed_at:
        systeme.append(f"Cette consultation est terminée. Diagnostic retenu : {consultation.diagnosis or 'non précisé'}.")
    if trace.get("diagnostic"):
        d = trace["diagnostic"]
        systeme.append(f"Tu as proposé plus tôt le diagnostic « {d.get('diagnostic')} » "
                       f"(hypothèses : {', '.join(d.get('hypotheses') or [])}). Ta justification : {d.get('justification')}")
    if trace.get("ordonnance"):
        o = trace["ordonnance"]
        systeme.append("Tu as proposé l'ordonnance : " + " ; ".join(
            f"{l.get('medicament')} {l.get('posologie')}" for l in o.get("ordonnance") or []))
        if o.get("retraits"):
            systeme.append("Le serveur a retiré de ta proposition : " + " ".join(o["retraits"]))

    historique = [{"role": m["role"], "content": m["content"]} for m in consultation.ia_messages][-MAX_MESSAGES:]
    reponse = completer([{"role": "system", "content": "\n\n".join(systeme)}, *historique,
                         {"role": "user", "content": question}], temperature=0.4, max_tokens=900)
    maintenant = timezone.now()
    consultation.ia_messages = [
        *consultation.ia_messages,
        {"role": "user", "content": question, "le": maintenant.isoformat()},
        {"role": "assistant", "content": reponse, "le": maintenant.isoformat()},
    ]
    consultation.ia_echange_le = maintenant
    consultation.save(update_fields=["ia_messages", "ia_echange_le"])
    return consultation.ia_messages
