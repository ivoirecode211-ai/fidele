from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Hospital
from appointments.models import Appointment
from consultations.models import Consultation
from patients.models import Patient
from prescriptions.models import Prescription, PrescriptionItem

from .auth import CodeInvalide, pin_valide
from .models import PatientAccess
from .services import heures_proposees, rappels_a_envoyer

User = get_user_model()
BASE = "/api/portail"


class PortailBase(APITestCase):
    def setUp(self):
        self.hospital = Hospital.objects.order_by("pk").first()
        self.accueil = User.objects.create_user(username="accueil", password="x", role="RECEPTION")
        self.medecin = User.objects.create_user(username="med", password="x", role="DOCTOR", first_name="Jean", last_name="Kouame")
        self.autre_medecin = User.objects.create_user(username="med2", password="x", role="DOCTOR")
        self.patient = Patient.objects.create(hospital=self.hospital, patient_number="P26K7MMAS", last_name="KONE",
                                              first_names="Awa", sex="F", phone="0700000000", allergies="Pénicilline")
        self.consultation = Consultation.objects.create(
            patient=self.patient, doctor=self.medecin, reason="Fièvre", diagnosis="Paludisme simple",
            treatment="Artéméther", recommendations="Boire beaucoup", observations="Note interne du médecin",
            completed_at=timezone.now())
        prescription = Prescription.objects.create(patient=self.patient, doctor=self.medecin, consultation=self.consultation)
        self.item = PrescriptionItem.objects.create(prescription=prescription, medicine="Artéméther 80 mg",
                                                    dose="1 comprimé / 2x / jour", frequency="", duration="3 jours")
        Appointment.objects.create(patient=self.patient, professional=self.medecin,
                                   date_time=timezone.now() + timedelta(days=5), reason="Contrôle")

    def activer(self):
        self.client.force_authenticate(self.accueil)
        data = self.client.post(f"{BASE}/acces/{self.patient.pk}/activer/").data
        self.client.force_authenticate(None)
        return data["temporaryPin"]

    def connecter(self, pin, code="P26K7MMAS"):
        return self.client.post(f"{BASE}/connexion/", {"code": code, "pin": pin}, format="json")

    def en_patient(self, pin_perso="482915"):
        temp = self.activer()
        token = self.connecter(temp).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Patient {token}")
        token = self.client.post(f"{BASE}/pin/", {"current": temp, "new": pin_perso}, format="json").data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Patient {token}")
        return token


