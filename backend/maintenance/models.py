from datetime import timedelta

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

CATEGORIES = [
    ("Électricité", "Électricité"),
    ("Climatisation", "Climatisation"),
    ("Stérilisation", "Stérilisation"),
    ("Froid médical", "Froid médical"),
    ("Gaz médicaux", "Gaz médicaux"),
    ("Infrastructure", "Infrastructure"),
]


class Equipment(models.Model):
    """Équipement du parc technique de la clinique."""
    name = models.CharField(max_length=150, unique=True)
    category = models.CharField(max_length=40, choices=CATEGORIES)
    location = models.CharField(max_length=120, blank=True)
    availability = models.PositiveSmallIntegerField(
        default=100, validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Disponibilité constatée, en %.",
    )
    maintenance_interval_days = models.PositiveSmallIntegerField(default=30)

    class Meta:
        verbose_name = "équipement"
        verbose_name_plural = "équipements"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Intervention(models.Model):
    TYPES = [("Préventive", "Préventive"), ("Corrective", "Corrective")]
    PRIORITIES = [("Normale", "Normale"), ("Haute", "Haute"), ("Critique", "Critique")]
    STATUSES = [("En attente", "En attente"), ("En cours", "En cours"), ("Terminée", "Terminée")]

    equipment = models.ForeignKey(Equipment, on_delete=models.PROTECT, related_name="interventions")
    technician = models.CharField(max_length=120)
    date = models.DateField()
    time = models.TimeField(null=True, blank=True)
    type = models.CharField(max_length=20, choices=TYPES, default="Préventive")
    priority = models.CharField(max_length=20, choices=PRIORITIES, default="Normale")
    status = models.CharField(max_length=20, choices=STATUSES, default="En attente")
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "intervention"
        verbose_name_plural = "interventions"
        ordering = ["-date", "-time", "-id"]

    def __str__(self):
        return f"{self.equipment} — {self.date:%d/%m/%Y}"


def next_maintenance(equipment, last_done):
    return last_done + timedelta(days=equipment.maintenance_interval_days) if last_done else None
