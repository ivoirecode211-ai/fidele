from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class LabExam(models.Model):
    """Examen du catalogue du laboratoire."""
    code = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=80)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    unit = models.CharField(max_length=30, blank=True)
    reference = models.CharField(max_length=60, blank=True, help_text="Valeurs de référence.")
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class LabRequest(models.Model):
    """Demande d'analyse d'un patient passé à la caisse (une par passage)."""
    STATUSES = [(s, s) for s in ("En attente", "En cours", "Terminée")]
    PRIORITIES = [(p, p) for p in ("Normale", "Urgente")]

    admission = models.OneToOneField("parcours.Admission", on_delete=models.PROTECT, related_name="lab_request")
    status = models.CharField(max_length=20, choices=STATUSES, default="En attente")
    priority = models.CharField(max_length=20, choices=PRIORITIES, default="Normale")
    observation = models.TextField(blank=True)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    requested_at = models.DateTimeField(auto_now_add=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"LAB-{self.admission_id:03d}"


class LabResult(models.Model):
    request = models.ForeignKey(LabRequest, on_delete=models.CASCADE, related_name="results")
    exam = models.ForeignKey(LabExam, on_delete=models.PROTECT)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    result = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["id"]
        constraints = [models.UniqueConstraint(fields=["request", "exam"], name="lab_result_unique_exam")]
