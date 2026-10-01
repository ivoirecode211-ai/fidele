from django.shortcuts import get_object_or_404

from accounts.tenancy import hospital_of
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from parcours.models import Admission
from parcours.permissions import RoleAccess

from .models import LabExam
from .services import save_request, save_results, serialize_analysis, serialize_exam, worklist


class LaboratoryAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "DOCTOR", "NURSE", "LAB"}
    write_roles = {"ADMIN", "DOCTOR", "LAB"}


def admission_for(pk, user):
    """Un passage de l'hôpital de l'utilisateur ; celui d'un autre hôpital est introuvable."""
    return get_object_or_404(Admission.objects.select_related("patient", "consultation__doctor"),
                             pk=pk, patient__hospital=hospital_of(user))


class OverviewView(APIView):
    permission_classes = [LaboratoryAccess]

    def get(self, request):
        return Response({
            "exams": [serialize_exam(exam) for exam in LabExam.objects.filter(active=True)],
            "analyses": worklist(hospital_of(request.user)),
        })


class RequestView(APIView):
    """« Demande d'analyse » : examens choisis pour un patient."""
    permission_classes = [LaboratoryAccess]

    def post(self, request, pk):
        admission = admission_for(pk, request.user)
        codes = request.data.get("examIds") or []
        if not isinstance(codes, list) or not LabExam.objects.filter(code__in=codes, active=True).exists():
            return Response({"examIds": "Veuillez sélectionner au moins un examen."}, status=status.HTTP_400_BAD_REQUEST)
        save_request(admission=admission, exam_codes=codes, user=request.user)
        return Response(serialize_analysis(admission_for(pk, request.user)))


class ResultView(APIView):
    """Saisie des résultats : la demande passe « Terminée »."""
    permission_classes = [LaboratoryAccess]

    def post(self, request, pk):
        admission = admission_for(pk, request.user)
        lab_request = getattr(admission, "lab_request", None)
        if lab_request is None or not lab_request.results.exists():
            return Response({"detail": "Aucun examen demandé pour ce patient."}, status=status.HTTP_400_BAD_REQUEST)
        values = request.data.get("results") or {}
        save_results(request=lab_request, values=values if isinstance(values, dict) else {},
                     observation=str(request.data.get("observation", "")), user=request.user)
        return Response(serialize_analysis(admission_for(pk, request.user)))
