"""Données de démonstration dans tous les modules, pour tester l'application.

Le parcours patient passe par les vraies API, comme un agent le ferait
(caisse → soins infirmiers → consultation → pharmacie, laboratoire,
rendez-vous, hospitalisation) : les données respectent les règles de
l'application. Les modules de gestion (stocks, hygiène, RH, maintenance,
GED) sont remplis directement.

Les patients de démonstration ont un téléphone en 07 99 00 xx xx :
`--reinitialiser` les efface (avec tout ce qui en dépend) avant de recommencer.

    python manage.py demo_donnees
    python manage.py demo_donnees --reinitialiser
"""
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Hospital
from patients.models import Patient

User = get_user_model()
PREFIXE = "079900"
PIN_DEMO = "482915"

# Comptes de démonstration propres aux spécialités (en plus de seed_default_users).
PRATICIENS = [
    ("pediatre", "Pediatre@2026!", "Aya", "KOFFI", "DOCTOR", ["pediatrie"], "Pédiatre"),
    ("sagefemme", "Sagefemme@2026!", "Mariam", "COULIBALY", "DOCTOR",
     ["cpn", "cpon", "accouchement", "planning-familial", "vaccination"], "Sage-femme"),
    ("cardiologue", "Cardio@2026!", "Serge", "N'GUESSAN", "DOCTOR", ["cardiologie"], "Cardiologue"),
    ("gyneco", "Gyneco@2026!", "Estelle", "YAO", "DOCTOR", ["gynecologie"], "Gynécologue"),
    ("aidesoignant", "Aide@2026!", "Brice", "KOUAKOU", "AIDE_SOIGNANT", [], "Aide-soignant"),
    ("dentiste", "Dentiste@2026!", "Hervé", "GNAGNE", "DOCTOR", ["dentaire"], "Chirurgien-dentiste"),
    ("chirurgien", "Chirurgien@2026!", "Alain", "BROU", "DOCTOR", ["chirurgie", "cpa", "urologie"], "Chirurgien"),
    ("interniste", "Interniste@2026!", "Nadia", "TOURE", "DOCTOR",
     ["diabetologie", "hemodialyse", "rhumatologie", "pneumologie", "vih", "neuro-psychiatrie"], "Médecin interniste"),
    ("specialiste", "Specialiste@2026!", "Didier", "AKA", "DOCTOR", ["dermatologie", "ophtalmologie", "orl"], "Médecin spécialiste"),
    ("kine", "Kine@2026!", "Rose", "DOGBO", "DOCTOR", ["kinesitherapie"], "Kinésithérapeute"),
]

# Prestations créées désactivées (à 0 FCFA) : activées pour la démonstration, à un prix indicatif.
PRIX_DEMO = {
    "Consultation dentaire": 10000, "Consultation pré-anesthésie": 10000, "Consultation diabétologie": 15000,
    "Consultation neuro-psychiatrie": 15000, "Consultation pneumologie": 15000, "Consultation rhumatologie": 15000,
    "Consultation urologie": 15000, "Consultation VIH": 0, "Séance d'hémodialyse": 25000, "Accouchement": 50000,
    "Consultation postnatale": 5000, "Planning familial": 2000,
}

# Un patient en salle d'attente pour chaque spécialité : (prestation, nom, prénom, sexe, âge ou naissance, constantes).
PAR_SPECIALITE = [
    ("Consultation dentaire", "AKISSI", "Marie", "Féminin", "31", {"nursingNotes": "Douleur dentaire depuis 4 jours"}),
    ("Chirurgie", "ADOU", "Koffi", "Masculin", "44", {"temperature": "37.9", "nursingNotes": "Douleur fosse iliaque droite"}),
    ("Consultation pré-anesthésie", "LOBA", "Didier", "Masculin", "56", {"systolic": "135", "diastolic": "85", "weight": "82"}),
    ("Dermatologie", "N'DRI", "Carine", "Féminin", "26", {"nursingNotes": "Éruption prurigineuse"}),
    ("Gynécologie", "KOUADIO", "Prisca", "Féminin", "38", {"nursingNotes": "Douleurs pelviennes"}),
    ("Kinésithérapie", "EHUI", "Fabrice", "Masculin", "47", {"nursingNotes": "Lombalgie, séance 3/10"}),
    ("Ophtalmologie", "SEKA", "Honorine", "Féminin", "61", {"nursingNotes": "Baisse de la vision"}),
    ("ORL", "GUEU", "Stéphane", "Masculin", "9", {"temperature": "38.3", "nursingNotes": "Otalgie droite"}),
    ("Consultation diabétologie", "TAPE", "Marcelline", "Féminin", "54", {"glucose": "2.4", "weight": "88"}),
    ("Consultation neuro-psychiatrie", "BOLI", "Ernest", "Masculin", "33", {"nursingNotes": "Insomnie, anxiété"}),
    ("Consultation urologie", "OULAI", "Gaston", "Masculin", "67", {"nursingNotes": "Dysurie"}),
    ("Consultation rhumatologie", "ABLE", "Jeanne", "Féminin", "59", {"nursingNotes": "Douleurs des genoux"}),
    ("Consultation pneumologie", "ZOKOU", "Patrice", "Masculin", "42", {"oxygen": "93", "respiratoryRate": "24", "nursingNotes": "Toux depuis 3 semaines"}),
    ("Séance d'hémodialyse", "MEITE", "Lassina", "Masculin", "50", {"systolic": "150", "diastolic": "92", "weight": "71.5"}),
    ("Accouchement", "ASSEMIEN", "Bintou", "Féminin", "23", {"systolic": "120", "diastolic": "75", "nursingNotes": "Contractions depuis 6 h"}),
    ("Consultation prénatale", "DJE", "Rosine", "Féminin", "25", {"systolic": "118", "diastolic": "72", "weight": "59"}),
    ("Consultation postnatale", "GOLI", "Nadia", "Féminin", "28", {"systolic": "115", "diastolic": "70"}),
    ("Planning familial", "YEO", "Salimata", "Féminin", "30", {"weight": "62"}),
    ("Vaccination", "KOUAME", "Grâce", "Féminin", "naissance:190", {"temperature": "36.8", "weight": "7.1"}),
    ("Consultation VIH", "ANOH", "Firmin", "Masculin", "39", {"weight": "66"}),
]


