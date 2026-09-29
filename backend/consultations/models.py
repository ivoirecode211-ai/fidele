from django.conf import settings
from django.db import models
from patients.models import Patient

class Consultation(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="consultations")
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="consultations")
    date_time = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True)
    symptoms = models.TextField(blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    blood_pressure = models.CharField(max_length=30, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    heart_rate = models.PositiveIntegerField(null=True, blank=True)
    observations = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    treatment = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)
    next_consultation = models.DateField(null=True, blank=True)
    # Passage en caisse à l'origine de la consultation (parcours Caisse → Soins → Consultation).
    admission = models.OneToOneField(
        "parcours.Admission", null=True, blank=True, on_delete=models.PROTECT, related_name="consultation"
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    # Formulaire de médecine générale, enregistré étape par étape : le médecin
    # reprend là où il s'était arrêté. Les champs texte ci-dessus en sont tirés
    # à la clôture, pour les modules qui les lisent (rapports, labo, séjours).
    form_data = models.JSONField(default=dict, blank=True)
    # Le formulaire utilisé, fixé à l'ouverture d'après la prestation payée en caisse.
    specialite = models.CharField("spécialité", max_length=40, default="medecine-generale")
    current_step = models.CharField(max_length=40, blank=True)
    completed_steps = models.JSONField(default=list, blank=True)

    OUTCOMES = [
        ("sortie", "Retour à domicile"),
        ("rdv", "Rendez-vous de contrôle"),
        ("observation", "Mise en observation"),
        ("hospitalisation", "Hospitalisation"),
        ("refere_interne", "Référé en interne"),
        ("refere_externe", "Référé en externe"),
        ("refus", "Refus d'hospitalisation"),
        ("evade", "Évadé"),
        ("decede", "Décédé"),
    ]
    outcome = models.CharField("issue", max_length=30, choices=OUTCOMES, blank=True)
    # Ce que l'assistant IA a proposé, par rubrique : on garde la trace de ce
    # qui a été suggéré, à côté de ce que le médecin a finalement retenu.
    ai_trace = models.JSONField(default=dict, blank=True)
    # La conversation du médecin avec l'assistant, au sujet de ce seul patient.
    ia_messages = models.JSONField(default=list, blank=True)
    ia_echange_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "consultation"
        verbose_name_plural = "consultations"
        ordering = ["-date_time"]
