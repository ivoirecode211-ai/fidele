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

    def test_prescription_is_assigned_to_authenticated_doctor(self):
        response = self.client.post("/api/prescriptions/", {
            "patient": self.patient.id, "instructions": "3x/jour après repas",
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["doctor"], self.doctor.id)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/prescriptions/")
        self.assertEqual(response.status_code, 401)
