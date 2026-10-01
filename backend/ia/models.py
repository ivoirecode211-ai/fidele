from django.conf import settings
from django.db import models


class Intervention(models.Model):
    """Chaque fois que l'assistant IA travaille sur un patient : qui l'a sollicité, ce qu'il a proposé.

    Le journal ne s'efface pas : une nouvelle proposition s'ajoute à la précédente
    au lieu de la remplacer (la consultation, elle, ne garde que la dernière).
    """
    NATURES = [
        ("diagnostic", "Diagnostic proposé"),
        ("examens", "Examens proposés"),
        ("ordonnance", "Ordonnance proposée"),
        ("conseils", "Conseils proposés"),
        ("conversation", "Question sur le patient"),
    ]

    hospital = models.ForeignKey("accounts.Hospital", null=True, blank=True, on_delete=models.PROTECT,
                                 related_name="interventions_ia", verbose_name="hôpital")
    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="interventions_ia")
    consultation = models.ForeignKey("consultations.Consultation", null=True, blank=True, on_delete=models.SET_NULL,
                                     related_name="interventions_ia")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                             related_name="+", verbose_name="sollicitée par")
    nature = models.CharField(max_length=20, choices=NATURES)
    demande = models.TextField("demande", blank=True)
    reponse = models.JSONField("réponse de l'IA", default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "intervention de l'IA"
        verbose_name_plural = "interventions de l'IA"
        ordering = ["-created_at", "-pk"]
        indexes = [models.Index(fields=["hospital", "patient", "-created_at"])]

    def __str__(self):
        return f"{self.get_nature_display()} — {self.patient.patient_number}"
