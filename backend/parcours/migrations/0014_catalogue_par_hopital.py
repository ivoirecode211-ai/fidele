"""Le catalogue existant revient au premier hôpital ; chaque autre hôpital reçoit sa copie du modèle."""
from django.db import migrations


def repartir(apps, schema_editor):
    from parcours.catalogue_modele import copier_catalogue

    Hospital = apps.get_model("accounts", "Hospital")
    MedicalService = apps.get_model("parcours", "MedicalService")
    Department = apps.get_model("parcours", "Department")
    hopitaux = list(Hospital.objects.order_by("pk"))
    if not hopitaux:
        return
    MedicalService.objects.filter(hospital__isnull=True).update(hospital=hopitaux[0])
    for hopital in hopitaux[1:]:
        copier_catalogue(hopital, MedicalService, Department)


class Migration(migrations.Migration):
    dependencies = [("parcours", "0013_prestations_par_hopital"), ("accounts", "0007_specialites")]
    operations = [migrations.RunPython(repartir, migrations.RunPython.noop)]
