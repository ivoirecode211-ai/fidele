from django.core.management.base import BaseCommand

from parcours.alertes import alerter_personnel


class Command(BaseCommand):
    help = "Envoie en push au personnel ce qui vient d'arriver pour lui (à lancer chaque minute)."

    def handle(self, *args, **options):
        self.stdout.write(f"{alerter_personnel()} notification(s) envoyée(s).")
