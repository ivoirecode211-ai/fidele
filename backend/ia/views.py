from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from parcours.permissions import RoleAccess
from patients.models import Patient

from .groq import IaIndisponible
from .models import Intervention
from .services import overview


class IaAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "DOCTOR"}


class OverviewView(APIView):
    permission_classes = [IaAccess]

    def get(self, request):
        return Response(overview(hospital_of(request.user)))


def personne(user):
    if user is None:
        return "—"
    return user.get_full_name() or user.username


class InterventionsView(APIView):
    """Patients sur qui l'IA est intervenue, du plus récent au plus ancien. ?q= nom ou n° de dossier."""
    permission_classes = [IaAccess]

    def get(self, request):
        lignes = Intervention.objects.filter(hospital=hospital_of(request.user))
        q = request.query_params.get("q", "").strip()
        if q:
            lignes = lignes.filter(Q(patient__last_name__icontains=q) | Q(patient__first_names__icontains=q)
                                   | Q(patient__patient_number__icontains=q))
        patients = (lignes.values("patient", "patient__last_name", "patient__first_names", "patient__patient_number")
                    .annotate(nombre=Count("id"), derniere=Max("created_at")).order_by("-derniere")[:100])
        return Response([{
            "id": p["patient"],
            "nom": f"{p['patient__last_name']} {p['patient__first_names']}".strip(),
            "numero": p["patient__patient_number"],
            "interventions": p["nombre"],
            "derniere": timezone.localtime(p["derniere"]).strftime("%d/%m/%Y %H:%M"),
        } for p in patients])


class InterventionsPatientView(APIView):
    """Toutes les interventions de l'IA sur un patient de l'hôpital, la plus récente en premier."""
    permission_classes = [IaAccess]

    def get(self, request, pk):
        patient = get_object_or_404(Patient, pk=pk, hospital=hospital_of(request.user))
        lignes = (Intervention.objects.filter(patient=patient, hospital=patient.hospital)
                  .select_related("user", "consultation"))
        from laboratory.models import LabExam

        noms_examens = dict(LabExam.objects.values_list("code", "name"))

        def lisible(intervention):
            reponse = dict(intervention.reponse or {})
            if intervention.nature == "examens":
                reponse["examensNoms"] = [noms_examens.get(code, code) for code in reponse.get("examens") or []]
            return reponse

        return Response({
            "patient": {"id": patient.pk, "nom": f"{patient.last_name} {patient.first_names}".strip(),
                        "numero": patient.patient_number, "dossier": f"/dossiers/{patient.pk}"},
            "interventions": [{
                "id": i.pk,
                "nature": i.nature,
                "libelle": i.get_nature_display(),
                "le": timezone.localtime(i.created_at).strftime("%d/%m/%Y à %H:%M"),
                "par": personne(i.user),
                "demande": i.demande,
                "reponse": lisible(i),
                "consultation": i.consultation_id,
            } for i in lignes],
        })


class AssistantView(APIView):
    """Le chat du module IA : questions sur le logiciel et localisation d'un patient."""
    permission_classes = [IaAccess]

    def post(self, request):
        from .assistant import repondre

        historique = request.data.get("historique")
        try:
            return Response(repondre(user=request.user, question=request.data.get("question"),
                                     historique=historique if isinstance(historique, list) else []))
        except IaIndisponible as erreur:
            return Response({"detail": str(erreur)}, status=status.HTTP_400_BAD_REQUEST)
