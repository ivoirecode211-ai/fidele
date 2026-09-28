from django.db import migrations


class Migration(migrations.Migration):
    """Les paramètres généraux vivent désormais sur chaque hôpital (accounts.Hospital)."""

    dependencies = [
        ("administration", "0003_alter_admindocument_options"),
        ("accounts", "0006_hopital_par_defaut"),
    ]
    operations = [migrations.DeleteModel(name="GeneralSettings")]
