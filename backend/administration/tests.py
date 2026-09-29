from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from accounts.models import Hospital

User = get_user_model()
BASE = "/api/administration"


class AdministrationTests(APITestCase):
    def setUp(self):
        # L'administrateur d'un hôpital (le premier, créé par les migrations).
        self.admin = User.objects.create_user(username="admin", password="x", role="ADMIN", first_name="Awa", last_name="Kone",
                                              hospital=Hospital.objects.first())
        self.client.force_authenticate(self.admin)

    def form(self, **overrides):
        data = {"name": "KOUADIO Jean", "function": "Médecin chef", "roles": ["Médecin", "Pharmacien"],
                "email": "jean@masante.local", "phone": "0700000000"}
        data.update(overrides)
        return data

    def test_create_user_with_several_roles_and_temporary_password(self):
        response = self.client.post(f"{BASE}/users/", self.form(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["name"], "KOUADIO Jean")
        self.assertEqual(response.data["roles"], ["Médecin", "Pharmacien"])
        self.assertEqual(response.data["connection"], "Jamais connecté")
        user = User.objects.get(email="jean@masante.local")
        self.assertEqual((user.role, user.extra_roles, user.job_title), ("DOCTOR", ["PHARMACY"], "Médecin chef"))
        self.assertTrue(user.check_password(response.data["temporaryPassword"]))
        self.assertTrue(user.has_role("PHARMACY"))

    def test_extra_role_opens_the_matching_api(self):
        self.client.post(f"{BASE}/users/", self.form(), format="json")
        self.client.force_authenticate(User.objects.get(email="jean@masante.local"))
        self.assertEqual(self.client.get("/api/parcours/pharmacie/ordonnances/").status_code, 200)
        self.assertEqual(self.client.get("/api/parcours/soins/patients/").status_code, 403)

    def test_specialites_attribuees_et_conservees(self):
        pk = self.client.post(f"{BASE}/users/", self.form(roles=["Médecin"]), format="json").data["id"]
        reponse = self.client.put(f"{BASE}/users/{pk}/", {**self.form(roles=["Médecin"]), "specialites": ["pediatrie", "cpn"]}, format="json")
        self.assertEqual(reponse.data["specialites"], ["pediatrie", "cpn"])
        # Un formulaire qui n'envoie pas les spécialités ne les efface pas.
        self.client.put(f"{BASE}/users/{pk}/", self.form(roles=["Médecin"]), format="json")
        self.assertEqual(User.objects.get(pk=pk).specialites, ["pediatrie", "cpn"])
        refus = self.client.put(f"{BASE}/users/{pk}/", {**self.form(roles=["Médecin"]), "specialites": ["inconnue"]}, format="json")
        self.assertEqual(refus.status_code, 400)

    def test_update_and_deactivate_user(self):
        pk = self.client.post(f"{BASE}/users/", self.form(), format="json").data["id"]
        response = self.client.put(f"{BASE}/users/{pk}/", self.form(roles=["Infirmier/infirmière"]), format="json")
        self.assertEqual(response.data["roles"], ["Infirmier/infirmière"])
        self.assertEqual(self.client.delete(f"{BASE}/users/{pk}/").data["status"], "Inactif")
        self.assertFalse(User.objects.get(pk=pk).is_active)

    def test_admin_role_grants_and_removal_revokes_full_rights(self):
        pk = self.client.post(f"{BASE}/users/", self.form(roles=["Administrateur"]), format="json").data["id"]
        created = User.objects.get(pk=pk)
        # Administrateur de son hôpital : tous les rôles, mais jamais la plateforme.
        self.assertEqual((created.hospital, created.is_superuser, created.is_platform), (self.admin.hospital, False, False))
        self.assertTrue(created.has_role("PHARMACY"))
        self.client.put(f"{BASE}/users/{pk}/", self.form(roles=["Médecin"]), format="json")
        user = User.objects.get(pk=pk)
        self.assertEqual((user.role, user.is_superuser, user.is_staff), ("DOCTOR", False, False))
        own = self.client.put(f"{BASE}/users/{self.admin.pk}/", self.form(email="", roles=["Médecin"]), format="json")
        self.assertEqual(own.status_code, 400)

    def test_cannot_deactivate_own_account(self):
        self.assertEqual(self.client.delete(f"{BASE}/users/{self.admin.pk}/").status_code, 400)

    def test_validation(self):
        self.assertEqual(self.client.post(f"{BASE}/users/", self.form(roles=[]), format="json").status_code, 400)
        self.assertEqual(self.client.post(f"{BASE}/users/", self.form(roles=["Secrétaire"]), format="json").status_code, 400)
        self.assertEqual(self.client.post(f"{BASE}/users/", self.form(name="Jean"), format="json").status_code, 400)
        self.client.post(f"{BASE}/users/", self.form(), format="json")
        self.assertEqual(self.client.post(f"{BASE}/users/", self.form(), format="json").status_code, 400)

    def test_overview_reflects_real_data(self):
        self.client.post(f"{BASE}/users/", self.form(), format="json")
        self.client.post(f"{BASE}/documents/", {"name": "Règlement intérieur", "type": "PDF"}, format="json")
        data = self.client.get(f"{BASE}/overview/").data
        self.assertEqual(data["stats"], {"activeUsers": 2, "roles": 3, "documents": 1})
        self.assertEqual(sum(row["percentage"] for row in data["roleDistribution"]), 100)
        self.assertIn("Médecin", data["availableRoles"])
        self.assertEqual(data["documents"][0]["name"], "Règlement intérieur")

    def test_only_admins(self):
        self.client.force_authenticate(User.objects.create_user(username="d", password="x", role="DIRECTOR"))
        self.assertEqual(self.client.get(f"{BASE}/overview/").status_code, 403)


from .models import AuditLog  # noqa: E402


class AuditAndSettingsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin2", email="admin2@masante.local", password="Secret@2026",
                                              role="ADMIN", first_name="Awa", last_name="Kone",
                                              hospital=Hospital.objects.first())

    def test_logins_are_journaled_with_ip_and_without_password(self):
        self.client.post("/api/auth/login/", {"username": "admin2@masante.local", "password": "mauvais"}, format="json",
                         HTTP_X_FORWARDED_FOR="41.202.10.5, 10.0.0.1")
        self.client.post("/api/auth/login/", {"username": "admin2@masante.local", "password": "Secret@2026"}, format="json")
        failed, ok = AuditLog.objects.order_by("id")
        self.assertEqual((failed.action, failed.success, failed.ip_address), ("Échec de connexion", False, "41.202.10.5"))
        self.assertEqual((ok.action, ok.user, ok.module), ("Connexion", self.admin, "Authentification"))
        self.assertNotIn("password", failed.details)

    def test_business_actions_are_journaled(self):
        self.client.force_authenticate(self.admin)
        self.client.post(f"{BASE}/documents/", {"name": "Règlement intérieur", "type": "PDF"}, format="json")
        log = AuditLog.objects.get()
        self.assertEqual((log.action, log.module, log.description, log.status_code), ("Création", "Administration", "Règlement intérieur", 201))
        self.client.get(f"{BASE}/overview/")  # une lecture n'est pas journalisée
        self.assertEqual(AuditLog.objects.count(), 1)
        data = self.client.get(f"{BASE}/audit/?q=Règlement").data
        self.assertEqual(data["logs"][0]["user"], "KONE Awa")
        self.assertEqual(data["logs"][0]["ip_address"], "127.0.0.1")

    def test_general_settings(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(f"{BASE}/parametres/").data["name"], "MA SANTÉ")
        payload = {"name": "Clinique MA SANTÉ Cocody", "slogan": "Santé – Proximité – Confiance", "address": "Cocody, Abidjan",
                   "phone": "27 22 00 00 00", "email": "contact@masante.ci", "currency": "FCFA",
                   "license_number": "AGR-2026-01", "opening_hours": "24h/24"}
        payload.update({"city": "Abidjan", "district": "Cocody", "ticket_copies": 2, "ticket_validity_days": 14,
                        "ticket_note": "Merci de votre confiance.", "ticket_exclusions": "Laboratoire", "code": "ZZZ"})
        saved = self.client.put(f"{BASE}/parametres/", payload, format="json").data
        self.assertEqual((saved["address"], saved["ticket_copies"], saved["ticket_validity_days"]), ("Cocody, Abidjan", 2, 14))
        self.assertEqual(saved["code"], "MAS")  # le code ne change pas : il termine les numéros déjà émis
        self.assertEqual(self.client.put(f"{BASE}/parametres/", {**payload, "ticket_copies": 9}, format="json").status_code, 400)
        nurse = User.objects.create_user(username="n", password="x", role="NURSE")
        self.client.force_authenticate(nurse)
        self.assertEqual(self.client.get(f"{BASE}/parametres/").data["name"], "Clinique MA SANTÉ Cocody")
        self.assertEqual(self.client.put(f"{BASE}/parametres/", payload, format="json").status_code, 403)
        self.assertEqual(self.client.get(f"{BASE}/audit/").status_code, 403)


