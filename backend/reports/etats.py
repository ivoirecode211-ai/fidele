"""États officiels : les tableaux que l'établissement remet au district.

Repris des états du logiciel DPI national (activités de consultation par
tranche d'âge, nutrition, pathologies, décès, référencements, laboratoire,
TDR, vaccination, contrôle du major ; caisses, prestations, assurances…),
calculés sur ce que l'application enregistre réellement.

Chaque état renvoie des tableaux au même format :

    {"titre", "entete", "colonnes": [{"label", "sous": ["M", "F"]?}],
     "lignes": [{"libelle", "valeurs": [...], "type": "normal" | "groupe" | "total"}]}

Filtres communs : période (du, au), service (code de spécialité), médecins,
`genre` (tranches d'âge détaillées par sexe).
"""
from collections import Counter, OrderedDict, defaultdict
from datetime import date

from django.db.models import Q
from django.utils import timezone

from consultations import specialites
from consultations.models import Consultation
from laboratory.models import LabRequest, LabResult
from parcours.models import Admission, MedicalService, VitalSigns

from . import praticien
from .detail import name

# ------------------------------------------------------------------ tranches d'âge

ANS = [("0-4 ans", 0, 5), ("5-9 ans", 5, 10), ("10-14 ans", 10, 15), ("15-19 ans", 15, 20),
       ("20-24 ans", 20, 25), ("25-49 ans", 25, 50), ("50 ans +", 50, 200)]
NUTRITION = [("0-5 mois", 0, 6), ("6-11 mois", 6, 12), ("12-23 mois", 12, 24), ("24-59 mois", 24, 60),
             ("5-9 ans", 60, 120), ("10-14 ans", 120, 180), ("15-19 ans", 180, 240), ("20-24 ans", 240, 300),
             ("25 ans et +", 300, 100000)]
VACCINATION = [("0-11 mois", 0, 12), ("12-23 mois", 12, 24), ("24-59 mois", 24, 60), ("5 ans et +", 60, 100000)]

# Programmes de suivi : ils s'intitulent eux-mêmes, sans diagnostic de maladie.
PROGRAMMES = {"cpn", "cpon", "accouchement", "planning-familial", "vaccination", "hemodialyse", "kinesitherapie", "cpa"}


def mois(patient, quand):
    """Âge en mois à la date de l'acte (None si la date de naissance manque)."""
    if not patient.birth_date:
        return None
    jour = timezone.localtime(quand).date() if hasattr(quand, "hour") else quand
    return (jour.year - patient.birth_date.year) * 12 + jour.month - patient.birth_date.month - (jour.day < patient.birth_date.day)


def sexe(patient):
    return patient.sex if patient.sex in ("M", "F") else "M"


class Grille:
    """Compte des lignes par tranche d'âge (en mois), éventuellement par sexe."""

    def __init__(self, tranches, *, genre=False, en_ans=True, extra=(), total_genre=False):
        self.tranches = [(l, a * 12 if en_ans else a, b * 12 if en_ans else b) for l, a, b in tranches]
        self.genre = genre
        self.extra = list(extra)                      # colonnes hors tranches (F.E., F.A.)
        self.total_genre = total_genre and genre      # « Total par genre » : M et F, avant le total
        self.lignes = OrderedDict()                   # libellé -> (Counter, type)

    def ligne(self, libelle, type_="normal"):
        return self.lignes.setdefault(libelle, (Counter(), type_))[0]

    def ajouter(self, libelle, age_mois, sx, n=1, extra=None):
        compte = self.ligne(libelle)
        if age_mois is not None:
            for i, (_, a, b) in enumerate(self.tranches):
                if a <= age_mois < b:
                    compte[(i, sx if self.genre else "")] += n
                    break
        else:
            compte["inconnu"] += n
        if extra:
            compte[("x", extra)] += n
        compte[("sexe", sx)] += n
        compte["total"] += n

    def colonnes(self):
        sous = ["M", "F"] if self.genre else None
        cols = [{"label": l, **({"sous": sous} if sous else {})} for l, _, _ in self.tranches]
        cols += [{"label": x} for x in self.extra]
        if self.total_genre:
            cols.append({"label": "Total par genre", "sous": ["M", "F"]})
        return cols + [{"label": "Total"}]

    def valeurs(self, compte):
        vals = []
        for i in range(len(self.tranches)):
            vals += [compte[(i, "M")], compte[(i, "F")]] if self.genre else [compte[(i, "")]]
        vals += [compte[("x", x)] for x in self.extra]
        if self.total_genre:
            vals += [compte[("sexe", "M")], compte[("sexe", "F")]]
        return vals + [compte["total"]]

    def tableau(self, titre, entete, *, total=None, tri=False):
        items = list(self.lignes.items())
        if tri:
            items.sort(key=lambda kv: -kv[1][0]["total"])
        lignes = [{"libelle": l, "valeurs": self.valeurs(c), "type": t} for l, (c, t) in items]
        if total:
            somme = Counter()
            for c, t in self.lignes.values():
                if t == "normal":
                    somme.update(c)
            lignes.append({"libelle": total, "valeurs": self.valeurs(somme), "type": "total"})
        return {"titre": titre, "entete": entete, "colonnes": self.colonnes(), "lignes": lignes}


