from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from parcours.permissions import RoleAccess

from . import praticien
from .detail import report_detail
from .services import overview

User = get_user_model()


class ReportsAccess(RoleAccess):
    # Rapports de l'établissement : la direction et la gestion.
    roles = {"ADMIN", "DIRECTOR", "ACCOUNTING", "HR", "REGISSEUR"}


class PraticienAccess(RoleAccess):
    # Rapport d'activité : chaque soignant le sien (depuis son module), la direction celui de tous.
    roles = {"ADMIN", "DIRECTOR", "DOCTOR", "NURSE", "AIDE_SOIGNANT", "LAB", "PHARMACY"}


class OverviewView(APIView):
    permission_classes = [ReportsAccess]

    def get(self, request):
        return Response(overview(hospital_of(request.user), request.query_params.get("period")))


class DetailView(APIView):
    """Rapport complet : chiffres clés et détail de chaque événement de la période."""
    permission_classes = [ReportsAccess]

    def get(self, request, report_id):
        try:
            return Response(report_detail(report_id, hospital_of(request.user)))
        except (ValueError, KeyError):
            return Response({"detail": "Rapport inconnu."}, status=404)


def voit_tous(user):
    return user.is_superuser or user.has_role(*praticien.DIRECTION)


class PraticiensView(APIView):
    """Les praticiens dont on peut ouvrir le rapport : tous pour la direction, soi-même sinon."""
    permission_classes = [PraticienAccess]

    def get(self, request):
        if voit_tous(request.user):
            return Response(praticien.praticiens(hospital_of(request.user)))
        return Response([praticien.fiche(request.user)])


class PraticienView(APIView):
    permission_classes = [PraticienAccess]

    def get(self, request):
        cible = request.user
        demande = request.query_params.get("praticien")
        if demande and str(demande) != str(request.user.pk):
            if not voit_tous(request.user):
                return Response({"detail": "Vous ne pouvez consulter que votre propre rapport."}, status=403)
            cible = get_object_or_404(User, pk=demande, hospital=hospital_of(request.user))
        return Response(praticien.rapport(cible, request.query_params.get("du"), request.query_params.get("au"),
                                          lecteur=request.user))


# ------------------------------------------------------------------ états officiels

from . import etats  # noqa: E402

FINANCES = ("ADMIN", "DIRECTOR", "ACCOUNTING", "REGISSEUR")


def groupes_de(user):
    """Activités : la direction ; finances : la direction et la comptabilité ; le médecin : les siennes."""
    groupes = set()
    if voit_tous(user):
        groupes |= {"activites", "maternite", "finances"}
    if user.has_role(*FINANCES):
        groupes.add("finances")
    return groupes


class EtatsAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "ACCOUNTING", "REGISSEUR", "DOCTOR"}


class EtatsView(APIView):
    """Le catalogue des états ouverts à la personne, avec les listes de filtres et l'en-tête officiel."""
    permission_classes = [EtatsAccess]

    def get(self, request):
        groupes = groupes_de(request.user)
        data = etats.catalogue(hospital_of(request.user), groupes=groupes)
        if not voit_tous(request.user):
            # Le médecin sort les états de sa propre activité, et seulement ceux-là.
            data["etats"] = [{"id": k, "groupe": "praticien", "label": v[1], "organiser": etats.organisation(k)}
                             for k, v in etats.ETATS.items()
                             if k in etats.POUR_PRATICIEN and request.user.has_role("DOCTOR")] + data["etats"]
            data["medecins"] = []
        return Response(data)


class FiltresPraticienView(APIView):
    """Les listes du filtre du rapport, vu depuis le module du praticien : ses services, ses confrères."""
    permission_classes = [PraticienAccess]

    def get(self, request):
        from consultations import specialites

        return Response({
            "services": [{"code": c, "nom": specialites.nom(c)} for c in etats.services_du(request.user)],
            "professionnels": etats.confreres(request.user),
            "moi": request.user.pk,
            # Le médecin, et la direction quand elle ouvre les rapports du module Consultation.
            "types": etats.types_du_praticien(request.user) if request.user.has_role("DOCTOR") or voit_tous(request.user) else [],
            "entete": etats.entete_officiel(hospital_of(request.user)),
        })


class EtatView(APIView):
    permission_classes = [EtatsAccess]

    def get(self, request, etat):
        if etat not in etats.ETATS:
            return Response({"detail": "État inconnu."}, status=404)
        groupe = etats.ETATS[etat][0]
        q = request.query_params
        medecins = [m for m in q.get("medecins", "").split(",") if m]
        service, permis = q.get("service", ""), None
        if groupe not in groupes_de(request.user):
            if not (request.user.has_role("DOCTOR") and etat in etats.POUR_PRATICIEN):
                return Response({"detail": "Cet état n'est pas ouvert à votre rôle."}, status=403)
            # Depuis son module : ses services seulement, et les professionnels qui les partagent.
            permis = etats.services_du(request.user)
            if service not in permis:
                service = ""
            autorises = {str(p["id"]) for p in etats.confreres(request.user)}
            medecins = [m for m in medecins if m in autorises]
        data = etats.calculer(etat, hospital_of(request.user), du=q.get("du"), au=q.get("au"), service=service,
                              medecins=medecins, genre=q.get("genre") in ("1", "true"), permis=permis,
                              organiser=q.get("organiser", ""))
        data["entete"] = etats.entete_officiel(hospital_of(request.user))
        data["medecins"] = [etats.praticien.fiche(u)["nom"] for u in User.objects.filter(pk__in=medecins)] if medecins else []
        return Response(data)
