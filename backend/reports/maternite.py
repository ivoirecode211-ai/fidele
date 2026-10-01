"""Rapports de santé maternelle : CPN, accouchement, CPON.

Repris des rapports du logiciel DPI national (mêmes intitulés de lignes),
calculés sur les formulaires des programmes (consultation/programmes.js,
consultation/graphiques.js).

« Organiser par » : total uniquement, ou par tranche d'âge de la mère
(8-14, 15-19, 20-24, 25-49, 50 ans et plus).
"""
from collections import OrderedDict
from datetime import date

from django.utils import timezone

from .etats import Grille, mois, sexe, valeur

MERES = [("8-14 ans", 8, 15), ("15-19 ans", 15, 20), ("20-24 ans", 20, 25), ("25-49 ans", 25, 50), ("50 ans +", 50, 200)]


def grille(f, *, par_age=False):
    """« Par total uniquement » : une seule colonne ; sinon les tranches d'âge de la mère."""
    if par_age or f.organiser in ("age", "genre"):
        return Grille(MERES)
    return Grille([])


def du_programme(f, code):
    return [c for c in f.consultations() if c.specialite == code]


def ajouter(g, libelle, c):
    g.ajouter(libelle, mois(c.patient, c.completed_at), sexe(c.patient))


def entier(v):
    try:
        return int(str(v).strip())
    except (TypeError, ValueError):
        return None


def semaines(c):
    """Terme en semaines d'aménorrhée à la date de la consultation."""
    try:
        ddr = date.fromisoformat(str(valeur(c, "ddr")))
    except ValueError:
        return None
    return (timezone.localtime(c.completed_at).date() - ddr).days // 7


def tension_elevee(texte):
    try:
        haute, basse = (int(x) for x in str(texte).replace(" ", "").split("/")[:2])
    except ValueError:
        return False
    return haute >= 140 or basse >= 90


# ------------------------------------------------------------------ CPN

def cpn_activites(f):
    g = grille(f)
    lignes = ["1ère CPN au cours du 1er trimestre de la grossesse", "1ère CPN autre trimestre de la grossesse", "CPN2", "CPN3",
              "CPN4 au 9ème mois de la grossesse", "CPN4 autre trimestre de la grossesse", "CPN5", "CPN6", "CPN7", "CPN8 et plus"]
    for l in lignes:
        g.ligne(l)
    for c in du_programme(f, "cpn"):
        n, sa = entier(valeur(c, "numero_cpn")) or 1, semaines(c)
        if n == 1:
            ajouter(g, lignes[0] if sa is not None and sa < 14 else lignes[1], c)
        elif n == 4:
            ajouter(g, lignes[4] if sa is not None and sa >= 36 else lignes[5], c)
        elif n >= 8:
            ajouter(g, lignes[9], c)
        else:
            ajouter(g, {2: lignes[2], 3: lignes[3], 5: lignes[6], 6: lignes[7], 7: lignes[8]}[n], c)
    return [g.tableau("Activités de consultations prénatales", "Femmes enceintes reçues", total="TOTAL DES CONSULTATIONS")]


SIGNES = ["Saignement vaginal", "Céphalées et troubles visuels", "Convulsions", "Fièvre", "Perte de liquide",
          "Diminution des mouvements du bébé", "Douleurs abdominales intenses", "Pâleur importante"]


def cpn_risque(f):
    g = grille(f)
    autres = ["Tension artérielle élevée (≥ 140/90)", "Anémie (Hb < 11 g/dL)", "Protéinurie positive", "Œdèmes",
              "VIH positif", "Syphilis positive", "Âge inférieur à 18 ans", "Âge de 35 ans et plus",
              "Grande multiparité (5 accouchements et plus)", "Césarienne antérieure"]
    for l in SIGNES + autres:
        g.ligne(l)
    g.ligne("FEMMES À RISQUE DÉPISTÉES", "total")
    for c in du_programme(f, "cpn"):
        age = mois(c.patient, c.completed_at)
        hb = valeur(c, "hemoglobine")
        facteurs = [s for s in (valeur(c, "signes_danger") or []) if s in SIGNES]
        facteurs += [l for l, vrai in [
            (autres[0], tension_elevee(valeur(c, "tension_cpn"))),
            (autres[1], hb not in (None, "") and float(str(hb).replace(",", ".")) < 11),
            (autres[2], valeur(c, "proteinurie") in ("+", "++", "+++")),
            (autres[3], valeur(c, "oedemes_cpn") == "oui"),
            (autres[4], valeur(c, "vih_cpn") == "positif"),
            (autres[5], valeur(c, "syphilis") == "positif"),
            (autres[6], age is not None and age < 18 * 12),
            (autres[7], age is not None and age >= 35 * 12),
            (autres[8], (entier(valeur(c, "parite")) or 0) >= 5),
            (autres[9], valeur(c, "cesarienne") == "oui"),
        ] if vrai]
        for l in facteurs:
            ajouter(g, l, c)
        if facteurs:
            g.ajouter("FEMMES À RISQUE DÉPISTÉES", age, sexe(c.patient))
    return [g.tableau("Dépistage des grossesses à risque", "Facteurs de risque")]


