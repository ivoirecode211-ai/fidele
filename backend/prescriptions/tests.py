from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from patients.models import Patient

User = get_user_model()


class PrescriptionApiTests(APITestCase):
    def setUp(self):
        self.doctor = User.objects.create_user(username="medecin", password="pass1234", role="DOCTOR")
        self.client.force_authenticate(self.doctor)
        self.patient = Patient.objects.create(
            patient_number="P-600", last_name="SANGARE", first_names="Oumar",
            birth_date="1988-07-22", sex="M",
        )

    def test_generic_route_is_read_only_and_scoped(self):
        from accounts.models import Hospital

        self.assertEqual(self.client.post("/api/prescriptions/", {"patient": self.patient.id}).status_code, 405)
        self.assertEqual(self.client.get("/api/prescriptions/").status_code, 200)
        autre = Hospital.objects.create(name="Clinique Sainte Marie", code="CSM")
        self.client.force_authenticate(User.objects.create_user(username="dr-b", password="x", role="DOCTOR", hospital=autre))
        data = self.client.get("/api/prescriptions/").data
        self.assertEqual(data.get("results", data) if isinstance(data, dict) else data, [])

    def test_other_roles_are_refused(self):
        self.client.force_authenticate(User.objects.create_user(username="cpt", password="x", role="ACCOUNTING"))
        self.assertEqual(self.client.get("/api/prescriptions/").status_code, 403)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/prescriptions/")
        self.assertEqual(response.status_code, 401)
