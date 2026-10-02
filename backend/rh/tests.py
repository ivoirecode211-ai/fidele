from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()


class RhTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(User.objects.create_user(username="rh", password="x", role="HR"))

    def employee(self, **overrides):
        data = {"matricule": "", "nom": "Kouassi", "prenom": "Jean", "sexe": "Homme", "telephone": "0708",
                "email": "", "poste": "Médecin", "departement": "Médecine générale", "dateEmbauche": "2024-01-15",
                "contrat": "CDI", "statut": "Actif"}
        data.update(overrides)
        return self.client.post("/api/rh/employes/", data, format="json")

    def test_crud_and_matricule(self):
        first = self.employee().data
        self.assertEqual(first["matricule"], "EMP-0001")
        self.assertEqual(self.employee(nom="Yao").data["matricule"], "EMP-0002")
        self.assertEqual(self.employee(matricule="emp-0002").status_code, 400)
        pk = first["id"]
        self.assertEqual(self.client.patch(f"/api/rh/employes/{pk}/", {"statut": "Congé"}, format="json").data["statut"], "Congé")
        self.assertEqual(self.client.put(f"/api/rh/employes/{pk}/", {**first, "poste": "Chef de service"}, format="json").data["poste"], "Chef de service")
        self.assertEqual(self.client.delete(f"/api/rh/employes/{pk}/").status_code, 204)
        self.assertEqual(len(self.client.get("/api/rh/employes/").data), 1)

    def test_validation_and_roles(self):
        self.assertEqual(self.employee(poste="").status_code, 400)
        self.assertEqual(self.employee(statut="Retraité").status_code, 400)
        self.client.force_authenticate(User.objects.create_user(username="n", password="x", role="NURSE"))
        self.assertEqual(self.client.get("/api/rh/employes/").status_code, 403)

    def test_absences_et_fin_de_contrat(self):
        pk = self.employee(contrat="CDD", dateFinContrat="2026-12-31").data["id"]
        self.assertEqual(self.client.get("/api/rh/employes/").data[0]["dateFinContrat"], "2026-12-31")
        r = self.client.post("/api/rh/absences/", {"employe": pk, "type": "Maladie", "debut": "2026-10-01", "fin": "2026-10-03"}, format="json")
        self.assertEqual((r.status_code, r.data["jours"]), (201, 3))
        self.assertEqual(self.client.post("/api/rh/absences/", {"employe": pk, "debut": "2026-10-05", "fin": "2026-10-01"},
                                          format="json").status_code, 400)
        self.assertEqual(self.client.delete(f"/api/rh/absences/{r.data['id']}/").status_code, 204)