def liste(titre, entete, colonnes, lignes):
    """Un tableau de détail : une ligne par événement."""
    return {"titre": titre, "entete": entete, "colonnes": [{"label": c} for c in colonnes],
            "lignes": [{"libelle": l[0], "valeurs": list(l[1:]), "type": "normal"} for l in lignes]}


def fcfa(v):
    return f"{int(v or 0):,}".replace(",", " ")


# ------------------------------------------------------------------ contexte (filtres)

class Filtres:
    def __init__(self, hospital, du, au, service="", medecins=(), genre=False, permis=None, organiser=""):
        self.hospital, self.du, self.au = hospital, du, au
        self.permis = permis
        # « Organiser par » : total, age (tranches d'âge), genre (tranches d'âge et genre).
        self.organiser = organiser or ("genre" if genre else "age")
        self.service = service or ""
        self.medecins = [int(m) for m in medecins if str(m).isdigit()]
        self.genre = genre

    def consultations(self):
        """Consultations terminées de la période, filtrées (service, médecins, services permis)."""
        qs = (Consultation.objects.filter(patient__hospital=self.hospital, completed_at__date__range=(self.du, self.au))
              .select_related("patient", "doctor", "admission__service").order_by("completed_at"))
        if self.medecins:
            qs = qs.filter(doctor_id__in=self.medecins)
        if self.service:
            qs = qs.filter(specialite=self.service) if self.service != specialites.GENERALE \
                else qs.filter(Q(specialite=self.service) | Q(specialite=""))
        if self.permis is not None:
            # Rapport vu depuis un module métier : les seuls services du praticien.
            filtre = Q(specialite__in=self.permis)
            if specialites.GENERALE in self.permis:
                filtre |= Q(specialite="")
            qs = qs.filter(filtre)
        return list(qs)

    def admissions(self):
        return Admission.objects.of_hospital(self.hospital).select_related("patient", "service__department", "session__cashier", "created_by")


def service_de(c):
    return specialites.nom(c.specialite or specialites.GENERALE)


def valeur(c, cle):
    return (c.form_data or {}).get(cle)


# ------------------------------------------------------------------ états des activités

def activites_consultations(f):
    grille = Grille(ANS, genre=f.genre)
    par_service = defaultdict(list)
    for c in f.consultations():
        par_service[service_de(c)].append(c)
    totaux = {k: Counter() for k in ("consultants", "consultations", "recus", "vers")}
    for service in sorted(par_service):
        grille.ligne(service.upper(), "groupe")
        for libelle in ("Nombre de consultants", "Nombre de consultations",
                        "Référés d'une autre structure reçus", "Référés vers une autre structure"):
            grille.ligne(f"{service} · {libelle}")
        vus = set()
        for c in par_service[service]:
            age, sx = mois(c.patient, c.completed_at), sexe(c.patient)
            if c.patient_id not in vus:
                vus.add(c.patient_id)
                grille.ajouter(f"{service} · Nombre de consultants", age, sx)
            grille.ajouter(f"{service} · Nombre de consultations", age, sx)
            if valeur(c, "refere_recu"):
                grille.ajouter(f"{service} · Référés d'une autre structure reçus", age, sx)
            if c.outcome == "refere_externe":
                grille.ajouter(f"{service} · Référés vers une autre structure", age, sx)
        for cle, libelle in [("consultants", "Nombre de consultants"), ("consultations", "Nombre de consultations"),
                             ("recus", "Référés d'une autre structure reçus"), ("vers", "Référés vers une autre structure")]:
            totaux[cle].update(grille.lignes[f"{service} · {libelle}"][0])
    tableau = grille.tableau("Activités par service", "Activités")
    for ligne in tableau["lignes"]:
        ligne["libelle"] = ligne["libelle"].split(" · ", 1)[-1]
    for cle, libelle in [("consultants", "TOTAL CONSULTANTS"), ("consultations", "TOTAL CONSULTATIONS"),
                         ("recus", "TOTAL RÉFÉRÉS D'UNE AUTRE STRUCTURE REÇUS"), ("vers", "TOTAL RÉFÉRÉS VERS UNE AUTRE STRUCTURE")]:
        tableau["lignes"].append({"libelle": libelle, "valeurs": grille.valeurs(totaux[cle]), "type": "total"})
    return [tableau]


