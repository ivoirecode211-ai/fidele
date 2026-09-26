from django.core.management.base import BaseCommand
from accounts.models import User

USERS = [
    ("admin", "admin@masante.local", "Admin", "MA SANTÉ", "ADMIN", "Admin@2026!"),
    ("directeur", "directeur@masante.local", "Directeur", "Clinique", "DIRECTOR", "Directeur@2026!"),
    ("medecin", "medecin@masante.local", "Médecin", "Principal", "DOCTOR", "Medecin@2026!"),
    ("infirmier", "infirmier@masante.local", "Infirmier", "Service", "NURSE", "Infirmier@2026!"),
    ("reception", "reception@masante.local", "Réception", "Accueil", "RECEPTION", "Reception@2026!"),
    ("laborantin", "laborantin@masante.local", "Laborantin", "Laboratoire", "LAB", "Laborantin@2026!"),
    ("pharmacien", "pharmacien@masante.local", "Pharmacien", "Pharmacie", "PHARMACY", "Pharmacien@2026!"),
    ("comptable", "comptable@masante.local", "Comptable", "Finance", "ACCOUNTING", "Comptable@2026!"),
    ("stocks", "stocks@masante.local", "Responsable", "Stocks", "STOCK", "Stocks@2026!"),
    ("rh", "rh@masante.local", "Responsable", "RH", "HR", "RH@2026!"),
    ("maintenance", "maintenance@masante.local", "Responsable", "Maintenance", "MAINTENANCE", "Maintenance@2026!"),
    ("regisseur", "regisseur@masante.local", "Régisseur", "Caisse", "REGISSEUR", "Regisseur@2026!"),
]

class Command(BaseCommand):
    help = "Crée les utilisateurs par défaut de MA SANTÉ."

    def handle(self, *args, **kwargs):
        for username, email, first, last, role, password in USERS:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                    "is_staff": role == "ADMIN",
                },
            )
            user.email = email
            user.first_name = first
            user.last_name = last
            user.role = role
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f"{'Créé' if created else 'Mis à jour'} : {email} / {password}"
            ))
