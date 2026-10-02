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

    def test_search_is_paginated_by_twenty(self):
        for i in range(24):
            Patient.objects.create(hospital=self.patient.hospital, patient_number=f"P26X{i:02d}MAS",
                                   last_name=f"TEST{i}", first_names="Page", sex="F")
        self.client.force_authenticate(self.accueil)
        premiere = self.client.get(f"{BASE}/").data
        self.assertEqual((premiere["total"], premiere["pages"], premiere["page"], len(premiere["patients"])), (25, 2, 1, 20))
        seconde = self.client.get(f"{BASE}/", {"page": 2}).data
        self.assertEqual(len(seconde["patients"]), 5)
        codes = {p["code"] for p in premiere["patients"]} | {p["code"] for p in seconde["patients"]}
        self.assertEqual(len(codes), 25)
        # Une page hors limites ramène à la dernière.
        self.assertEqual(self.client.get(f"{BASE}/", {"page": 99}).data["page"], 2)

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


from consultations.tests import MG, consultation_complete  # noqa: E402
from parcours.tests import ParcoursBase  # noqa: E402


class ParcoursEntreModulesTests(ParcoursBase):
    """Un patient de bout en bout ; chaque module en aval doit voir la même chose."""

    def test_caisse_soins_consultation_pharmacie_puis_tous_les_modules(self):
        patient = Patient.objects.get()
        self.envoyer_en_consultation()
        self.as_user(self.medecin)
        termine = self.client.post(f"{MG}{self.pk}/terminer/", {"valeurs": consultation_complete()}, format="json")
        self.assertEqual(termine.status_code, 200, termine.data)

        self.as_user(self.pharmacien)
        code = self.client.get("/api/parcours/pharmacie/ordonnances/").data[0]["id"]
        self.client.post(f"/api/parcours/pharmacie/ordonnances/{code}/preparer/")
        self.assertEqual(self.client.post(f"/api/parcours/pharmacie/ordonnances/{code}/servir/").data["status"], "Servie")

        # Comptabilité : le passage payé.
        self.as_user(self.comptable)
        paiements = self.client.get("/api/parcours/comptabilite/paiements/").data
        self.assertEqual([p["patientId"] for p in paiements], [patient.patient_number])

        # Dossier patient : chaque module y apparaît, avec les mêmes faits.
        self.as_user(self.medecin)
        dossier = self.client.get(f"/api/dossier/patients/{patient.pk}/").data
        self.assertEqual(len(dossier["passages"]), 1)
        self.assertEqual(len(dossier["constantes"]), 1)
        self.assertEqual(dossier["consultations"][0]["diagnostic"], "Paludisme simple")
        self.assertEqual(dossier["ordonnances"][0]["statut"], "Servie")
        self.assertTrue({"passage", "constantes", "consultation", "ordonnance"} <= {e["type"] for e in dossier["chronologie"]})
        # L'allergie notée en consultation est celle que tous les modules affichent.
        self.assertIn("Pénicilline", dossier["identite"]["allergies"])

        # Espace patient : le même diagnostic et le même traitement.
        self.as_user(self.caissier)
        pin = self.client.post(f"/api/portail/acces/{patient.pk}/activer/").data["temporaryPin"]
        self.client.force_authenticate(None)
        token = self.client.post("/api/portail/connexion/", {"code": patient.patient_number, "pin": pin}, format="json").data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Patient {token}")
        token = self.client.post("/api/portail/pin/", {"current": pin, "new": "482915"}, format="json").data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Patient {token}")
        portail = self.client.get("/api/portail/dossier/").data
        self.assertEqual(portail["consultations"][0]["diagnosis"], "Paludisme simple")
        medicaments = self.client.get("/api/portail/medicaments/").data["ordonnances"][0]["items"]
        self.assertEqual(medicaments[0]["medicine"], "Artéméther-Luméfantrine")
        self.assertEqual([f["doctorId"] for f in self.client.get("/api/portail/messages/").data], [self.medecin.pk])

    def test_issues_de_consultation_visibles_dans_le_dossier_et_l_espace_patient(self):
        from datetime import timedelta

        from hospitalization.models import Bed, Room
        from laboratory.models import LabExam

        patient = Patient.objects.get()
        LabExam.objects.create(code="test-nfs", name="NFS test", category="Hématologie", price=5000)
        chambre = Room.objects.create(name="C-1", department="Médecine")
        Bed.objects.create(room=chambre, number="1")
        self.envoyer_en_consultation()
        self.as_user(self.medecin)
        jour = (timezone.localdate() + timedelta(days=7)).isoformat()
        rdv = self.client.post(f"{MG}{self.pk}/terminer/", {"valeurs": consultation_complete(
            issue="rdv", rdv_date=jour, rdv_heure="10:30", examens=["test-nfs"])}, format="json")
        self.assertEqual(rdv.status_code, 200, rdv.data)

        dossier = self.client.get(f"/api/dossier/patients/{patient.pk}/").data
        self.assertEqual(dossier["laboratoire"][0]["resultats"][0]["examen"], "NFS test")
        self.assertTrue(dossier["rendezVous"][0]["aVenir"])
        self.assertTrue(dossier["resume"]["prochainRendezVous"].startswith(timezone.datetime.fromisoformat(jour).strftime("%d/%m/%Y")))

        self.as_user(self.caissier)
        pin = self.client.post(f"/api/portail/acces/{patient.pk}/activer/").data["temporaryPin"]
        self.client.force_authenticate(None)
        token = self.client.post("/api/portail/connexion/", {"code": patient.patient_number, "pin": pin}, format="json").data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Patient {token}")
        token = self.client.post("/api/portail/pin/", {"current": pin, "new": "482915"}, format="json").data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Patient {token}")
        accueil = self.client.get("/api/portail/accueil/").data
        self.assertEqual((accueil["nextAppointment"]["time"], accueil["nextAppointment"]["reason"]),
                         ("10:30", "Consultation de contrôle"))
        self.assertEqual(self.client.get("/api/portail/dossier/").data["consultations"][0]["nextConsultation"],
                         timezone.datetime.fromisoformat(jour).strftime("%d/%m/%Y"))
        self.client.credentials()

        # Hospitalisation décidée en consultation : le dossier signale le séjour en cours.
        self.as_user(self.medecin)
        hospit = self.client.post(f"{MG}{self.pk}/terminer/", {"valeurs": consultation_complete(
            issue="hospitalisation", chambre="C-1", lit="1")}, format="json")
        self.assertEqual(hospit.status_code, 200, hospit.data)
        dossier = self.client.get(f"/api/dossier/patients/{patient.pk}/").data
        self.assertTrue(dossier["hospitalisations"][0]["enCours"])
        self.assertTrue(dossier["resume"]["hospitaliseLe"])


