from django.conf import settings
from django.db import models


class FormInstance(models.Model):
    STATUS = [
        ("draft", "Brouillon"),
        ("in_progress", "En cours"),
        ("completed", "Terminé"),
        ("submitted", "Soumis"),
        ("cancelled", "Annulé"),
    ]

    form_key = models.CharField(max_length=100, db_index=True)
    patient = models.ForeignKey(
        "patients.Patient",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="form_instances",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="form_instances",
    )
    status = models.CharField(max_length=20, choices=STATUS, default="draft")
    current_step = models.CharField(max_length=100, blank=True)
    data = models.JSONField(default=dict)
    completed_steps = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.form_key} ({self.status})"
