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


class QrCodeTests(APITestCase):
    """Module QR Code : parc, fiche au scan, étiquette révoquée, compte rendu, cloisonnement."""

    def setUp(self):
        from accounts.models import Hospital

        self.hospital = Hospital.objects.order_by("pk").first()
        self.tech = User.objects.create_user(username="tech", password="x", role="MAINTENANCE",
                                             first_name="Marc", last_name="Yao")
        self.client.force_authenticate(self.tech)
        self.equipment = self.client.post("/api/maintenance/equipements/", {
            "name": "Échographe Mindray DC-40", "category": "Imagerie médicale", "brand": "Mindray",
            "model_name": "DC-40", "serial_number": "SN-4471", "supplier": "Ministère de la Santé",
            "acquisition": "Dotation de l'État", "installation_date": "2025-03-12", "warranty_end": "2027-03-12",
            "service": "Imagerie", "location": "Salle 3",
        }, format="json").data

    def test_new_equipment_gets_code_and_token(self):
        self.assertEqual(self.equipment["code"], f"EQ-{self.hospital.code}-0001")
        self.assertRegex(self.equipment["token"], r"^[0-9a-f-]{36}$")
        second = self.client.post("/api/maintenance/equipements/", {"name": "Moniteur Philips", "category": "Monitoring"},
                                  format="json").data
        self.assertEqual(second["code"], f"EQ-{self.hospital.code}-0002")
        duplicate = self.client.post("/api/maintenance/equipements/", {"name": "échographe mindray dc-40",
                                                                        "category": "Monitoring"}, format="json")
        self.assertEqual(duplicate.status_code, 400)

    def test_scan_shows_the_full_sheet_with_maintenance_history(self):
        pk = self.client.post("/api/maintenance/interventions/", {
            "equipment": "Échographe Mindray DC-40", "category": "Imagerie médicale", "technician": "Marc Yao",
            "date": timezone.localdate().isoformat(), "type": "Corrective", "priority": "Haute",
            "description": "Sonde qui grésille",
        }, format="json").data["id"]
        closed = self.client.post(f"/api/maintenance/interventions/{pk}/cloturer/", {
            "diagnosis": "Câble de sonde usé", "work_done": "Remplacement du câble", "parts": "Câble C5-2",
            "cost": "45000", "duration_minutes": 90,
        }, format="json")
        self.assertEqual(closed.status_code, 200, closed.data)

        nurse = User.objects.create_user(username="inf", password="x", role="NURSE")
        self.client.force_authenticate(nurse)
        sheet = self.client.get(f"/api/maintenance/scan/{self.equipment['token']}/").data
        self.assertEqual((sheet["supplier"], sheet["installationDate"], sheet["underWarranty"]),
                         ("Ministère de la Santé", "2025-03-12", True))
        intervention = sheet["interventions"][0]
        self.assertEqual((intervention["status"], intervention["workDone"], intervention["cost"], intervention["technicianAccount"]),
                         ("Terminée", "Remplacement du câble", 45000.0, "YAO Marc"))
        self.assertEqual((sheet["totalCost"], sheet["canEdit"]), (45000.0, False))
        self.assertEqual(sheet["lastScans"][0]["user"], "inf")

    def test_regenerated_label_revokes_the_old_one(self):
        old = self.equipment["token"]
        new = self.client.post(f"/api/maintenance/equipements/{self.equipment['id']}/nouveau-qr/").data["token"]
        self.assertNotEqual(old, new)
        self.assertEqual(self.client.get(f"/api/maintenance/scan/{old}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/maintenance/scan/{new}/").status_code, 200)

    def test_another_hospital_cannot_scan_or_list(self):
        from accounts.models import Hospital

        other = Hospital.objects.create(name="Clinique Sainte Marie", code="CSM")
        stranger = User.objects.create_user(username="tech2", password="x", role="MAINTENANCE", hospital=other)
        self.client.force_authenticate(stranger)
        self.assertEqual(self.client.get(f"/api/maintenance/scan/{self.equipment['token']}/").status_code, 404)
        self.assertEqual(self.client.get("/api/maintenance/equipements/").data["equipments"], [])
        self.assertEqual(self.client.get("/api/maintenance/overview/").data["equipments"], [])

    def test_closing_requires_a_report_and_repairs_a_broken_device(self):
        self.client.patch(f"/api/maintenance/equipements/{self.equipment['id']}/", {"state": "En panne"}, format="json")
        pk = self.client.post("/api/maintenance/interventions/", {
            "equipment": "Échographe Mindray DC-40", "category": "Imagerie médicale", "technician": "Marc Yao",
            "date": timezone.localdate().isoformat(), "type": "Corrective", "priority": "Critique",
        }, format="json").data["id"]
        self.assertEqual(self.client.post(f"/api/maintenance/interventions/{pk}/cloturer/", {"work_done": ""},
                                          format="json").status_code, 400)
        sheet = self.client.post(f"/api/maintenance/interventions/{pk}/cloturer/", {"work_done": "Carte remplacée"},
                                 format="json").data
        self.assertEqual((sheet["state"], sheet["status"]), ("En service", "Opérationnel"))