def _nombre(v):
    try:
        return float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return None


def nutrition(f):
    grille = Grille(NUTRITION, genre=True, en_ans=False, extra=["F.E.", "F.A."])
    lignes = ["Personnes ayant bénéficié d'une évaluation nutritionnelle (poids et taille)",
              "Malnutrition aiguë sévère sans complication", "Malnutrition aiguë sévère avec complication",
              "Malnutrition aiguë modérée", "Surpoids", "Obésité"]
    for l in lignes:
        grille.ligne(l)
    consultations = f.consultations()
    constantes = {}
    for v in VitalSigns.objects.filter(admission_id__in=[c.admission_id for c in consultations if c.admission_id]).order_by("recorded_at"):
        constantes[v.admission_id] = v
    for c in consultations:
        vit = constantes.get(c.admission_id)
        poids = _nombre(valeur(c, "poids_enfant")) or (float(vit.weight) if vit and vit.weight else None)
        taille = _nombre(valeur(c, "taille_enfant")) or (float(vit.height) if vit and vit.height else None)
        pb = _nombre(valeur(c, "pb"))
        if not (poids or pb):
            continue
        age, sx = mois(c.patient, c.completed_at), sexe(c.patient)
        extra = "F.E." if c.specialite == "cpn" else "F.A." if c.specialite == "cpon" else None
        grille.ajouter(lignes[0], age, sx, extra=extra)
        if age is not None and age < 60:
            severe = (pb is not None and pb < 115) or valeur(c, "oedemes_bilateraux") == "oui"
            if severe:
                complique = bool(valeur(c, "signes_danger_enfant")) or valeur(c, "etat_general") == "altere"
                grille.ajouter(lignes[2] if complique else lignes[1], age, sx)
            elif pb is not None and pb < 125:
                grille.ajouter(lignes[3], age, sx)
        elif age is not None and age >= 180 and poids and taille:
            imc = poids / ((taille / 100) ** 2)
            if imc >= 30:
                grille.ajouter(lignes[5], age, sx, extra=extra)
            elif imc >= 25:
                grille.ajouter(lignes[4], age, sx, extra=extra)
    return [grille.tableau("Évaluation nutritionnelle par tranche d'âge", "Activités")]


def deces(f):
    grille = Grille(ANS, genre=f.genre)
    grille.ligne("Décès")
    rows = []
    for c in f.consultations():
        if c.outcome != "decede":
            continue
        age = mois(c.patient, c.completed_at)
        grille.ajouter("Décès", age, sexe(c.patient))
        rows.append([timezone.localtime(c.completed_at).strftime("%d/%m/%Y"), name(c.patient),
                     f"{age // 12} ans" if age is not None else "—", c.patient.get_sex_display(), service_de(c),
                     c.diagnosis or "—", f"{c.doctor.last_name.upper()} {c.doctor.first_name}"])
    return [grille.tableau("Décès par tranche d'âge", "Décès"),
            liste("Liste des décès", "Date", ["Patient", "Âge", "Sexe", "Service", "Diagnostic", "Médecin"], rows)]


def normaliser(diagnostic):
    texte = " ".join(str(diagnostic or "").split()).strip(" .")
    return texte[:1].upper() + texte[1:].lower() if texte else ""


def pathologies(f):
    grille = Grille(ANS, genre=f.genre, total_genre=True)
    for c in f.consultations():
        if (c.specialite or "") in PROGRAMMES or c.specialite == "vih":
            continue
        diagnostic = normaliser(c.diagnosis)
        if diagnostic:
            grille.ajouter(diagnostic, mois(c.patient, c.completed_at), sexe(c.patient))
    titre = "Rapport maladie par tranche d'âge et genre" if f.genre else "Rapport maladie par tranche d'âge"
    return [grille.tableau(titre, "Maladies", total="TOTAL", tri=True)]


