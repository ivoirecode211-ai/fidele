import secrets

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from accounts.models import Hospital, User
from accounts.tenancy import code_candidates

# Compte de la plateforme : crée les hôpitaux et leurs administrateurs (aucun hôpital).
PLATFORM = ("plateforme", "plateforme@masante.local", "Plateforme", "MA SANTÉ", "ADMIN", "Plateforme@2026!")

# Comptes de l'hôpital de démonstration (« admin » en est l'administrateur).
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
    help = ("Crée les utilisateurs par défaut de MA SANTÉ. En développement, remet les mots de passe connus ; "
            "en production (DEBUG=False), crée seulement les comptes absents avec un mot de passe aléatoire.")

    def add_arguments(self, parser):
        parser.add_argument("--production", action="store_true",
                            help="Confirme l'exécution sur un serveur de production.")

    def handle(self, *args, **kwargs):
        production = not settings.DEBUG
        if production and not kwargs["production"]:
            raise CommandError("DEBUG=False : relancez avec --production. Les comptes existants ne seront pas modifiés "
                               "et chaque nouveau compte recevra un mot de passe aléatoire, affiché une seule fois.")
        hospital = Hospital.objects.order_by("pk").first() or Hospital.objects.create(
            name="MA SANTÉ", code=code_candidates("MA SANTÉ")[0])
        for username, email, first, last, role, password in [PLATFORM, *USERS]:
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
            if production:
                if not created:
                    self.stdout.write(f"Inchangé : {username}")
                    continue
                password = secrets.token_urlsafe(12)
            user.email = email
            user.first_name = first
            user.last_name = last
            user.role = role
            user.hospital = None if username == PLATFORM[0] else hospital
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f"{'Créé' if created else 'Mis à jour'} : {email} / {password}"
            ))
