from django.db import migrations

# Service de destination de chaque prestation, pour l'écran « Prestation » de l'accueil.
REPARTITION = {
    "Médecine générale": ["Médecine générale", "Consultation spécialisée"],
    "Pédiatrie": ["Pédiatrie"],
    "Chirurgie": ["Chirurgie", "Petite chirurgie"],
    "Gynécologie-Obstétrique": ["Gynécologie", "Consultation prénatale"],
    "Cardiologie": ["Cardiologie", "Électrocardiogramme (ECG)"],
    "Dermatologie": ["Dermatologie"],
    "Urgences": ["Urgences"],
    "ORL": ["ORL"],
    "Ophtalmologie": ["Ophtalmologie"],
    "Soins infirmiers": ["Soins infirmiers", "Pansement", "Injection", "Vaccination"],
    "Imagerie médicale": ["Échographie", "Radiographie"],
    "Kinésithérapie": ["Kinésithérapie"],
}


def repartir(apps, schema_editor):
    Department = apps.get_model("parcours", "Department")
    MedicalService = apps.get_model("parcours", "MedicalService")
    for name, services in REPARTITION.items():
        department, _ = Department.objects.get_or_create(name=name)
        MedicalService.objects.filter(name__in=services, department__isnull=True).update(department=department)
    # Une prestation ajoutée hors de cette liste reste sélectionnable : elle forme son propre service.
    for service in MedicalService.objects.filter(department__isnull=True):
        service.department, _ = Department.objects.get_or_create(name=service.name)
        service.save(update_fields=["department"])


class Migration(migrations.Migration):
    dependencies = [("parcours", "0007_services_de_destination")]
    operations = [migrations.RunPython(repartir, migrations.RunPython.noop)]