def references(f):
    grille = Grille(ANS, genre=f.genre)
    for l in ("Référés reçus d'une autre structure", "Référés en interne", "Référés vers une autre structure"):
        grille.ligne(l)
    rows = []
    for c in f.consultations():
        age, sx = mois(c.patient, c.completed_at), sexe(c.patient)
        if valeur(c, "refere_recu"):
            grille.ajouter("Référés reçus d'une autre structure", age, sx)
        if c.outcome in ("refere_interne", "refere_externe"):
            interne = c.outcome == "refere_interne"
            grille.ajouter("Référés en interne" if interne else "Référés vers une autre structure", age, sx)
            rows.append([timezone.localtime(c.completed_at).strftime("%d/%m/%Y"), name(c.patient), service_de(c),
                         "Interne" if interne else "Externe",
                         (valeur(c, "refere_service") if interne else valeur(c, "refere_structure")) or "—",
                         valeur(c, "refere_motif") or c.diagnosis or "—"])
    return [grille.tableau("Référencements par tranche d'âge", "Référencements"),
            liste("Détail des références", "Date", ["Patient", "Service d'origine", "Type", "Vers", "Motif"], rows)]


def laboratoire(f):
    demandes = LabRequest.objects.filter(admission__patient__hospital=f.hospital, requested_at__date__range=(f.du, f.au))
    if f.medecins:
        demandes = demandes.filter(admission__consultation__doctor_id__in=f.medecins)
    compte = Counter()
    rendus = Counter()
    categorie = {}
    for r in LabResult.objects.filter(request__in=demandes).select_related("exam"):
        compte[r.exam.name] += 1
        categorie[r.exam.name] = r.exam.category
        if r.result:
            rendus[r.exam.name] += 1
    labo = liste("Examens de laboratoire", "Examen", ["Catégorie", "Demandés", "Résultats rendus"],
                 [[n, categorie[n], compte[n], rendus[n]] for n, _ in compte.most_common()])
    if compte:
        labo["lignes"].append({"libelle": "TOTAL", "valeurs": ["", sum(compte.values()), sum(rendus.values())], "type": "total"})
    imagerie = Counter()
    for a in f.admissions().encaissees().filter(service__category="EXAMEN", paid_at__date__range=(f.du, f.au)):
        imagerie[a.service_name] += a.quantity
    radio = liste("Radiologie, échographie et ECG", "Examen", ["Réalisés"], [[n, v] for n, v in imagerie.most_common()])
    return [labo, radio]


TESTS = [("tdr_palu", "TDR paludisme"), ("tdr_vih", "TDR VIH"), ("tdr_dengue", "TDR dengue"), ("tdr_covid", "Test COVID-19")]


def tdr(f):
    grille = Grille(ANS, genre=f.genre)
    for cle, nom in TESTS:
        grille.ligne(nom.upper(), "groupe")
        grille.ligne(f"{nom} · réalisés")
        grille.ligne(f"{nom} · positifs")
    for c in f.consultations():
        age, sx = mois(c.patient, c.completed_at), sexe(c.patient)
        for cle, nom in TESTS:
            resultat = valeur(c, cle)
            if resultat in ("positif", "negatif"):
                grille.ajouter(f"{nom} · réalisés", age, sx)
                if resultat == "positif":
                    grille.ajouter(f"{nom} · positifs", age, sx)
    tableau = grille.tableau("Tests de diagnostic rapide", "Tests")
    for ligne in tableau["lignes"]:
        ligne["libelle"] = ligne["libelle"].split(" · ", 1)[-1].capitalize() if " · " in ligne["libelle"] else ligne["libelle"]
    return [tableau]


def vaccination(f):
    grille = Grille(VACCINATION, genre=f.genre, en_ans=False)
    for c in f.consultations():
        doses = list(valeur(c, "vaccins_donnes") or []) + list(valeur(c, "vaccins_naissance") or [])
        for vaccin in doses:
            grille.ajouter(str(vaccin), mois(c.patient, c.completed_at), sexe(c.patient))
    return [grille.tableau("Doses de vaccin administrées", "Vaccins", total="TOTAL DES DOSES", tri=True)]


