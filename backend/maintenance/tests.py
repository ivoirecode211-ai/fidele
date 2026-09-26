from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Equipment

User = get_user_model()


class MaintenanceTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(User.objects.create_user(username="tech", password="x", role="MAINTENANCE"))
        self.today = timezone.localdate()

    def create(self, **overrides):
        data = {"equipment": "Générateur principal", "category": "Électricité", "technician": "Marc Yao",
                "date": self.today.isoformat(), "time": "10:15", "type": "Corrective",
                "priority": "Critique", "description": "Batterie faible"}
        data.update(overrides)
        return self.client.post("/api/maintenance/interventions/", data, format="json")

    def test_intervention_creates_equipment_and_marks_it_critical(self):
        response = self.create()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual((response.data["date"], response.data["time"], response.data["status"]), (self.today.strftime("%d/%m/%Y"), "10:15", "En attente"))
        data = self.client.get("/api/maintenance/overview/").data
        self.assertEqual(data["equipments"][0]["status"], "Critique")
        self.assertEqual(data["criticalEquipments"], [{"name": "Générateur principal", "location": "—", "issue": "Batterie faible", "priority": "Critique"}])
        self.assertEqual(data["stats"], {"monthInterventions": 1, "pending": 1, "critical": 1, "plannedThisWeek": 1})

    def test_existing_equipment_is_reused_case_insensitively(self):
        self.create()
        self.create(equipment="générateur PRINCIPAL", priority="Normale")
        self.assertEqual(Equipment.objects.count(), 1)

    def test_completion_restores_equipment_and_schedules_next_maintenance(self):
        pk = self.create(type="Préventive").data["id"]
        self.assertEqual(self.client.post(f"/api/maintenance/interventions/{pk}/statut/", {"status": "Terminée"}, format="json").status_code, 200)
        row = self.client.get("/api/maintenance/overview/").data["equipments"][0]
        self.assertEqual(row["status"], "Opérationnel")
        self.assertEqual(row["lastMaintenance"], self.today.strftime("%d/%m/%Y"))
        self.assertEqual(row["nextMaintenance"], (self.today + timedelta(days=30)).strftime("%d/%m/%Y"))

    def test_validation_and_roles(self):
        self.assertEqual(self.create(category="Plomberie").status_code, 400)
        self.assertEqual(self.create(technician="").status_code, 400)
        self.client.force_authenticate(User.objects.create_user(username="n", password="x", role="NURSE"))
        self.assertEqual(self.client.get("/api/maintenance/overview/").status_code, 403)
