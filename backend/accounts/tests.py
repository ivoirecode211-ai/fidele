from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()


class LoginTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="medecin", email="medecin@masante.local",
            password="pass1234", role="DOCTOR",
        )

    def test_login_with_username(self):
        response = self.client.post(
            "/api/auth/login/", {"username": "medecin", "password": "pass1234"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)

    def test_login_with_email_resolves_to_username(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "medecin@masante.local", "password": "pass1234"},
        )
        self.assertEqual(response.status_code, 200)

    def test_login_with_wrong_password_is_rejected(self):
        response = self.client.post(
            "/api/auth/login/", {"username": "medecin", "password": "wrong"}
        )
        self.assertEqual(response.status_code, 401)

    def test_superuser_is_always_an_administrator(self):
        superuser = User.objects.create_superuser(
            username="superviseur", password="pass1234", role="RECEPTION"
        )

        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.is_staff)
        self.assertEqual(superuser.role, "ADMIN")

    def test_me_exposes_superuser_status(self):
        superuser = User.objects.create_superuser(
            username="superviseur-api", password="pass1234"
        )
        self.client.force_authenticate(superuser)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_superuser"])
        self.assertTrue(response.data["is_staff"])
        self.assertEqual(response.data["role"], "ADMIN")


class UserListTests(APITestCase):
    def setUp(self):
        User.objects.create_user(username="medecin1", password="pass1234", role="DOCTOR")
        User.objects.create_user(username="infirmier1", password="pass1234", role="NURSE")
        from .models import Hospital

        self.requester = User.objects.create_user(username="admin", password="pass1234", role="ADMIN",
                                                  hospital=Hospital.objects.first())
        self.client.force_authenticate(self.requester)

    def test_role_filter_returns_only_matching_users(self):
        response = self.client.get("/api/auth/users/?role=DOCTOR")
        self.assertEqual(response.status_code, 200)
        roles = {u["role"] for u in response.data}
        self.assertEqual(roles, {"DOCTOR"})

    def test_no_filter_returns_all_users(self):
        response = self.client.get("/api/auth/users/")
        self.assertEqual(len(response.data), 3)


class PlatformTests(APITestCase):
    """Espace de la plateforme : hôpitaux, leur administrateur, et le cloisonnement."""

    def setUp(self):
        self.platform = User.objects.create_superuser(username="plateforme", password="pass1234")
        self.client.force_authenticate(self.platform)

    def create_hospital(self, name="Centre de Santé Urbain de Treichville", **extra):
        data = {"name": name, "phone": "0707070707", "city": "Abidjan", "district": "Treichville", **extra}
        return self.client.post("/api/plateforme/hopitaux/", data, format="json")

    def test_code_comes_from_the_acronym_and_stays_unique(self):
        from .tenancy import code_candidates

        self.assertEqual(code_candidates("Centre de Santé Urbain de Treichville")[0], "CSU")
        first = self.create_hospital().data
        self.assertEqual((first["code"], first["city"], first["district"]), ("CSU", "Abidjan", "Treichville"))
        second = self.create_hospital().data
        self.assertNotEqual(second["code"], "CSU")
        self.assertRegex(second["code"], r"^[A-Z]{3}$")
        self.assertEqual(self.create_hospital(city="").status_code, 400)

    def test_hospital_admin_administers_only_his_hospital(self):
        hospital = self.create_hospital().data
        created = self.client.post("/api/plateforme/administrateurs/", {
            "hospital": hospital["id"], "name": "YAO Serge", "email": "yao@csu.ci", "phone": "0101010101",
        }, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual((created.data["hospitalCode"], created.data["username"]), ("CSU", "syao"))
        admin = User.objects.get(username="syao")
        self.assertEqual((admin.role, admin.is_superuser, admin.is_platform), ("ADMIN", False, False))

        self.client.force_authenticate(admin)
        self.assertEqual(self.client.get("/api/plateforme/hopitaux/").status_code, 403)
        me = self.client.get("/api/auth/me/").data
        self.assertEqual((me["hospital"]["code"], me["is_platform"]), ("CSU", False))
        settings = self.client.get("/api/administration/parametres/").data
        self.assertEqual((settings["name"], settings["ticket_copies"], settings["ticket_validity_days"]),
                         ("Centre de Santé Urbain de Treichville", 3, 15))
        users = self.client.get("/api/administration/overview/").data["users"]
        self.assertEqual([u["username"] for u in users], ["syao"])

    def test_patients_never_cross_hospitals(self):
        from patients.models import Patient

        hospital = self.create_hospital().data
        other = User.objects.create_user(username="caisse-csu", password="x", role="RECEPTION", hospital_id=hospital["id"])
        mine = User.objects.create_user(username="caisse-mas", password="x", role="RECEPTION")
        for user, name in ((other, "KONE"), (mine, "YAO")):
            self.client.force_authenticate(user)
            created = self.client.post("/api/accueil/patients/", {
                "last_name": name, "first_names": "Awa", "sex": "F", "phone": "0700000000"}, format="json")
            self.assertEqual(created.status_code, 201, created.data)
        self.assertRegex(Patient.objects.get(last_name="KONE").patient_number, r"^P\d{2}[A-Z2-9]{3}CSU$")
        self.assertEqual([p["last_name"] for p in self.client.get("/api/accueil/patients/").data["resultats"]], ["YAO"])
        kone = Patient.objects.get(last_name="KONE")
        refused = self.client.post("/api/accueil/fiches/", {"patient": kone.pk, "prestation": 1}, format="json")
        self.assertEqual(refused.status_code, 404)
