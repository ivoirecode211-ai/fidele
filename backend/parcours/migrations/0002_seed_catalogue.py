from django.db import migrations

# Valeurs reprises de servicesConfiguration / insuranceConfiguration (Caisse.jsx).
SERVICES = [
    ("Médecine générale", 10000),
    ("Pédiatrie", 12000),
    ("Chirurgie", 25000),
    ("Gynécologie", 15000),
    ("Cardiologie", 20000),
    ("Dermatologie", 12000),
]
INSURANCES = [("MUGEFCI", 30), ("CNPS", 20), ("NSIA", 40)]


def seed(apps, schema_editor):
    MedicalService = apps.get_model("parcours", "MedicalService")
    InsuranceCompany = apps.get_model("parcours", "InsuranceCompany")
    for name, price in SERVICES:
        MedicalService.objects.get_or_create(name=name, defaults={"price": price})
    for name, coverage in INSURANCES:
        InsuranceCompany.objects.get_or_create(name=name, defaults={"coverage": coverage})


class Migration(migrations.Migration):
    dependencies = [("parcours", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
