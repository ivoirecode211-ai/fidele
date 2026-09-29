import uuid
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
    # Appareils médicaux : ce que l'on étiquette d'un QR code.
    ("Imagerie médicale", "Imagerie médicale"),
    ("Laboratoire", "Laboratoire"),
    ("Monitoring", "Monitoring"),
    ("Bloc opératoire", "Bloc opératoire"),
    ("Mobilier médical", "Mobilier médical"),
    ("Informatique", "Informatique"),
]

ACQUISITIONS = [
    ("Achat", "Achat"),
    ("Don", "Don"),
    ("Dotation de l'État", "Dotation de l'État"),
    ("Location", "Location"),
    ("Prêt", "Prêt"),
]


class Equipment(models.Model):
    """Équipement du parc technique de l'hôpital.

    Chacun porte une étiquette QR : l'adresse qu'elle contient se termine par
    `qr_token`, un identifiant aléatoire (un numéro qui se suit se devinerait).
    Régénérer le jeton rend l'ancienne étiquette inutilisable.
    """
    IN_SERVICE, BROKEN, RETIRED = "En service", "En panne", "Réformé"
    STATES = [(IN_SERVICE, IN_SERVICE), (BROKEN, BROKEN), (RETIRED, RETIRED)]

    hospital = models.ForeignKey("accounts.Hospital", null=True, blank=True, on_delete=models.PROTECT,
                                 related_name="equipments", verbose_name="hôpital")
    code = models.CharField("code interne", max_length=20, unique=True, null=True, blank=True)
    qr_token = models.UUIDField("jeton du QR code", default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=40, choices=CATEGORIES)
    brand = models.CharField("marque", max_length=100, blank=True)
    model_name = models.CharField("modèle", max_length=100, blank=True)
    serial_number = models.CharField("numéro de série", max_length=100, blank=True)
    supplier = models.CharField("structure d'origine", max_length=160, blank=True,
                                help_text="Fournisseur, donateur ou organisme qui a envoyé l'appareil.")
    acquisition = models.CharField("mode d'acquisition", max_length=30, choices=ACQUISITIONS, blank=True)
    installation_date = models.DateField("date d'installation", null=True, blank=True)
    warranty_end = models.DateField("fin de garantie", null=True, blank=True)
    service = models.CharField("service", max_length=120, blank=True)
    state = models.CharField("statut", max_length=20, choices=STATES, default=IN_SERVICE)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="+")
    created_at = models.DateTimeField(auto_now_add=True, null=True)
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
        constraints = [
            models.UniqueConstraint(fields=["hospital", "name"], name="maintenance_equipement_unique_par_hopital"),
        ]

    def __str__(self):
        return self.name


class Intervention(models.Model):
    TYPES = [("Préventive", "Préventive"), ("Corrective", "Corrective")]
    PRIORITIES = [("Normale", "Normale"), ("Haute", "Haute"), ("Critique", "Critique")]
    STATUSES = [("En attente", "En attente"), ("En cours", "En cours"), ("Terminée", "Terminée")]

    equipment = models.ForeignKey(Equipment, on_delete=models.PROTECT, related_name="interventions")
    # Nom affiché ; `technician_user` quand c'est un agent de l'hôpital,
    # `company` quand l'intervention est sous-traitée.
    technician = models.CharField(max_length=120)
    technician_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                        related_name="maintenance_interventions", verbose_name="technicien (compte)")
    company = models.CharField("entreprise", max_length=160, blank=True)
    date = models.DateField()
    time = models.TimeField(null=True, blank=True)
    type = models.CharField(max_length=20, choices=TYPES, default="Préventive")
    priority = models.CharField(max_length=20, choices=PRIORITIES, default="Normale")
    status = models.CharField(max_length=20, choices=STATUSES, default="En attente")
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Compte rendu, rempli à la clôture.
    diagnosis = models.TextField("diagnostic", blank=True)
    work_done = models.TextField("travaux réalisés", blank=True)
    parts = models.TextField("pièces remplacées", blank=True)
    cost = models.DecimalField("coût", max_digits=12, decimal_places=2, null=True, blank=True,
                               validators=[MinValueValidator(0)])
    duration_minutes = models.PositiveIntegerField("durée (minutes)", null=True, blank=True)
    closed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                  related_name="+")

    class Meta:
        verbose_name = "intervention"
        verbose_name_plural = "interventions"
        ordering = ["-date", "-time", "-id"]

    def __str__(self):
        return f"{self.equipment} — {self.date:%d/%m/%Y}"


def next_maintenance(equipment, last_done):
    return last_done + timedelta(days=equipment.maintenance_interval_days) if last_done else None


class EquipmentScan(models.Model):
    """Qui a scanné quelle étiquette, et quand : la traçabilité des consultations."""
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name="scans")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    scanned_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = "scan d'équipement"
        verbose_name_plural = "scans d'équipements"
        ordering = ["-scanned_at"]
