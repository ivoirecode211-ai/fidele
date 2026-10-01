from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from billing.models import Invoice
from patients.models import Patient

User = get_user_model()


class DashboardSummaryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="admin", password="pass1234")
        self.client.force_authenticate(self.user)

    def test_revenue_today_is_zero_without_invoices(self):
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.data["revenue_today"], 0)


from parcours.tests import ParcoursBase  # noqa: E402
from stocks.models import Product  # noqa: E402


class DirectionTests(ParcoursBase):
    def test_revenue_comes_from_the_cash_desk(self):
        self.as_user(self.comptable)
        self.assertEqual(self.client.get("/api/dashboard/").data["revenue_today"], 8000)

    def test_direction_figures_follow_the_workflow(self):
        Product.objects.create(name="Gants", category="Consommable", stock=2, threshold=50)
        self.envoyer_en_consultation()
        self.valider()
        self.as_user(User.objects.create_user(username="dir", password="x", role="DIRECTOR"))
        data = self.client.get("/api/dashboard/direction/").data
        stats = {row["title"]: row for row in data["statistics"]}
        self.assertEqual(stats["Patients aujourd'hui"]["value"], "1")
        self.assertEqual(stats["Consultations"]["value"], "1")
        self.assertEqual(stats["Recettes du jour"]["value"], "8 000")
        self.assertEqual(stats["Stock critiques"]["value"], "1")
        self.assertEqual(data["consultationData"][-1]["patients"], 1)
        self.assertEqual(data["services"], [{"name": "Médecine générale", "percentage": 100, "color": "var(--primary-800)"}])
        self.assertEqual(data["alerts"][0]["title"], "Stock critique : Gants")

    def test_only_direction(self):
        self.as_user(self.medecin)
        self.assertEqual(self.client.get("/api/dashboard/direction/").status_code, 403)


    def test_other_hospital_sees_its_own_figures(self):
        from accounts.models import Hospital

        self.envoyer_en_consultation()
        self.valider()
        autre = Hospital.objects.create(name="Clinique Sainte Marie", code="CSM")
        self.as_user(User.objects.create_user(username="dir-b", password="x", role="DIRECTOR", hospital=autre))
        stats = {row["title"]: row for row in self.client.get("/api/dashboard/direction/").data["statistics"]}
        self.assertEqual((stats["Patients aujourd'hui"]["value"], stats["Recettes du jour"]["value"]), ("0", "0"))
        summary = self.client.get("/api/dashboard/").data
        self.assertEqual((summary["patients"], summary["revenue_today"]), (0, 0))
