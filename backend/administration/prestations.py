"""Prestations et tarifs : le catalogue de la caisse de CET hôpital (/api/administration/prestations/).

Chaque hôpital a son catalogue, copié du modèle à sa création (parcours/catalogue_modele.py) ;
son administrateur y change prix et prestations sans toucher aux autres hôpitaux.

Une prestation = ce que la caisse encaisse (nom, prix, catégorie), le service où le patient
est envoyé, et pour une consultation la spécialité dont le formulaire s'ouvrira.
Un prix modifié ne change rien aux passages déjà encaissés : ils ont figé le leur.
"""
from decimal import Decimal, InvalidOperation

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from consultations.specialites import SPECIALITES, liste
from parcours.models import Department, MedicalService
from parcours.permissions import RoleAccess


class PrestationsAccess(RoleAccess):
    """Les tarifs relèvent de l'administrateur de l'hôpital."""
    roles = {"ADMIN"}

CATEGORIES = dict(MedicalService.CATEGORIES)


def fiche(s):
    return {
        "id": s.pk, "nom": s.name, "prix": float(s.price), "categorie": s.category,
        "categorieLibelle": CATEGORIES.get(s.category, s.category),
        "service": s.department.name if s.department_id else "", "specialite": s.specialite,
        "specialiteNom": SPECIALITES[s.specialite]["nom"] if s.specialite in SPECIALITES else "",
        "active": s.active,
    }


def lire(donnees, hopital, service=None):
    """Valide le formulaire ; renvoie (champs, erreurs)."""
    erreurs, champs = {}, {}
    nom = str(donnees.get("nom") or "").strip()
    if not nom:
        erreurs["nom"] = "Le nom de la prestation est obligatoire."
    elif MedicalService.objects.filter(hospital=hopital, name__iexact=nom).exclude(pk=getattr(service, "pk", None)).exists():
        erreurs["nom"] = "Une prestation porte déjà ce nom."
    try:
        prix = Decimal(str(donnees.get("prix", "")).replace(" ", "").replace(",", "."))
        if prix < 0:
            raise InvalidOperation
    except (InvalidOperation, ValueError):
        erreurs["prix"] = "Indiquez un prix en FCFA (0 ou plus)."
        prix = None
    categorie = donnees.get("categorie") or "CONSULTATION"
    if categorie not in CATEGORIES:
        erreurs["categorie"] = "Catégorie inconnue."
    specialite = donnees.get("specialite") or ""
    if specialite and specialite not in SPECIALITES:
        erreurs["specialite"] = "Spécialité inconnue."
    nom_service = str(donnees.get("service") or "").strip()
    if erreurs:
        return None, erreurs
    champs.update(
        hospital=hopital, name=nom[:120], price=prix, category=categorie,
        specialite=specialite if categorie == "CONSULTATION" else "",
        department=Department.objects.get_or_create(name=nom_service[:120])[0] if nom_service else None,
        active=bool(donnees.get("active", True)),
    )
    return champs, None


class PrestationsView(APIView):
    """GET : le catalogue et ses listes. POST : une nouvelle prestation."""
    permission_classes = [PrestationsAccess]

    def get(self, request):
        return Response({
            "prestations": [fiche(s) for s in MedicalService.objects.filter(hospital=hospital_of(request.user))
                            .select_related("department").order_by("category", "name")],
            "services": list(Department.objects.filter(active=True).order_by("name").values_list("name", flat=True)),
            "specialites": liste(),
            "categories": [{"code": c, "libelle": l} for c, l in MedicalService.CATEGORIES],
        })

    def post(self, request):
        champs, erreurs = lire(request.data, hospital_of(request.user))
        if erreurs:
            return Response(erreurs, status=status.HTTP_400_BAD_REQUEST)
        return Response(fiche(MedicalService.objects.create(**champs)), status=status.HTTP_201_CREATED)


class PrestationView(APIView):
    """PUT : modifier (nom, prix, service, spécialité, activation). Jamais supprimée : on la désactive."""
    permission_classes = [PrestationsAccess]

    def put(self, request, pk):
        hopital = hospital_of(request.user)
        service = get_object_or_404(MedicalService, pk=pk, hospital=hopital)
        champs, erreurs = lire(request.data, hopital, service)
        if erreurs:
            return Response(erreurs, status=status.HTTP_400_BAD_REQUEST)
        for champ, valeur in champs.items():
            setattr(service, champ, valeur)
        service.save()
        return Response(fiche(service))
