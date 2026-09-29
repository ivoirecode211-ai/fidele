from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models


class Hospital(models.Model):
    """Un hôpital client du logiciel (multitenant) : ses données ne se mêlent à aucun autre.

    Le code (3 lettres, tiré de l'acronyme du nom) termine le numéro de dossier
    de chacun de ses patients : P25F46TSB pour l'hôpital TSB.
    """
    name = models.CharField("nom de l'hôpital", max_length=160)
    code = models.CharField("code", max_length=3, unique=True,
                            validators=[RegexValidator(r"^[A-Z]{3}$", "Trois lettres majuscules.")])
    phone = models.CharField("téléphone", max_length=50, blank=True)
    email = models.EmailField("e-mail", blank=True)
    city = models.CharField("ville", max_length=120, blank=True)
    district = models.CharField("quartier", max_length=120, blank=True)
    address = models.CharField("adresse", max_length=250, blank=True)
    slogan = models.CharField(max_length=160, blank=True)
    currency = models.CharField("devise", max_length=10, default="FCFA")
    license_number = models.CharField("numéro d'agrément", max_length=80, blank=True)
    opening_hours = models.CharField("horaires d'ouverture", max_length=160, default="24h/24 – 7j/7", blank=True)

    # Caisse et tickets : réglés par l'administrateur de l'hôpital.
    ticket_copies = models.PositiveSmallIntegerField(
        "souches par ticket", default=3, validators=[MinValueValidator(1), MaxValueValidator(5)])
    ticket_validity_days = models.PositiveSmallIntegerField(
        "validité d'un reçu (jours)", default=15, validators=[MinValueValidator(1), MaxValueValidator(365)],
        help_text="Délai avant de pouvoir réémettre un ticket pour la même consultation.")
    ticket_note = models.CharField(
        "mention en pied de ticket", max_length=200, blank=True,
        default="Conservez ce reçu, il vous sera demandé en cas de réclamation.")
    ticket_exclusions = models.CharField(
        "exclusions du ticket", max_length=200, blank=True, default="Laboratoire – Échographie – Hospitalisation")

    active = models.BooleanField("actif", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name="+")

    class Meta:
        verbose_name = "hôpital"
        verbose_name_plural = "hôpitaux"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class User(AbstractUser):
    # Rôle métier utilisé pour le RBAC.
    ROLE_CHOICES = [
        ("ADMIN", "Administrateur"),
        ("DIRECTOR", "Directeur de clinique"),
        ("DOCTOR", "Médecin"),
        ("NURSE", "Infirmier/infirmière"),
        ("RECEPTION", "Réceptionniste"),
        ("LAB", "Laborantin"),
        ("PHARMACY", "Pharmacien"),
        ("ACCOUNTING", "Comptable"),
        ("STOCK", "Responsable des stocks"),
        ("HR", "Responsable RH"),
        ("MAINTENANCE", "Responsable maintenance"),
        # Reçoit les fonds des caisses, valide les clôtures, annule les tickets.
        ("REGISSEUR", "Régisseur"),
    ]
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default="RECEPTION")
    phone = models.CharField(max_length=30, blank=True)
    department = models.CharField(max_length=120, blank=True)
    # Intitulé de poste affiché dans l'Administration (ex. « Médecin chef »).
    job_title = models.CharField(max_length=120, blank=True)
    # Rôles supplémentaires : ils s'ajoutent au rôle principal pour les accès.
    extra_roles = models.JSONField(default=list, blank=True)
    # Spécialités exercées (codes de consultations/specialites.py) : le rôle donne les droits,
    # les spécialités donnent les formulaires et la file d'attente. Vide : médecine générale.
    specialites = models.JSONField(default=list, blank=True)
    # Hôpital de rattachement. Sans hôpital : compte de la plateforme (création des hôpitaux).
    hospital = models.ForeignKey(Hospital, null=True, blank=True, on_delete=models.PROTECT,
                                 related_name="users", verbose_name="hôpital")

    class Meta(AbstractUser.Meta):
        constraints = [
            models.CheckConstraint(
                condition=models.Q(is_superuser=False) | models.Q(role="ADMIN"),
                name="superuser_must_have_admin_role",
            ),
        ]

    def save(self, *args, **kwargs):
        admin = self.role == "ADMIN" or "ADMIN" in (self.extra_roles or [])
        if self.hospital_id is None and not (self.is_superuser or admin):
            # Seul un administrateur peut appartenir à la plateforme : tout autre
            # compte travaille dans un hôpital, le premier à défaut d'en préciser un.
            self.hospital = Hospital.objects.filter(active=True).order_by("pk").first()
        if self.hospital_id is None:
            # Compte de la plateforme : le super-utilisateur Django garde le
            # rôle ADMIN, et un ADMIN sans hôpital est super-utilisateur.
            if self.is_superuser:
                self.role = "ADMIN"
            if admin:
                self.is_superuser = True
                self.is_staff = True
        else:
            # L'administrateur d'un hôpital a tous les droits dans SON hôpital,
            # jamais ceux de la plateforme ni l'admin Django (qui voit tout).
            self.is_superuser = False
            self.is_staff = False

        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            kwargs["update_fields"] = set(update_fields) | {"role", "is_staff", "is_superuser", "hospital"}
        return super().save(*args, **kwargs)

    @property
    def is_platform(self):
        """Compte de la plateforme : crée les hôpitaux et leurs administrateurs."""
        return self.is_superuser and self.hospital_id is None

    @property
    def role_codes(self):
        """Tous les rôles de l'utilisateur (principal + supplémentaires)."""
        codes = {self.role, *self.extra_roles}
        if self.is_superuser:
            codes.add("ADMIN")
        return codes

    def has_role(self, *codes):
        # L'administrateur (de la plateforme ou d'un hôpital) a tous les rôles.
        return self.is_superuser or "ADMIN" in self.role_codes or bool(self.role_codes & set(codes))

    def __str__(self):
        return f"{self.get_full_name() or self.username} — {self.get_role_display()}"