def jour(delta=0):
    return timezone.localdate() + timedelta(days=delta)


def pdf(titre):
    """Un petit PDF valide d'une page, pour que la GED ait un vrai fichier à ouvrir."""
    texte = titre.replace("(", "").replace(")", "")
    flux = f"BT /F1 18 Tf 60 760 Td ({texte}) Tj ET".encode("latin-1", "replace")
    objets = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(flux) + flux + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    sortie, positions = b"%PDF-1.4\n", []
    for i, obj in enumerate(objets, 1):
        positions.append(len(sortie))
        sortie += b"%d 0 obj\n" % i + obj + b"\nendobj\n"
    xref = len(sortie)
    sortie += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objets) + 1)
    sortie += b"".join(b"%010d 00000 n \n" % p for p in positions)
    sortie += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objets) + 1, xref)
    return sortie


def effacer(obj):
    """Supprime un objet et ce qui le protège (passages, consultations…), récursivement."""
    for _ in range(12):
        try:
            obj.delete()
            return
        except ProtectedError as e:
            for o in e.protected_objects:
                effacer(o)


class Command(BaseCommand):
    help = "Remplit tous les modules avec des données de démonstration."

    def add_arguments(self, parser):
        parser.add_argument("--reinitialiser", action="store_true", help="Efface d'abord les données de démonstration.")

    # ------------------------------------------------------------------ outils

    def api(self, user, methode, url, data=None, attendu=(200, 201)):
        self.client.force_authenticate(user)
        reponse = getattr(self.client, methode)(url, data or {}, format="json")
        if reponse.status_code not in attendu:
            raise CommandError(f"{methode.upper()} {url} → {reponse.status_code} : {getattr(reponse, 'data', '')}")
        return reponse.data

    def compte(self, username):
        user = User.objects.filter(username=username).first()
        if user is None:
            raise CommandError(f"Compte « {username} » absent : lancez d'abord  python manage.py seed_default_users")
        return user

    def service(self, nom):
        from parcours.models import MedicalService

        return MedicalService.objects.get(hospital=self.hopital, name=nom)

    # ------------------------------------------------------------------ parcours patient

    def inscrire(self, n, nom, prenom, sexe, service, *, age="", naissance="", quartier="Cocody", assurance=None):
        """Caisse : enregistrement et encaissement. Renvoie l'admission."""
        if naissance and not age:
            age = str((timezone.localdate() - date.fromisoformat(naissance)).days // 365)
        data = {
            "nom": nom, "prenom": prenom, "sexe": sexe, "age": age, "dateNaissance": naissance,
            "service": self.service(service).pk, "telephone": f"{PREFIXE}{n:04d}",
            "parentContact": f"0500{n:06d}", "assurance": "Non", "assuranceId": "", "insuranceNumber": "",
            "quartier": quartier,
        }
        if assurance:
            from parcours.models import InsuranceCompany

            data.update(assurance="Oui", assuranceId=InsuranceCompany.objects.get(name=assurance).pk,
                        insuranceNumber=f"{assurance[:3]}-{n:05d}")
        pk = self.api(self.caissier, "post", "/api/parcours/caisse/patients/", data)["admissionId"]
        try:
            self.api(self.caissier, "post", f"/api/parcours/caisse/patients/{pk}/encaisser/")
        except CommandError as erreur:
            if "déjà réglé" not in str(erreur):  # prestation gratuite : réglée à l'enregistrement
                raise
        return pk

    def constantes(self, pk, **mesures):
        valeurs = {"temperature": "37", "systolic": "120", "diastolic": "80", "pulse": "78", "oxygen": "98",
                   "respiratoryRate": "16", "glucose": "", "weight": "", "height": "", "nursingNotes": ""}
        valeurs.update({k: str(v) for k, v in mesures.items()})
        self.api(self.infirmier, "post", f"/api/parcours/soins/patients/{pk}/constantes/", valeurs)

    def specialites(self):
        """Un patient en attente du praticien pour chaque spécialité : on peut ouvrir chaque formulaire."""
        from parcours.models import MedicalService

        for nom, prix in PRIX_DEMO.items():
            MedicalService.objects.filter(hospital=self.hopital, name=nom, active=False).update(active=True, price=prix)
        for n, (prestation, nom, prenom, sexe, age, mesures) in enumerate(PAR_SPECIALITE, 20):
            naissance = ""
            if age.startswith("naissance:"):
                naissance, age = str(jour(-int(age.split(":")[1]))), ""
            pk = self.inscrire(n, nom, prenom, sexe, prestation, age=age, naissance=naissance)
            self.constantes(pk, **mesures)

    def maternite(self):
        """CPN, accouchements et CPON terminés : les rapports de santé maternelle ont de quoi compter."""
        sf = self.praticiens["sagefemme"]
        cpn = [
            (60, "N'GUESSAN", "Affoué", "22", {"numero_cpn": "1", "ddr": str(jour(-70)), "tension_cpn": "110/70",
             "tpi": "Aucun", "vat": "Td1", "fer_folique": "oui", "milda": "oui", "tdr_palu_cpn": "negatif", "goutte_epaisse": "negatif"}),
            (61, "KOUAKOU", "Mireille", "17", {"numero_cpn": "1", "ddr": str(jour(-150)), "tension_cpn": "145/95", "hemoglobine": "9.5",
             "signes_danger": ["Céphalées et troubles visuels"], "pathologies_grossesse": ["Anémie", "Hypertension artérielle"],
             "tpi": "SP1", "vat": "Td2", "fer_folique": "oui", "tdr_palu_cpn": "positif", "goutte_epaisse": "positif"}),
            (62, "DIOMANDE", "Fanta", "36", {"numero_cpn": "4", "ddr": str(jour(-260)), "tension_cpn": "120/80", "parite": "5",
             "tpi": "SP3", "vat": "Td3", "fer_folique": "oui", "pathologies_grossesse": ["Paludisme"], "tdr_palu_cpn": "negatif"}),
            (63, "GBAKA", "Odette", "29", {"numero_cpn": "3", "ddr": str(jour(-200)), "tension_cpn": "115/75",
             "tpi": "SP2", "vat": "Aucun", "milda": "oui", "pathologies_grossesse": ["Infection urinaire"]}),
        ]
        for n, nom, prenom, age, valeurs in cpn:
            pk = self.inscrire(n, nom, prenom, "Féminin", "Consultation prénatale", age=age)
            self.constantes(pk, systolic=valeurs["tension_cpn"].split("/")[0], diastolic=valeurs["tension_cpn"].split("/")[1])
            self.terminer(sf, pk, {**valeurs, "issue": "rdv", "rdv_date": str(jour(30)), "rdv_heure": "08:00",
                                   "__diagnostic_programme": f"CPN {valeurs['numero_cpn']}"})
        accouchements = [
            (70, "SILUE", "Kady", "24", {"mode_accouchement": "Voie basse", "lieu_accouchement_acc": "Établissement", "statut_vat": "Td2",
             "sexe_bebe": "F", "poids_naissance": "3100", "vivant": "oui", "declaration_naissance": "oui"}),
            (71, "AMANI", "Lucie", "19", {"mode_accouchement": "Césarienne", "lieu_accouchement_acc": "Établissement", "statut_vat": "Td1",
             "sexe_bebe": "M", "poids_naissance": "2300", "vivant": "oui", "reanimation": "oui",
             "complications_mere": ["Hémorragie du post-partum"], "declaration_naissance": "non"}),
            (72, "OUEDRAOGO", "Awa", "31", {"mode_accouchement": "Voie basse", "lieu_accouchement_acc": "En route", "statut_vat": "Inconnu",
             "sexe_bebe": "M", "poids_naissance": "3400", "vivant": "oui", "complications_mere": ["Déchirure périnéale"],
             "declaration_naissance": "oui"}),
        ]
        for n, nom, prenom, age, valeurs in accouchements:
            pk = self.inscrire(n, nom, prenom, "Féminin", "Accouchement", age=age)
            self.constantes(pk)
            self.terminer(sf, pk, {**valeurs, "issue": "sortie", "__diagnostic_programme": f"Accouchement {valeurs['mode_accouchement']}"})
        for n, nom, prenom, age, visite in [(75, "TANOH", "Elise", "27", "immediate"), (76, "YAPI", "Rita", "33", "s6_8")]:
            pk = self.inscrire(n, nom, prenom, "Féminin", "Consultation postnatale", age=age)
            self.constantes(pk)
            self.terminer(sf, pk, {"visite_cpon": visite, "allaitement": "Exclusif", "issue": "sortie",
                                   "__diagnostic_programme": f"CPON {visite}"})

    def terminer(self, medecin, pk, valeurs):
        mg = "/api/consultations/medecine/"
        self.api(medecin, "post", f"{mg}{pk}/")
        return self.api(medecin, "post", f"{mg}{pk}/terminer/", {"valeurs": valeurs})

    def parcours(self):
        m, ped, sf, cardio = self.medecin, self.praticiens["pediatre"], self.praticiens["sagefemme"], self.praticiens["cardiologue"]
        mg = "/api/consultations/medecine/"

        # 1. Payés à la caisse, en attente de constantes.
        self.inscrire(1, "KONAN", "Yves", "Masculin", "Médecine générale", age="41", quartier="Yopougon")
        self.inscrire(2, "BAMBA", "Fatou", "Féminin", "Consultation prénatale", age="27", quartier="Abobo")
        self.inscrire(3, "DIALLO", "Moussa", "Masculin", "Pédiatrie", naissance=str(jour(-400)), quartier="Adjamé")

        # 2. Constantes prises, en attente du médecin (dont des constantes anormales).
        pk = self.inscrire(4, "OUATTARA", "Salif", "Masculin", "Médecine générale", age="35", assurance="CNPS")
        self.constantes(pk, temperature="39.2", pulse="112", systolic="118", diastolic="76", nursingNotes="Fièvre depuis 3 jours")
        pk = self.inscrire(5, "TRAORE", "Aminata", "Féminin", "Cardiologie", age="58", quartier="Marcory")
        self.constantes(pk, systolic="172", diastolic="104", pulse="88", nursingNotes="Céphalées, HTA connue")
        pk = self.inscrire(6, "KOUASSI", "Ange", "Masculin", "Pédiatrie", naissance=str(jour(-610)))
        self.constantes(pk, temperature="38.6", weight="10.4", oxygen="95", respiratoryRate="44")

        # 3. Consultation commencée (« Poursuivre »).
        pk = self.inscrire(7, "GBAGBO", "Clarisse", "Féminin", "Médecine générale", age="29", assurance="MUGEFCI")
        self.constantes(pk, temperature="37.8")
        self.api(m, "post", f"{mg}{pk}/")
        self.api(m, "post", f"{mg}{pk}/etape/", {"etape": "interrogatoire", "complete": True, "valeurs": {
            "motif": "Toux", "histoire": "Toux sèche depuis 10 jours, sans fièvre.", "signes": ["Toux"]}})

        # 4. Consultations terminées, branchées sur les autres modules.
        pk = self.inscrire(8, "YAO", "Paul", "Masculin", "Médecine générale", age="45")
        self.constantes(pk, temperature="38.9", pulse="104")
        self.terminer(m, pk, {
            "motif": "Fièvre", "histoire": "Fièvre, frissons et courbatures depuis 3 jours.", "signes": ["Fièvre", "Céphalées"],
            "etat_general": "moyen", "tdr_palu": "positif", "diagnostic": "Paludisme simple",
            "ordonnance": [
                {"medicament": "Artéméther-Luméfantrine", "posologie": "4 cp matin et soir", "duree": "3", "quantite": "24", "voie": "Orale"},
                {"medicament": "Paracétamol 500 mg", "posologie": "1 cp 3 fois par jour", "duree": "3", "quantite": "9", "voie": "Orale"},
            ],
            "examens": ["nfs", "test-paludisme"], "conseils": "Boire beaucoup d'eau. Revenir si vomissements.", "issue": "sortie",
        })
        self.paludisme = pk

        pk = self.inscrire(9, "ASSI", "Rachelle", "Féminin", "Médecine générale", age="33")
        self.constantes(pk, temperature="37.4")
        self.terminer(m, pk, {
            "motif": "Brûlures urinaires", "histoire": "Brûlures mictionnelles depuis 2 jours.", "etat_general": "bon",
            "diagnostic": "Infection urinaire basse",
            "ordonnance": [{"medicament": "Amoxicilline 500 mg", "posologie": "1 gél 3 fois par jour", "duree": "7", "quantite": "21", "voie": "Orale"}],
            "examens": ["urines"], "issue": "sortie",
        })
        self.urinaire = pk

        pk = self.inscrire(10, "KOFFI", "Jean-Marc", "Masculin", "Cardiologie", age="62", assurance="NSIA")
        self.constantes(pk, systolic="165", diastolic="98")
        self.terminer(cardio, pk, {
            "motif": "Contrôle HTA", "histoire": "Hypertendu connu, traitement mal suivi.", "etat_general": "bon",
            "diagnostic": "Hypertension artérielle non contrôlée",
            "ordonnance": [{"medicament": "Amlodipine 5 mg", "posologie": "1 cp le matin", "duree": "30", "quantite": "30", "voie": "Orale"}],
            "examens": ["creatinine", "bilan-lipidique"],
            "issue": "rdv", "rdv_date": str(jour(14)), "rdv_heure": "09:30",
        })
        self.hta = pk

        pk = self.inscrire(11, "SORO", "Ibrahim", "Masculin", "Médecine générale", age="52")
        self.constantes(pk, temperature="39.8", pulse="120", systolic="95", diastolic="60", oxygen="92")
        self.terminer(m, pk, {
            "motif": "Fièvre et vomissements", "histoire": "Fièvre élevée, vomissements répétés, asthénie.",
            "etat_general": "altere", "tdr_palu": "positif", "diagnostic": "Paludisme grave",
            "issue": "hospitalisation", "chambre": "A-101", "lit": "Lit 01",
        })

        pk = self.inscrire(12, "KONE", "Awa", "Féminin", "Consultation prénatale", age="24", quartier="Koumassi")
        self.constantes(pk, systolic="110", diastolic="70", weight="64")
        self.terminer(sf, pk, {
            "ddr": str(jour(-150)), "tension_cpn": "110/70", "numero_cpn": "2", "issue": "rdv",
            "rdv_date": str(jour(28)), "rdv_heure": "08:30", "__diagnostic_programme": "CPN 2 · 21 SA",
        })

        pk = self.inscrire(13, "ZADI", "Emmanuel", "Masculin", "Pédiatrie", naissance=str(jour(-300)))
        self.constantes(pk, temperature="38.1", weight="7.6")
        self.terminer(ped, pk, {
            "motif": "Diarrhée", "histoire": "Selles liquides depuis 2 jours, boit bien.", "etat_general": "bon",
            "poids_enfant": "7.6", "diagnostic": "Diarrhée aiguë sans déshydratation",
            "ordonnance": [{"medicament": "SRO", "posologie": "1 sachet après chaque selle", "duree": "3", "quantite": "10", "voie": "Orale"},
                           {"medicament": "Zinc 20 mg", "posologie": "1/2 cp par jour", "duree": "10", "quantite": "10", "voie": "Orale"}],
            "issue": "sortie",
        })

        # 5. Pharmacie : une ordonnance servie, une prête, les autres à préparer.
        from parcours.serializers import prescription_code
        from prescriptions.models import Prescription

        def ordonnance(pk):
            return Prescription.objects.get(consultation__admission_id=pk)

        code = prescription_code(ordonnance(self.urinaire))
        self.api(self.pharmacien, "post", f"/api/parcours/pharmacie/ordonnances/{code}/preparer/")
        self.api(self.pharmacien, "post", f"/api/parcours/pharmacie/ordonnances/{code}/servir/")
        code = prescription_code(ordonnance(self.hta))
        self.api(self.pharmacien, "post", f"/api/parcours/pharmacie/ordonnances/{code}/preparer/")

        # 6. Laboratoire : un résultat rendu, les autres en attente.
        self.api(self.laborantin, "post", f"/api/laboratory/analyses/{self.urinaire}/resultat/", {
            "results": {"urines": "Leucocytes ++, nitrites +, E. coli"}, "observation": "Infection urinaire confirmée"})

        # 7. Rendez-vous supplémentaires dans l'agenda.
        from appointments.models import Appointment

        yao = Patient.objects.get(phone=f"{PREFIXE}0008")
        for delta, heure, pro, motif in [(0, 15, m, "Contrôle paludisme"), (3, 10, m, "Résultats d'analyses"),
                                         (7, 11, ped, "Vaccination de rappel")]:
            Appointment.objects.create(patient=yao, professional=pro, reason=motif, service="Consultation",
                                       date_time=timezone.make_aware(datetime.combine(jour(delta), time(heure, 0))))

        # 8. Historique : quelques passages des jours précédents (tableaux de bord, rapports).
        from consultations.models import Consultation
        from parcours.models import Admission

        for n, delta in [(9, -1), (13, -3)]:
            passe = timezone.now() + timedelta(days=delta)
            Admission.objects.filter(patient__phone=f"{PREFIXE}{n:04d}").update(created_at=passe)
            Consultation.objects.filter(admission__patient__phone=f"{PREFIXE}{n:04d}").update(date_time=passe, completed_at=passe)

    # ------------------------------------------------------------------ espace patient

    def espace_patient(self):
        from portail.models import PatientAccess
        from portail.services import conversation, ecrire, programmer_rappel
        from prescriptions.models import PrescriptionItem

        for n in (8, 10):
            patient = Patient.objects.get(phone=f"{PREFIXE}{n:04d}")
            access = PatientAccess.objects.filter(patient=patient).first() or PatientAccess(patient=patient)
            access.set_pin(PIN_DEMO, temporary=False)
            access.active, access.activated_by = True, self.caissier
            access.save()
        yao = Patient.objects.get(phone=f"{PREFIXE}0008")
        conv = conversation(yao, self.medecin.pk)
        ecrire(conversation=conv, text="Bonjour docteur, la fièvre a baissé mais j'ai encore des maux de tête.", from_patient=True)
        ecrire(conversation=conv, text="Bonjour, c'est normal les premiers jours. Continuez le traitement et buvez beaucoup.", from_patient=False)
        ecrire(conversation=conv, text="D'accord merci docteur. Je dois revenir quand ?", from_patient=True)
        for item in PrescriptionItem.objects.filter(prescription__consultation__admission__patient=yao):
            programmer_rappel(patient=yao, item=item, times=["08:00", "20:00"], end_date=jour(3))

    # ------------------------------------------------------------------ modules de gestion

    def stocks(self):
        from stocks.models import Movement, Product, Supplier

        produits = [
            ("Artéméther-Luméfantrine", "Médicament", "Antipaludique", 3500, 120, 30),
            ("Paracétamol 500 mg", "Médicament", "Antalgique", 500, 400, 100),
            ("Amoxicilline 500 mg", "Médicament", "Antibiotique", 2500, 90, 40),
            ("Amlodipine 5 mg", "Médicament", "Antihypertenseur", 3000, 18, 25),
            ("SRO", "Médicament", "Réhydratation", 200, 250, 50),
            ("Zinc 20 mg", "Médicament", "Oligo-élément", 1500, 8, 20),
            ("Ceftriaxone 1 g", "Médicament", "Antibiotique", 1800, 60, 20),
            ("Artésunate injectable 60 mg", "Médicament", "Antipaludique", 4500, 12, 15),
            ("Métronidazole 250 mg", "Médicament", "Antiparasitaire", 1000, 150, 30),
            ("Ibuprofène 400 mg", "Médicament", "Anti-inflammatoire", 800, 200, 50),
            ("Gants d'examen (boîte de 100)", "Consommable", "", 4000, 35, 10),
            ("Seringues 5 ml", "Consommable", "", 100, 500, 100),
            ("Compresses stériles", "Consommable", "", 1500, 6, 20),
            ("Cathéters 22G", "Consommable", "", 600, 80, 30),
            ("Tubes EDTA", "Laboratoire", "", 150, 300, 100),
            ("Bandelettes urinaires", "Laboratoire", "", 8000, 4, 5),
            ("TDR paludisme", "Laboratoire", "", 700, 150, 50),
        ]
        for nom, categorie, classe, prix, stock, seuil in produits:
            p, cree = Product.objects.get_or_create(name=nom, defaults={
                "category": categorie, "therapeutic_class": classe, "price": prix, "stock": stock, "threshold": seuil})
            if not cree and p.stock < stock:
                # Une démonstration précédente a servi des ordonnances : le stock revient au niveau de départ.
                Product.objects.filter(pk=p.pk).update(stock=stock)
            if cree:
                Movement.objects.create(reference=f"DEMO-E{p.pk:04d}", product=p, type="Entrée", quantity=stock,
                                        stock_after=stock, motif="Stock initial", date=jour(-20),
                                        supplier="Laborex Côte d'Ivoire", user=self.admin)
        for nom, contact, tel, n in [("Laborex Côte d'Ivoire", "Service commercial", "27 21 75 30 00", 12),
                                     ("Copharmed", "M. Diabaté", "27 21 21 44 44", 8),
                                     ("Nouvelle PSP Côte d'Ivoire", "Dépôt d'Abidjan", "27 21 27 16 00", 15),
                                     ("DPCI Médical", "Mme Aka", "07 07 45 12 12", 4)]:
            Supplier.objects.get_or_create(name=nom, defaults={"contact": contact, "phone": tel, "products_count": n})

    def hygiene(self):
        from hygiene.models import CleaningTask, HygieneAudit, HygieneProduct, WasteCollection

        if CleaningTask.objects.exists():
            return
        taches = [("Bloc opératoire", "Désinfection", "Équipe A", 0, 7, "Terminée"),
                  ("Salle d'accouchement", "Décontamination", "Équipe B", 0, 9, "En cours"),
                  ("Urgences", "Nettoyage", "Équipe A", 0, 14, "Planifiée"),
                  ("Chambre A-101", "Désinfection", "Équipe C", 0, 16, "Planifiée"),
                  ("Laboratoire", "Nettoyage", "Équipe B", 1, 8, "Planifiée"),
                  ("Instruments du bloc", "Stérilisation", "Stérilisation", -1, 10, "Terminée")]
        for zone, type_, equipe, delta, heure, statut in taches:
            CleaningTask.objects.create(zone=zone, type=type_, responsible=equipe, date=jour(delta), hour=time(heure),
                                        status=statut, created_by=self.admin,
                                        completed_at=timezone.now() if statut == "Terminée" else None)
        for nom, icone in [("Solution hydroalcoolique", "FlaskConical"), ("Eau de Javel", "FlaskConical"),
                           ("Gants de ménage", "ShieldCheck"), ("Sacs DASRI", "Biohazard"), ("Boîtes à aiguilles", "LockKeyhole")]:
            HygieneProduct.objects.get_or_create(name=nom, defaults={"icon": icone, "last_check": jour(-2)})
        for type_, kg, delta in [("Déchets infectieux", "18.5", 0), ("Déchets assimilés", "42", 0),
                                 ("Déchets infectieux", "21", -1), ("Déchets chimiques", "3.2", -2)]:
            WasteCollection.objects.create(type=type_, quantity_kg=Decimal(kg), date=jour(delta))
        HygieneAudit.objects.create(date=jour(-10), score=86, compliant=True, next_date=jour(20),
                                    notes="Bonne tenue générale ; afficher le protocole de lavage des mains aux urgences.")

    def rh(self):
        from rh.models import Employee

        employes = [("RH-001", "KOUAME", "Jean", "Homme", "Médecin chef", "Médecine générale", "CDI"),
                    ("RH-002", "KOFFI", "Aya", "Femme", "Pédiatre", "Pédiatrie", "CDI"),
                    ("RH-003", "COULIBALY", "Mariam", "Femme", "Sage-femme", "Maternité", "CDI"),
                    ("RH-004", "N'GUESSAN", "Serge", "Homme", "Cardiologue", "Cardiologie", "Prestataire"),
                    ("RH-005", "DIABATE", "Koné", "Homme", "Infirmier", "Soins infirmiers", "CDI"),
                    ("RH-006", "KOUAKOU", "Brice", "Homme", "Aide-soignant", "Soins infirmiers", "CDD"),
                    ("RH-007", "AKA", "Estelle", "Femme", "Caissière", "Accueil et caisse", "CDI"),
                    ("RH-008", "TOURE", "Adama", "Homme", "Technicien de laboratoire", "Laboratoire", "CDI"),
                    ("RH-009", "BEUGRE", "Nadège", "Femme", "Pharmacienne", "Pharmacie", "CDI"),
                    ("RH-010", "SANOGO", "Issouf", "Homme", "Agent d'entretien", "Hygiène", "Stage")]
        champs = {f.name for f in Employee._meta.fields}
        for i, (mat, nom, prenom, sexe, poste, dep, contrat) in enumerate(employes):
            defaults = {"nom": nom, "prenom": prenom, "sexe": sexe, "poste": poste, "departement": dep, "contrat": contrat,
                        "telephone": f"07 08 {10 + i:02d} {20 + i:02d} {30 + i:02d}",
                        "statut": "Congé" if mat == "RH-004" else "Actif"}
            for champ in ("dateEmbauche", "date_embauche"):
                if champ in champs:
                    defaults[champ] = date(2018 + i % 7, 1 + i, 1)
            Employee.objects.get_or_create(matricule=mat, defaults=defaults)

    def maintenance(self):
        from maintenance.models import Equipment, Intervention

        appareils = [("Échographe", "Imagerie médicale", "Mindray", "DC-40", "En service", "Imagerie"),
                     ("Autoclave 75 L", "Stérilisation", "Tuttnauer", "3870EA", "En service", "Bloc opératoire"),
                     ("Réfrigérateur à vaccins", "Froid médical", "Dometic", "TCW 3000", "En service", "Vaccination"),
                     ("Groupe électrogène 60 kVA", "Électricité", "SDMO", "J66K", "En service", "Technique"),
                     ("Climatiseur bloc", "Climatisation", "Daikin", "FTXM50", "En panne", "Bloc opératoire"),
                     ("Moniteur multiparamétrique", "Monitoring", "Philips", "MX450", "En service", "Urgences"),
                     ("Analyseur d'hématologie", "Laboratoire", "Sysmex", "XP-300", "En service", "Laboratoire")]
        for i, (nom, cat, marque, modele, etat, service) in enumerate(appareils, 1):
            eq, cree = Equipment.objects.get_or_create(code=f"DEMO-{i:03d}", defaults={
                "hospital": self.hopital, "name": nom, "category": cat, "brand": marque, "model_name": modele,
                "state": etat, "service": service, "location": service, "acquisition": "Achat",
                "installation_date": date(2021, i, 10), "warranty_end": date(2027, i, 10), "created_by": self.admin})
            if cree and etat == "En panne":
                Intervention.objects.create(equipment=eq, technician="Froid Service CI", date=jour(0), time=time(10),
                                            type="Corrective", priority="Critique", status="En cours",
                                            description="Ne refroidit plus : bloc à 29 °C.", created_by=self.admin)
            elif cree and i % 3 == 0:
                Intervention.objects.create(equipment=eq, technician="Technicien biomédical", date=jour(-12),
                                            type="Préventive", status="Terminée", description="Maintenance préventive trimestrielle.",
                                            work_done="Contrôle et nettoyage", completed_at=timezone.now() - timedelta(days=12),
                                            created_by=self.admin)

    def ged(self):
        from ged.models import Document, IdentiteArchive

        if IdentiteArchive.objects.filter(hospital=self.hopital, numero_registre__startswith="DEMO").exists():
            return
        yao = Patient.objects.get(phone=f"{PREFIXE}0008")
        identites = [("YAO", "Paul", "M", 1981, "DEMO-1998-0142", 1998, "Médecine", yao),
                     ("AHOUA", "Brigitte", "F", 1965, "DEMO-1987-0031", 1987, "Maternité", None),
                     ("KOUASSI", "Kwasi Raphaël", "M", 1954, "DEMO-1979-0210", 1979, "Chirurgie", None),
                     ("DJEDJE", "Solange", "F", 1990, "DEMO-2004-0587", 2004, "Pédiatrie", None)]
        for nom, prenoms, sexe, annee, numero, annee_reg, service, patient in identites:
            ident = IdentiteArchive.objects.create(
                hospital=self.hopital, nom=nom, prenoms=prenoms, sexe=sexe, annee_naissance=annee,
                numero_registre=numero, annee_registre=annee_reg, service=service, patient=patient,
                notes="Retrouvé dans le registre papier du service.", created_by=self.admin)
            titre = f"Registre {service} {annee_reg} - {nom} {prenoms}"
            doc = Document(hospital=self.hopital, titre=titre, type="registre", date_document=date(annee_reg, 3, 15),
                           patient=patient, identite=ident, service=service, created_by=self.admin,
                           nom_fichier=f"registre-{numero}.pdf", type_mime="application/pdf")
            contenu = pdf(titre)
            doc.fichier.save(f"registre-{numero}.pdf", ContentFile(contenu), save=False)
            doc.taille = len(contenu)
            doc.save()
        for titre, type_ in [("Compte rendu d'hospitalisation 2019", "compte_rendu"),
                             ("Résultat NFS du 12/01/2024", "laboratoire")]:
            doc = Document(hospital=self.hopital, titre=titre, type=type_, date_document=date(2024, 1, 12),
                           patient=yao, created_by=self.admin, nom_fichier="document.pdf", type_mime="application/pdf")
            contenu = pdf(titre)
            doc.fichier.save("document.pdf", ContentFile(contenu), save=False)
            doc.taille = len(contenu)
            doc.save()

    # ------------------------------------------------------------------ ensemble

    def reinitialiser(self):
        from hospitalization.models import Bed

        demo = Patient.objects.filter(phone__startswith=PREFIXE)
        lits = list(Bed.objects.filter(hospitalizations__patient__in=demo).values_list("pk", flat=True))
        with transaction.atomic():
            for patient in demo:
                effacer(patient)
            Bed.objects.filter(pk__in=lits, hospitalizations__isnull=True).update(status="AVAILABLE")
            from ged.models import IdentiteArchive
            for ident in IdentiteArchive.objects.filter(numero_registre__startswith="DEMO"):
                for doc in ident.documents.all():
                    doc.fichier.delete(save=False)
                    effacer(doc)
                effacer(ident)

    def handle(self, *args, **options):
        if options["reinitialiser"]:
            self.reinitialiser()
            self.stdout.write("Données de démonstration effacées.")
        elif Patient.objects.filter(phone__startswith=PREFIXE).exists():
            raise CommandError("Les données de démonstration existent déjà : ajoutez --reinitialiser pour les refaire.")

        self.client = APIClient(SERVER_NAME="localhost")
        self.hopital = Hospital.objects.get(code="MAS")
        self.admin = self.compte("admin")
        self.caissier = self.compte("reception")
        self.infirmier = self.compte("infirmier")
        self.medecin = self.compte("medecin")
        self.pharmacien = self.compte("pharmacien")
        self.laborantin = self.compte("laborantin")

        self.praticiens = {}
        for username, mdp, prenom, nom, role, specialites, poste in PRATICIENS:
            user = User.objects.filter(username=username).first()
            if user is None:
                user = User.objects.create_user(username=username, password=mdp, first_name=prenom, last_name=nom,
                                                role=role, hospital=self.hopital, job_title=poste)
            user.specialites = specialites
            user.save(update_fields=["specialites"])
            self.praticiens[username] = user

        # La réception ouvre sa caisse (déjà ouverte : le serveur le dit, on continue).
        self.api(self.caissier, "post", "/api/parcours/caisse/session/", attendu=(200, 201, 400, 409))
        self.stocks()                         # avant les ordonnances : la pharmacie sert depuis le stock
        self.parcours()
        self.specialites()
        self.maternite()
        self.espace_patient()
        self.hygiene()
        self.rh()
        self.maintenance()
        self.ged()
        self.stdout.write(self.style.SUCCESS("Données de démonstration prêtes."))