def controle_major(f):
    """Pour chaque service : ce que chaque praticien a en attente, en cours, terminé ; et l'infirmerie."""
    admissions = (f.admissions().parcours_soins().filter(created_at__date__range=(f.du, f.au))
                  .select_related("consultation__doctor"))
    if f.service:
        admissions = admissions.filter(service__specialite=f.service)
    par_service = defaultdict(lambda: defaultdict(Counter))
    for a in admissions:
        service = specialites.nom(a.service.specialite or specialites.GENERALE)
        c = getattr(a, "consultation", None)
        if f.medecins and (c is None or c.doctor_id not in f.medecins):
            continue
        qui = f"{c.doctor.last_name.upper()} {c.doctor.first_name}".strip() if c else "Non encore attribué"
        etat = "terminées" if c and c.completed_at else "en cours" if c else "en attente"
        if a.sent_to_consultation_at is None:
            continue  # encore à l'infirmerie
        par_service[service][qui][etat] += 1
    lignes = []
    cumul = Counter()
    for service in sorted(par_service):
        lignes.append({"libelle": service.upper(), "valeurs": ["", "", "", ""], "type": "groupe"})
        for qui, compte in sorted(par_service[service].items()):
            vals = [compte["en attente"], compte["en cours"], compte["terminées"]]
            cumul.update(compte)
            lignes.append({"libelle": qui, "valeurs": vals + [sum(vals)], "type": "normal"})
    total = [cumul["en attente"], cumul["en cours"], cumul["terminées"]]
    lignes.append({"libelle": "TOTAL CUMULÉ", "valeurs": total + [sum(total)], "type": "total"})
    consultations = {"titre": "Contrôle des consultations par service", "entete": "Professionnels consultants",
                     "colonnes": [{"label": l} for l in ("Patients en attente", "Consultations en cours", "Consultations terminées", "Total")],
                     "lignes": lignes}

    constantes = VitalSigns.objects.filter(admission__patient__hospital=f.hospital, recorded_at__date__range=(f.du, f.au)
                                           ).select_related("recorded_by", "admission__service")
    if f.service:
        constantes = constantes.filter(admission__service__specialite=f.service)
    infirmerie = defaultdict(Counter)
    for v in constantes:
        service = specialites.nom(v.admission.service.specialite or specialites.GENERALE)
        infirmerie[service][f"{v.recorded_by.last_name.upper()} {v.recorded_by.first_name}".strip()] += 1
    lignes = []
    for service in sorted(infirmerie):
        lignes.append({"libelle": service.upper(), "valeurs": [""], "type": "groupe"})
        lignes += [{"libelle": qui, "valeurs": [n], "type": "normal"} for qui, n in infirmerie[service].most_common()]
    lignes.append({"libelle": "TOTAL", "valeurs": [sum(sum(c.values()) for c in infirmerie.values())], "type": "total"})
    return [consultations, {"titre": "Contrôle des activités à l'infirmerie", "entete": "Professionnels d'accueil",
                            "colonnes": [{"label": "Prises de constantes terminées"}], "lignes": lignes}]


def _liste_valeurs(v):
    """Une liste déroulante, ou l'ancien texte libre « a, b »."""
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    return [x.strip() for x in str(v or "").split(",") if x.strip()]


def pathologies_associees(f):
    """Chaque maladie, qu'elle soit le diagnostic retenu ou une pathologie associée."""
    grille = Grille(ANS, genre=f.genre, total_genre=True)
    for c in f.consultations():
        if (c.specialite or "") in PROGRAMMES or c.specialite == "vih":
            continue
        age, sx = mois(c.patient, c.completed_at), sexe(c.patient)
        vues = set()
        for maladie in [normaliser(c.diagnosis)] + [normaliser(p) for p in _liste_valeurs(valeur(c, "pathologies"))]:
            if maladie and maladie not in vues:
                vues.add(maladie)
                grille.ajouter(maladie, age, sx)
    titre = "Rapport maladies avec pathologies associées"
    return [grille.tableau(titre, "Maladies", total="TOTAL", tri=True)]


def _un_test(cle, nom):
    def etat(f):
        grille = Grille(ANS, genre=f.genre, total_genre=True)
        for libelle in (f"{nom} réalisés", f"{nom} positifs", f"{nom} négatifs"):
            grille.ligne(libelle)
        for c in f.consultations():
            resultat = valeur(c, cle)
            if resultat in ("positif", "negatif"):
                age, sx = mois(c.patient, c.completed_at), sexe(c.patient)
                grille.ajouter(f"{nom} réalisés", age, sx)
                grille.ajouter(f"{nom} positifs" if resultat == "positif" else f"{nom} négatifs", age, sx)
        return [grille.tableau(f"Rapport {nom}", "Tests")]
    return etat


