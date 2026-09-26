from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import HygieneAudit, WasteCollection

User = get_user_model()


class HygieneTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(User.objects.create_user(username="dir", password="x", role="DIRECTOR"))
        self.today = timezone.localdate()

    def task(self, **overrides):
        data = {"zone": "Bloc opératoire", "type": "Désinfection", "responsible": "ADOU K.",
                "date": self.today.isoformat(), "hour": "23:59"}
        data.update(overrides)
        return self.client.post("/api/hygiene/tasks/", data, format="json")

    def test_task_lifecycle_and_lateness(self):
        pk = self.task().data["id"]
        late = self.task(date=(self.today - timedelta(days=1)).isoformat(), hour="08:00").data
        self.assertEqual(late["status"], "En retard")
        self.client.post(f"/api/hygiene/tasks/{pk}/statut/", {"status": "En cours"}, format="json")
        stats = self.client.get("/api/hygiene/overview/").data["stats"]
        self.assertEqual((stats["inProgress"], stats["late"]), (1, 1))
        self.assertEqual(self.client.put(f"/api/hygiene/tasks/{pk}/", {"zone": "Sanitaires", "type": "Nettoyage", "responsible": "YAO F.", "date": self.today.isoformat(), "hour": "09:00"}, format="json").data["zone"], "Sanitaires")

    def test_compliance_uses_last_audit_then_tasks(self):
        pk = self.task(date=(self.today - timedelta(days=1)).isoformat()).data["id"]
        self.task(date=(self.today - timedelta(days=1)).isoformat())
        self.client.post(f"/api/hygiene/tasks/{pk}/statut/", {"status": "Terminée"}, format="json")
        self.assertEqual(self.client.get("/api/hygiene/overview/").data["stats"]["compliance"], 50)
        HygieneAudit.objects.create(date=self.today, score=96, compliant=True, next_date=self.today + timedelta(days=7))
        data = self.client.get("/api/hygiene/overview/").data
        self.assertEqual((data["stats"]["compliance"], data["audit"]["lastResult"]), (96, "Conforme"))

    def test_waste_shows_latest_collection_per_type(self):
        WasteCollection.objects.create(type="Déchets infectieux", quantity_kg=10, date=self.today - timedelta(days=3))
        WasteCollection.objects.create(type="Déchets infectieux", quantity_kg=12, date=self.today)
        wastes = self.client.get("/api/hygiene/overview/").data["wastes"]
        self.assertEqual((wastes[0]["quantity"], wastes[0]["collection"]), ("12 kg", self.today.strftime("%d/%m/%Y")))
        self.assertEqual(wastes[1]["quantity"], "—")

    def test_roles(self):
        self.client.force_authenticate(User.objects.create_user(username="n", password="x", role="NURSE"))
        self.assertEqual(self.client.get("/api/hygiene/overview/").status_code, 403)
