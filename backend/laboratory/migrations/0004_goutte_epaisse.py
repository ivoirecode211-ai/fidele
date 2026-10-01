from django.db import migrations


def ajouter(apps, schema_editor):
    """Goutte épaisse : examen de référence du paludisme, compté dans les rapports (« Examens goutte épaisse »)."""
    LabExam = apps.get_model("laboratory", "LabExam")
    LabExam.objects.get_or_create(code="goutte-epaisse", defaults={
        "name": "Goutte épaisse", "category": "Parasitologie", "price": 2000, "unit": "", "reference": "Négatif",
    })


class Migration(migrations.Migration):
    dependencies = [("laboratory", "0003_alter_labexam_options_alter_labrequest_options_and_more")]
    operations = [migrations.RunPython(ajouter, migrations.RunPython.noop)]
