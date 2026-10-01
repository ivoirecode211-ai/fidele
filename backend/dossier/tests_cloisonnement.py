"""Cloisonnement par hôpital des modules transverses : un hôpital ne voit jamais les patients d'un autre.

Ces tests verrouillent les fuites relevées à l'inspection avant déploiement
(API patients, rendez-vous, agenda, hospitalisation).
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Hospital
from appointments.models import Appointment
from hospitalization.models import Bed, Hospitalization, Room
from patients.models import Patient

User = get_user_model()


class CloisonnementTests(APITestCase):
    def setUp(self):
        self.a = Hospital.objects.order_by("pk").first()
        self.b = Hospital.objects.create(name="Clinique Sainte Marie", code="CSM")
        self.medecin_a = User.objects.create_user(username="med-a", password="x", role="DOCTOR", hospital=self.a)
        self.medecin_b = User.objects.create_user(username="med-b", password="x", role="DOCTOR", hospital=self.b)
        self.accueil_b = User.objects.create_user(username="acc-b", password="x", role="RECEPTION", hospital=self.b)
        self.patient_a = Patient.objects.create(hospital=self.a, patient_number="P26AAAMAS", last_name="KONE",
                                                first_names="Awa", sex="F")
        self.patient_b = Patient.objects.create(hospital=self.b, patient_number="P26BBBCSM", last_name="YAO",
                                                first_names="Paul", sex="M")
        demain = timezone.now() + timedelta(days=1)
        Appointment.objects.create(patient=self.patient_a, professional=self.medecin_a, date_time=demain)
        Appointment.objects.create(patient=self.patient_b, professional=self.medecin_b, date_time=demain)
        chambre = Room.objects.create(hospital=self.a, name="A-1", department="Médecine")
        lit = Bed.objects.create(room=chambre, number="1", status="OCCUPIED")
        Hospitalization.objects.create(patient=self.patient_a, bed=lit, admission_date=timezone.now())

    def test_listes_limitees_a_son_hopital(self):
        self.client.force_authenticate(self.medecin_b)
        patients = self.client.get("/api/patients/").data
        patients = patients.get("results", patients) if isinstance(patients, dict) else patients
        self.assertEqual([p["patient_number"] for p in patients], ["P26BBBCSM"])
        rdv = self.client.get("/api/appointments/").data
        rdv = rdv.get("results", rdv) if isinstance(rdv, dict) else rdv
        self.assertEqual([r["patient"] for r in rdv], [self.patient_b.pk])
        self.assertEqual([r["patientId"] for r in self.client.get("/api/appointments/agenda/").data], ["P26BBBCSM"])
        service = self.client.get("/api/hospitalization/service/").data
        self.assertEqual((service["hospitalizations"], service["rooms"]), ([], []))
        self.assertEqual(self.client.get(f"/api/patients/{self.patient_a.pk}/").status_code, 404)

    def test_aucune_ecriture_sur_un_autre_hopital(self):
        self.client.force_authenticate(self.accueil_b)
        jour = (timezone.localdate() + timedelta(days=3)).isoformat()
        refus = self.client.post("/api/appointments/agenda/", {"patientId": "P26AAAMAS", "date": jour, "time": "09:00"},
                                 format="json")
        self.assertEqual(refus.status_code, 400)
        avec_medecin_a = self.client.post("/api/appointments/agenda/", {"patientId": "P26BBBCSM", "date": jour, "time": "09:00",
                                                                         "doctorId": self.medecin_a.pk}, format="json")
        self.assertEqual(avec_medecin_a.status_code, 400)
        # Le client ne choisit ni l'hôpital ni le numéro d'un nouveau patient.
        cree = self.client.post("/api/patients/", {"last_name": "BAH", "first_names": "Ali", "sex": "M",
                                                   "hospital": self.a.pk, "patient_number": "P26XXXMAS"}, format="json")
        self.assertEqual(cree.status_code, 201, cree.data)
        nouveau = Patient.objects.get(last_name="BAH")
        self.assertEqual(nouveau.hospital, self.b)
        self.assertTrue(nouveau.patient_number.endswith("CSM"))

    def test_lit_d_un_autre_hopital_introuvable(self):
        self.client.force_authenticate(self.medecin_b)
        self.client.post("/api/hospitalization/service/lits/", {"room": "A-1", "bed": "2"}, format="json")
        # La chambre « A-1 » créée pour B est distincte de celle de A.
        self.assertEqual(Room.objects.filter(name__iexact="A-1").count(), 2)
        self.assertEqual(Room.objects.get(hospital=self.b).beds.count(), 1)
