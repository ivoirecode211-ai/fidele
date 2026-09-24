from django.conf import settings
from django.db import models
from patients.models import Patient

class Prescription(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="prescriptions")
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    date = models.DateField(auto_now_add=True)
    instructions = models.TextField(blank=True)
    STATUS_CHOICES = [("TO_PREPARE", "À préparer"), ("READY", "Prête"), ("SERVED", "Servie")]
    consultation = models.OneToOneField(
        "consultations.Consultation", null=True, blank=True, on_delete=models.PROTECT, related_name="prescription"
    )
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="TO_PREPARE")
    prepared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    prepared_at = models.DateTimeField(null=True, blank=True)
    served_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    served_at = models.DateTimeField(null=True, blank=True)

class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name="items")
    medicine = models.CharField(max_length=180)
    dose = models.CharField(max_length=80)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=1)
    instructions = models.TextField(blank=True)
