from django.contrib.auth import get_user_model
from django.utils import timezone

from parcours.tests import ParcoursBase

User = get_user_model()


class ReportsTests(ParcoursBase):
    def test_current_month_reports_reflect_the_workflow(self):
        self.envoyer_en_consultation()
        self.valider()
        self.as_user(User.objects.create_user(username="dir", password="x", role="DIRECTOR"))
        data = self.client.get("/api/reports/overview/").data
        today = timezone.localdate()
        self.assertEqual(len(data["reports"]), 6)
        self.assertEqual(data["stats"], {"total": 6, "available": 0, "inProgress": 6, "rate": 0})
        finances = next(r for r in data["reports"] if r["type"] == "Finances")
        self.assertEqual(finances["status"], "En cours")
        self.assertEqual(finances["id"], f"Finances-{today.year}-{today.month:02d}")
        values = {f["label"]: f["value"] for f in finances["figures"]}
        self.assertEqual(values["Montant total des prestations"], "10 000 FCFA")
        self.assertEqual(values["Part des assurances"], "2 000 FCFA")
        activity = {f["label"]: f["value"] for f in next(r for r in data["reports"] if r["type"] == "Activité")["figures"]}
        self.assertEqual((activity["Constantes prises"], activity["Consultations validées"]), (1, 1))
        self.assertEqual(data["serviceStats"], [{"service": "Médecine générale", "value": 100, "reports": 1}])

    def test_roles(self):
        self.as_user(self.infirmier)
        self.assertEqual(self.client.get("/api/reports/overview/").status_code, 403)
