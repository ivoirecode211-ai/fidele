from django.contrib.auth import get_user_model

from parcours.tests import ParcoursBase

User = get_user_model()


class LaboratoryTests(ParcoursBase):
    def setUp(self):
        super().setUp()
        self.labo = User.objects.create_user(username="lab", password="x", role="LAB", first_name="Emmanuel", last_name="Koffi")
        self.as_user(self.labo)

    def test_worklist_request_and_results(self):
        row = self.client.get("/api/laboratory/overview/").data["analyses"][0]
        self.assertEqual((row["id"], row["patient"], row["statut"], row["type"]), (f"LAB-{self.pk:03d}", "TRAORE Awa", "En attente", "—"))
        response = self.client.post(f"/api/laboratory/analyses/{self.pk}/demande/", {"examIds": ["glycemie", "crp"]}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual((response.data["type"], response.data["caisse"]["montant"]), ("2 examens", 7500.0))
        response = self.client.post(f"/api/laboratory/analyses/{self.pk}/resultat/",
                                    {"results": {"glycemie": "1,4", "crp": "12"}, "observation": "Hyperglycémie"}, format="json")
        self.assertEqual(response.data["statut"], "Terminée")
        self.assertEqual(response.data["resultat"], "Glycémie: 1,4 g/L | CRP: 12 mg/L")

    def test_changing_exams_keeps_entered_results(self):
        url = f"/api/laboratory/analyses/{self.pk}/"
        self.client.post(url + "demande/", {"examIds": ["glycemie"]}, format="json")
        self.client.post(url + "resultat/", {"results": {"glycemie": "0,9"}}, format="json")
        data = self.client.post(url + "demande/", {"examIds": ["glycemie", "nfs"]}, format="json").data
        self.assertEqual(data["statut"], "En attente")
        self.assertEqual({e["id"]: e["result"] for e in data["examens"]}, {"glycemie": "0,9", "nfs": ""})

    def test_completed_results_are_archived(self):
        url = f"/api/laboratory/analyses/{self.pk}/"
        self.client.post(url + "demande/", {"examIds": ["nfs"]}, format="json")
        self.client.post(url + "resultat/", {"results": {"nfs": "Normale"}}, format="json")
        self.as_user(User.objects.create_user(username="dir", password="x", role="DIRECTOR"))
        types = [d["type"] for d in self.client.get("/api/archives/overview/").data["documents"]]
        self.assertIn("Résultat labo", types)

    def test_rules(self):
        self.assertEqual(self.client.post(f"/api/laboratory/analyses/{self.pk}/demande/", {"examIds": []}, format="json").status_code, 400)
        self.assertEqual(self.client.post(f"/api/laboratory/analyses/{self.pk}/resultat/", {}, format="json").status_code, 400)
        self.as_user(self.infirmier)
        self.assertEqual(self.client.get("/api/laboratory/overview/").status_code, 200)
        self.assertEqual(self.client.post(f"/api/laboratory/analyses/{self.pk}/demande/", {"examIds": ["nfs"]}, format="json").status_code, 403)