def cpn_prevention(f):
    g = grille(f)
    lignes = [f"TPI {i} (SP{i})" for i in range(1, 6)] + [f"Td{i}" for i in range(1, 6)] + [
        "Fer + acide folique", "Moustiquaire imprégnée (MILDA) remise"]
    for l in lignes:
        g.ligne(l)
    for c in du_programme(f, "cpn"):
        tpi, td = str(valeur(c, "tpi") or ""), str(valeur(c, "vat") or "")
        if tpi.startswith("SP"):
            ajouter(g, f"TPI {tpi[2:]} ({tpi})", c)
        if td.startswith("Td"):
            ajouter(g, td, c)
        if valeur(c, "fer_folique") == "oui":
            ajouter(g, lignes[10], c)
        if valeur(c, "milda") == "oui":
            ajouter(g, lignes[11], c)
    return [g.tableau("Prévention au cours de la grossesse", "Interventions")]


def _test(f, cle, titre, nom):
    g = grille(f)
    for l in (f"{nom} réalisés", f"{nom} positifs", f"{nom} négatifs"):
        g.ligne(l)
    for c in du_programme(f, "cpn"):
        resultat = valeur(c, cle)
        if resultat in ("positif", "negatif"):
            ajouter(g, f"{nom} réalisés", c)
            ajouter(g, f"{nom} positifs" if resultat == "positif" else f"{nom} négatifs", c)
    return [g.tableau(titre, "Femmes enceintes")]


def cpn_goutte(f):
    return _test(f, "goutte_epaisse", "Goutte épaisse", "Gouttes épaisses")


def cpn_tdr(f):
    return _test(f, "tdr_palu_cpn", "TDR paludisme", "TDR paludisme")


def cpn_pathologies(f):
    g = grille(f, par_age=True)
    for c in du_programme(f, "cpn"):
        for p in valeur(c, "pathologies_grossesse") or []:
            ajouter(g, str(p), c)
    return [g.tableau("Pathologies par tranche d'âge", "Pathologies", total="TOTAL", tri=True)]


# ------------------------------------------------------------------ accouchement

def acc_lieu(f):
    g = grille(f)
    for l in ("Accouchement à domicile", "Accouchement dans l'établissement", "Accouchement en route"):
        g.ligne(l)
    for c in du_programme(f, "accouchement"):
        lieu = valeur(c, "lieu_accouchement_acc") or "Établissement"
        ajouter(g, {"Domicile": "Accouchement à domicile", "En route": "Accouchement en route"}.get(lieu, "Accouchement dans l'établissement"), c)
    return [g.tableau("Lieu d'accouchement", "Lieu", total="Total")]


def acc_vat(f):
    g = grille(f)
    for l in ("Non vaccinée", "Td1", "Td2", "Td3", "Td4", "Td5", "Inconnu"):
        g.ligne(l)
    for c in du_programme(f, "accouchement"):
        ajouter(g, valeur(c, "statut_vat") or "Inconnu", c)
    return [g.tableau("Statut vaccinal au VAT à l'accouchement", "Statut vaccinal", total="Total")]


def acc_issue(f):
    g = grille(f)
    lignes = ["Naissances vivantes", "Naissances vivantes de sexe masculin", "Naissances vivantes de sexe féminin",
              "Mort-nés", "Nouveau-nés de faible poids (< 2 500 g)", "Nouveau-nés réanimés"]
    for l in lignes:
        g.ligne(l)
    for c in du_programme(f, "accouchement"):
        if valeur(c, "vivant") == "non":
            ajouter(g, "Mort-nés", c)
            continue
        ajouter(g, "Naissances vivantes", c)
        if valeur(c, "sexe_bebe") in ("M", "F"):
            ajouter(g, lignes[1] if valeur(c, "sexe_bebe") == "M" else lignes[2], c)
        poids = entier(valeur(c, "poids_naissance"))
        if poids and poids < 2500:
            ajouter(g, lignes[4], c)
        if valeur(c, "reanimation") == "oui":
            ajouter(g, lignes[5], c)
    return [g.tableau("Issue de la grossesse", "Issue")]


COMPLICATIONS = ["Hémorragie du post-partum", "Déchirure périnéale", "Épisiotomie", "Éclampsie", "Rétention placentaire", "Rupture utérine"]