class ConnexionTests(PortailBase):
    def test_temporary_pin_only_opens_the_pin_change(self):
        temp = self.activer()
        login = self.connecter(temp)
        self.assertEqual((login.status_code, login.data["mustChangePin"]), (200, True))
        self.client.credentials(HTTP_AUTHORIZATION=f"Patient {login.data['token']}")
        self.assertEqual(self.client.get(f"{BASE}/dossier/").status_code, 403)
        self.assertIn("facile", self.client.post(f"{BASE}/pin/", {"current": temp, "new": "123456"}, format="json").data["detail"])
        new_token = self.client.post(f"{BASE}/pin/", {"current": temp, "new": "482915"}, format="json").data["token"]
        # L'ancien jeton ne vaut plus rien après le changement de PIN.
        self.assertEqual(self.client.get(f"{BASE}/dossier/").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION=f"Patient {new_token}")
        self.assertEqual(self.client.get(f"{BASE}/dossier/").status_code, 200)

    def test_wrong_pin_locks_after_five_attempts_with_a_generic_message(self):
        self.activer()
        unknown = self.connecter("482915", code="P26ZZZMAS")
        wrong = self.connecter("000001")
        self.assertEqual(unknown.data["detail"], wrong.data["detail"])  # aucun indice sur l'existence du dossier
        for _ in range(4):
            self.connecter("000001")
        access = PatientAccess.objects.get(patient=self.patient)
        self.assertTrue(access.locked)
        self.assertIn("Trop d'essais", self.connecter("000001").data["detail"])

    def test_patient_token_never_opens_staff_apis_and_reset_revokes_it(self):
        token = self.en_patient()
        self.assertEqual(self.client.get("/api/parcours/caisse/patients/").status_code, 401)
        self.assertEqual(self.client.get(f"{BASE}/acces/").status_code, 401)
        self.client.credentials()
        self.client.force_authenticate(self.accueil)
        self.client.post(f"{BASE}/acces/{self.patient.pk}/activer/")  # PIN réinitialisé à l'accueil
        self.client.force_authenticate(None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Patient {token}")
        self.assertEqual(self.client.get(f"{BASE}/accueil/").status_code, 401)

    def test_reception_lists_patients_with_and_without_access(self):
        self.client.force_authenticate(self.accueil)
        rows = self.client.get(f"{BASE}/acces/", {"q": "KONE"}).data["patients"]
        self.assertEqual((rows[0]["status"], rows[0]["lastLogin"]), ("Aucun accès", None))
        self.activer()
        self.client.force_authenticate(self.accueil)
        self.assertEqual(self.client.get(f"{BASE}/acces/", {"q": "KONE"}).data["patients"][0]["status"], "PIN provisoire")

    def test_pin_rules(self):
        for faible in ("111111", "123456", "987654", "12345", "abcdef"):
            with self.assertRaises(CodeInvalide):
                pin_valide(faible)
        self.assertEqual(pin_valide("482915"), "482915")


class DossierTests(PortailBase):
    def test_record_shows_what_belongs_to_the_patient_only(self):
        self.en_patient()
        record = self.client.get(f"{BASE}/dossier/").data
        consultation = record["consultations"][0]
        self.assertEqual((consultation["diagnosis"], consultation["doctor"]), ("Paludisme simple", "Dr Jean KOUAME"))
        self.assertNotIn("observations", consultation)  # les notes internes restent internes
        self.assertEqual(record["patient"]["allergies"], "Pénicilline")
        self.assertEqual(consultation["prescription"]["items"][0]["dose"], "1 comprimé / 2x / jour")
        home = self.client.get(f"{BASE}/accueil/").data
        self.assertEqual(home["nextAppointment"]["reason"], "Contrôle")

    def test_confidential_consultations_are_hidden(self):
        if not hasattr(Consultation, "specialite"):
            self.skipTest("Champ « specialite » absent de ce modèle.")
        Consultation.objects.create(patient=self.patient, doctor=self.autre_medecin, diagnosis="Suivi", specialite="vih")
        self.en_patient()
        self.assertEqual(len(self.client.get(f"{BASE}/dossier/").data["consultations"]), 1)
        self.assertEqual([f["doctorId"] for f in self.client.get(f"{BASE}/messages/").data], [self.medecin.pk])

    def test_another_patient_is_never_reachable(self):
        other = Patient.objects.create(hospital=self.hospital, patient_number="P26A2BMAS", last_name="YAO",
                                       first_names="Paul", sex="M")
        other_item = PrescriptionItem.objects.create(
            prescription=Prescription.objects.create(patient=other, doctor=self.medecin), medicine="X", dose="1x")
        self.en_patient()
        self.assertEqual(self.client.post(f"{BASE}/medicaments/{other_item.pk}/rappel/", {"times": ["08:00"]},
                                          format="json").status_code, 404)
        self.assertEqual(self.client.get(f"{BASE}/messages/{self.autre_medecin.pk}/").status_code, 404)


class RappelsTests(PortailBase):
    def test_times_are_suggested_from_the_posology(self):
        self.assertEqual(heures_proposees(self.item), ["08:00", "20:00"])

    @mock.patch("portail.push.send", return_value=1)
    def test_reminder_is_sent_once_then_taken(self, send):
        self.en_patient()
        meds = self.client.post(f"{BASE}/medicaments/{self.item.pk}/rappel/", {"times": ["08:00", "20:00"]}, format="json").data
        reminder = meds["ordonnances"][0]["items"][0]["reminder"]
        self.assertEqual(reminder["times"], ["08:00", "20:00"])

        at_eight = timezone.localtime().replace(hour=8, minute=3)
        due = list(rappels_a_envoyer(at_eight))
        self.assertEqual([(r.medicine, i.time) for r, i in due], [("Artéméther 80 mg", "08:00")])
        from django.core.management import call_command
        with mock.patch("portail.services.timezone.now", return_value=at_eight):
            call_command("envoyer_rappels", stdout=open("/dev/null", "w"))
            call_command("envoyer_rappels", stdout=open("/dev/null", "w"))  # pas deux fois la même prise
        self.assertEqual(send.call_count, 1)

        taken = self.client.post(f"{BASE}/rappels/{reminder['id']}/prise/", {"time": "08:00"}, format="json").data
        self.assertEqual([p["taken"] for p in taken["todayIntakes"]], [True, False])


class MessagerieTests(PortailBase):
    @mock.patch("portail.push.send", return_value=0)
    def test_patient_and_doctor_exchange(self, send):
        self.en_patient()
        threads = self.client.get(f"{BASE}/messages/").data
        self.assertEqual((threads[0]["doctor"], threads[0]["unread"]), ("Dr Jean KOUAME", 0))
        self.client.post(f"{BASE}/messages/{self.medecin.pk}/", {"text": "Bonjour docteur, la fièvre est tombée."}, format="json")
        patient_credentials = self.client._credentials
        self.client.credentials()

        self.client.force_authenticate(self.medecin)
        inbox = self.client.get(f"{BASE}/medecin/messages/").data
        self.assertEqual((inbox[0]["code"], inbox[0]["unread"]), ("P26K7MMAS", 1))
        self.client.post(f"{BASE}/medecin/messages/{self.patient.pk}/", {"text": "Très bien, continuez le traitement."}, format="json")
        self.assertEqual(send.call_count, 1)  # le patient est prévenu sur son téléphone
        self.client.force_authenticate(self.autre_medecin)
        self.assertEqual(self.client.get(f"{BASE}/medecin/messages/{self.patient.pk}/").status_code, 404)

        self.client.force_authenticate(None)
        self.client.credentials(**patient_credentials)
        self.assertEqual(self.client.get(f"{BASE}/messages/").data[0]["unread"], 1)
        thread = self.client.get(f"{BASE}/messages/{self.medecin.pk}/").data
        self.assertEqual([m["fromPatient"] for m in thread["messages"]], [True, False])

    @mock.patch("portail.push.send", return_value=0)
    def test_each_doctor_has_his_own_inbox(self, send):
        self.en_patient()
        self.assertEqual(self.client.post(f"{BASE}/messages/{self.autre_medecin.pk}/", {"text": "Bonjour"}, format="json").status_code, 404)
        self.client.post(f"{BASE}/messages/{self.medecin.pk}/", {"text": "Bonjour docteur"}, format="json")
        self.client.credentials()

        self.client.force_authenticate(self.autre_medecin)
        self.assertEqual(self.client.get(f"{BASE}/medecin/messages/").data, [])
        self.client.force_authenticate(self.medecin)
        self.assertEqual(len(self.client.get(f"{BASE}/medecin/messages/").data), 1)
