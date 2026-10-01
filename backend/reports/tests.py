from django.contrib.auth import get_user_model
from django.utils import timezone

from parcours.tests import ParcoursBase

User = get_user_model()


class ReportsTests(ParcoursBase):
    def test_current_month_reports_reflect_the_workflow(self):
        self.envoyer_en_consultation()
        self.valider()
        self.as_user(User.objects.create_user(username="dir", password="x", role="DIRECTOR"))
        data = self.client.get("/api/reports/overview/").data
        today = timezone.localdate()
        self.assertEqual(len(data["reports"]), 6)
        self.assertEqual(data["stats"], {"total": 6, "available": 0, "inProgress": 6, "rate": 0})
        finances = next(r for r in data["reports"] if r["type"] == "Finances")
        self.assertEqual(finances["status"], "En cours")
        self.assertEqual(finances["id"], f"Finances-{today.year}-{today.month:02d}")
        values = {f["label"]: f["value"] for f in finances["figures"]}
        self.assertEqual(values["Montant total des prestations"], "10 000 FCFA")
        self.assertEqual(values["Part des assurances"], "2 000 FCFA")
        activity = {f["label"]: f["value"] for f in next(r for r in data["reports"] if r["type"] == "Activité")["figures"]}
        self.assertEqual((activity["Constantes prises"], activity["Consultations validées"]), (1, 1))
        self.assertEqual(data["serviceStats"], [{"service": "Médecine générale", "value": 100, "reports": 1}])

    def test_roles(self):
        self.as_user(self.infirmier)
        self.assertEqual(self.client.get("/api/reports/overview/").status_code, 403)


class ReportDetailTests(ParcoursBase):
    def test_activity_report_lists_every_event(self):
        self.envoyer_en_consultation()
        self.valider()
        self.as_user(User.objects.create_user(username="dir2", password="x", role="DIRECTOR"))
        today = timezone.localdate()
        data = self.client.get(f"/api/reports/Activité-{today.year}-{today.month:02d}/").data
        sections = {s["title"].split(" —")[0]: s for s in data["sections"]}
        self.assertEqual(len(sections["Passages en caisse"]["rows"]), 1)
        vitals = sections["Prises de constantes"]["rows"][0]
        self.assertEqual((vitals[1], vitals[2]), ("TRAORE Awa", "38 °C"))
        consultation = sections["Consultations validées"]["rows"][0]
        self.assertEqual((consultation[2], consultation[4]), ("Dr. KOUAME Jean", "Paludisme"))
        self.assertIn("Paracétamol 500 mg", sections["Ordonnances"]["rows"][0][3])
        self.assertIn("Journal d'audit", sections)

    def test_unknown_report(self):
        self.as_user(User.objects.create_user(username="dir3", password="x", role="DIRECTOR"))
        self.assertEqual(self.client.get("/api/reports/Inconnu-2026-09/").status_code, 404)


