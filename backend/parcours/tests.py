from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from patients.models import Patient

from .models import Admission, InsuranceCompany, MedicalService, VitalSigns

User = get_user_model()
URL = "/api/parcours/caisse/patients/"
# P + année sur 2 chiffres + 3 caractères (lettres et chiffres) + code de l'hôpital (MAS par défaut).
NUMERO = r"^P\d{2}(?=[A-Z2-9]*\d)(?=[A-Z2-9]*[A-Z])[A-Z2-9]{3}MAS$"


def form(**overrides):
    data = {
        "nom": "traore", "prenom": "Awa", "sexe": "Féminin", "age": "32", "dateNaissance": "",
        "service": MedicalService.objects.get(name="Médecine générale", hospital__code="MAS").pk, "telephone": "0700000000",
        "parentContact": "0500000000", "assurance": "Non", "assuranceId": "", "insuranceNumber": "",
        "quartier": "Cocody",
    }
    data.update(overrides)
    return data


def encaisser(client, admission_id):
    """Le caissier connecté ouvre sa caisse et encaisse le ticket (passage aux soins)."""
    client.post("/api/parcours/caisse/session/")
    response = client.post(f"/api/parcours/caisse/patients/{admission_id}/encaisser/")
    assert response.status_code == 200, response.data


class CatalogueTests(APITestCase):
    def test_catalogue_matches_frontend_configuration(self):
        self.client.force_authenticate(User.objects.create_user(username="doc", password="x", role="DOCTOR"))
        response = self.client.get("/api/parcours/catalogue/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["services"][0], {"id": response.data["services"][0]["id"], "name": "Médecine générale",
                                                        "price": 10000, "category": "CONSULTATION"})
        self.assertEqual([i["name"] for i in response.data["insurances"]], ["MUGEFCI", "CNPS", "NSIA"])


class CaissePatientTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="caisse", password="x", role="RECEPTION")
        self.client.force_authenticate(self.user)

    def test_create_patient_without_insurance(self):
        response = self.client.post(URL, form(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertRegex(response.data["id"], NUMERO)
        self.assertEqual(response.data["patient"], "TRAORE Awa")
        self.assertEqual(response.data["sexe"], "Féminin")
        self.assertEqual(response.data["age"], 32)
        self.assertEqual(response.data["service"], "Médecine générale")
        self.assertEqual(response.data["cost"], 10000)
        self.assertEqual(response.data["insurance"], "Non")
        self.assertEqual(response.data["quartier"], "Cocody")
        patient = Patient.objects.get()
        self.assertEqual((patient.sex, patient.emergency_phone), ("F", "0500000000"))

    def test_insurance_coverage_reduces_cost_server_side(self):
        cnps = InsuranceCompany.objects.get(name="CNPS")
        chirurgie = MedicalService.objects.get(name="Chirurgie")
        response = self.client.post(URL, form(
            service=chirurgie.pk, assurance="Oui", assuranceId=cnps.pk, insuranceNumber="CNPS-1", cost=1,
        ), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["cost"], 20000)
        self.assertEqual(response.data["insuranceName"], "CNPS")
        self.assertEqual(response.data["insuranceCoverage"], 20)

    def test_insurance_requires_company_and_number(self):
        self.assertEqual(self.client.post(URL, form(assurance="Oui"), format="json").status_code, 400)
        cnps = InsuranceCompany.objects.get(name="CNPS")
        self.assertEqual(self.client.post(URL, form(assurance="Oui", assuranceId=cnps.pk), format="json").status_code, 400)
        self.assertFalse(Patient.objects.exists())

    def test_patient_number_follows_the_nomenclature(self):
        first = self.client.post(URL, form(), format="json").data["id"]
        second = self.client.post(URL, form(nom="kone", prenom="Ibrahim", sexe="Masculin"), format="json").data["id"]
        self.assertRegex(first, NUMERO)
        self.assertRegex(second, NUMERO)
        self.assertTrue(first.startswith(f"P{timezone.localdate():%y}"))
        self.assertNotEqual(first, second)

    def test_future_birth_date_rejected(self):
        tomorrow = (timezone.localdate() + timedelta(days=1)).isoformat()
        self.assertEqual(self.client.post(URL, form(dateNaissance=tomorrow), format="json").status_code, 400)

    def test_list_returns_admissions_in_registration_order(self):
        self.client.post(URL, form(), format="json")
        self.client.post(URL, form(nom="kone", prenom="Ibrahim", sexe="Masculin"), format="json")
        response = self.client.get(URL)
        self.assertEqual([p["patient"] for p in response.data], ["TRAORE Awa", "KONE Ibrahim"])

    def test_roles_outside_caisse_are_refused(self):
        self.client.force_authenticate(User.objects.create_user(username="lab", password="x", role="LAB"))
        self.assertEqual(self.client.get(URL).status_code, 403)
        self.assertEqual(self.client.post(URL, form(), format="json").status_code, 403)
        self.assertFalse(Admission.objects.exists())


class NursingTests(APITestCase):
    def setUp(self):
        caissier = User.objects.create_user(username="caisse", password="x", role="RECEPTION")
        self.client.force_authenticate(caissier)
        self.admission_id = self.client.post(URL, form(), format="json").data["admissionId"]
        encaisser(self.client, self.admission_id)
        self.client.force_authenticate(User.objects.create_user(username="inf", password="x", role="NURSE"))
        self.vitals_url = f"/api/parcours/soins/patients/{self.admission_id}/constantes/"

    def vitals(self, **overrides):
        data = {
            "temperature": "38,2", "systolic": "120", "diastolic": "80", "pulse": "", "oxygen": "97",
            "respiratoryRate": "", "glucose": "0.9", "weight": "", "height": "", "nursingNotes": "Fièvre",
        }
        data.update(overrides)
        return data

    def test_list_exposes_names_expected_by_nursing_page(self):
        patient = self.client.get("/api/parcours/soins/patients/").data[0]
        self.assertRegex(patient["id"], NUMERO)
        self.assertEqual(patient["numero"], patient["id"])
        self.assertEqual((patient["nom"], patient["prenom"], patient["sexe"]), ("TRAORE", "Awa", "F"))
        self.assertEqual(patient["telephoneParents"], "0500000000")
        self.assertFalse(patient["sentToConsultation"])
        self.assertIsNone(patient["lastVitalUpdate"])
        self.assertNotIn("temperature", patient)

    def test_saving_vitals_sends_patient_to_consultation(self):
        response = self.client.post(self.vitals_url, self.vitals(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["temperature"], 38.2)
        self.assertEqual(response.data["systolic"], 120)
        self.assertEqual(response.data["nursingNotes"], "Fièvre")
        self.assertNotIn("pulse", response.data)
        self.assertTrue(response.data["sentToConsultation"])
        self.assertIsNotNone(response.data["lastVitalUpdate"])

    def test_latest_vitals_win_and_history_is_kept(self):
        self.client.post(self.vitals_url, self.vitals(), format="json")
        self.client.post(self.vitals_url, self.vitals(temperature="37"), format="json")
        patient = self.client.get("/api/parcours/soins/patients/").data[0]
        self.assertEqual(patient["temperature"], 37.0)
        self.assertEqual(VitalSigns.objects.filter(admission_id=self.admission_id).count(), 2)

    def test_impossible_or_empty_values_are_rejected(self):
        self.assertEqual(self.client.post(self.vitals_url, self.vitals(temperature="382"), format="json").status_code, 400)
        self.assertEqual(self.client.post(self.vitals_url, self.vitals(systolic="80", diastolic="90"), format="json").status_code, 400)
        empty = {key: "" for key in self.vitals()}
        self.assertEqual(self.client.post(self.vitals_url, empty, format="json").status_code, 400)
        self.assertFalse(VitalSigns.objects.exists())

    def test_caisse_roles_cannot_take_vitals(self):
        self.client.force_authenticate(User.objects.get(username="caisse"))
        self.assertEqual(self.client.post(self.vitals_url, self.vitals(), format="json").status_code, 403)
        self.assertEqual(self.client.get("/api/parcours/soins/patients/").status_code, 403)

    def test_aide_soignant_takes_vitals_and_nothing_else(self):
        self.client.force_authenticate(User.objects.create_user(username="as", password="x", role="AIDE_SOIGNANT"))
        self.assertEqual(self.client.get("/api/parcours/soins/patients/").status_code, 200)
        self.assertEqual(self.client.post(self.vitals_url, self.vitals(), format="json").status_code, 201)
        self.assertEqual(self.client.get("/api/consultations/medecine/").status_code, 403)
        self.assertEqual(self.client.get("/api/hospitalization/service/").status_code, 403)


class ParcoursBase(APITestCase):
    """Un patient enregistré à la caisse et les acteurs du parcours."""

    def setUp(self):
        self.caissier = User.objects.create_user(username="caisse", password="x", role="RECEPTION", first_name="Koffi", last_name="Armel")
        self.infirmier = User.objects.create_user(username="inf", password="x", role="NURSE")
        self.medecin = User.objects.create_user(username="med", password="x", role="DOCTOR", first_name="Jean", last_name="Kouame")
        self.autre_medecin = User.objects.create_user(username="med2", password="x", role="DOCTOR", first_name="Awa", last_name="Bah")
        self.pharmacien = User.objects.create_user(username="pha", password="x", role="PHARMACY", first_name="Clara", last_name="Ahoue")
        self.comptable = User.objects.create_user(username="cpt", password="x", role="ACCOUNTING")

        self.client.force_authenticate(self.caissier)
        cnps = InsuranceCompany.objects.get(name="CNPS")
        self.pk = self.client.post(URL, form(assurance="Oui", assuranceId=cnps.pk, insuranceNumber="C-1"), format="json").data["admissionId"]
        encaisser(self.client, self.pk)

    def as_user(self, user):
        self.client.force_authenticate(user)

    def envoyer_en_consultation(self):
        self.as_user(self.infirmier)
        self.client.post(f"/api/parcours/soins/patients/{self.pk}/constantes/", {"temperature": "38"}, format="json")

    def consulter(self, user=None):
        self.as_user(user or self.medecin)
        return self.client.post(f"/api/parcours/consultations/{self.pk}/consulter/")

    def valider(self, traitement="Paracétamol 500 mg\n- Amoxicilline 500 mg\n\n", user=None):
        self.as_user(user or self.medecin)
        return self.client.post(f"/api/parcours/consultations/{self.pk}/valider/", {
            "symptomes": "Fièvre", "diagnostic": "Paludisme", "traitement": traitement, "observations": "",
        }, format="json")



class ParcoursCompletTests(ParcoursBase):
    """Caisse → Soins infirmiers → Consultation → Pharmacie / Comptabilité."""

    def test_patient_waits_for_vitals_before_consultation(self):
        self.as_user(self.medecin)
        self.assertEqual(self.client.get("/api/parcours/consultations/").data, [])
        self.assertEqual(self.consulter().status_code, 400)
        self.envoyer_en_consultation()
        self.as_user(self.medecin)
        patient = self.client.get("/api/parcours/consultations/").data[0]
        self.assertEqual((patient["statut"], patient["doctor"], patient["temperature"]), ("En attente", "", 38.0))
        self.assertEqual((patient["insurance"], patient["insuranceName"]), ("Oui", "CNPS"))

    def test_consulter_assigns_doctor_and_locks_patient(self):
        self.envoyer_en_consultation()
        response = self.consulter()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual((response.data["statut"], response.data["doctor"]), ("En cours", "Dr. KOUAME Jean"))
        self.assertEqual(self.consulter(self.autre_medecin).status_code, 400)
        self.as_user(self.autre_medecin)
        self.assertEqual(self.client.get("/api/parcours/consultations/").data, [])

    def test_valider_closes_consultation_and_creates_prescription(self):
        self.envoyer_en_consultation()
        self.consulter()
        response = self.valider()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["statut"], "Terminée")
        self.assertEqual(response.data["diagnostic"], "Paludisme")
        self.assertIsNotNone(response.data["dateConsultation"])
        self.assertEqual(response.data["prescription"], response.data["traitement"])

        self.as_user(self.pharmacien)
        ordonnance = self.client.get("/api/parcours/pharmacie/ordonnances/").data[0]
        self.assertEqual(ordonnance["medicines"], ["Paracétamol 500 mg", "Amoxicilline 500 mg"])
        self.assertEqual((ordonnance["status"], ordonnance["statusClass"]), ("À préparer", "prepare"))
        self.assertEqual((ordonnance["patient"], ordonnance["doctor"]), ("TRAORE Awa", "Dr. KOUAME Jean"))

    def test_consultation_without_treatment_has_no_prescription(self):
        self.envoyer_en_consultation()
        self.valider(traitement="  ")
        self.as_user(self.pharmacien)
        self.assertEqual(self.client.get("/api/parcours/pharmacie/ordonnances/").data, [])

    def test_pharmacy_prepares_then_serves_once_and_logs_history(self):
        self.envoyer_en_consultation()
        self.valider()
        self.as_user(self.pharmacien)
        code = self.client.get("/api/parcours/pharmacie/ordonnances/").data[0]["id"]
        base = f"/api/parcours/pharmacie/ordonnances/{code}"
        self.assertEqual(self.client.post(f"{base}/preparer/").data["status"], "Prête")
        self.assertEqual(self.client.post(f"{base}/servir/").data["status"], "Servie")
        self.assertEqual(self.client.post(f"{base}/servir/").status_code, 400)
        history = self.client.get("/api/parcours/pharmacie/historique/").data
        self.assertEqual([row["medicine"] for row in history], ["Paracétamol 500 mg", "Amoxicilline 500 mg"])
        self.assertEqual(history[0]["pharmacist"], "Clara Ahoue")

    def test_pharmacy_receipt_lists_each_medicine_with_its_price(self):
        from stocks.models import Product

        Product.objects.create(name="Paracétamol 500 mg", category="Médicament", stock=100, threshold=5, price=500)
        self.envoyer_en_consultation()
        self.valider()
        self.as_user(self.pharmacien)
        code = self.client.get("/api/parcours/pharmacie/ordonnances/").data[0]["id"]
        base = f"/api/parcours/pharmacie/ordonnances/{code}"
        self.client.post(f"{base}/preparer/")
        self.client.post(f"{base}/servir/")
        data = self.client.get(f"{base}/recu/").data
        recu = data["recu"]
        self.assertTrue(data["etablissement"]["nom"])
        self.assertEqual((recu["reference"], recu["statut"], recu["pharmacien"]), (f"ORD-{code}", "Délivrée", "Clara Ahoue"))
        self.assertEqual([l["medicament"] for l in recu["lignes"]], ["Paracétamol 500 mg", "Amoxicilline 500 mg"])
        paracetamol, amoxicilline = recu["lignes"]
        self.assertEqual((paracetamol["prix_unitaire"], amoxicilline["prix_unitaire"]), (500.0, None))
        self.assertEqual((recu["total"], recu["hors_catalogue"]), (paracetamol["montant"], 1))
        self.as_user(self.comptable)
        self.assertEqual(self.client.get(f"{base}/recu/").status_code, 403)

    def test_served_prescription_cannot_be_rewritten(self):
        self.envoyer_en_consultation()
        self.valider()
        self.as_user(self.pharmacien)
        code = self.client.get("/api/parcours/pharmacie/ordonnances/").data[0]["id"]
        self.client.post(f"/api/parcours/pharmacie/ordonnances/{code}/servir/")
        self.assertEqual(self.valider(traitement="Ibuprofène").status_code, 400)
        self.assertEqual(self.valider().status_code, 200)

    def test_revalidation_with_new_treatment_replaces_unserved_prescription(self):
        self.envoyer_en_consultation()
        self.valider()
        self.valider(traitement="Ibuprofène 400 mg")
        self.as_user(self.pharmacien)
        ordonnances = self.client.get("/api/parcours/pharmacie/ordonnances/").data
        self.assertEqual(len(ordonnances), 1)
        self.assertEqual(ordonnances[0]["medicines"], ["Ibuprofène 400 mg"])

    def test_accounting_sees_caisse_payments(self):
        self.as_user(self.comptable)
        payment = self.client.get("/api/parcours/comptabilite/paiements/").data[0]
        self.assertEqual(payment["patient"], "TRAORE Awa")
        self.assertRegex(payment["patientId"], NUMERO)
        self.assertEqual((payment["totalAmount"], payment["patientAmount"], payment["insuranceAmount"]), (10000, 8000, 2000))
        self.assertEqual((payment["cashier"], payment["service"], payment["insuranceName"]), ("Koffi Armel", "Médecine générale", "CNPS"))

    def test_roles_are_enforced(self):
        self.envoyer_en_consultation()
        self.as_user(self.infirmier)
        self.assertEqual(self.client.get("/api/parcours/consultations/").status_code, 403)
        self.assertEqual(self.client.get("/api/parcours/comptabilite/paiements/").status_code, 403)
        self.valider()
        self.as_user(self.medecin)
        code = self.client.get("/api/parcours/pharmacie/ordonnances/").data and "001"
        self.assertEqual(self.client.post(f"/api/parcours/pharmacie/ordonnances/{code}/servir/").status_code, 403)


class NotificationsTests(ParcoursBase):
    """La pastille reflète ce qui attend une action, selon le rôle."""

    def notifications(self, user):
        self.as_user(user)
        return self.client.get("/api/parcours/notifications/").data

    def test_nurse_sees_patients_waiting_for_vitals(self):
        data = self.notifications(self.infirmier)
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["items"][0]["link"], "/nursing")
        self.envoyer_en_consultation()
        self.assertEqual(self.notifications(self.infirmier)["items"], [])

    def test_doctor_sees_queue_until_consultation_is_validated(self):
        self.assertEqual(self.notifications(self.medecin)["count"], 0)
        self.envoyer_en_consultation()
        self.assertEqual(self.notifications(self.medecin)["count"], 1)
        self.consulter()
        self.assertEqual(self.notifications(self.autre_medecin)["count"], 0)
        self.assertEqual(self.notifications(self.medecin)["count"], 1)
        self.valider()
        self.assertEqual(self.notifications(self.medecin)["count"], 0)

    def test_pharmacist_sees_prescriptions_to_prepare_then_to_serve(self):
        self.envoyer_en_consultation()
        self.valider()
        self.assertEqual([i["id"] for i in self.notifications(self.pharmacien)["items"]], ["to-prepare"])
        code = self.client.get("/api/parcours/pharmacie/ordonnances/").data[0]["id"]
        self.client.post(f"/api/parcours/pharmacie/ordonnances/{code}/preparer/")
        self.assertEqual([i["id"] for i in self.notifications(self.pharmacien)["items"]], ["ready"])
        self.client.post(f"/api/parcours/pharmacie/ordonnances/{code}/servir/")
        self.assertEqual(self.notifications(self.pharmacien)["count"], 0)

    def test_roles_without_pending_actions_get_nothing(self):
        self.assertEqual(self.notifications(self.comptable)["items"], [])


class NotificationsNouveautesTests(ParcoursBase):
    """La pastille compte les nouveautés : elle s'efface au clic et revient à la prochaine arrivée."""

    def notifications(self, user):
        self.as_user(user)
        return self.client.get("/api/parcours/notifications/").data

    def nouveau_patient(self):
        self.as_user(self.caissier)
        pk = self.client.post(URL, form(nom="yao", prenom="Paul", telephone="0700000001"), format="json").data["admissionId"]
        encaisser(self.client, pk)

    def test_badge_clears_on_click_and_comes_back_with_the_next_patient(self):
        self.assertEqual(self.notifications(self.infirmier)["nouveaux"], 1)
        vu = self.client.post("/api/parcours/notifications/vues/").data
        self.assertEqual((vu["nouveaux"], vu["count"]), (0, 1))
        self.assertEqual(self.notifications(self.infirmier)["nouveaux"], 0)
        self.nouveau_patient()
        data = self.notifications(self.infirmier)
        self.assertEqual((data["nouveaux"], data["count"]), (1, 2))

    def test_badge_is_personal(self):
        self.as_user(self.infirmier)
        self.client.post("/api/parcours/notifications/vues/")
        autre = User.objects.create_user(username="inf2", password="x", role="NURSE")
        self.assertEqual(self.notifications(autre)["nouveaux"], 1)

    def test_doctor_is_only_told_about_his_specialties(self):
        cardiologue = User.objects.create_user(username="cardio", password="x", role="DOCTOR", specialites=["cardiologie"])
        self.envoyer_en_consultation()
        self.assertEqual(self.notifications(self.medecin)["count"], 1)
        self.assertEqual(self.notifications(cardiologue)["count"], 0)

    def test_push_leaves_only_for_arrivals(self):
        from unittest import mock

        from parcours import alertes
        from parcours.models import AbonnementPush

        AbonnementPush.objects.create(user=self.infirmier, endpoint="https://push.example/1", p256dh="k", auth="a")
        with mock.patch.object(alertes, "envoyer", return_value=1) as envoyer:
            self.assertEqual(alertes.alerter_personnel(), 1)
            self.assertEqual(alertes.alerter_personnel(), 0)
            self.nouveau_patient()
            self.assertEqual(alertes.alerter_personnel(), 1)
        self.assertEqual(envoyer.call_args.kwargs["body"], "2 patient(s) en attente de constantes")
        self.assertEqual({c.args[0] for c in envoyer.call_args_list}, {self.infirmier})

    def test_subscription_requires_a_complete_browser_subscription(self):
        self.as_user(self.medecin)
        self.assertEqual(self.client.post("/api/parcours/notifications/push/", {"subscription": {"endpoint": "x"}}, format="json").status_code, 400)


class NotificationsModulesTests(ParcoursBase):
    def test_lab_and_stock_notifications(self):
        from stocks.models import Product

        Product.objects.create(name="Gants", category="Consommable", stock=1, threshold=10)
        stock = User.objects.create_user(username="stk", password="x", role="STOCK")
        self.as_user(stock)
        self.assertEqual(self.client.get("/api/parcours/notifications/").data["items"][0]["id"], "stock")
        labo = User.objects.create_user(username="lab", password="x", role="LAB")
        self.as_user(labo)
        self.assertEqual(self.client.get("/api/parcours/notifications/").data["count"], 0)
        self.client.post(f"/api/laboratory/analyses/{self.pk}/demande/", {"examIds": ["nfs"]}, format="json")
        self.assertEqual(self.client.get("/api/parcours/notifications/").data["items"][0]["id"], "lab")


class CaisseTests(APITestCase):
    """Sessions, encaissement, annulation, doublons, patient existant, régie."""

    def setUp(self):
        self.caissier = User.objects.create_user(username="caisse", password="x", role="RECEPTION", first_name="Fatou", last_name="Coulibaly")
        self.regisseur = User.objects.create_user(username="regie", password="x", role="REGISSEUR")
        self.infirmier = User.objects.create_user(username="inf", password="x", role="NURSE")
        self.client.force_authenticate(self.caissier)
        self.ticket = self.client.post(URL, form(), format="json").data

    def as_user(self, user):
        self.client.force_authenticate(user)

    def pay(self, pk=None):
        return self.client.post(f"/api/parcours/caisse/patients/{pk or self.ticket['admissionId']}/encaisser/")

    def test_new_ticket_is_unpaid_and_not_yet_in_nursing(self):
        self.assertEqual((self.ticket["paymentStatus"], self.ticket["statutPaiement"]), ("en_attente", "À payer"))
        self.assertRegex(self.ticket["reference"], r"^TCK-\d{4}-\d{6}$")
        self.as_user(self.infirmier)
        self.assertEqual(self.client.get("/api/parcours/soins/patients/").data, [])

    def test_paying_requires_an_open_session_and_opens_nursing(self):
        self.assertIn("fermée", self.pay().data["detail"])
        self.client.post("/api/parcours/caisse/session/")
        self.assertEqual(self.pay().data["paymentStatus"], "paye")
        self.assertIn("déjà réglé", self.pay().data["detail"])
        self.as_user(self.infirmier)
        self.assertEqual(len(self.client.get("/api/parcours/soins/patients/").data), 1)

    def test_full_insurance_needs_no_payment_and_exams_skip_nursing(self):
        from .models import InsuranceCompany
        full = InsuranceCompany.objects.create(name="CMU 100", coverage=100)
        insured = self.client.post(URL, form(nom="yao", prenom="Paul", assurance="Oui", assuranceId=full.pk, insuranceNumber="X"), format="json").data
        self.assertEqual((insured["paymentStatus"], insured["cost"]), ("assurance", 0))
        exam = MedicalService.objects.get(name="Échographie")
        self.client.post("/api/parcours/caisse/session/")
        exam_ticket = self.client.post(URL, form(nom="kone", prenom="Ali", service=exam.pk), format="json").data
        self.pay(exam_ticket["admissionId"])
        self.as_user(self.infirmier)
        self.assertEqual([p["patient"] for p in self.client.get("/api/parcours/soins/patients/").data], ["YAO Paul"])

    def test_close_with_justified_gap_then_regisseur_validates(self):
        self.client.post("/api/parcours/caisse/session/")
        self.pay()
        refused = self.client.patch("/api/parcours/caisse/session/", {"montantCompte": 9000}, format="json")
        self.assertIn("justifié", refused.data["detail"])
        closed = self.client.patch("/api/parcours/caisse/session/", {"montantCompte": 9000, "justification": "Rendu monnaie"}, format="json").data
        self.assertEqual((closed["attendu"], closed["compte"], closed["ecart"], closed["statut"]), (10000.0, 9000.0, -1000.0, "en_attente"))
        self.assertIsNone(self.client.get("/api/parcours/caisse/session/").data["session"])
        self.as_user(self.regisseur)
        regie = self.client.get("/api/parcours/caisse/regie/").data
        self.assertEqual(len(regie["cloturesAValider"]), 1)
        url = f"/api/parcours/caisse/regie/sessions/{closed['id']}/valider/"
        self.assertEqual(self.client.post(url, {"montantRecu": 9000}, format="json").data["statut"], "validee")

    def test_cashier_cannot_validate_own_session_or_cancel(self):
        self.caissier.extra_roles = []
        self.client.post("/api/parcours/caisse/session/")
        closed = self.client.patch("/api/parcours/caisse/session/", {"montantCompte": 0}, format="json").data
        self.assertEqual(self.client.post(f"/api/parcours/caisse/regie/sessions/{closed['id']}/valider/", {"montantRecu": 0}, format="json").status_code, 403)
        self.assertEqual(self.client.post(f"/api/parcours/caisse/patients/{self.ticket['admissionId']}/annuler/", {"motif": "Erreur de saisie"}, format="json").status_code, 403)

    def test_regisseur_cancels_with_reason_unless_care_started(self):
        self.as_user(self.regisseur)
        url = f"/api/parcours/caisse/patients/{self.ticket['admissionId']}/annuler/"
        self.assertIn("motif", self.client.post(url, {"motif": "non"}, format="json").data["detail"])
        cancelled = self.client.post(url, {"motif": "Erreur de saisie"}, format="json").data
        self.assertEqual((cancelled["paymentStatus"], cancelled["motifAnnulation"]), ("annule", "Erreur de saisie"))
        self.assertEqual(len(self.client.get("/api/parcours/caisse/regie/").data["corbeille"]), 1)
        # Soins commencés : annulation refusée.
        self.as_user(self.caissier)
        other = self.client.post(URL, form(nom="yao", prenom="Paul"), format="json").data
        self.client.post("/api/parcours/caisse/session/")
        self.pay(other["admissionId"])
        self.as_user(self.infirmier)
        self.client.post(f"/api/parcours/soins/patients/{other['admissionId']}/constantes/", {"temperature": "37"}, format="json")
        self.as_user(self.regisseur)
        refused = self.client.post(f"/api/parcours/caisse/patients/{other['admissionId']}/annuler/", {"motif": "Erreur de saisie"}, format="json")
        self.assertIn("soins ont déjà commencé", refused.data["detail"])

    def test_duplicate_within_15_days_and_existing_patient(self):
        duplicate = self.client.post(URL, form(patientId=self.ticket["id"]), format="json")
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(duplicate.data["doublon"]["reference"], self.ticket["reference"])
        other_service = MedicalService.objects.get(name="Pédiatrie")
        again = self.client.post(URL, form(patientId=self.ticket["id"], service=other_service.pk), format="json").data
        self.assertEqual(again["id"], self.ticket["id"])  # même dossier, nouveau passage
        self.assertEqual(Patient.objects.count(), 1)
        found = self.client.get("/api/parcours/caisse/recherche/", {"q": "trao"}).data
        self.assertEqual(found[0]["patientId"], self.ticket["id"])

    def test_ticket_second_print_is_a_duplicate(self):
        url = f"/api/parcours/caisse/patients/{self.ticket['admissionId']}/ticket/"
        first = self.client.post(url).data
        self.assertEqual((first["duplicata"], first["aPayer"], first["etablissement"]["nom"]), (False, 10000.0, "MA SANTÉ"))
        self.assertTrue(self.client.post(url).data["duplicata"])


class AccueilTests(APITestCase):
    """API du module Accueil & Caisse : dossier, fiche, règlement, bilan, régie."""

    def setUp(self):
        self.caissier = User.objects.create_user(username="caisse", password="x", role="RECEPTION")
        self.regisseur = User.objects.create_user(username="regie", password="x", role="REGISSEUR")
        self.client.force_authenticate(self.caissier)
        self.refs = self.client.get("/api/accueil/referentiels/").data
        self.patient = self.client.post("/api/accueil/patients/", {
            "last_name": "kone", "first_names": "Aminata", "birth_date": None, "sex": "F",
            "phone": "0700000000", "city": "Abidjan", "locality": "Cocody",
            "assurance": InsuranceCompany.objects.get(name="MUGEFCI").pk, "numero_assurance": "M-1",
        }, format="json").data

    def fiche(self, prestation="Médecine générale", quantite=1):
        service = MedicalService.objects.get(name=prestation)
        return self.client.post("/api/accueil/fiches/", {
            "patient": self.patient["id"], "service": service.department_id,
            "prestation": service.pk, "quantite": quantite, "notes": "",
        }, format="json")

    def test_referentiels_group_prestations_by_service(self):
        imagerie = next(s for s in self.refs["services"] if s["name"] == "Imagerie médicale")
        noms = {p["name"] for p in self.refs["prestations"] if p["service"] == imagerie["id"]}
        self.assertEqual(noms, {"Échographie", "Radiographie"})
        self.assertEqual(self.refs["etablissement"]["nom"], "MA SANTÉ")

    def test_patient_without_birth_date_and_insured_fiche(self):
        self.assertEqual((self.patient["nom_complet"], self.patient["birth_date"]), ("KONE Aminata", None))
        self.assertEqual((self.patient["assurance_nom"], self.patient["taux_assurance"]), ("MUGEFCI", "30.00"))
        fiche = self.fiche(quantite=2).data
        self.assertEqual((fiche["prix_unitaire"], fiche["montant_total"], fiche["montant_assurance"], fiche["montant_patient"]),
                         ("10000.00", "20000.00", "6000.00", "14000.00"))
        self.assertEqual((fiche["statut"], fiche["service_nom"]), ("en_attente", "Médecine générale"))
        found = self.client.get("/api/accueil/patients/", {"q": "amin"}).data
        self.assertEqual((found["total"], found["resultats"][0]["patient_number"]), (1, self.patient["patient_number"]))

    def test_same_service_within_15_days_is_a_duplicate(self):
        first = self.fiche().data
        again = self.fiche("Consultation spécialisée")  # même service de destination
        self.assertEqual(again.status_code, 409)
        self.assertEqual((again.data["fiche_existante"]["reference"], again.data["delai_jours"]), (first["reference"], 15))
        self.assertEqual(self.fiche("Pédiatrie").status_code, 201)

    def test_pay_then_close_and_regie_validates(self):
        fiche = self.fiche().data
        self.assertIn("fermée", self.client.post(f"/api/accueil/fiches/{fiche['id']}/valider/").data["detail"])
        self.client.post("/api/accueil/session/")
        short = self.client.post(f"/api/accueil/fiches/{fiche['id']}/valider/", {"montant_recu": "5000"}, format="json")
        self.assertIn("inférieur", short.data["detail"])
        paid = self.client.post(f"/api/accueil/fiches/{fiche['id']}/valider/", {"montant_recu": "10000"}, format="json").data
        self.assertEqual((paid["statut"], paid["statut_display"]), ("paye", "Payé"))
        self.assertEqual((paid["montant_recu"], paid["monnaie_rendue"], paid["patient_sexe"]), ("10000.00", "3000.00", "F"))
        self.assertTrue(paid["valide_par_nom"])
        bilan = self.client.get("/api/accueil/bilan/").data
        self.assertEqual((bilan["caissier"], bilan["regisseur"], len(bilan["operations"])), (True, False, 1))
        self.assertEqual(bilan["bilan_periode"]["encaisse"], "7000.00")
        closed = self.client.patch("/api/accueil/session/", {"montant_compte": "7000", "justificatif": ""}, format="json").data
        self.assertEqual((closed["statut"], closed["ecart"]), ("en_attente", "0.00"))

        self.client.force_authenticate(self.regisseur)
        regie = self.client.get("/api/accueil/bilan/").data
        self.assertEqual((regie["caissier"], regie["regisseur"], len(regie["clotures_a_valider"])), (False, True, 1))
        valid = self.client.post(f"/api/accueil/sessions/{closed['id']}/valider/", {"montant_recu": "7000", "note": ""}, format="json")
        self.assertEqual(valid.data["statut"], "validee")
        cancelled = self.client.post(f"/api/accueil/fiches/{fiche['id']}/annuler/", {"motif": "Erreur de saisie"}, format="json").data
        self.assertEqual(cancelled["motif_annulation"], "Erreur de saisie")
        self.assertEqual(self.client.get("/api/accueil/bilan/").data["totaux"]["tickets_annules"], 1)

    def test_cashier_cannot_cancel(self):
        fiche = self.fiche().data
        self.assertEqual(self.client.post(f"/api/accueil/fiches/{fiche['id']}/annuler/", {"motif": "Erreur"}, format="json").status_code, 403)
