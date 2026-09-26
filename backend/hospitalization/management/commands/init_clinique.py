from django.core.management.base import BaseCommand
from django.db import transaction

from hospitalization.models import Bed, Room

# Configuration de départ du service d'hospitalisation (maquette de la page).
# À adapter aux locaux réels via l'admin Django.
ROOMS = [
    ("A-101", "Médecine générale", "Standard", 2),
    ("A-102", "Médecine générale", "Standard", 2),
    ("B-201", "Maternité", "Standard", 3),
    ("B-204", "Maternité", "VIP", 2),
    ("C-301", "Cardiologie", "VIP", 1),
    ("D-105", "Chirurgie", "Standard", 2),
]


class Command(BaseCommand):
    help = "Installe les chambres et lits de départ, uniquement si aucune chambre n'existe."

    @transaction.atomic
    def handle(self, *args, **options):
        if Room.objects.exists():
            self.stdout.write("Des chambres existent déjà : rien n'est modifié.")
            return
        for name, department, kind, beds in ROOMS:
            room = Room.objects.create(name=name, department=department, type=kind)
            Bed.objects.bulk_create(Bed(room=room, number=f"Lit {n:02d}") for n in range(1, beds + 1))
        self.stdout.write(self.style.SUCCESS(f"{len(ROOMS)} chambres et {sum(r[3] for r in ROOMS)} lits créés."))
