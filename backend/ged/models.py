"""GED : les documents du centre, et les identités des patients d'avant le logiciel.

Un document est une fiche (type, date, patient, mots-clés) qui dit OÙ se trouve
son fichier : sur ce serveur, ou dans le logiciel d'archivage externe. Les
écrans ne voient que la fiche ; changer de stockage ne change rien pour eux.
"""
import os
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


def chemin_fichier(document, nom):
    """ged/<hôpital>/<année>/<mois>/<uuid>.<ext> : jamais le nom d'origine, qui peut contenir un nom de patient."""
    extension = os.path.splitext(nom)[1].lower()[:10]
    return f"ged/{document.hospital_id or 0}/{timezone.now():%Y/%m}/{uuid.uuid4().hex}{extension}"


class IdentiteArchive(models.Model):
    """Un patient connu des registres papier, enregistré avant le logiciel (ou jamais passé à la caisse).

    Quand il revient et reçoit un numéro de dossier, on relie les deux : ses
    anciens registres apparaissent alors dans son dossier.
    """
    hospital = models.ForeignKey("accounts.Hospital", on_delete=models.PROTECT, related_name="+")
    nom = models.CharField(max_length=120)
    prenoms = models.CharField(max_length=180, blank=True)
    sexe = models.CharField(max_length=1, blank=True, choices=[("M", "Masculin"), ("F", "Féminin")])
    date_naissance = models.DateField(null=True, blank=True)
    annee_naissance = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Quand seule l'année est connue.")
    numero_registre = models.CharField("n° dans le registre", max_length=60, blank=True)
    annee_registre = models.PositiveSmallIntegerField("année du registre", null=True, blank=True)
    service = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    patient = models.ForeignKey("patients.Patient", null=True, blank=True, on_delete=models.SET_NULL,
                                related_name="identites_archive", verbose_name="dossier actuel")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "identité d'archive"
        verbose_name_plural = "identités d'archive"
        ordering = ["nom", "prenoms"]

    def __str__(self):
        return f"{self.nom} {self.prenoms}".strip()


class Document(models.Model):
    TYPES = [
        ("registre", "Registre papier"),
        ("dossier", "Dossier médical"),
        ("compte_rendu", "Compte rendu"),
        ("ordonnance", "Ordonnance"),
        ("laboratoire", "Résultat de laboratoire"),
        ("imagerie", "Imagerie"),
        ("administratif", "Pièce administrative"),
        ("facture", "Facture"),
        ("courrier", "Courrier"),
        ("autre", "Autre"),
    ]
    # Où se trouve le fichier. « distant » : dans le logiciel d'archivage externe.
    STOCKAGES = [("local", "Serveur du centre"), ("distant", "Logiciel d'archivage")]
    SYNCHRONISATIONS = [("local", "Local seulement"), ("a_envoyer", "À envoyer"), ("envoye", "Envoyé"), ("erreur", "Échec d'envoi")]

    hospital = models.ForeignKey("accounts.Hospital", on_delete=models.PROTECT, related_name="+")
    titre = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPES, default="autre")
    date_document = models.DateField("date du document", null=True, blank=True)
    patient = models.ForeignKey("patients.Patient", null=True, blank=True, on_delete=models.PROTECT, related_name="documents_ged")
    identite = models.ForeignKey(IdentiteArchive, null=True, blank=True, on_delete=models.PROTECT, related_name="documents")
    service = models.CharField(max_length=120, blank=True)
    mots_cles = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)

    stockage = models.CharField(max_length=10, choices=STOCKAGES, default="local")
    fichier = models.FileField(upload_to=chemin_fichier, blank=True)
    nom_fichier = models.CharField("nom d'origine", max_length=255, blank=True)
    taille = models.PositiveBigIntegerField(default=0)
    type_mime = models.CharField(max_length=100, blank=True)
    reference_distante = models.CharField(max_length=255, blank=True, help_text="Identifiant du document dans le logiciel externe.")
    synchronisation = models.CharField(max_length=12, choices=SYNCHRONISATIONS, default="local")

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    # Corbeille : un document supprimé n'est jamais effacé tout de suite.
    supprime_le = models.DateTimeField(null=True, blank=True)
    supprime_par = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+")

    class Meta:
        verbose_name = "document"
        verbose_name_plural = "documents"
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.titre
