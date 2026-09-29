"""Les spécialités du module Consultation (voir docs/specialites.md).

Un code par spécialité, partagé avec le frontend (frontend/src/catalogue/specialites.js) :
la prestation choisie en caisse porte un code, la consultation ouvre le formulaire de ce
code, et le praticien voit la file des spécialités qui lui sont attribuées.

`obligatoires` : ce que le serveur exige pour clore la consultation, en plus de l'issue.
Tout le reste du formulaire est facultatif.
"""

GENERALE = "medecine-generale"

# Tronc commun : ce qu'exige toute consultation.
COMMUNS = {
    "motif": "Veuillez indiquer le motif de consultation.",
    "diagnostic": "Veuillez poser le diagnostic retenu.",
}
CLINIQUE = {
    "histoire": "Veuillez décrire l'histoire de la maladie.",
    "etat_general": "Veuillez indiquer l'état général.",
}

SPECIALITES = {
    GENERALE: {"nom": "Médecine générale", "obligatoires": {**COMMUNS, **CLINIQUE}},
    "pediatrie": {"nom": "Pédiatrie", "obligatoires": {**COMMUNS, **CLINIQUE}},
    "dentaire": {"nom": "Cabinet dentaire", "obligatoires": COMMUNS},
    "cardiologie": {"nom": "Cardiologie", "obligatoires": {**COMMUNS, **CLINIQUE}},
    "chirurgie": {"nom": "Chirurgie", "obligatoires": {**COMMUNS, "indication_operatoire": "Veuillez indiquer s'il y a une indication opératoire."}},
    "cpa": {"nom": "Consultation pré-anesthésie", "obligatoires": {
        "motif": COMMUNS["motif"], "asa": "Veuillez indiquer le score ASA.", "aptitude": "Veuillez conclure : apte ou non.",
    }},
    "dermatologie": {"nom": "Dermatologie", "obligatoires": COMMUNS},
    "gynecologie": {"nom": "Gynécologie", "obligatoires": COMMUNS},
    "kinesitherapie": {"nom": "Kinésithérapie", "obligatoires": {"motif": COMMUNS["motif"], "zone": "Veuillez indiquer la zone traitée."}},
    "ophtalmologie": {"nom": "Ophtalmologie", "obligatoires": COMMUNS},
    "orl": {"nom": "ORL", "obligatoires": COMMUNS},
    "diabetologie": {"nom": "Diabétologie", "obligatoires": COMMUNS},
    "neuro-psychiatrie": {"nom": "Neuro-psychiatrie", "obligatoires": {**COMMUNS, "idees_suicidaires": "Veuillez renseigner les idées suicidaires."}},
    "urologie": {"nom": "Urologie", "obligatoires": COMMUNS},
    "rhumatologie": {"nom": "Rhumatologie", "obligatoires": COMMUNS},
    "pneumologie": {"nom": "Pneumologie", "obligatoires": {**COMMUNS, **CLINIQUE}},
    "hemodialyse": {"nom": "Hémodialyse", "obligatoires": {"poids_avant": "Veuillez indiquer le poids avant la séance."}},
    "cpn": {"nom": "Consultation prénatale", "obligatoires": {"ddr": "Veuillez indiquer la date des dernières règles.",
                                                              "tension_cpn": "Veuillez indiquer la tension artérielle."}},
    "accouchement": {"nom": "Accouchement", "obligatoires": {"mode_accouchement": "Veuillez indiquer le mode d'accouchement."}},
    "cpon": {"nom": "Consultation postnatale", "obligatoires": {"visite_cpon": "Veuillez indiquer la visite postnatale."}},
    "planning-familial": {"nom": "Planning familial", "obligatoires": {"methode_pf": "Veuillez indiquer la méthode choisie."}},
    "vaccination": {"nom": "Vaccination", "obligatoires": {}},
    "vih": {"nom": "VIH", "obligatoires": {"statut_arv": "Veuillez indiquer la situation du traitement ARV."}},
}

# Prestations du catalogue de la caisse → spécialité, à la première installation.
PAR_PRESTATION = {
    "médecine générale": GENERALE, "consultation spécialisée": GENERALE, "urgences": GENERALE,
    "cardiologie": "cardiologie", "électrocardiogramme (ecg)": "cardiologie",
    "chirurgie": "chirurgie", "petite chirurgie": "chirurgie",
    "dermatologie": "dermatologie", "gynécologie": "gynecologie", "consultation prénatale": "cpn",
    "kinésithérapie": "kinesitherapie", "ophtalmologie": "ophtalmologie", "orl": "orl",
    "pédiatrie": "pediatrie", "vaccination": "vaccination",
}


def nom(code):
    return SPECIALITES.get(code, SPECIALITES[GENERALE])["nom"]


def liste():
    return [{"code": code, "nom": s["nom"]} for code, s in SPECIALITES.items()]