class ListesEtFusionTests(DossierTests):
    def test_recents_et_doublons(self):
        from datetime import date

        self.client.force_authenticate(self.medecin)
        self.client.get(f"/api/dossier/patients/{self.patient.pk}/")
        recents = self.client.get("/api/dossier/listes/recents/").data["patients"]
        self.assertEqual([p["code"] for p in recents], ["P26D0SMAS"])
        Patient.objects.filter(pk=self.patient.pk).update(birth_date=date(1990, 5, 1))
        Patient.objects.create(hospital=self.hospital, patient_number="P26ZZZMAS", last_name="kone",
                               first_names=self.patient.first_names, sex="F", birth_date=date(1990, 5, 1))
        groupes = self.client.get("/api/dossier/listes/doublons/").data["groupes"]
        self.assertEqual(len(groupes), 1)
        self.assertEqual(len(groupes[0]["patients"]), 2)

    def test_fusion_rattache_tout_au_dossier_garde(self):
        doublon = Patient.objects.create(hospital=self.hospital, patient_number="P26ZZYMAS", last_name="KONE",
                                         first_names="Awa", sex="F", phone="0700000099")
        Consultation.objects.create(patient=doublon, doctor=self.medecin, reason="Toux", completed_at=timezone.now())
        avant = Consultation.objects.filter(patient=self.patient).count()
        self.client.force_authenticate(self.medecin)
        self.assertEqual(self.client.post("/api/dossier/fusion/", {"garde": self.patient.pk, "doublon": doublon.pk},
                                          format="json").status_code, 403)
        directeur = User.objects.create_user(username="dirf", password="x", role="DIRECTOR")
        self.client.force_authenticate(directeur)
        r = self.client.post("/api/dossier/fusion/", {"garde": self.patient.pk, "doublon": doublon.pk}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertFalse(Patient.objects.filter(pk=doublon.pk).exists())
        self.assertEqual(Consultation.objects.filter(patient=self.patient).count(), avant + 1)
        self.assertTrue(AuditLog.objects.filter(action="Fusion").exists())
