from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from billing.models import Invoice
from patients.models import Patient

User = get_user_model()


class DashboardSummaryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="admin", password="pass1234")
        self.client.force_authenticate(self.user)

    def test_revenue_today_sums_todays_paid_invoices(self):
        patient = Patient.objects.create(
            patient_number="P-001", last_name="KOFFI", first_names="Jean",
            birth_date="1990-01-01", sex="M",
        )
        Invoice.objects.create(patient=patient, number="INV-001", amount_paid=15000)
        Invoice.objects.create(patient=patient, number="INV-002", amount_paid=5000)

        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["revenue_today"], 20000)

    def test_revenue_today_is_zero_without_invoices(self):
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.data["revenue_today"], 0)
