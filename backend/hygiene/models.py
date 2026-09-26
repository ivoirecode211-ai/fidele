from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class CleaningTask(models.Model):
    TYPES = [(t, t) for t in ("Nettoyage", "Désinfection", "Décontamination", "Stérilisation")]
    # « En retard » n'est pas stocké : il se déduit de l'heure prévue.
    STATUSES = [(s, s) for s in ("Planifiée", "En cours", "Terminée")]

    zone = models.CharField(max_length=120)
    type = models.CharField(max_length=30, choices=TYPES, default="Nettoyage")
    responsible = models.CharField(max_length=120)
    date = models.DateField()
    hour = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUSES, default="Planifiée")
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "tâche d'hygiène"
        verbose_name_plural = "tâches d'hygiène"
        ordering = ["-date", "hour", "id"]

    def __str__(self):
        return f"{self.zone} — {self.date:%d/%m/%Y} {self.hour:%H:%M}"


class HygieneProduct(models.Model):
    ICONS = [(i, i) for i in ("FlaskConical", "LockKeyhole", "ShieldCheck", "Biohazard", "Package")]

    name = models.CharField(max_length=120, unique=True)
    icon = models.CharField(max_length=30, choices=ICONS, default="Package")
    last_check = models.DateField(help_text="Dernier contrôle de disponibilité.")

    class Meta:
        verbose_name = "produit d'hygiène"
        verbose_name_plural = "produits d'hygiène"
        ordering = ["name"]

    def __str__(self):
        return self.name


class WasteCollection(models.Model):
    TYPES = [(t, t) for t in ("Déchets infectieux", "Déchets chimiques", "Déchets assimilés")]

    type = models.CharField(max_length=40, choices=TYPES)
    quantity_kg = models.DecimalField(max_digits=7, decimal_places=1, validators=[MinValueValidator(0)])
    date = models.DateField()

    class Meta:
        verbose_name = "collecte de déchets"
        verbose_name_plural = "collectes de déchets"
        ordering = ["-date", "-id"]


class HygieneAudit(models.Model):
    date = models.DateField()
    score = models.PositiveSmallIntegerField(validators=[MaxValueValidator(100)], help_text="Conformité en %.")
    compliant = models.BooleanField(default=True)
    next_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "contrôle d'hygiène"
        verbose_name_plural = "contrôles d'hygiène"
        ordering = ["-date", "-id"]
