import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import Hospital, User
from administration.models import AuditLog
from consultations.tests import MG, consultation_complete
from parcours.tests import ParcoursBase
from patients.models import Patient

from .models import Document, IdentiteArchive
from .services import score

G = "/api/ged/"
MEDIA = tempfile.mkdtemp()


def pdf(nom="scan.pdf", taille=1000):
    return SimpleUploadedFile(nom, b"%PDF-1.4 " + b"0" * taille, content_type="application/pdf")


@override_settings(MEDIA_ROOT=MEDIA)
class GedTests(ParcoursBase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        super().setUp()
        self.patient = Patient.objects.get()
        self.as_user(self.medecin)

    def deposer(self, **donnees):
        return self.client.post(f"{G}documents/", {"fichiers": [donnees.pop("fichier", pdf())], **donnees}, format="multipart")

    def test_depot_puis_lecture_du_fichier_trace(self):
        reponse = self.deposer(titre="Radio thorax", type="imagerie", patient=self.patient.pk, motsCles="poumon")
        self.assertEqual(reponse.status_code, 201, reponse.data)
        doc = reponse.data[0]
        self.assertEqual((doc["patient"]["numero"], doc["stockage"]), (self.patient.patient_number, "local"))
        # Le nom d'origine (souvent un nom de patient) n'apparaît pas dans le chemin sur disque.
        self.assertNotIn("scan", Document.objects.get().fichier.name)
        fichier = self.client.get(f"{G}documents/{doc['id']}/fichier/")
        self.assertEqual(fichier.status_code, 200)
        self.assertTrue(b"".join(fichier.streaming_content).startswith(b"%PDF"))
        self.assertTrue(AuditLog.objects.filter(module="GED", action="Consultation d'un document").exists())

    def test_gros_scan_et_formats_refuses(self):
        self.assertEqual(self.deposer(fichier=pdf(taille=4 * 1024 * 1024)).status_code, 201)
        refuse = self.deposer(fichier=SimpleUploadedFile("virus.exe", b"MZ", content_type="application/octet-stream"))
        self.assertEqual(refuse.status_code, 400)
        self.assertIn("fichier", refuse.data)

    def test_corbeille_et_restauration(self):
        doc = self.deposer().data[0]
        self.client.delete(f"{G}documents/{doc['id']}/")
        self.assertEqual(self.client.get(f"{G}documents/").data, [])
        self.assertEqual(len(self.client.get(f"{G}documents/", {"corbeille": "1"}).data), 1)
        self.client.post(f"{G}documents/{doc['id']}/restaurer/")
        self.assertEqual(len(self.client.get(f"{G}documents/").data), 1)

    def test_recherche_tolerante_nom_et_numero(self):
        self.assertGreater(score("kwasi", "KOUASSI"), 0)
        self.assertEqual(score("traore", "KONE"), 0)
        IdentiteArchive.objects.create(hospital=self.patient.hospital, nom="KOUASSI", prenoms="Yao",
                                       numero_registre="R-1987-0412", annee_registre=1987, created_by=self.medecin)
        for terme, attendu in (("Traoré", "patient"), (self.patient.patient_number, "patient"),
                               ("kwasi yao", "archive"), ("1987-0412", "archive")):
            self.assertEqual(self.client.get(f"{G}recherche/", {"q": terme}).data[0]["sorte"], attendu, terme)

    def test_registre_papier_relie_au_dossier_actuel(self):
        identite = self.client.post(f"{G}identites/", {"nom": "traore", "prenoms": "Awa", "naissance": "1994",
                                                       "numeroRegistre": "R-1999-12", "anneeRegistre": "1999"}).data
        self.assertEqual((identite["nom"], identite["naissance"]), ("TRAORE Awa", "1994"))
        doublon = self.client.post(f"{G}identites/", {"nom": "Traoré", "numeroRegistre": "r-1999-12"})
        self.assertEqual((doublon.status_code, doublon.data["identite"]["id"]), (409, identite["id"]))
        self.deposer(titre="Registre maternité 1999", type="registre", identite=identite["id"])
        # Avant le lien : le registre est seul.
        seul = self.client.get(f"{G}dossier/", {"identite": identite["id"]}).data
        self.assertIsNone(seul["patient"])
        self.assertEqual([e["source"] for e in seul["evenements"]], ["Registre papier"])
        # Lié : le registre apparaît dans le dossier actuel, à côté de la consultation.
        self.client.post(f"{G}identites/{identite['id']}/lier/", {"patient": self.patient.pk})
        self.envoyer_en_consultation()
        self.as_user(self.medecin)
        self.client.post(f"{MG}{self.pk}/terminer/", {"valeurs": consultation_complete()}, format="json")
        dossier = self.client.get(f"{G}dossier/", {"patient": self.patient.pk}).data
        sources = {e["source"] for e in dossier["evenements"]}
        self.assertTrue({"Registre papier", "Consultation", "Pharmacie", "Caisse"} <= sources, sources)
        self.assertEqual(len(dossier["identites"]), 1)

    def test_naissance_complete_ou_a_la_francaise_sans_erreur_serveur(self):
        from ged.models import IdentiteArchive

        iso = self.client.post(f"{G}identites/", {"nom": "kone", "naissance": "1962-04-18",
                                                  "numeroRegistre": "A12", "anneeRegistre": "1998"})
        self.assertEqual((iso.status_code, iso.data["naissance"], iso.data["anneeRegistre"]), (201, "1962-04-18", 1998))
        francaise = self.client.post(f"{G}identites/", {"nom": "yao", "naissance": "18/04/1962"})
        self.assertEqual((francaise.status_code, francaise.data["naissance"]), (201, "1962-04-18"))
        # Illisible ou impossible : refusé avec un message, et rien n'est créé.
        avant = IdentiteArchive.objects.count()
        for naissance, annee in (("1962-13-40", ""), ("hier", ""), ("2999", ""), ("1962", "1850")):
            refus = self.client.post(f"{G}identites/", {"nom": "bah", "naissance": naissance, "anneeRegistre": annee})
            self.assertEqual(refus.status_code, 400, (naissance, annee))
        self.assertEqual(IdentiteArchive.objects.count(), avant)

    def test_acces_et_cloisonnement_par_hopital(self):
        self.as_user(self.infirmier)
        self.assertEqual(self.client.get(f"{G}documents/").status_code, 403)
        autre = Hospital.objects.create(name="Autre clinique", code="AUT")
        medecin_ailleurs = User.objects.create_user(username="ailleurs", password="x", role="DOCTOR", hospital=autre)
        self.as_user(self.medecin)
        doc = self.deposer().data[0]
        self.as_user(medecin_ailleurs)
        self.assertEqual(self.client.get(f"{G}documents/").data, [])
        self.assertEqual(self.client.get(f"{G}documents/{doc['id']}/fichier/").status_code, 404)
        self.assertEqual(self.client.get(f"{G}recherche/", {"q": "traore"}).data, [])
