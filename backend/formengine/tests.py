from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import FormInstance

User = get_user_model()


class FormInstanceFlowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="caissier", password="pass1234")
        self.client.force_authenticate(self.user)

    def test_full_flow_create_save_resume_submit(self):
        create = self.client.post("/api/forms/", {"form_key": "caisse_admission"})
        self.assertEqual(create.status_code, 201)
        instance_id = create.data["id"]
        self.assertEqual(create.data["status"], "draft")

        step1 = self.client.post(
            f"/api/forms/{instance_id}/save_step/",
            {"step_id": "identification", "complete": True, "data": {"last_name": "TRAORE"}},
            format="json",
        )
        self.assertEqual(step1.status_code, 200)
        self.assertEqual(step1.data["status"], "in_progress")
        self.assertEqual(step1.data["completed_steps"], ["identification"])

        step2 = self.client.post(
            f"/api/forms/{instance_id}/save_step/",
            {"step_id": "orientation", "complete": True, "data": {"service": "MEDECINE"}},
            format="json",
        )
        self.assertEqual(step2.data["completed_steps"], ["identification", "orientation"])

        # Une reprise après coupure doit retrouver les deux étapes déjà saisies.
        resume = self.client.get(f"/api/forms/{instance_id}/")
        self.assertEqual(resume.data["data"]["identification"]["last_name"], "TRAORE")
        self.assertEqual(resume.data["data"]["orientation"]["service"], "MEDECINE")

        submit = self.client.post(f"/api/forms/{instance_id}/submit/")
        self.assertEqual(submit.data["status"], "submitted")
        self.assertIsNotNone(submit.data["submitted_at"])

    def test_save_step_without_step_id_is_rejected(self):
        create = self.client.post("/api/forms/", {"form_key": "caisse_admission"})
        instance_id = create.data["id"]

        response = self.client.post(
            f"/api/forms/{instance_id}/save_step/", {"data": {}}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_cancel_sets_status(self):
        create = self.client.post("/api/forms/", {"form_key": "caisse_admission"})
        instance_id = create.data["id"]

        response = self.client.post(f"/api/forms/{instance_id}/cancel/")
        self.assertEqual(response.data["status"], "cancelled")

    def test_anonymous_access_is_rejected(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/forms/")
        self.assertEqual(response.status_code, 401)
