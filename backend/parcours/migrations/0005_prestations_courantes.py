from django.db import migrations

# Prestations courantes proposées à la caisse (tarifs en FCFA, modifiables
# dans l'admin Django : Parcours patient > Services médicaux).
PRESTATIONS = [
    ("Consultation spécialisée", 15000),
    ("Urgences", 15000),
    ("ORL", 15000),
    ("Ophtalmologie", 15000),
    ("Consultation prénatale", 8000),
    ("Soins infirmiers", 5000),
    ("Pansement", 3000),
    ("Injection", 2000),
    ("Vaccination", 5000),
    ("Échographie", 20000),
    ("Radiographie", 15000),
    ("Électrocardiogramme (ECG)", 12000),
    ("Kinésithérapie", 10000),
    ("Petite chirurgie", 20000),
]


def seed(apps, schema_editor):
    MedicalService = apps.get_model("parcours", "MedicalService")
    for name, price in PRESTATIONS:
        MedicalService.objects.get_or_create(name=name, defaults={"price": price})


class Migration(migrations.Migration):
    dependencies = [("parcours", "0004_alter_admission_options_and_more")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
