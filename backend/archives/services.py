"""Archives : vue sur les documents réellement produits par les autres modules.

Rien n'est recopié : chaque source (patients, consultations, encaissements,
documents administratifs…) est lue telle qu'elle est enregistrée.
"""
from django.utils import timezone

from administration.models import AdminDocument
from consultations.models import Consultation
from laboratory.models import LabRequest
from parcours.models import Admission
from patients.models import Patient

LIMIT = 500

# Catégorie de la colonne de gauche -> type de document de la table.
CATEGORIES = [
    ("patient", "Dossiers patients", "Dossier patient", "FileArchive"),
    ("accounts", "Comptes rendus", "Compte rendu", "FileCheck2"),
    ("results", "Résultats d'analyses", "Résultat labo", "FileSpreadsheet"),
    ("invoices", "Factures", "Facture", "FileText"),
    ("mail", "Courriers", "Courrier", "File"),
    ("administrative", "Documents administratifs", "Document administratif", "FileText"),
]


def person(user):
    if user is None:
        return "—"
    return f"{user.last_name.upper()} {user.first_name}".strip() or user.username


def patient_name(patient):
    return f"{patient.last_name} {patient.first_names}"


def collect():
    """Tous les documents archivés, du plus récent au plus ancien."""
    rows = []
    for patient in Patient.objects.prefetch_related("admissions__created_by"):
        admission = next(iter(patient.admissions.all()), None)
        rows.append({
            "when": patient.created_at, "type": "Dossier patient", "patient": patient_name(patient),
            "reference": f"DOS-{patient.created_at:%Y}-{patient.pk:05d}",
            "author": person(admission.created_by) if admission else "Secrétariat",
        })
    for consultation in Consultation.objects.filter(completed_at__isnull=False).select_related("patient", "doctor"):
        rows.append({
            "when": consultation.completed_at, "type": "Compte rendu", "patient": patient_name(consultation.patient),
            "reference": f"CR-{consultation.completed_at:%Y}-{consultation.pk:05d}",
            "author": f"Dr. {person(consultation.doctor)}",
        })
    for admission in Admission.objects.select_related("patient", "created_by"):
        rows.append({
            "when": admission.created_at, "type": "Facture", "patient": patient_name(admission.patient),
            "reference": f"FAC-{admission.created_at:%Y}-{admission.pk:05d}",
            "author": person(admission.created_by),
        })
    for lab in LabRequest.objects.filter(status="Terminée").select_related("admission__patient", "completed_by"):
        rows.append({
            "when": lab.completed_at, "type": "Résultat labo", "patient": patient_name(lab.admission.patient),
            "reference": f"LAB-{lab.completed_at:%Y}-{lab.pk:05d}", "author": person(lab.completed_by),
        })
    for document in AdminDocument.objects.select_related("created_by"):
        rows.append({
            "when": document.created_at, "type": "Document administratif", "patient": "—",
            "reference": f"ADM-{document.created_at:%Y}-{document.pk:05d}", "author": person(document.created_by),
            "format": document.type,
        })
    rows.sort(key=lambda row: row["when"], reverse=True)
    return rows


def overview(year=None):
    rows = collect()
    this_year = timezone.localdate().year
    year = year or this_year
    type_to_category = {doc_type: name for _, name, doc_type, _ in CATEGORIES}
    counts = {}
    for row in rows:
        counts[row["type"]] = counts.get(row["type"], 0) + 1
    selected = [row for row in rows if timezone.localtime(row["when"]).year == year][:LIMIT]
    years = sorted({timezone.localtime(row["when"]).year for row in rows} | {this_year}, reverse=True)
    return {
        "stats": {
            "documents": len(rows),
            "patientFiles": counts.get("Dossier patient", 0),
            "thisYear": sum(1 for row in rows if timezone.localtime(row["when"]).year == this_year),
            "year": this_year,
        },
        "categories": [
            {"id": key, "name": name, "count": counts.get(doc_type, 0), "icon": icon}
            for key, name, doc_type, icon in CATEGORIES
        ],
        "years": [str(value) for value in years],
        "documents": [
            {
                "id": row["reference"],
                "date": timezone.localtime(row["when"]).strftime("%d/%m/%Y"),
                "type": row["type"],
                "patient": row["patient"],
                "reference": row["reference"],
                "author": row["author"],
                "format": row.get("format", "PDF"),
                "category": type_to_category.get(row["type"], "Autres"),
            }
            for row in selected
        ],
    }
