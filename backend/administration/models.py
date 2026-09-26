from django.conf import settings
from django.db import models


class AdminDocument(models.Model):
    """Document administratif référencé dans le module Administration."""
    TYPES = [("PDF", "PDF"), ("DOCX", "DOCX"), ("XLSX", "XLSX")]

    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPES, default="PDF")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "document administratif"
        verbose_name_plural = "documents administratifs"
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.name


class GeneralSettings(models.Model):
    """Paramètres généraux de l'établissement (une seule ligne)."""
    name = models.CharField("nom de l'établissement", max_length=160, default="MA SANTÉ")
    slogan = models.CharField(max_length=160, default="Santé – Proximité – Confiance", blank=True)
    address = models.CharField("adresse", max_length=250, blank=True)
    phone = models.CharField("téléphone", max_length=50, blank=True)
    email = models.EmailField("e-mail", blank=True)
    currency = models.CharField("devise", max_length=10, default="FCFA")
    license_number = models.CharField("numéro d'agrément", max_length=80, blank=True)
    opening_hours = models.CharField("horaires d'ouverture", max_length=160, default="24h/24 – 7j/7", blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "paramètres généraux"
        verbose_name_plural = "paramètres généraux"

    def __str__(self):
        return self.name

    @classmethod
    def load(cls):
        settings_row, _ = cls.objects.get_or_create(pk=1)
        return settings_row


class AuditLog(models.Model):
    """Journal d'audit : qui a fait quoi, quand, depuis où."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    username = models.CharField("identifiant", max_length=150, blank=True, help_text="Conservé même si le compte disparaît.")
    action = models.CharField(max_length=40)
    module = models.CharField(max_length=60)
    description = models.CharField(max_length=255, blank=True)
    method = models.CharField(max_length=10, blank=True)
    path = models.CharField(max_length=255, blank=True)
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)
    success = models.BooleanField(default=True)
    ip_address = models.GenericIPAddressField("adresse IP", null=True, blank=True)
    user_agent = models.CharField("navigateur", max_length=255, blank=True)
    duration_ms = models.PositiveIntegerField("durée (ms)", null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "entrée du journal d'audit"
        verbose_name_plural = "journal d'audit"

    def __str__(self):
        return f"{self.created_at:%d/%m/%Y %H:%M} — {self.username or 'anonyme'} — {self.action}"
