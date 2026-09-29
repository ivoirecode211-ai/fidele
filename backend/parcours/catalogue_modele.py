"""Le catalogue de prestations remis à chaque nouvel hôpital.

Chaque hôpital reçoit sa propre copie à sa création (signal dans parcours/apps.py) : son
administrateur change ensuite prix, noms et prestations selon ses réalités
(Administration › Prestations et tarifs), sans toucher aux autres hôpitaux.

(nom, prix en FCFA, catégorie, service de destination, spécialité, proposée à la caisse)
Les spécialités sans tarif connu arrivent à 0 FCFA et non proposées : à tarifer puis activer.
"""
from decimal import Decimal

CATALOGUE_MODELE = [
    ("Médecine générale", 10000, "CONSULTATION", "Médecine générale", "medecine-generale", True),
    ("Pédiatrie", 12000, "CONSULTATION", "Pédiatrie", "pediatrie", True),
    ("Chirurgie", 25000, "CONSULTATION", "Chirurgie", "chirurgie", True),
    ("Gynécologie", 15000, "CONSULTATION", "Gynécologie-Obstétrique", "gynecologie", True),
    ("Cardiologie", 20000, "CONSULTATION", "Cardiologie", "cardiologie", True),
    ("Dermatologie", 12000, "CONSULTATION", "Dermatologie", "dermatologie", True),
    ("Consultation spécialisée", 15000, "CONSULTATION", "Médecine générale", "medecine-generale", True),
    ("Urgences", 15000, "CONSULTATION", "Urgences", "medecine-generale", True),
    ("ORL", 15000, "CONSULTATION", "ORL", "orl", True),
    ("Ophtalmologie", 15000, "CONSULTATION", "Ophtalmologie", "ophtalmologie", True),
    ("Consultation prénatale", 8000, "CONSULTATION", "Gynécologie-Obstétrique", "cpn", True),
    ("Soins infirmiers", 5000, "SOIN", "Soins infirmiers", "", True),
    ("Pansement", 3000, "SOIN", "Soins infirmiers", "", True),
    ("Injection", 2000, "SOIN", "Soins infirmiers", "", True),
    ("Vaccination", 5000, "SOIN", "Soins infirmiers", "vaccination", True),
    ("Échographie", 20000, "EXAMEN", "Imagerie médicale", "", True),
    ("Radiographie", 15000, "EXAMEN", "Imagerie médicale", "", True),
    ("Électrocardiogramme (ECG)", 12000, "EXAMEN", "Cardiologie", "cardiologie", True),
    ("Kinésithérapie", 10000, "SOIN", "Kinésithérapie", "kinesitherapie", True),
    ("Petite chirurgie", 20000, "SOIN", "Chirurgie", "chirurgie", True),
    ("Consultation dentaire", 0, "CONSULTATION", "Cabinet dentaire", "dentaire", False),
    ("Consultation pré-anesthésie", 0, "CONSULTATION", "Chirurgie", "cpa", False),
    ("Consultation diabétologie", 0, "CONSULTATION", "Médecine générale", "diabetologie", False),
    ("Consultation neuro-psychiatrie", 0, "CONSULTATION", "Neuro-psychiatrie", "neuro-psychiatrie", False),
    ("Consultation urologie", 0, "CONSULTATION", "Urologie", "urologie", False),
    ("Consultation rhumatologie", 0, "CONSULTATION", "Médecine générale", "rhumatologie", False),
    ("Consultation pneumologie", 0, "CONSULTATION", "Médecine générale", "pneumologie", False),
    ("Séance d'hémodialyse", 0, "CONSULTATION", "Hémodialyse", "hemodialyse", False),
    ("Accouchement", 0, "CONSULTATION", "Gynécologie-Obstétrique", "accouchement", False),
    ("Consultation postnatale", 0, "CONSULTATION", "Gynécologie-Obstétrique", "cpon", False),
    ("Planning familial", 0, "CONSULTATION", "Gynécologie-Obstétrique", "planning-familial", False),
    ("Consultation VIH", 0, "CONSULTATION", "Médecine générale", "vih", False),
]


def copier_catalogue(hospital, MedicalService=None, Department=None):
    """Donne à l'hôpital sa copie du catalogue modèle ; ce qu'il a déjà n'est pas touché.

    Les classes de modèle sont passables pour servir aussi depuis une migration.
    """
    if MedicalService is None:
        from .models import Department, MedicalService
    existantes = set(MedicalService.objects.filter(hospital=hospital).values_list("name", flat=True))
    for nom, prix, categorie, destination, specialite, active in CATALOGUE_MODELE:
        if nom in existantes:
            continue
        MedicalService.objects.create(
            hospital=hospital, name=nom, price=Decimal(prix), category=categorie, specialite=specialite, active=active,
            department=Department.objects.get_or_create(name=destination)[0] if destination else None,
        )