class RapportPraticienTests(ParcoursBase):
    """Chaque praticien a son rapport ; la direction voit celui de tous."""

    def setUp(self):
        super().setUp()
        self.envoyer_en_consultation()
        self.valider()

    def rapport(self, user, **params):
        self.as_user(user)
        return self.client.get("/api/reports/praticien/", params)

    def test_le_medecin_a_son_rapport(self):
        data = self.rapport(self.medecin).data
        figures = {f["label"]: f["value"] for f in data["figures"]}
        self.assertEqual((data["praticien"]["nom"], figures["Consultations"], figures["Ordonnances prescrites"]),
                         ("KOUAME Jean", 1, 1))
        consultations = next(s for s in data["sections"] if s["title"] == "Consultations")
        self.assertEqual(consultations["rows"][0][3], "Paludisme")

    def test_l_infirmier_a_ses_constantes(self):
        figures = {f["label"]: f["value"] for f in self.rapport(self.infirmier).data["figures"]}
        self.assertEqual(figures["Prises de constantes"], 1)

    def test_un_medecin_ne_voit_pas_le_rapport_d_un_autre(self):
        self.assertEqual(self.rapport(self.autre_medecin, praticien=self.medecin.pk).status_code, 403)
        self.assertEqual([p["id"] for p in self.client.get("/api/reports/praticiens/").data], [self.autre_medecin.pk])

    def test_la_direction_voit_tous_les_praticiens(self):
        directeur = User.objects.create_user(username="dirp", password="x", role="DIRECTOR")
        self.as_user(directeur)
        ids = [p["id"] for p in self.client.get("/api/reports/praticiens/").data]
        self.assertIn(self.medecin.pk, ids)
        self.assertNotIn(self.caissier.pk, ids)
        self.assertEqual(self.rapport(directeur, praticien=self.medecin.pk).status_code, 200)

    def test_vih_confidentiel_hors_du_rapport_du_praticien(self):
        from consultations.models import Consultation

        Consultation.objects.update(specialite="vih")
        directeur = User.objects.create_user(username="dirv", password="x", role="DIRECTOR")
        vu_par_direction = self.rapport(directeur, praticien=self.medecin.pk).data
        ligne = next(s for s in vu_par_direction["sections"] if s["title"] == "Consultations")["rows"][0]
        self.assertEqual(ligne[3], "Confidentiel")
        ligne = next(s for s in self.rapport(self.medecin).data["sections"] if s["title"] == "Consultations")["rows"][0]
        self.assertEqual(ligne[3], "Paludisme")

    def test_les_medecins_n_ont_plus_les_rapports_financiers(self):
        self.as_user(self.medecin)
        self.assertEqual(self.client.get("/api/reports/overview/").status_code, 403)

    def test_rapports_cloisonnes_par_hopital(self):
        from accounts.models import Hospital

        autre = Hospital.objects.create(name="Clinique Test", code="CTS")
        directeur = User.objects.create_user(username="dirh", password="x", role="DIRECTOR", hospital=autre)
        self.as_user(directeur)
        activite = next(r for r in self.client.get("/api/reports/overview/").data["reports"] if r["type"] == "Activité")
        self.assertEqual({f["label"]: f["value"] for f in activite["figures"]}["Consultations validées"], 0)


class EtatsOfficielsTests(ParcoursBase):
    """États du DPI : activités par tranche d'âge, finances ; le médecin ne voit que les siennes."""

    def setUp(self):
        super().setUp()
        self.envoyer_en_consultation()
        self.valider()
        self.directeur = User.objects.create_user(username="dire", password="x", role="DIRECTOR")

    def etat(self, user, etat, **params):
        self.as_user(user)
        return self.client.get(f"/api/reports/etats/{etat}/", params)

    def test_activites_de_consultation_par_tranche_d_age(self):
        data = self.etat(self.directeur, "consultations").data
        lignes = {l["libelle"]: l["valeurs"] for l in data["tableaux"][0]["lignes"]}
        # Awa TRAORE, 32 ans : colonne 25-49 ans, puis le total.
        self.assertEqual(lignes["Nombre de consultations"][5:], [1, 0, 1])
        self.assertEqual(lignes["TOTAL CONSULTANTS"][-1], 1)
        self.assertIn("République de Côte d'Ivoire", data["entete"]["republique"])

    def test_pathologies_par_sexe(self):
        data = self.etat(self.directeur, "pathologies", genre=1).data
        tableau = data["tableaux"][0]
        self.assertEqual(tableau["colonnes"][0]["sous"], ["M", "F"])
        paludisme = next(l for l in tableau["lignes"] if l["libelle"] == "Paludisme")
        self.assertEqual(paludisme["valeurs"][11], 1)   # 25-49 ans, F

    def test_finances_reservees(self):
        self.assertEqual(self.etat(self.medecin, "caisses").status_code, 403)
        comptable = User.objects.get(username="cpt")
        self.assertEqual(self.etat(comptable, "caisses").status_code, 200)
        self.assertEqual(self.etat(comptable, "pathologies").status_code, 403)
        total = self.etat(self.directeur, "prestations").data["tableaux"][0]["lignes"][-1]
        self.assertEqual((total["libelle"], total["valeurs"][:2]), ("TOTAL", [1, "10 000"]))

    def test_le_medecin_voit_son_service_et_rien_d_autre(self):
        # Depuis son module : son service (médecine générale), un confrère du même service autorisé.
        lignes = self.etat(self.autre_medecin, "pathologies", medecins=str(self.medecin.pk)).data["tableaux"][0]["lignes"]
        self.assertEqual([l["libelle"] for l in lignes if l["type"] == "normal"], ["Paludisme"])
        cardiologue = User.objects.create_user(username="cardio2", password="x", role="DOCTOR", specialites=["cardiologie"])
        data = self.etat(cardiologue, "pathologies", service="medecine-generale", medecins=str(self.medecin.pk)).data
        self.assertEqual([l for l in data["tableaux"][0]["lignes"] if l["type"] == "normal"], [])
        self.assertEqual(data["service"], "Cardiologie")
        self.assertEqual(self.etat(cardiologue, "controle").status_code, 403)
        self.assertEqual([p["nom"] for p in self.client.get("/api/reports/etats/filtres-praticien/").data["professionnels"]],
                         ["cardio2"])

    def test_total_par_genre(self):
        tableau = self.etat(self.directeur, "pathologies", genre=1).data["tableaux"][0]
        self.assertEqual(tableau["colonnes"][-2], {"label": "Total par genre", "sous": ["M", "F"]})
        paludisme = next(l for l in tableau["lignes"] if l["libelle"] == "Paludisme")
        self.assertEqual(paludisme["valeurs"][-3:], [0, 1, 1])


