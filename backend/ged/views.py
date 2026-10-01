"""API de la GED (/api/ged/), aux noms de champs de l'écran."""
import re

from django.db import transaction
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from administration.audit import client_ip
from administration.models import AuditLog
from parcours.permissions import RoleAccess
from patients.models import Patient

from . import services
from .connecteurs import ConnecteurIndisponible, connecteur
from .models import Document, IdentiteArchive


class GedAccess(RoleAccess):
    """Données médicales : médecins, direction, laboratoire. Seuls eux déposent et suppriment."""
    roles = {"ADMIN", "DIRECTOR", "DOCTOR", "LAB"}


def refus(erreur):
    return Response(erreur.erreurs, status=status.HTTP_400_BAD_REQUEST)


def tracer(request, action, document):
    """Qui a ouvert quel document, et quand : une donnée médicale ne se consulte pas sans trace."""
    AuditLog.objects.create(
        user=request.user, username=request.user.get_username(), action=action, module="GED",
        description=f"{document.titre} (document n° {document.pk})"[:255], method=request.method,
        path=request.path[:255], status_code=200, ip_address=client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
        details={"document": document.pk, "patient": document.patient_id, "identite": document.identite_id},
    )


class ReferencesView(APIView):
    permission_classes = [GedAccess]

    def get(self, request):
        return Response({
            "types": [{"code": c, "libelle": l} for c, l in Document.TYPES],
            "connecteur": {"nom": connecteur().nom, "actif": connecteur().actif},
            "tailleMax": services.TAILLE_MAX,
            "extensions": sorted(services.EXTENSIONS),
        })


