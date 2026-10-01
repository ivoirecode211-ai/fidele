from django.db import models
from patients.models import Patient

class Room(models.Model):
    class Meta:
        verbose_name = "chambre"
        verbose_name_plural = "chambres"

    # Chaque hôpital a ses chambres et ses lits : jamais partagés entre hôpitaux.
    hospital = models.ForeignKey("accounts.Hospital", null=True, blank=True, on_delete=models.PROTECT,
                                 related_name="rooms", verbose_name="hôpital")
    name = models.CharField(max_length=100)
    department = models.CharField(max_length=120)
    type = models.CharField(max_length=40, default="Standard")

    def save(self, *args, **kwargs):
        # Une chambre appartient toujours à un hôpital : à défaut, le premier.
        if self.hospital_id is None:
            from accounts.models import Hospital

            self.hospital = Hospital.objects.filter(active=True).order_by("pk").first()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Bed(models.Model):
    class Meta:
        verbose_name = "lit"
        verbose_name_plural = "lits"

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
    class Meta:
        verbose_name = "séjour"
        verbose_name_plural = "séjours"

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