def examens_goutte(f):
    """Gouttes épaisses demandées au laboratoire depuis les consultations de la période."""
    grille = Grille(ANS, genre=f.genre, total_genre=True)
    for libelle in ("Gouttes épaisses demandées", "Résultats rendus", "Gouttes épaisses positives"):
        grille.ligne(libelle)
    consultations = {c.admission_id: c for c in f.consultations() if c.admission_id}
    for r in LabResult.objects.filter(exam__code="goutte-epaisse", request__admission_id__in=consultations).select_related("request"):
        c = consultations[r.request.admission_id]
        age, sx = mois(c.patient, c.completed_at), sexe(c.patient)
        grille.ajouter("Gouttes épaisses demandées", age, sx)
        if r.result:
            grille.ajouter("Résultats rendus", age, sx)
            texte = r.result.lower()
            if "pos" in texte or "+" in texte or "trophozo" in texte:
                grille.ajouter("Gouttes épaisses positives", age, sx)
    return [grille.tableau("Examens goutte épaisse", "Examens")]


def patients_consultes(f):
    lignes = []
    for c in f.consultations():
        age = mois(c.patient, c.completed_at)
        diagnostic = "Confidentiel" if c.specialite == "vih" else (c.diagnosis or "—")
        lignes.append([timezone.localtime(c.completed_at).strftime("%d/%m/%Y %H:%M"), c.patient.patient_number, name(c.patient),
                       f"{age // 12} ans" if age is not None else "—", c.patient.get_sex_display(), service_de(c),
                       c.reason or "—", diagnostic, dict(Consultation.OUTCOMES).get(c.outcome, "—")])
    return [liste("Liste des patients consultés", "Date", ["N° dossier", "Patient", "Âge", "Sexe", "Service", "Motif",
                                                           "Diagnostic", "Issue"], lignes)]


# ------------------------------------------------------------------ états financiers

def _encaissees(f):
    return f.admissions().encaissees().filter(paid_at__date__range=(f.du, f.au))


def _montants(admissions):
    brut = sum(a.service_price for a in admissions)
    patient = sum(a.cost for a in admissions)
    return [len(admissions), fcfa(brut), fcfa(patient), fcfa(brut - patient)]


def _par(f, cle, titre, entete):
    groupes = defaultdict(list)
    for a in _encaissees(f):
        groupes[cle(a)].append(a)
    lignes = [{"libelle": k, "valeurs": _montants(v), "type": "normal"} for k, v in sorted(groupes.items())]
    tout = [a for v in groupes.values() for a in v]
    lignes.append({"libelle": "TOTAL", "valeurs": _montants(tout), "type": "total"})
    return {"titre": titre, "entete": entete, "lignes": lignes,
            "colonnes": [{"label": l} for l in ("Passages", "Montant (FCFA)", "Payé par les patients", "Part des assurances")]}


def caisses(f):
    def caissier(a):
        u = a.session.cashier if a.session_id else a.created_by
        return f"{u.last_name.upper()} {u.first_name}".strip() or u.username
    tableau = _par(f, caissier, "Encaissements par caisse", "Caissier")
    annules = Counter()
    for a in f.admissions().filter(cancelled_at__date__range=(f.du, f.au)):
        annules[caissier(a)] += 1
    tableau["colonnes"].append({"label": "Tickets annulés"})
    for ligne in tableau["lignes"]:
        ligne["valeurs"].append(sum(annules.values()) if ligne["type"] == "total" else annules[ligne["libelle"]])
    return [tableau]


def prestations(f):
    return [_par(f, lambda a: a.service_name, "Encaissements par prestation", "Prestation")]


def assurances(f):
    return [_par(f, lambda a: a.insurance_name or "Sans assurance", "Encaissements par assurance", "Assurance")]


def services(f):
    return [_par(f, lambda a: a.service.department.name if a.service.department_id else "Autres",
                 "Encaissements par service", "Service")]


def gratuites(f):
    rows = []
    for a in _encaissees(f).filter(cost=0).order_by("paid_at"):
        motif = "Gratuité" if not a.service_price else f"Prise en charge à 100 % ({a.insurance_name})"
        rows.append([timezone.localtime(a.paid_at).strftime("%d/%m/%Y"), a.reference or "—", name(a.patient),
                     a.service_name, fcfa(a.service_price), motif])
    return [liste("Gratuités et prises en charge totales", "Date",
                  ["Ticket", "Patient", "Prestation", "Valeur (FCFA)", "Motif"], rows)]


