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
        self.requester = User.objects.create_user(username="admin", password="pass1234", role="ADMIN")
        self.client.force_authenticate(self.requester)

    def test_role_filter_returns_only_matching_users(self):
        response = self.client.get("/api/auth/users/?role=DOCTOR")
        self.assertEqual(response.status_code, 200)
        roles = {u["role"] for u in response.data}
        self.assertEqual(roles, {"DOCTOR"})

    def test_no_filter_returns_all_users(self):
        response = self.client.get("/api/auth/users/")
        self.assertEqual(len(response.data), 3)