class DocumentsView(APIView):
    """GET : les documents (q, type, patient, identite, corbeille). POST (multipart) : déposer un ou plusieurs fichiers."""
    permission_classes = [GedAccess]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        hopital = hospital_of(request.user)
        docs = services.filtrer(services.documents(hopital), request.query_params)[:500]
        return Response([services.fiche_document(d) for d in docs])

    def post(self, request):
        hopital = hospital_of(request.user)
        fichiers = request.FILES.getlist("fichiers") or request.FILES.getlist("fichier")
        if not fichiers:
            return Response({"fichier": "Choisissez au moins un fichier."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                crees = [services.deposer(hospital=hopital, user=request.user, fichier=f, donnees=request.data)
                         for f in fichiers]
        except services.RefusGed as erreur:
            return refus(erreur)
        return Response([services.fiche_document(d) for d in crees], status=status.HTTP_201_CREATED)


class DocumentView(APIView):
    """GET : la fiche. PATCH : l'indexation. DELETE : à la corbeille (jamais effacé d'emblée)."""
    permission_classes = [GedAccess]

    def document(self, request, pk):
        return get_object_or_404(services.documents(hospital_of(request.user)), pk=pk)

    def get(self, request, pk):
        return Response(services.fiche_document(self.document(request, pk)))

    def patch(self, request, pk):
        d = self.document(request, pk)
        donnees = request.data
        try:
            if "patient" in donnees or "identite" in donnees:
                d.patient, d.identite = services.rattacher(d.hospital, donnees)
        except services.RefusGed as erreur:
            return refus(erreur)
        if str(donnees.get("titre") or "").strip():
            d.titre = str(donnees["titre"]).strip()[:200]
        if donnees.get("type") in services.TYPES:
            d.type = donnees["type"]
        if "date" in donnees:
            d.date_document = donnees["date"] or None
        for champ, cle, limite in (("service", "service", 120), ("mots_cles", "motsCles", 255), ("description", "description", None)):
            if cle in donnees:
                valeur = str(donnees[cle] or "")
                setattr(d, champ, valeur[:limite] if limite else valeur)
        d.save()
        return Response(services.fiche_document(d))

    def delete(self, request, pk):
        d = self.document(request, pk)
        if d.supprime_le is None:
            d.supprime_le, d.supprime_par = timezone.now(), request.user
            d.save(update_fields=["supprime_le", "supprime_par"])
        return Response(services.fiche_document(d))


class RestaurerView(APIView):
    permission_classes = [GedAccess]

    def post(self, request, pk):
        d = get_object_or_404(services.documents(hospital_of(request.user)), pk=pk)
        d.supprime_le = d.supprime_par = None
        d.save(update_fields=["supprime_le", "supprime_par"])
        return Response(services.fiche_document(d))


class FichierView(APIView):
    """Le fichier lui-même, jamais par une URL publique : ouvert ici, et tracé."""
    permission_classes = [GedAccess]

    def get(self, request, pk):
        d = get_object_or_404(services.documents(hospital_of(request.user)), pk=pk)
        tracer(request, "Consultation d'un document", d)
        telecharger = request.query_params.get("telecharger") == "1"
        if d.stockage == "distant":
            try:
                contenu, mime, nom = connecteur().telecharger(d.reference_distante)
            except ConnecteurIndisponible as erreur:
                return Response({"detail": str(erreur)}, status=status.HTTP_502_BAD_GATEWAY)
            reponse = HttpResponse(contenu, content_type=mime or "application/octet-stream")
            reponse["Content-Disposition"] = f'{"attachment" if telecharger else "inline"}; filename="{nom}"'
            return reponse
        if not d.fichier:
            return Response({"detail": "Ce document n'a pas de fichier."}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(d.fichier.open("rb"), as_attachment=telecharger, filename=d.nom_fichier,
                            content_type=d.type_mime or None)


class RechercheView(APIView):
    """Patients et identités d'archive, par nom (tolérant aux fautes) ou par numéro."""
    permission_classes = [GedAccess]

    def get(self, request):
        return Response(services.rechercher(hospital_of(request.user), request.query_params.get("q")))


def lire_naissance(valeur):
    """« 1962 », « 1962-04-18 » ou « 18/04/1962 » -> (date, année). Vide -> (None, None).

    Une naissance illisible ou impossible est refusée avec un message clair,
    plutôt que d'échouer à l'enregistrement.
    """
    from datetime import date, datetime

    texte = str(valeur or "").strip()
    if not texte:
        return None, None
    if re.fullmatch(r"\d{4}", texte):
        annee = int(texte)
        if not 1880 <= annee <= date.today().year:
            raise ValueError(f"Année de naissance impossible : {texte}.")
        return None, annee
    for format_ in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            jour = datetime.strptime(texte, format_).date()
        except ValueError:
            continue
        if not date(1880, 1, 1) <= jour <= date.today():
            raise ValueError("La date de naissance ne peut pas être dans le futur ni avant 1880.")
        return jour, None
    raise ValueError("Naissance : indiquez une année (1962) ou une date (18/04/1962).")


def lire_annee(valeur):
    """Année du registre : entre 1900 et l'année en cours, ou vide."""
    from datetime import date

    texte = str(valeur or "").strip()
    if not texte:
        return None
    if not texte.isdigit() or not 1900 <= int(texte) <= date.today().year:
        raise ValueError(f"Année du registre impossible : {texte}.")
    return int(texte)


class IdentitesView(APIView):
    """GET : les identités d'archive. POST : en créer une (un patient des registres papier)."""
    permission_classes = [GedAccess]

    def get(self, request):
        identites = IdentiteArchive.objects.filter(hospital=hospital_of(request.user)).select_related("patient")
        terme = request.query_params.get("q")
        if terme:
            identites = [i for i in identites if services.score(terme, i.nom, i.prenoms)
                         or (i.numero_registre and terme.lower() in i.numero_registre.lower())]
        return Response([services.fiche_identite(i) for i in list(identites)[:200]])

    def post(self, request):
        donnees = request.data
        nom = str(donnees.get("nom") or "").strip().upper()
        if not nom:
            return Response({"nom": "Le nom est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            date_naissance, annee_naissance = lire_naissance(donnees.get("naissance"))
            annee_registre = lire_annee(donnees.get("anneeRegistre"))
        except ValueError as erreur:
            return Response({"detail": str(erreur)}, status=status.HTTP_400_BAD_REQUEST)
        # Un même n° de registre, c'est la même personne : on renvoie la fiche existante (409), jamais un doublon.
        numero = str(donnees.get("numeroRegistre") or "").strip()
        existante = numero and IdentiteArchive.objects.filter(
            hospital=hospital_of(request.user), numero_registre__iexact=numero,
        ).select_related("patient").first()
        if existante:
            return Response({"detail": "Cette personne du registre existe déjà.", "identite": services.fiche_identite(existante)},
                            status=status.HTTP_409_CONFLICT)
        identite = IdentiteArchive.objects.create(
            hospital=hospital_of(request.user), nom=nom[:120],
            prenoms=str(donnees.get("prenoms") or "").strip()[:180],
            sexe=donnees.get("sexe") if donnees.get("sexe") in ("M", "F") else "",
            date_naissance=date_naissance,
            annee_naissance=annee_naissance,
            numero_registre=numero[:60],
            annee_registre=annee_registre,
            service=str(donnees.get("service") or "")[:120], notes=str(donnees.get("notes") or ""),
            created_by=request.user,
        )
        return Response(services.fiche_identite(identite), status=status.HTTP_201_CREATED)


class LierView(APIView):
    """Relie une identité d'archive au dossier actuel du patient (ou l'en détache)."""
    permission_classes = [GedAccess]

    def post(self, request, pk):
        hopital = hospital_of(request.user)
        identite = get_object_or_404(IdentiteArchive, hospital=hopital, pk=pk)
        patient = None
        if request.data.get("patient"):
            patient = Patient.objects.filter(hospital=hopital, pk=request.data["patient"]).first()
            if patient is None:
                return Response({"patient": "Patient inconnu dans cet hôpital."}, status=status.HTTP_400_BAD_REQUEST)
        identite.patient = patient
        identite.save(update_fields=["patient"])
        return Response(services.fiche_identite(identite))


class DossierView(APIView):
    """?patient=<id> ou ?identite=<id> : tout ce que l'hôpital sait de cette personne."""
    permission_classes = [GedAccess]

    def get(self, request):
        try:
            return Response(services.dossier(
                hospital=hospital_of(request.user),
                patient_id=request.query_params.get("patient"),
                identite_id=request.query_params.get("identite"),
            ))
        except services.RefusGed as erreur:
            return Response(erreur.erreurs, status=status.HTTP_404_NOT_FOUND)
