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
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.name
