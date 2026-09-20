from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from patients.models import Patient
from .models import Invoice

User = get_user_model()


class InvoiceApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="comptable", password="pass1234")
        self.client.force_authenticate(self.user)
        self.patient = Patient.objects.create(
            patient_number="P-400", last_name="YAO", first_names="Marc",
            birth_date="1975-11-01", sex="M",
        )

    def test_create_invoice(self):
        response = self.client.post("/api/billing/", {
            "patient": self.patient.id, "number": "INV-100", "total": 25000,
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "UNPAID")

    def test_list_invoices(self):
        Invoice.objects.create(patient=self.patient, number="INV-101", total=10000)

        response = self.client.get("/api/billing/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/billing/")
        self.assertEqual(response.status_code, 401)
