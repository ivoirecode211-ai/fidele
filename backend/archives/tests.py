from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from administration.models import AdminDocument
from parcours.tests import ParcoursBase

User = get_user_model()


class ArchivesTests(ParcoursBase):
    def test_archives_list_documents_produced_by_other_modules(self):
        self.envoyer_en_consultation()
        self.valider()
        director = User.objects.create_user(username="dir", password="x", role="DIRECTOR")
        AdminDocument.objects.create(name="Règlement", type="PDF", created_by=director)
        self.as_user(director)
        data = self.client.get("/api/archives/overview/").data
        types = sorted(row["type"] for row in data["documents"])
        self.assertEqual(types, ["Compte rendu", "Document administratif", "Dossier patient", "Facture"])
        report = next(row for row in data["documents"] if row["type"] == "Compte rendu")
        self.assertEqual((report["patient"], report["author"]), ("TRAORE Awa", "Dr. KOUAME Jean"))
        self.assertEqual(data["stats"]["documents"], 4)
        self.assertEqual({c["name"]: c["count"] for c in data["categories"]}["Factures"], 1)

    def test_year_filter_and_roles(self):
        self.as_user(User.objects.create_user(username="dir", password="x", role="DIRECTOR"))
        self.assertEqual(self.client.get("/api/archives/overview/?year=2001").data["documents"], [])
        self.as_user(self.infirmier)
        self.assertEqual(self.client.get("/api/archives/overview/").status_code, 403)
