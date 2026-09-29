from django.core.management.base import BaseCommand
from django.utils import timezone

from portail import push
from portail.services import rappels_a_envoyer


class Command(BaseCommand):
    help = "Envoie les rappels de médicaments dont l'heure est venue (à lancer chaque minute, par cron)."

    def handle(self, *args, **options):
        sent = 0
        for reminder, intake in rappels_a_envoyer():
            dose = f" — {reminder.dose}" if reminder.dose else ""
            push.send(reminder.patient, title="C'est l'heure de votre médicament",
                      body=f"{reminder.medicine}{dose} ({intake.time})",
                      url="/patient/espace?onglet=medicaments", tag=f"prise-{intake.pk}")
            intake.notified_at = timezone.now()
            intake.save(update_fields=["notified_at"])
            sent += 1
        self.stdout.write(f"{sent} rappel(s) envoyé(s).")