from django.contrib import admin as django_admin  # noqa: E402
from django.test import TestCase  # noqa: E402
from django.urls import reverse  # noqa: E402


class DjangoAdminTests(TestCase):
    def test_admin_role_logs_in_with_email_and_opens_every_page(self):
        from django.test import RequestFactory

        chef = User.objects.create_user(username="chef", email="chef@masante.local", password="Secret@2026", role="ADMIN")
        self.assertTrue(self.client.login(username="chef@masante.local", password="Secret@2026"))
        self.assertEqual(self.client.get(reverse("admin:index")).status_code, 200)
        request = RequestFactory().get("/admin/")
        request.user = chef
        for model, model_admin in django_admin.site._registry.items():
            opts = model._meta
            changelist = reverse(f"admin:{opts.app_label}_{opts.model_name}_changelist")
            self.assertEqual(self.client.get(changelist).status_code, 200, changelist)
            if model_admin.has_add_permission(request):
                add = reverse(f"admin:{opts.app_label}_{opts.model_name}_add")
                self.assertEqual(self.client.get(add).status_code, 200, add)

    def test_other_roles_cannot_enter_django_admin(self):
        User.objects.create_user(username="inf", email="inf@masante.local", password="Secret@2026", role="NURSE")
        self.client.login(username="inf@masante.local", password="Secret@2026")
        self.assertEqual(self.client.get(reverse("admin:index")).status_code, 302)


