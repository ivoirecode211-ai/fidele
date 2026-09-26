from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from patients.models import Patient
from .models import Appointment

User = get_user_model()


class AppointmentApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="reception", password="pass1234")
        self.doctor = User.objects.create_user(username="medecin", password="pass1234", role="DOCTOR")
        self.patient = Patient.objects.create(
            patient_number="P-200", last_name="TOURE", first_names="Kadi",
            birth_date="1992-06-15", sex="F",
        )
        self.client.force_authenticate(self.user)

    def test_create_appointment(self):
        response = self.client.post("/api/appointments/", {
            "patient": self.patient.id, "professional": self.doctor.id,
            "date_time": "2026-01-15T09:00:00Z",
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "PROGRAMMED")

    def test_list_appointments_ordered_by_date(self):
        Appointment.objects.create(
            patient=self.patient, professional=self.doctor,
            date_time="2026-01-16T09:00:00Z",
        )
        Appointment.objects.create(
            patient=self.patient, professional=self.doctor,
            date_time="2026-01-15T09:00:00Z",
        )

        response = self.client.get("/api/appointments/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertLess(response.data[0]["date_time"], response.data[1]["date_time"])

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/appointments/")
        self.assertEqual(response.status_code, 401)


from datetime import timedelta as _td

from django.utils import timezone as _tz

from parcours.tests import ParcoursBase


class AgendaTests(ParcoursBase):
    def payload(self, **overrides):
        day = (_tz.localdate() + _td(days=3)).isoformat()
        data = {"patientId": "PAT-001", "date": day, "time": "09:30", "motif": "Contrôle"}
        data.update(overrides)
        return data

    def test_doctor_books_follow_up_from_consultation(self):
        self.as_user(self.medecin)
        response = self.client.post("/api/appointments/agenda/", self.payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual((response.data["patient"], response.data["doctor"], response.data["status"], response.data["time"]),
                         ("TRAORE Awa", "Dr. KOUAME Jean", "En attente", "09:30"))
        self.assertEqual(response.data["service"], "Médecine générale")

    def test_reception_confirms_moves_and_cancels(self):
        self.as_user(self.medecin)
        pk = self.client.post("/api/appointments/agenda/", self.payload(), format="json").data["id"]
        self.as_user(self.caissier)
        self.assertEqual(self.client.post(f"/api/appointments/agenda/{pk}/statut/", {"status": "Confirmé"}, format="json").data["status"], "Confirmé")
        moved = self.client.put(f"/api/appointments/agenda/{pk}/", self.payload(time="11:00", status="Confirmé"), format="json").data
        self.assertEqual((moved["time"], moved["doctor"]), ("11:00", "Dr. KOUAME Jean"))
        self.assertEqual(self.client.delete(f"/api/appointments/agenda/{pk}/").status_code, 204)

    def test_rules(self):
        self.as_user(self.medecin)
        past = (_tz.localdate() - _td(days=1)).isoformat()
        self.assertEqual(self.client.post("/api/appointments/agenda/", self.payload(date=past), format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/appointments/agenda/", self.payload(patientId="PAT-999"), format="json").status_code, 400)
        self.as_user(self.pharmacien)
        self.assertEqual(self.client.get("/api/appointments/agenda/").status_code, 403)
