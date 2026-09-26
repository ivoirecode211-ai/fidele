"""Parcours du patient : Caisse → Soins infirmiers → Consultation → Pharmacie.

Les colonnes suivent les champs manipulés par les pages React (Caisse.jsx,
Nursing.jsx, Consultations.jsx) afin que l'API les serve sans conversion.
"""
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class MedicalService(models.Model):
    """Service médical proposé à la caisse (select « Service » du formulaire)."""
    name = models.CharField(max_length=120, unique=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "service médical"
        verbose_name_plural = "services médicaux"
        ordering = ["id"]
        constraints = [models.CheckConstraint(condition=Q(price__gte=0), name="parcours_service_price")]

    def __str__(self):
        return self.name


class InsuranceCompany(models.Model):
    """Assurance ; coverage = pourcentage pris en charge."""
    name = models.CharField(max_length=120, unique=True)
    coverage = models.DecimalField(
        max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "assurance"
        verbose_name_plural = "assurances"
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(condition=Q(coverage__gte=0, coverage__lte=100), name="parcours_insurance_coverage")
        ]

    def __str__(self):
        return self.name


class Admission(models.Model):
    """Passage d'un patient enregistré à la caisse.

    Le service, le tarif et l'assurance sont figés au moment du passage : une
    modification ultérieure du catalogue ne change pas ce qui a été encaissé.
    """
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="admissions")
    service = models.ForeignKey(MedicalService, on_delete=models.PROTECT)
    service_name = models.CharField(max_length=120)
    service_price = models.DecimalField(max_digits=12, decimal_places=2)
    insurance = models.ForeignKey(InsuranceCompany, null=True, blank=True, on_delete=models.PROTECT)
    insurance_name = models.CharField(max_length=120, blank=True)
    insurance_number = models.CharField(max_length=120, blank=True)
    insurance_coverage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    cost = models.DecimalField(max_digits=12, decimal_places=2)
    motif = models.CharField(max_length=255, default="Consultation générale")
    statut = models.CharField(max_length=40, default="En attente")
    # Renseigné quand l'infirmier enregistre les constantes : le patient
    # apparaît alors dans le module Consultation.
    sent_to_consultation_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "passage en caisse"
        verbose_name_plural = "passages en caisse"
        ordering = ["created_at", "id"]
        constraints = [models.CheckConstraint(condition=Q(cost__gte=0), name="parcours_admission_cost")]

    def __str__(self):
        return f"{self.patient.patient_number} — {self.service_name}"


class VitalSigns(models.Model):
    """Constantes prises en Soins infirmiers. Chaque enregistrement est conservé :
    la page affiche le plus récent, l'historique reste consultable."""
    admission = models.ForeignKey(Admission, on_delete=models.PROTECT, related_name="vitals")
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)  # °C
    systolic = models.PositiveSmallIntegerField(null=True, blank=True)  # mmHg
    diastolic = models.PositiveSmallIntegerField(null=True, blank=True)  # mmHg
    pulse = models.PositiveSmallIntegerField(null=True, blank=True)  # bpm
    oxygen = models.PositiveSmallIntegerField(null=True, blank=True)  # SpO2 %
    respiratory_rate = models.PositiveSmallIntegerField(null=True, blank=True)  # /min
    glucose = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)  # g/L
    weight = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)  # kg
    height = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)  # cm
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "prise de constantes"
        verbose_name_plural = "prises de constantes"
        ordering = ["-recorded_at", "-id"]