def bilan_caisse(f):
    jours = defaultdict(list)
    for a in _encaissees(f):
        jours[timezone.localtime(a.paid_at).date()].append(a)
    annules = Counter()
    for a in f.admissions().filter(cancelled_at__date__range=(f.du, f.au)):
        annules[timezone.localtime(a.cancelled_at).date()] += 1
    lignes = [{"libelle": j.strftime("%d/%m/%Y"), "valeurs": _montants(v) + [annules[j]], "type": "normal"}
              for j, v in sorted(jours.items())]
    tout = [a for v in jours.values() for a in v]
    lignes.append({"libelle": "TOTAL", "valeurs": _montants(tout) + [sum(annules.values())], "type": "total"})
    return [{"titre": "Bilan agrégé de la caisse, jour par jour", "entete": "Jour", "lignes": lignes,
             "colonnes": [{"label": l} for l in ("Passages", "Montant (FCFA)", "Payé par les patients",
                                                 "Part des assurances", "Tickets annulés")]}]


# ------------------------------------------------------------------ catalogue

ETATS = OrderedDict([
    ("consultations", ("activites", "Activités de consultation", activites_consultations)),
    ("pathologies", ("activites", "Pathologies", pathologies)),
    ("nutrition", ("activites", "Nutrition", nutrition)),
    ("tdr", ("activites", "Tests rapides (TDR)", tdr)),
    ("vaccination", ("activites", "Vaccination", vaccination)),
    ("laboratoire", ("activites", "Laboratoire, radio et écho", laboratoire)),
    ("references", ("activites", "Référencements", references)),
    ("deces", ("activites", "Décès", deces)),
    ("pathologies_associees", ("activites", "Maladies avec pathologies associées", pathologies_associees)),
    ("tdr_goutte", ("activites", "TDR goutte épaisse", _un_test("goutte_epaisse", "TDR goutte épaisse"))),
    ("tdr_palu", ("activites", "TDR paludisme", _un_test("tdr_palu", "TDR paludisme"))),
    ("tdr_grossesse", ("activites", "TDR grossesse", _un_test("tdr_grossesse", "TDR grossesse"))),
    ("tdr_vih", ("activites", "TDR VIH", _un_test("tdr_vih", "TDR VIH"))),
    ("tdr_covid", ("activites", "TDR COVID", _un_test("tdr_covid", "TDR COVID"))),
    ("tdr_dengue", ("activites", "TDR dengue", _un_test("tdr_dengue", "TDR dengue"))),
    ("examens_goutte", ("activites", "Examens goutte épaisse", examens_goutte)),
    ("patients_consultes", ("activites", "Liste des patients consultés", patients_consultes)),
    ("controle", ("activites", "Contrôle du major", controle_major)),
    ("bilan", ("finances", "Bilan agrégé de caisse", bilan_caisse)),
    ("caisses", ("finances", "Caisses", caisses)),
    ("prestations", ("finances", "Prestations", prestations)),
    ("assurances", ("finances", "Assurances", assurances)),
    ("services", ("finances", "Services", services)),
    ("gratuites", ("finances", "Gratuités", gratuites)),
])

# Ce qu'un médecin peut sortir sur sa propre activité.
# Les rapports du module du praticien (consultations générales et spécialités), dans l'ordre du DPI.
TYPES_CONSULTATION = [
    ("pathologies", "Rapport maladie", "age_genre"),
    ("pathologies_associees", "Rapport maladies avec pathologies associées", "age_genre"),
    ("consultations", "Rapport activités consultations", "age_genre"),
    ("nutrition", "Rapport nutritionnel", None),
    ("tdr_goutte", "TDR goutte épaisse", "age_genre"),
    ("tdr_palu", "TDR paludisme", "age_genre"),
    ("tdr_grossesse", "TDR grossesse", "age_genre"),
    ("tdr_vih", "TDR VIH", "age_genre"),
    ("tdr_covid", "TDR COVID", "age_genre"),
    ("tdr_dengue", "TDR dengue", "age_genre"),
    ("examens_goutte", "Examens goutte épaisse", "age_genre"),
    ("patients_consultes", "Liste des patients consultés", None),
]

POUR_PRATICIEN = {"consultations", "pathologies", "nutrition", "tdr", "vaccination", "laboratoire", "references", "deces"} | {
    t[0] for t in TYPES_CONSULTATION}