def acc_evacuation(f):
    g = grille(f)
    for l in COMPLICATIONS + ["Mères évacuées vers une autre structure", "Nouveau-nés réanimés"]:
        g.ligne(l)
    for c in du_programme(f, "accouchement"):
        for comp in valeur(c, "complications_mere") or []:
            ajouter(g, str(comp), c)
        if c.outcome == "refere_externe":
            ajouter(g, "Mères évacuées vers une autre structure", c)
        if valeur(c, "reanimation") == "oui":
            ajouter(g, "Nouveau-nés réanimés", c)
    return [g.tableau("Évacuation des mères et des nouveau-nés / complications obstétricales", "Complications et évacuations")]


def acc_declaration(f):
    g = grille(f)
    for l in ("Naissances vivantes", "Déclarations de naissance faites en salle d'accouchement", "Naissances non déclarées"):
        g.ligne(l)
    for c in du_programme(f, "accouchement"):
        if valeur(c, "vivant") == "non":
            continue
        ajouter(g, "Naissances vivantes", c)
        ajouter(g, "Déclarations de naissance faites en salle d'accouchement" if valeur(c, "declaration_naissance") == "oui"
                else "Naissances non déclarées", c)
    return [g.tableau("Déclaration de naissance en salle d'accouchement", "Naissances")]


MODES = ["Voie basse", "Voie basse instrumentale", "Césarienne"]


def _mode(f, par_age):
    g = grille(f, par_age=par_age)
    for l in MODES:
        g.ligne(l)
    for c in du_programme(f, "accouchement"):
        if valeur(c, "mode_accouchement"):
            ajouter(g, str(valeur(c, "mode_accouchement")), c)
    titre = "Mode d'accouchement par tranche d'âge" if par_age else "Mode d'accouchement"
    return [g.tableau(titre, "Mode d'accouchement", total="Total")]


def acc_mode(f):
    return _mode(f, False)


def acc_mode_age(f):
    return _mode(f, True)


# ------------------------------------------------------------------ CPON

# Anciennes valeurs (J3, J7, S6) rattachées aux périodes du DPI.
PERIODES_CPON = OrderedDict([
    ("immediate", "Consultation postnatale immédiate dans les 6 à 72 heures suivant l'accouchement"),
    ("j6_10", "Consultation postnatale entre le 6e et le 10e jour après l'accouchement"),
    ("autre", "Consultation postnatale autres périodes (> 72 h et < 6 jours ; > 10 jours et < 6e semaine)"),
    ("s6_8", "Consultation postnatale (6e semaine à 8e semaine)"),
])
ANCIENNES = {"J3": "immediate", "J7": "j6_10", "S6": "s6_8"}


def cpon_activites(f):
    g = grille(f)
    for l in PERIODES_CPON.values():
        g.ligne(l)
    for c in du_programme(f, "cpon"):
        visite = valeur(c, "visite_cpon") or "autre"
        ajouter(g, PERIODES_CPON.get(ANCIENNES.get(visite, visite), PERIODES_CPON["autre"]), c)
    return [g.tableau("Consultations postnatales", "Nombre de femmes vues en consultations postnatales", total="Total")]


# ------------------------------------------------------------------ catalogue

# id -> (groupe, libellé, fonction, service, organiser)
#   organiser : "total_age" (au choix), "age" (toujours par tranche d'âge)
ETATS = OrderedDict([
    ("cpn_activites", ("maternite", "Activités de consultations prénatales", cpn_activites, "cpn", "total_age")),
    ("cpn_risque", ("maternite", "Dépistage des grossesses à risque", cpn_risque, "cpn", "total_age")),
    ("cpn_prevention", ("maternite", "Prévention au cours de la grossesse", cpn_prevention, "cpn", "total_age")),
    ("cpn_goutte", ("maternite", "Goutte épaisse", cpn_goutte, "cpn", "total_age")),
    ("cpn_tdr", ("maternite", "TDR paludisme", cpn_tdr, "cpn", "total_age")),
    ("cpn_pathologies", ("maternite", "Pathologies par tranche d'âge", cpn_pathologies, "cpn", "age")),
    ("acc_lieu", ("maternite", "Lieu d'accouchement", acc_lieu, "accouchement", "total_age")),
    ("acc_vat", ("maternite", "Statut vaccinal au VAT à l'accouchement", acc_vat, "accouchement", "total_age")),
    ("acc_issue", ("maternite", "Issue de la grossesse", acc_issue, "accouchement", "total_age")),
    ("acc_evacuation", ("maternite", "Évacuation des mères et des nouveau-nés / complications obstétricales", acc_evacuation, "accouchement", "total_age")),
    ("acc_declaration", ("maternite", "Déclaration de naissance en salle d'accouchement", acc_declaration, "accouchement", "total_age")),
    ("acc_mode", ("maternite", "Mode d'accouchement", acc_mode, "accouchement", "total_age")),
    ("acc_mode_age", ("maternite", "Mode d'accouchement par tranche d'âge", acc_mode_age, "accouchement", "age")),
    ("cpon_activites", ("maternite", "Consultations postnatales", cpon_activites, "cpon", "total_age")),
])
