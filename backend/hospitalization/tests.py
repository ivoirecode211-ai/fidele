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

    def test_generic_route_is_read_only(self):
        # On admet par /service/sejours/, qui vérifie le lit et l'hôpital du patient.
        response = self.client.post("/api/hospitalization/", {
            "patient": self.patient.id, "bed": self.bed.id,
            "admission_date": "2026-01-10T08:00:00Z",
        })
        self.assertEqual(response.status_code, 405)
        self.assertEqual(Hospitalization.objects.count(), 0)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/hospitalization/beds/")
        self.assertEqual(response.status_code, 401)


from datetime import timedelta as _td

from django.utils import timezone as _tz

from hospitalization.models import Bed as _Bed, Room as _Room
from parcours.tests import ParcoursBase


class WardTests(ParcoursBase):
    def setUp(self):
        super().setUp()
        room = _Room.objects.create(name="A-101", department="Médecine générale")
        _Bed.objects.create(room=room, number="Lit 01")
        self.envoyer_en_consultation()
        self.valider()

    def hospitalize(self, **overrides):
        today = _tz.localdate()
        data = {"admissionId": self.pk, "chambre": "a-101", "lit": "lit 01",
                "dateAdmission": today.isoformat(), "dateSortie": (today + _td(days=3)).isoformat()}
        data.update(overrides)
        self.as_user(self.medecin)
        return self.client.post("/api/hospitalization/service/sejours/", data, format="json")

    def test_consultation_hospitalizes_patient_and_occupies_bed(self):
        response = self.hospitalize()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual((response.data["chambre"], response.data["lit"], response.data["status"]), ("A-101", "Lit 01", "En cours"))
        self.assertEqual((response.data["medecin"], response.data["motif"], response.data["sexe"]), ("Dr. KOUAME Jean", "Paludisme", "Femme"))
        room = self.client.get("/api/hospitalization/service/").data["rooms"][0]
        self.assertEqual((room["totalBeds"], room["occupiedBeds"]), (1, 1))
        self.assertEqual(self.hospitalize().status_code, 400)  # lit occupé

    def test_discharge_frees_the_bed(self):
        pk = self.hospitalize().data["id"]
        self.assertEqual(self.client.post(f"/api/hospitalization/service/sejours/{pk}/sortie/").data["status"], "Sortie")
        self.assertEqual(_Bed.objects.get().status, "AVAILABLE")

    def test_validation_and_beds(self):
        self.assertIn("A-101", str(self.hospitalize(chambre="Z-9").data))
        self.assertEqual(self.hospitalize(dateSortie="2000-01-01").status_code, 400)
        self.as_user(self.infirmier)
        self.assertEqual(self.client.post("/api/hospitalization/service/lits/", {"room": "A-101", "bed": "Lit 02"}, format="json").data["totalBeds"], 2)
        self.assertEqual(self.client.post("/api/hospitalization/service/lits/", {"room": "A-101", "bed": "lit 02"}, format="json").status_code, 400)
        new_room = self.client.post("/api/hospitalization/service/lits/", {"room": "e-12", "bed": "Lit 01"}, format="json").data
        self.assertEqual((new_room["number"], new_room["totalBeds"], new_room["service"]), ("E-12", 1, "Non précisé"))
        self.as_user(self.pharmacien)
        self.assertEqual(self.client.get("/api/hospitalization/service/").status_code, 403)
