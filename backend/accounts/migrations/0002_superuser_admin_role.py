from django.db import migrations, models
from django.db.models import Q


def normalize_superuser_roles(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(is_superuser=True).exclude(role="ADMIN").update(
        role="ADMIN",
        is_staff=True,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(normalize_superuser_roles, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="user",
            constraint=models.CheckConstraint(
                condition=Q(is_superuser=False) | Q(role="ADMIN"),
                name="superuser_must_have_admin_role",
            ),
        ),
    ]
