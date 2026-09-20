from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from patients.models import Patient
from .models import Bed, Hospitalization, Room

User = get_user_model()


class HospitalizationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="reception", password="pass1234")
        self.client.force_authenticate(self.user)
        self.room = Room.objects.create(name="Chambre 1", department="Médecine")
        self.bed = Bed.objects.create(room=self.room, number="1A")
        self.patient = Patient.objects.create(
            patient_number="P-300", last_name="OUATTARA", first_names="Seydou",
            birth_date="1980-03-20", sex="M",
        )

    def test_list_beds(self):
        Bed.objects.create(room=self.room, number="1B", status="OCCUPIED")

        response = self.client.get("/api/hospitalization/beds/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_admit_patient(self):
        response = self.client.post("/api/hospitalization/", {
            "patient": self.patient.id, "bed": self.bed.id,
            "admission_date": "2026-01-10T08:00:00Z",
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Hospitalization.objects.count(), 1)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/hospitalization/beds/")
        self.assertEqual(response.status_code, 401)
