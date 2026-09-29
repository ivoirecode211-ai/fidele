"""Espace patient : l'accès du patient, sa messagerie avec ses médecins, ses rappels.

Le patient n'est pas un utilisateur du personnel : il n'a pas de compte
Django. Il se connecte avec son code patient (imprimé sur ses tickets et sur
sa carte d'accès) et un code PIN de 6 chiffres, et reçoit un jeton qui
n'ouvre que les API de l'espace patient.
"""
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone


class PatientAccess(models.Model):
    MAX_FAILURES = 5
    LOCK_MINUTES = 15

    patient = models.OneToOneField("patients.Patient", on_delete=models.CASCADE, related_name="portal_access")
    pin_hash = models.CharField(max_length=128)
    # Le PIN remis à l'accueil est provisoire : le patient choisit le sien à la première connexion.
    must_change_pin = models.BooleanField(default=True)
    active = models.BooleanField(default=True)
    # Incrémenté à chaque changement ou réinitialisation du PIN : les anciens jetons tombent.
    token_version = models.PositiveIntegerField(default=1)
    failed_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    activated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    activated_at = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "accès à l'espace patient"
        verbose_name_plural = "accès à l'espace patient"

    def __str__(self):
        return f"Accès de {self.patient}"

    def set_pin(self, pin, *, temporary):
        self.pin_hash = make_password(pin)
        self.must_change_pin = temporary
        self.token_version += 1
        self.failed_attempts = 0
        self.locked_until = None

    def check_pin(self, pin):
        return check_password(pin, self.pin_hash)

    @property
    def locked(self):
        return bool(self.locked_until and self.locked_until > timezone.now())


class Conversation(models.Model):
    """Un fil entre un patient et un médecin qui l'a consulté."""
    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="conversations")
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="patient_conversations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "conversation patient"
        verbose_name_plural = "conversations patients"
        ordering = ["-updated_at"]
        constraints = [models.UniqueConstraint(fields=["patient", "doctor"], name="portail_une_conversation_par_medecin")]


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    from_patient = models.BooleanField()
    text = models.TextField(max_length=2000)
    sent_at = models.DateTimeField(default=timezone.now)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "message"
        verbose_name_plural = "messages"
        ordering = ["sent_at", "id"]


class Reminder(models.Model):
    """Rappel de prise d'un médicament, aux heures choisies, entre deux dates."""
    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="reminders")
    prescription_item = models.ForeignKey("prescriptions.PrescriptionItem", null=True, blank=True,
                                          on_delete=models.SET_NULL, related_name="reminders")
    medicine = models.CharField(max_length=180)
    dose = models.CharField(max_length=80, blank=True)
    times = models.JSONField(default=list, help_text="Heures de prise, « HH:MM ».")
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "rappel de médicament"
        verbose_name_plural = "rappels de médicaments"
        ordering = ["medicine"]


class Intake(models.Model):
    """Une prise prévue : notifiée, puis confirmée (ou non) par le patient."""
    reminder = models.ForeignKey(Reminder, on_delete=models.CASCADE, related_name="intakes")
    date = models.DateField()
    time = models.CharField(max_length=5)
    notified_at = models.DateTimeField(null=True, blank=True)
    taken_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "prise de médicament"
        verbose_name_plural = "prises de médicaments"
        constraints = [models.UniqueConstraint(fields=["reminder", "date", "time"], name="portail_une_prise_par_heure")]


class PushSubscription(models.Model):
    """Un téléphone (ou navigateur) du patient, abonné aux notifications Web Push."""
    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.URLField(max_length=600, unique=True)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "abonnement aux notifications"
        verbose_name_plural = "abonnements aux notifications"


class PushKeys(models.Model):
    """Clés VAPID du serveur (une seule ligne), créées au premier besoin."""
    public_key = models.TextField()
    private_key = models.TextField()

    class Meta:
        verbose_name = "clés de notification"
        verbose_name_plural = "clés de notification"
