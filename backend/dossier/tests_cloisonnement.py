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


class CloisonnementModulesTests(APITestCase):
    """Stocks, RH, Hygiène, Laboratoire, Archives : chaque hôpital ne voit et ne touche que ses données."""

    def setUp(self):
        from hygiene.models import CleaningTask
        from rh.models import Employee
        from stocks.models import Product, Supplier

        self.a = Hospital.objects.order_by("pk").first()
        self.b = Hospital.objects.create(name="Clinique Sainte Marie", code="CSM")
        self.admin_b = User.objects.create_user(username="adm-b", password="x", role="ADMIN", hospital=self.b)
        self.produit_a = Product.objects.create(hospital=self.a, name="Paracétamol 500 mg", category="Médicament", stock=40)
        Supplier.objects.create(hospital=self.a, name="Laborex", contact="M. Kone", phone="0102")
        self.employe_a = Employee.objects.create(hospital=self.a, matricule="EMP-0001", nom="KOUASSI", prenom="Ange",
                                                 poste="Infirmier", departement="Soins", dateEmbauche="2024-01-02")
        admin_a = User.objects.create_user(username="adm-a", password="x", role="ADMIN", hospital=self.a)
        self.tache_a = CleaningTask.objects.create(hospital=self.a, zone="Bloc A", type="Désinfection", responsible="Équipe 1",
                                                   date=timezone.localdate(), hour="08:00", created_by=admin_a)
        patient_a = Patient.objects.create(hospital=self.a, patient_number="P26AAAMAS", last_name="KONE", first_names="Awa", sex="F")
        self.client.force_authenticate(self.admin_b)
        self.patient_a = patient_a

    def test_stocks_par_hopital(self):
        from stocks.models import Product

        vue = self.client.get("/api/stocks/overview/").data
        self.assertEqual((vue["produits"], vue["fournisseurs"], vue["mouvements"]), ([], [], []))
        self.assertEqual(self.client.get("/api/stocks/pharmacie/produits/").data, [])
        # Même nom de produit permis dans B ; un mouvement sur le produit de A est introuvable.
        cree = self.client.post("/api/stocks/produits/", {"produit": "Paracétamol 500 mg", "categorie": "Médicament",
                                                          "stock": 5, "seuil": 1}, format="json")
        self.assertEqual(cree.status_code, 201, cree.data)
        self.assertEqual(Product.objects.get(hospital=self.b).stock, 5)
        sortie = self.client.post("/api/stocks/mouvements/", {"type": "Sortie", "produitId": f"{self.produit_a.pk:03d}",
                                                              "quantite": 1, "motif": "Test", "date": str(timezone.localdate())},
                                  format="json")
        self.assertEqual(sortie.status_code, 404)
        self.produit_a.refresh_from_db()
        self.assertEqual(self.produit_a.stock, 40)

    def test_rh_et_hygiene_par_hopital(self):
        self.assertEqual(self.client.get("/api/rh/employes/").data, [])
        self.assertEqual(self.client.delete(f"/api/rh/employes/{self.employe_a.pk}/").status_code, 404)
        # Le matricule EMP-0001 est libre dans B : chaque hôpital a sa suite.
        cree = self.client.post("/api/rh/employes/", {"nom": "YAO", "prenom": "Paul", "sexe": "Homme", "poste": "Agent",
                                                      "departement": "Accueil", "dateEmbauche": "2025-01-01"}, format="json")
        self.assertEqual(cree.data["matricule"], "EMP-0001")
        self.assertEqual(self.client.get("/api/hygiene/overview/").data["tasks"], [])
        self.assertEqual(self.client.post(f"/api/hygiene/tasks/{self.tache_a.pk}/statut/", {"status": "Terminée"},
                                          format="json").status_code, 404)

    def test_laboratoire_archives_et_routes_generiques(self):
        self.assertEqual(self.client.get("/api/laboratory/overview/").data["analyses"], [])
        archives = self.client.get("/api/archives/overview/").data
        self.assertEqual(archives["stats"]["patientFiles"], 0)
        for url in ("/api/consultations/", "/api/prescriptions/"):
            data = self.client.get(url).data
            self.assertEqual(data.get("results", data) if isinstance(data, dict) else data, [])
