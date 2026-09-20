from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from patients.models import Patient

User = get_user_model()


class ConsultationApiTests(APITestCase):
    def setUp(self):
        self.doctor = User.objects.create_user(username="medecin", password="pass1234", role="DOCTOR")
        self.client.force_authenticate(self.doctor)
        self.patient = Patient.objects.create(
            patient_number="P-500", last_name="DIALLO", first_names="Fatim",
            birth_date="1995-09-05", sex="F",
        )

    def test_consultation_is_assigned_to_authenticated_doctor(self):
        other_doctor = User.objects.create_user(username="autre", password="pass1234", role="DOCTOR")

        response = self.client.post("/api/consultations/", {
            "patient": self.patient.id, "doctor": other_doctor.id, "reason": "Fièvre",
        })
        self.assertEqual(response.status_code, 201)
        # Le médecin est toujours celui qui est connecté, quoi que le client envoie.
        self.assertEqual(response.data["doctor"], self.doctor.id)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/consultations/")
        self.assertEqual(response.status_code, 401)
