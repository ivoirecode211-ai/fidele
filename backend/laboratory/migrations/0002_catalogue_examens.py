from django.db import migrations

# Catalogue repris de EXAMS (Laboratory.jsx) ; unités et valeurs de
# référence usuelles, modifiables dans l'admin Django.
EXAMS = [
    ("nfs", "NFS", "Hématologie", 5000, "", ""),
    ("glycemie", "Glycémie", "Biochimie", 2500, "g/L", "0,70 - 1,10"),
    ("groupe-sanguin", "Groupe sanguin", "Immuno-hématologie", 3000, "", ""),
    ("creatinine", "Créatinine", "Biochimie", 3000, "mg/L", "6 - 13"),
    ("uree", "Urée", "Biochimie", 3000, "g/L", "0,15 - 0,45"),
    ("crp", "CRP", "Immunologie", 5000, "mg/L", "< 6"),
    ("bilan-lipidique", "Bilan lipidique", "Biochimie", 10000, "", ""),
    ("cholesterol", "Cholestérol total", "Biochimie", 3000, "g/L", "< 2,00"),
    ("triglycerides", "Triglycérides", "Biochimie", 3000, "g/L", "< 1,50"),
    ("transaminases", "Transaminases", "Biochimie", 6000, "UI/L", "< 40"),
    ("vih", "Sérologie VIH", "Sérologie", 5000, "", "Négatif"),
    ("hepatite-b", "Ag HBs - Hépatite B", "Sérologie", 5000, "", "Négatif"),
    ("hepatite-c", "Sérologie Hépatite C", "Sérologie", 5000, "", "Négatif"),
    ("urines", "ECBU", "Bactériologie", 7000, "", ""),
    ("test-paludisme", "Test de diagnostic du paludisme", "Parasitologie", 3000, "", "Négatif"),
]


def seed(apps, schema_editor):
    LabExam = apps.get_model("laboratory", "LabExam")
    for code, name, category, price, unit, reference in EXAMS:
        LabExam.objects.get_or_create(code=code, defaults={
            "name": name, "category": category, "price": price, "unit": unit, "reference": reference,
        })


class Migration(migrations.Migration):
    dependencies = [("laboratory", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
