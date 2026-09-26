from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()
BASE = "/api/administration"


class AdministrationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin", password="x", role="ADMIN", first_name="Awa", last_name="Kone")
        self.client.force_authenticate(self.admin)

    def form(self, **overrides):
        data = {"name": "KOUADIO Jean", "function": "Médecin chef", "roles": ["Médecin", "Pharmacien"],
                "email": "jean@masante.local", "phone": "0700000000"}
        data.update(overrides)
        return data

    def test_create_user_with_several_roles_and_temporary_password(self):
        response = self.client.post(f"{BASE}/users/", self.form(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["name"], "KOUADIO Jean")
        self.assertEqual(response.data["roles"], ["Médecin", "Pharmacien"])
        self.assertEqual(response.data["connection"], "Jamais connecté")
        user = User.objects.get(email="jean@masante.local")
        self.assertEqual((user.role, user.extra_roles, user.job_title), ("DOCTOR", ["PHARMACY"], "Médecin chef"))
        self.assertTrue(user.check_password(response.data["temporaryPassword"]))
        self.assertTrue(user.has_role("PHARMACY"))

    def test_extra_role_opens_the_matching_api(self):
        self.client.post(f"{BASE}/users/", self.form(), format="json")
        self.client.force_authenticate(User.objects.get(email="jean@masante.local"))
        self.assertEqual(self.client.get("/api/parcours/pharmacie/ordonnances/").status_code, 200)
        self.assertEqual(self.client.get("/api/parcours/soins/patients/").status_code, 403)

    def test_update_and_deactivate_user(self):
        pk = self.client.post(f"{BASE}/users/", self.form(), format="json").data["id"]
        response = self.client.put(f"{BASE}/users/{pk}/", self.form(roles=["Infirmier/infirmière"]), format="json")
        self.assertEqual(response.data["roles"], ["Infirmier/infirmière"])
        self.assertEqual(self.client.delete(f"{BASE}/users/{pk}/").data["status"], "Inactif")
        self.assertFalse(User.objects.get(pk=pk).is_active)

    def test_cannot_deactivate_own_account(self):
        self.assertEqual(self.client.delete(f"{BASE}/users/{self.admin.pk}/").status_code, 400)

    def test_validation(self):
        self.assertEqual(self.client.post(f"{BASE}/users/", self.form(roles=[]), format="json").status_code, 400)
        self.assertEqual(self.client.post(f"{BASE}/users/", self.form(roles=["Secrétaire"]), format="json").status_code, 400)
        self.assertEqual(self.client.post(f"{BASE}/users/", self.form(name="Jean"), format="json").status_code, 400)
        self.client.post(f"{BASE}/users/", self.form(), format="json")
        self.assertEqual(self.client.post(f"{BASE}/users/", self.form(), format="json").status_code, 400)

    def test_overview_reflects_real_data(self):
        self.client.post(f"{BASE}/users/", self.form(), format="json")
        self.client.post(f"{BASE}/documents/", {"name": "Règlement intérieur", "type": "PDF"}, format="json")
        data = self.client.get(f"{BASE}/overview/").data
        self.assertEqual(data["stats"], {"activeUsers": 2, "roles": 3, "documents": 1})
        self.assertEqual(sum(row["percentage"] for row in data["roleDistribution"]), 100)
        self.assertIn("Médecin", data["availableRoles"])
        self.assertEqual(data["documents"][0]["name"], "Règlement intérieur")

    def test_only_admins(self):
        self.client.force_authenticate(User.objects.create_user(username="d", password="x", role="DIRECTOR"))
        self.assertEqual(self.client.get(f"{BASE}/overview/").status_code, 403)
