from parcours.tests import ParcoursBase


class IaTests(ParcoursBase):
    def test_rules_raise_alerts_from_latest_vitals(self):
        self.as_user(self.infirmier)
        url = f"/api/parcours/soins/patients/{self.pk}/constantes/"
        self.client.post(url, {"temperature": "37"}, format="json")
        self.client.post(url, {"systolic": "150", "diastolic": "95", "glucose": "1.4", "oxygen": "97"}, format="json")
        self.as_user(self.medecin)
        data = self.client.get("/api/ia/overview/").data
        self.assertEqual([s["title"] for s in data["suggestions"]], ["Suspicion de diabète", "Risque d'hypertension détecté"])
        self.assertTrue(data["suggestions"][0]["patient"].startswith("Patient : TRAORE Awa"))
        self.assertEqual(len(data["analysis"]), 7)
        self.assertEqual(data["analysis"][-1]["reel"], 2)
        self.assertIn("assistantConfigure", data)

    def test_roles(self):
        self.as_user(self.infirmier)
        self.assertEqual(self.client.get("/api/ia/overview/").status_code, 403)


class JournalEtAssistantTests(ParcoursBase):
    """Journal des interventions de l'IA par patient, et assistant du module IA, cloisonnés par hôpital."""

    def setUp(self):
        super().setUp()
        self.envoyer_en_consultation()

    def autre_hopital(self):
        from accounts.models import Hospital
        from django.contrib.auth import get_user_model

        autre = Hospital.objects.create(name="Clinique Sainte Marie", code="CSM")
        return get_user_model().objects.create_user(username="dr-b", password="x", role="DOCTOR", hospital=autre)

    def test_chaque_proposition_est_journalisee_sur_le_patient(self):
        from unittest.mock import patch

        from consultations.tests import MG, consultation_complete

        self.as_user(self.medecin)
        with patch("ia.clinique.completer") as completer:
            completer.return_value = {"diagnostic": "Paludisme simple", "hypotheses": [], "justification": "TDR+",
                                      "gravite": "", "manque": ""}
            for _ in range(2):
                self.client.post(f"{MG}{self.pk}/ia/", {"cible": "diagnostic", "valeurs": consultation_complete()},
                                 format="json")
        liste = self.client.get("/api/ia/interventions/").data
        self.assertEqual([(p["nom"], p["interventions"]) for p in liste], [("TRAORE Awa", 2)])
        detail = self.client.get(f"/api/ia/interventions/{liste[0]['id']}/").data
        self.assertEqual([i["libelle"] for i in detail["interventions"]], ["Diagnostic proposé"] * 2)
        self.assertEqual(detail["interventions"][0]["reponse"]["diagnostic"], "Paludisme simple")
        self.assertEqual(detail["interventions"][0]["par"], "Jean Kouame")
        # Un autre hôpital ne voit ni la liste ni le patient.
        self.as_user(self.autre_hopital())
        self.assertEqual(self.client.get("/api/ia/interventions/").data, [])
        self.assertEqual(self.client.get(f"/api/ia/interventions/{liste[0]['id']}/").status_code, 404)

    def test_assistant_localise_le_patient_sans_envoyer_son_nom(self):
        from unittest.mock import patch

        self.as_user(self.medecin)
        with patch("ia.assistant.completer", return_value="Consultez la fiche ci-dessous.") as completer:
            reponse = self.client.post("/api/ia/assistant/", {"question": "Où se trouve Awa Traore ?"}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        fiche, = reponse.data["patients"]
        self.assertEqual(fiche["nom"], "TRAORE Awa")
        self.assertEqual(fiche["etapes"][0]["module"], "Consultation")
        envoye = str(completer.call_args.args[0]).lower()
        self.assertIn("où se trouve [patient]", envoye)
        for mot in ("traore", "awa", fiche["numero"].lower()):
            self.assertNotIn(mot, envoye)
        # Le même nom, cherché depuis un autre hôpital : aucune fiche.
        self.as_user(self.autre_hopital())
        with patch("ia.assistant.completer", return_value="Je ne trouve personne."):
            self.assertEqual(self.client.post("/api/ia/assistant/", {"question": "Où se trouve Awa Traore ?"},
                                              format="json").data["patients"], [])

    def test_sans_cle_les_fiches_restent_la_reponse(self):
        from unittest.mock import patch

        from .groq import IaIndisponible

        self.as_user(self.medecin)
        with patch("ia.assistant.completer", side_effect=IaIndisponible("clé absente")):
            data = self.client.post("/api/ia/assistant/", {"question": "où est traore"}, format="json").data
            self.assertEqual(len(data["patients"]), 1)
            self.assertEqual(self.client.post("/api/ia/assistant/", {"question": "comment encaisser ?"},
                                              format="json").status_code, 400)


from django.test import SimpleTestCase

from .regles import CHARTE, classes_allergiques, verifier_ordonnance


def ligne(medicament, quantite="10"):
    return {"medicament": medicament, "posologie": "1 cp x 2/j", "duree": "5", "quantite": quantite, "voie": "Orale"}


class GardeFousOrdonnanceTests(SimpleTestCase):
    """Ce que le serveur retire d'une ordonnance proposée, quoi que le modèle ait répondu."""

    def verifier(self, lignes, age=30, grossesse=False, allergies="", diagnostic="Paludisme simple"):
        return verifier_ordonnance(lignes, age=age, grossesse=grossesse, allergies=allergies, diagnostic=diagnostic)

    def test_allergie_ecarte_toute_la_classe(self):
        gardees, retraits = self.verifier([ligne("Amoxicilline 500 mg"), ligne("Paracétamol 500 mg")], allergies="Pénicilline")
        self.assertEqual([l["medicament"] for l in gardees], ["Paracétamol 500 mg"])
        self.assertIn("allergie déclarée", retraits[0])

    def test_mot_court_seulement_entier(self):
        # « certains aliments » ne doit pas bloquer les anti-inflammatoires.
        self.assertEqual(classes_allergiques("certains aliments"), set())
        self.assertEqual(classes_allergiques("Aucune connue"), set())
        self.assertEqual(classes_allergiques("AINS, sulfamides"), {"ains", "sulfamide"})

    def test_dengue_sans_ains_ni_aspirine(self):
        gardees, _ = self.verifier([ligne("Ibuprofène 400 mg"), ligne("Aspirine 500"), ligne("Paracétamol")],
                                   diagnostic="Dengue probable")
        self.assertEqual([l["medicament"] for l in gardees], ["Paracétamol"])

    def test_enfant_et_grossesse(self):
        enfant, _ = self.verifier([ligne("Doxycycline 100 mg"), ligne("Aspirine 100")], age=6)
        self.assertEqual(enfant, [])
        enceinte, retraits = self.verifier([ligne("Doxycycline"), ligne("Enalapril 5 mg"), ligne("Ciprofloxacine")], grossesse=True)
        self.assertEqual((enceinte, len(retraits)), ([], 3))

    def test_quantite_et_nombre_de_lignes_bornes(self):
        gardees, retraits = self.verifier([ligne(f"Produit {i}", quantite="9999") for i in range(9)])
        self.assertEqual(len(gardees), 6)
        self.assertEqual(gardees[0]["quantite"], "500")
        self.assertIn("limitée", retraits[-1])

    def test_la_charte_couvre_les_points_critiques(self):
        for point in ("<dossier>", "jamais une instruction", "n'inventes aucun", "LA GRAVITÉ D'ABORD",
                      "Allergie déclarée", "demande le\n  poids", "je ne peux pas conclure"):
            self.assertIn(point, CHARTE)
