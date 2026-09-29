from django.apps import AppConfig
from django.db.models.signals import post_save


def catalogue_du_nouvel_hopital(sender, instance, created, raw=False, **kwargs):
    """Tout hôpital créé reçoit sa copie du catalogue modèle de prestations."""
    if created and not raw:
        from .catalogue_modele import copier_catalogue

        copier_catalogue(instance)


class ParcoursConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'parcours'
    verbose_name = "Parcours patient"

    def ready(self):
        post_save.connect(catalogue_du_nouvel_hopital, sender="accounts.Hospital",
                          dispatch_uid="parcours_catalogue_du_nouvel_hopital")
