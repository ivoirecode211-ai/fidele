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
