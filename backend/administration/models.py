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
