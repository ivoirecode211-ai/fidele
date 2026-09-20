from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Patient

User = get_user_model()


class PatientApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="reception", password="pass1234")
        self.client.force_authenticate(self.user)

    def test_create_patient(self):
        response = self.client.post("/api/patients/", {
            "patient_number": "P-100", "last_name": "BAMBA", "first_names": "Awa",
            "birth_date": "1985-04-10", "sex": "F",
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Patient.objects.count(), 1)

    def test_search_filters_by_name(self):
        Patient.objects.create(
            patient_number="P-101", last_name="BAMBA", first_names="Awa",
            birth_date="1985-04-10", sex="F",
        )
        Patient.objects.create(
            patient_number="P-102", last_name="KONE", first_names="Ibrahim",
            birth_date="1978-02-02", sex="M",
        )

        response = self.client.get("/api/patients/?search=BAMBA")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["last_name"], "BAMBA")

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/patients/")
        self.assertEqual(response.status_code, 401)
