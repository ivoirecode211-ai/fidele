import re
import secrets

from django.db import migrations

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
NOMENCLATURE = re.compile(r"^P\d{2}[A-Z2-9]{3}[A-Z]{3}$")


def renumeroter(apps, schema_editor):
    """Ancien format (PAT-001…) -> P + année d'enregistrement + 3 caractères + code de l'hôpital."""
    Patient = apps.get_model("patients", "Patient")
    Hospital = apps.get_model("accounts", "Hospital")
    default = Hospital.objects.order_by("pk").first()
    taken = set(Patient.objects.values_list("patient_number", flat=True))
    for patient in Patient.objects.all():
        if NOMENCLATURE.match(patient.patient_number):
            continue
        hospital = patient.hospital or default
        if hospital is None:
            continue
        while True:
            middle = [secrets.choice(ALPHABET) for _ in range(3)]
            if not any(c.isdigit() for c in middle) or not any(c.isalpha() for c in middle):
                continue
            number = f"P{patient.created_at:%y}{''.join(middle)}{hospital.code}"
            if number not in taken:
                break
        taken.add(number)
        patient.patient_number = number
        patient.hospital = hospital
        patient.save(update_fields=["patient_number", "hospital"])


class Migration(migrations.Migration):
    dependencies = [("patients", "0005_hopital"), ("accounts", "0006_hopital_par_defaut")]
    operations = [migrations.RunPython(renumeroter, migrations.RunPython.noop)]
