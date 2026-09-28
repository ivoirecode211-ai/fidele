from django.db import migrations


def creer_hopital(apps, schema_editor):
    """L'établissement existant devient le premier hôpital ; ses données lui sont rattachées."""
    from accounts.tenancy import code_candidates

    Hospital = apps.get_model("accounts", "Hospital")
    User = apps.get_model("accounts", "User")
    Patient = apps.get_model("patients", "Patient")
    CashSession = apps.get_model("parcours", "CashSession")
    GeneralSettings = apps.get_model("administration", "GeneralSettings")

    if Hospital.objects.exists():
        return
    old = GeneralSettings.objects.first()
    fields = {}
    if old:
        fields = {name: getattr(old, name) for name in
                  ("name", "slogan", "address", "phone", "email", "currency", "license_number", "opening_hours")}
    name = fields.pop("name", "") or "MA SANTÉ"
    hospital = Hospital.objects.create(name=name, code=code_candidates(name)[0], **fields)

    User.objects.filter(hospital__isnull=True, is_superuser=False).update(hospital=hospital)
    Patient.objects.filter(hospital__isnull=True).update(hospital=hospital)
    for session in CashSession.objects.filter(hospital__isnull=True).select_related("cashier"):
        session.hospital_id = session.cashier.hospital_id or hospital.pk
        session.save(update_fields=["hospital"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_hopitaux"),
        ("patients", "0005_hopital"),
        ("parcours", "0010_hopital"),
        ("administration", "0003_alter_admindocument_options"),
    ]
    operations = [migrations.RunPython(creer_hopital, migrations.RunPython.noop)]
