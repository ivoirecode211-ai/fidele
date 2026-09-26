from django.conf import settings
from django.db import models
from patients.models import Patient

class Appointment(models.Model):
    STATUS = [
        ("PROGRAMMED", "PROGRAMMÉ"),
        ("CONFIRMED", "CONFIRMÉ"),
        ("WAITING", "EN ATTENTE"),
        ("IN_CONSULTATION", "EN CONSULTATION"),
        ("DONE", "TERMINÉ"),
        ("CANCELLED", "ANNULÉ"),
        ("ABSENT", "ABSENT"),
    ]
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="appointments")
    professional = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="appointments")
    date_time = models.DateTimeField()
    service = models.CharField(max_length=120, blank=True)
    reason = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=30, choices=STATUS, default="PROGRAMMED")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "rendez-vous"
        verbose_name_plural = "rendez-vous"
        ordering = ["date_time"]