def periode(du, au):
    today = timezone.localdate()
    try:
        debut = date.fromisoformat(du) if du else today.replace(day=1)
        fin = date.fromisoformat(au) if au else today
    except ValueError:
        debut, fin = today.replace(day=1), today
    return (fin, debut) if debut > fin else (debut, fin)


def calculer(etat, hospital, *, du=None, au=None, service="", medecins=(), genre=False, permis=None, organiser=""):
    groupe, titre, fonction = ETATS[etat][:3]
    if etat in maternite.ETATS:
        service = maternite.ETATS[etat][3]   # un rapport de CPN porte sur la CPN, etc.
    debut, fin = periode(du, au)
    f = Filtres(hospital, debut, fin, service, medecins, genre or organiser == "genre", permis, organiser)
    return {
        "id": etat,
        "groupe": groupe,
        "titre": titre,
        "du": debut.isoformat(),
        "au": fin.isoformat(),
        "periode": f"du {debut:%d/%m/%Y} au {fin:%d/%m/%Y}",
        "service": specialites.nom(service) if service else (
            ", ".join(specialites.nom(c) for c in permis) if permis else ""),
        "genre": genre,
        "tableaux": fonction(f),
        "generatedAt": timezone.localtime().strftime("%d/%m/%Y %H:%M"),
    }


def entete_officiel(hospital):
    """L'en-tête des états remis au district."""
    return {
        "ministere": "Ministère de la Santé, de l'Hygiène Publique et de la Couverture Maladie Universelle",
        "republique": "République de Côte d'Ivoire",
        "devise": "Union - Discipline - Travail",
        "etablissement": hospital.name if hospital else "",
        "contacts": [x for x in (getattr(hospital, "address", ""), getattr(hospital, "city", ""),
                                 getattr(hospital, "phone", ""), getattr(hospital, "email", "")) if x] if hospital else [],
    }


def catalogue(hospital, *, groupes):
    return {
        "etats": [{"id": k, "groupe": v[0], "label": v[1], "organiser": organisation(k)} for k, v in ETATS.items() if v[0] in groupes],
        "services": [{"code": s["code"], "nom": s["nom"]} for s in specialites.liste()],
        "medecins": [p for p in praticien.praticiens(hospital) if p["role"] == "Médecin"],
        "entete": entete_officiel(hospital),
    }


def services_du(user):
    """Les spécialités d'un praticien (médecine générale s'il n'en a pas)."""
    return list(user.specialites or [specialites.GENERALE])


def confreres(user):
    """Les médecins de l'hôpital qui partagent au moins un service avec le praticien."""
    from django.contrib.auth import get_user_model

    siens = set(services_du(user))
    return [praticien.fiche(u) for u in get_user_model().objects.filter(hospital=user.hospital, role="DOCTOR", is_active=True)
            .order_by("last_name", "first_name") if siens & set(services_du(u))]


# ------------------------------------------------------------------ santé maternelle

from . import maternite  # noqa: E402

ETATS.update((k, v[:3]) for k, v in maternite.ETATS.items())
POUR_PRATICIEN |= set(maternite.ETATS)


def types_du_praticien(user):
    """Les types de rapport proposés dans le module du praticien, selon ses spécialités.

    Chaque type dit comment on peut l'organiser : « age_genre » (tranche d'âge, ou âge et genre),
    « total_age » (total uniquement, ou par tranche d'âge), « age » (toujours par tranche d'âge).
    """
    types = []
    codes = services_du(user)
    for code in codes:
        service = specialites.nom(code)
        if code in ("cpn", "accouchement", "cpon"):
            types += [{"id": k, "label": v[1], "service": service, "organiser": v[4]}
                      for k, v in maternite.ETATS.items() if v[3] == code]
        elif code == "vaccination":
            types.append({"id": "vaccination", "label": "Vaccination", "service": service, "organiser": "age_genre"})
    generales = [c for c in codes if c not in PROGRAMMES and c != "vih"]
    if generales:
        nom = ", ".join(specialites.nom(c) for c in generales)
        types = [{"id": i, "label": l, "service": nom, "organiser": o} for i, l, o in TYPES_CONSULTATION] + types
    return types


def organisation(etat):
    """Ce que propose « Organiser par » pour un état (None : rien à choisir)."""
    if etat in maternite.ETATS:
        return maternite.ETATS[etat][4]
    if etat in ("laboratoire", "controle", "nutrition", "patients_consultes") or ETATS[etat][0] == "finances":
        return None
    return "age_genre"
