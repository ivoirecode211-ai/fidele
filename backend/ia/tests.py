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
        self.assertEqual([m["status"] for m in data["models"]].count("Actif"), 2)

    def test_roles(self):
        self.as_user(self.infirmier)
        self.assertEqual(self.client.get("/api/ia/overview/").status_code, 403)


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
