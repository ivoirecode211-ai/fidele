from django.db import models
from patients.models import Patient

class Room(models.Model):
    name = models.CharField(max_length=100)
    department = models.CharField(max_length=120)
    type = models.CharField(max_length=40, default="Standard")
    def __str__(self):
        return self.name

class Bed(models.Model):
    STATUS = [
        ("AVAILABLE", "Disponible"),
        ("OCCUPIED", "Occupé"),
        ("RESERVED", "Réservé"),
        ("CLEANING", "Désinfection"),
    ]
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="beds")
    number = models.CharField(max_length=30)
    status = models.CharField(max_length=20, choices=STATUS, default="AVAILABLE")
    def __str__(self):
        return f"{self.room.name} — Lit {self.number}"

class Hospitalization(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="hospitalizations")
    bed = models.ForeignKey(Bed, on_delete=models.PROTECT, related_name="hospitalizations")
    admission_date = models.DateTimeField()
    discharge_date = models.DateTimeField(null=True, blank=True)
    reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    # Parcours : séjour décidé en consultation.
    planned_discharge = models.DateField(null=True, blank=True)
    service = models.CharField(max_length=120, blank=True)
    doctor = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="hospitalizations"
    )
    admission = models.ForeignKey(
        "parcours.Admission", null=True, blank=True, on_delete=models.PROTECT, related_name="hospitalizations"
    )
