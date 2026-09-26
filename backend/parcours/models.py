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
    CATEGORIES = [("CONSULTATION", "Consultation"), ("SOIN", "Soin"), ("EXAMEN", "Examen")]
    # Consultations et soins passent par l'infirmerie ; un examen, non.
    PARCOURS_SOINS = ("CONSULTATION", "SOIN")

    name = models.CharField(max_length=120, unique=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    category = models.CharField("catégorie", max_length=20, choices=CATEGORIES, default="CONSULTATION")
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


class CashSession(models.Model):
    """Journée de caisse d'un caissier : ouverture, clôture, validation par le régisseur."""
    OPEN, PENDING, VALIDATED = "ouverte", "en_attente", "validee"
    STATUSES = [(OPEN, "Ouverte"), (PENDING, "En attente de validation"), (VALIDATED, "Validée")]

    cashier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cash_sessions_parcours")
    opened_at = models.DateTimeField(default=timezone.now)
    session_date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=20, choices=STATUSES, default=OPEN)
    closed_at = models.DateTimeField(null=True, blank=True)
    expected = models.DecimalField("montant attendu", max_digits=14, decimal_places=2, default=0)
    counted = models.DecimalField("montant compté", max_digits=14, decimal_places=2, null=True, blank=True)
    gap = models.DecimalField("écart", max_digits=14, decimal_places=2, null=True, blank=True)
    justification = models.TextField(blank=True)
    closed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    validated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    validated_at = models.DateTimeField(null=True, blank=True)
    received = models.DecimalField("montant reçu", max_digits=14, decimal_places=2, null=True, blank=True)
    validation_gap = models.DecimalField("écart à la validation", max_digits=14, decimal_places=2, null=True, blank=True)
    validation_note = models.TextField(blank=True)

    class Meta:
        verbose_name = "session de caisse"
        verbose_name_plural = "sessions de caisse"
        ordering = ["-opened_at"]
        constraints = [
            # Une seule caisse ouverte à la fois par caissier (plusieurs dans la journée).
            models.UniqueConstraint(fields=["cashier"], condition=Q(status="ouverte"), name="parcours_une_caisse_ouverte"),
        ]

    def __str__(self):
        return f"Caisse du {self.session_date:%d/%m/%Y} — {self.get_status_display()}"


class AdmissionQuerySet(models.QuerySet):
    def actives(self):
        """Hors tickets annulés."""
        return self.filter(cancelled_at__isnull=True)

    def encaissees(self):
        """Réglées en caisse ou prises en charge à 100 % : ce qui compte en recettes et ouvre les soins."""
        return self.actives().filter(payment_status__in=(Admission.PAID, Admission.INSURED))

    def parcours_soins(self):
        """File de l'infirmerie : encaissées, et consultation ou soin (pas un examen)."""
        return self.encaissees().filter(service__category__in=MedicalService.PARCOURS_SOINS)


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

    # Paiement : créé « à payer » à l'accueil, réglé en caisse (session ouverte).
    UNPAID, PAID, INSURED = "en_attente", "paye", "assurance"
    PAYMENT_STATUSES = [(UNPAID, "À payer"), (PAID, "Payé"), (INSURED, "Pris en charge (100 %)")]
    reference = models.CharField("n° de ticket", max_length=30, unique=True, null=True, blank=True)
    payment_status = models.CharField("paiement", max_length=20, choices=PAYMENT_STATUSES, default=UNPAID)
    paid_at = models.DateTimeField(null=True, blank=True)
    session = models.ForeignKey(CashSession, null=True, blank=True, on_delete=models.PROTECT, related_name="admissions")
    # Corbeille : un ticket annulé n'est jamais effacé ; il sort des comptes.
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    cancel_reason = models.TextField(blank=True)
    printed_count = models.PositiveSmallIntegerField(default=0)

    objects = AdmissionQuerySet.as_manager()

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