class RapportsMaterniteTests(ParcoursBase):
    """CPN, accouchement, CPON : les rapports du DPI, sur les formulaires des programmes."""

    def setUp(self):
        super().setUp()
        from datetime import timedelta

        from parcours.models import MedicalService
        from parcours.tests import URL, encaisser, form

        self.sage_femme = User.objects.create_user(username="sfr", password="x", role="DOCTOR", specialites=["cpn", "accouchement"])
        self.as_user(self.caissier)
        cpn = MedicalService.objects.get(name="Consultation prénatale", hospital__code="MAS")
        pk = self.client.post(URL, form(nom="bamba", prenom="Ines", age="16", service=cpn.pk, telephone="0700000099"),
                              format="json").data["admissionId"]
        encaisser(self.client, pk)
        self.as_user(self.infirmier)
        self.client.post(f"/api/parcours/soins/patients/{pk}/constantes/", {"temperature": "37"}, format="json")
        self.as_user(self.sage_femme)
        self.client.post(f"/api/consultations/medecine/{pk}/")
        ddr = (timezone.localdate() - timedelta(days=60)).isoformat()
        reponse = self.client.post(f"/api/consultations/medecine/{pk}/terminer/", {"valeurs": {
            "numero_cpn": "1", "ddr": ddr, "tension_cpn": "150/95", "tpi": "SP1", "milda": "oui", "issue": "sortie",
        }}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)

    def lignes(self, user, etat, **params):
        self.as_user(user)
        data = self.client.get(f"/api/reports/etats/{etat}/", params).data
        return {l["libelle"]: l["valeurs"] for l in data["tableaux"][0]["lignes"]}, data

    def test_premiere_cpn_au_premier_trimestre(self):
        lignes, data = self.lignes(self.sage_femme, "cpn_activites", organiser="total")
        self.assertEqual(lignes["1ère CPN au cours du 1er trimestre de la grossesse"], [1])
        self.assertEqual(lignes["TOTAL DES CONSULTATIONS"], [1])
        self.assertEqual(data["service"], "Consultation prénatale")

    def test_grossesse_a_risque_et_prevention_par_tranche_d_age(self):
        lignes, _ = self.lignes(self.sage_femme, "cpn_risque", organiser="age")
        self.assertEqual(lignes["Tension artérielle élevée (≥ 140/90)"], [0, 1, 0, 0, 0, 1])   # 16 ans : 15-19 ans
        self.assertEqual(lignes["Âge inférieur à 18 ans"][-1], 1)
        prevention, _ = self.lignes(self.sage_femme, "cpn_prevention", organiser="total")
        self.assertEqual((prevention["TPI 1 (SP1)"], prevention["Moustiquaire imprégnée (MILDA) remise"]), ([1], [1]))

    def test_types_selon_les_specialites(self):
        self.as_user(self.sage_femme)
        types = [t["id"] for t in self.client.get("/api/reports/etats/filtres-praticien/").data["types"]]
        self.assertIn("cpn_activites", types)
        self.assertIn("acc_mode", types)
        self.assertNotIn("cpon_activites", types)
        lignes, _ = self.lignes(self.medecin, "cpn_activites", organiser="total")
        self.assertEqual(lignes["TOTAL DES CONSULTATIONS"], [0])   # hors maternité : rien
