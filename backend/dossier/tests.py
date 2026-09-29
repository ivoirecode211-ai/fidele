from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Hospital
from administration.models import AuditLog
from consultations.models import Consultation
from patients.models import Patient
from prescriptions.models import Prescription, PrescriptionItem

User = get_user_model()
BASE = "/api/dossier/patients"


class DossierTests(APITestCase):
    def setUp(self):
        self.hospital = Hospital.objects.order_by("pk").first()
        self.medecin = User.objects.create_user(username="med", password="x", role="DOCTOR", first_name="Jean", last_name="Kouame")
        self.accueil = User.objects.create_user(username="acc", password="x", role="RECEPTION")
        self.labo = User.objects.create_user(username="lab", password="x", role="LAB")
        self.patient = Patient.objects.create(hospital=self.hospital, patient_number="P26D0SMAS", last_name="KONE",
                                              first_names="Awa", sex="F", phone="0700000000", allergies="Pénicilline")
        consultation = Consultation.objects.create(patient=self.patient, doctor=self.medecin, reason="Fièvre",
                                                   diagnosis="Paludisme simple", completed_at=timezone.now())
        prescription = Prescription.objects.create(patient=self.patient, doctor=self.medecin, consultation=consultation)
        PrescriptionItem.objects.create(prescription=prescription, medicine="Artéméther", dose="2x/jour")

    def ouvrir(self, user):
        self.client.force_authenticate(user)
        return self.client.get(f"{BASE}/{self.patient.pk}/")

    def test_doctor_sees_the_whole_record_and_the_opening_is_logged(self):
        data = self.ouvrir(self.medecin).data
        self.assertEqual(data["identite"]["allergies"], "Pénicilline")
        self.assertEqual(data["consultations"][0]["diagnostic"], "Paludisme simple")
        self.assertEqual(data["ordonnances"][0]["medicaments"][0]["nom"], "Artéméther")
        self.assertEqual({e["type"] for e in data["chronologie"]}, {"consultation", "ordonnance"})
        log = AuditLog.objects.get(module="Dossier patient")
        self.assertEqual((log.action, log.user, log.description), ("Consultation", self.medecin, "P26D0SMAS — KONE Awa"))

    def test_each_role_sees_only_its_sections(self):
        accueil = self.ouvrir(self.accueil).data
        self.assertNotIn("consultations", accueil)
        self.assertNotIn("ordonnances", accueil)
        self.assertIn("passages", accueil)
        self.assertNotIn("Paludisme", str(accueil["chronologie"]))
        labo = self.ouvrir(self.labo).data
        self.assertEqual(set(labo["sections"]), {"laboratoire"})

    def test_confidential_consultation_is_hidden_from_non_doctors(self):
        if not hasattr(Consultation, "specialite"):
            self.skipTest("Champ « specialite » absent de ce modèle.")
        Consultation.objects.create(patient=self.patient, doctor=self.medecin, diagnosis="Suivi VIH", specialite="vih")
        infirmier = User.objects.create_user(username="inf", password="x", role="NURSE")
        masked = [c for c in self.ouvrir(infirmier).data["consultations"] if c["confidentiel"]][0]
        self.assertEqual((masked["masque"], masked["diagnostic"]), (True, ""))
        visible = [c for c in self.ouvrir(self.medecin).data["consultations"] if c["confidentiel"]][0]
        self.assertEqual(visible["diagnostic"], "Suivi VIH")

    def test_search_and_edits_follow_the_roles(self):
        self.client.force_authenticate(self.accueil)
        self.assertEqual(self.client.get(f"{BASE}/", {"q": "kone"}).data["patients"][0]["code"], "P26D0SMAS")
        ok = self.client.patch(f"{BASE}/{self.patient.pk}/", {"phone": "0101010101", "last_name": "kone"}, format="json")
        self.assertEqual((ok.status_code, ok.data["identite"]["phone"], ok.data["identite"]["last_name"]), (200, "0101010101", "KONE"))
        self.assertEqual(self.client.patch(f"{BASE}/{self.patient.pk}/", {"allergies": "Aucune"}, format="json").status_code, 403)
        self.client.force_authenticate(self.medecin)
        self.assertEqual(self.client.patch(f"{BASE}/{self.patient.pk}/", {"allergies": "Pénicilline, aspirine"},
                                           format="json").data["identite"]["allergies"], "Pénicilline, aspirine")

    def test_another_hospital_never_reaches_the_record(self):
        other = Hospital.objects.create(name="Clinique Sainte Marie", code="CSM")
        stranger = User.objects.create_user(username="med9", password="x", role="DOCTOR", hospital=other)
        self.assertEqual(self.ouvrir(stranger).status_code, 404)
        self.assertEqual(self.client.get(f"{BASE}/", {"q": "kone"}).data["total"], 0)
