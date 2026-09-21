from django.contrib.auth.models import AbstractUser
from django.db import models

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
    ]
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default="RECEPTION")
    phone = models.CharField(max_length=30, blank=True)
    department = models.CharField(max_length=120, blank=True)

    class Meta(AbstractUser.Meta):
        constraints = [
            models.CheckConstraint(
                condition=models.Q(is_superuser=False) | models.Q(role="ADMIN"),
                name="superuser_must_have_admin_role",
            ),
        ]

    def save(self, *args, **kwargs):
        # Un super-utilisateur Django possède tous les droits. Son rôle métier
        # doit donc rester ADMIN, même s'il a été créé sans rôle explicite ou
        # si une interface tente ensuite de le classer comme réceptionniste.
        if self.is_superuser:
            self.role = "ADMIN"
            self.is_staff = True

            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = set(update_fields) | {"role", "is_staff"}

        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_full_name() or self.username} — {self.get_role_display()}"
