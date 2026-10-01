"""Reprend dans le journal les interventions de l'IA gardées jusqu'ici sur chaque consultation.

La consultation ne gardait que la dernière proposition par rubrique (ai_trace)
et la conversation (ia_messages) : elles deviennent des lignes du journal,
à leur date d'origine.
"""
from django.db import migrations
from django.utils.dateparse import parse_datetime

NATURES = {"diagnostic", "examens", "ordonnance", "conseils"}


def reprendre(apps, schema_editor):
    Consultation = apps.get_model("consultations", "Consultation")
    Intervention = apps.get_model("ia", "Intervention")
    for c in Consultation.objects.select_related("admission__patient").exclude(ai_trace={}, ia_messages=[]):
        patient = c.admission.patient if c.admission_id else c.patient
        lignes = []
        for nature, trace in (c.ai_trace or {}).items():
            if nature in NATURES and isinstance(trace, dict):
                reponse = {k: v for k, v in trace.items() if k != "le"}
                lignes.append((parse_datetime(trace.get("le") or "") or c.date_time, nature, "", reponse))
        messages = c.ia_messages or []
        for question, reponse in zip(messages, messages[1:]):
            if question.get("role") == "user" and reponse.get("role") == "assistant":
                lignes.append((parse_datetime(reponse.get("le") or "") or c.date_time, "conversation",
                               question.get("content", ""), {"texte": reponse.get("content", "")}))
        for le, nature, demande, reponse in lignes:
            ligne = Intervention.objects.create(hospital_id=patient.hospital_id, patient=patient, consultation=c,
                                                user_id=c.doctor_id, nature=nature, demande=demande, reponse=reponse)
            Intervention.objects.filter(pk=ligne.pk).update(created_at=le)


class Migration(migrations.Migration):
    dependencies = [
        ("ia", "0001_journal_interventions"),
        ("consultations", "0006_specialites"),
    ]

    operations = [migrations.RunPython(reprendre, migrations.RunPython.noop)]
