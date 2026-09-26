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
