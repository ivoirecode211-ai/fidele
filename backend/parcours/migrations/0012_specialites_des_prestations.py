"""Chaque prestation de consultation reçoit sa spécialité ; les prestations des spécialités absentes du
catalogue sont créées DÉSACTIVÉES et à 0 FCFA : l'administrateur fixe le prix et les active."""
from django.db import migrations

PAR_PRESTATION = {
    "médecine générale": "medecine-generale", "consultation spécialisée": "medecine-generale", "urgences": "medecine-generale",
    "cardiologie": "cardiologie", "électrocardiogramme (ecg)": "cardiologie",
    "chirurgie": "chirurgie", "petite chirurgie": "chirurgie",
    "dermatologie": "dermatologie", "gynécologie": "gynecologie", "consultation prénatale": "cpn",
    "kinésithérapie": "kinesitherapie", "ophtalmologie": "ophtalmologie", "orl": "orl",
    "pédiatrie": "pediatrie", "vaccination": "vaccination",
}

# (prestation, spécialité, service de destination)
A_CREER = [
    ("Consultation dentaire", "dentaire", "Cabinet dentaire"),
    ("Consultation pré-anesthésie", "cpa", "Chirurgie"),
    ("Consultation diabétologie", "diabetologie", "Médecine générale"),
    ("Consultation neuro-psychiatrie", "neuro-psychiatrie", "Neuro-psychiatrie"),
    ("Consultation urologie", "urologie", "Urologie"),
    ("Consultation rhumatologie", "rhumatologie", "Médecine générale"),
    ("Consultation pneumologie", "pneumologie", "Médecine générale"),
    ("Séance d'hémodialyse", "hemodialyse", "Hémodialyse"),
    ("Accouchement", "accouchement", "Gynécologie-Obstétrique"),
    ("Consultation postnatale", "cpon", "Gynécologie-Obstétrique"),
    ("Planning familial", "planning-familial", "Gynécologie-Obstétrique"),
    ("Consultation VIH", "vih", "Médecine générale"),
]


def attribuer(apps, schema_editor):
    MedicalService = apps.get_model("parcours", "MedicalService")
    Department = apps.get_model("parcours", "Department")
    for service in MedicalService.objects.all():
        code = PAR_PRESTATION.get(service.name.strip().lower())
        if code:
            service.specialite = code
            service.save(update_fields=["specialite"])
    for nom, code, destination in A_CREER:
        if MedicalService.objects.filter(name=nom).exists():
            continue
        departement, _ = Department.objects.get_or_create(name=destination)
        MedicalService.objects.create(name=nom, price=0, category="CONSULTATION", department=departement,
                                      specialite=code, active=False)


class Migration(migrations.Migration):
    dependencies = [("parcours", "0011_specialites")]
    operations = [migrations.RunPython(attribuer, migrations.RunPython.noop)]