from .services import suggest_username, username_candidates  # noqa: E402


class UsernameNomenclatureTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="kadmin", password="x", role="ADMIN")
        self.client.force_authenticate(self.admin)

    def test_candidate_order(self):
        self.assertEqual(username_candidates("KOUADIO Jean Marc")[:4], ["jkouadio", "mkouadio", "jekouadio", "makouadio"])
        self.assertEqual(username_candidates("N'GUESSAN Éloïse")[:2], ["enguessan", "elnguessan"])
        self.assertEqual(username_candidates("KOUADIO"), [])

    def test_next_free_username_is_proposed(self):
        User.objects.create_user(username="jkouadio", password="x")
        self.assertEqual(suggest_username("KOUADIO Jean Marc"), "mkouadio")
        User.objects.create_user(username="mkouadio", password="x")
        self.assertEqual(suggest_username("KOUADIO Jean Marc"), "jekouadio")
        response = self.client.get(f"{BASE}/users/nom-utilisateur/", {"name": "KOUADIO Jean Marc"})
        self.assertEqual(response.data["username"], "jekouadio")

    def test_create_with_generated_username_and_chosen_password(self):
        data = {"name": "TRAORE Awa", "function": "Infirmière", "roles": ["Infirmier/infirmière"], "email": "", "phone": "",
                "username": "", "password": "Clinique@2026"}
        created = self.client.post(f"{BASE}/users/", data, format="json").data
        self.assertEqual((created["username"], created["temporaryPassword"]), ("atraore", None))
        self.assertTrue(User.objects.get(username="atraore").check_password("Clinique@2026"))

    def test_edit_name_username_and_password(self):
        base = {"function": "", "roles": ["Médecin"], "email": "", "phone": ""}
        pk = self.client.post(f"{BASE}/users/", {**base, "name": "YAO Claude", "username": "", "password": ""}, format="json").data["id"]
        response = self.client.put(f"{BASE}/users/{pk}/", {**base, "name": "YAO Claude Serge", "username": "cyao2",
                                                           "password": "Nouveau@2026"}, format="json")
        self.assertEqual((response.data["name"], response.data["username"]), ("YAO Claude Serge", "cyao2"))
        self.assertTrue(User.objects.get(pk=pk).check_password("Nouveau@2026"))
        kept = self.client.put(f"{BASE}/users/{pk}/", {**base, "name": "YAO Claude", "username": "", "password": ""}, format="json")
        self.assertEqual(kept.data["username"], "cyao2")
        weak = self.client.put(f"{BASE}/users/{pk}/", {**base, "name": "YAO Claude", "username": "", "password": "123"}, format="json")
        self.assertEqual(weak.status_code, 400)
        taken = self.client.put(f"{BASE}/users/{pk}/", {**base, "name": "YAO Claude", "username": "kadmin", "password": ""}, format="json")
        self.assertEqual(taken.status_code, 400)


class PrestationsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="adm", password="x", role="ADMIN")
        self.client.force_authenticate(self.admin)

    def test_creer_modifier_desactiver(self):
        cree = self.client.post(f"{BASE}/prestations/", {"nom": "Consultation dentaire test", "prix": "7 500",
                                                           "categorie": "CONSULTATION", "service": "Cabinet dentaire",
                                                           "specialite": "dentaire"}, format="json")
        self.assertEqual(cree.status_code, 201, cree.data)
        self.assertEqual((cree.data["prix"], cree.data["specialiteNom"], cree.data["service"]), (7500, "Cabinet dentaire", "Cabinet dentaire"))
        modifie = self.client.put(f"{BASE}/prestations/{cree.data['id']}/", {**cree.data, "prix": 8000, "active": False}, format="json")
        self.assertEqual((modifie.data["prix"], modifie.data["active"]), (8000, False))
        liste = self.client.get(f"{BASE}/prestations/").data
        self.assertIn("dentaire", [s["code"] for s in liste["specialites"]])

    def test_refus_lisibles_et_acces(self):
        refus = self.client.post(f"{BASE}/prestations/", {"nom": "", "prix": "-5"}, format="json")
        self.assertEqual(set(refus.data), {"nom", "prix"})
        self.client.force_authenticate(User.objects.create_user(username="doc", password="x", role="DOCTOR"))
        self.assertEqual(self.client.get(f"{BASE}/prestations/").status_code, 403)


class CatalogueParHopitalTests(APITestCase):
    """Chaque hôpital reçoit sa copie du catalogue modèle et la modifie sans toucher aux autres."""

    def test_nouvel_hopital_recoit_sa_copie_et_ses_prix(self):
        from parcours.catalogue_modele import CATALOGUE_MODELE
        from parcours.models import MedicalService

        mas = Hospital.objects.get(code="MAS")
        autre = Hospital.objects.create(name="Clinique Autre", code="CLA")
        self.assertEqual(MedicalService.objects.filter(hospital=autre).count(), len(CATALOGUE_MODELE))
        admin_autre = User.objects.create_user(username="adm_cla", password="x", role="ADMIN", hospital=autre)
        self.client.force_authenticate(admin_autre)
        mg = next(p for p in self.client.get(f"{BASE}/prestations/").data["prestations"] if p["nom"] == "Médecine générale")
        self.client.put(f"{BASE}/prestations/{mg['id']}/", {**mg, "prix": 3000}, format="json")
        self.assertEqual(MedicalService.objects.get(hospital=autre, name="Médecine générale").price, 3000)
        self.assertEqual(MedicalService.objects.get(hospital=mas, name="Médecine générale").price, 10000)
        # La prestation de MAS n'existe pas pour l'administrateur de l'autre hôpital.
        mas_mg = MedicalService.objects.get(hospital=mas, name="Médecine générale")
        self.assertEqual(self.client.put(f"{BASE}/prestations/{mas_mg.pk}/", {**mg, "prix": 1}, format="json").status_code, 404)

    def test_la_caisse_refuse_la_prestation_d_un_autre_hopital(self):
        from parcours.models import MedicalService
        from parcours.tests import URL, form

        autre = Hospital.objects.create(name="Clinique Autre", code="CLA")
        caissier = User.objects.create_user(username="caisse_mas", password="x", role="RECEPTION")
        self.client.force_authenticate(caissier)
        etrangere = MedicalService.objects.get(hospital=autre, name="Médecine générale")
        reponse = self.client.post(URL, form(service=etrangere.pk), format="json")
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("service", reponse.data)
