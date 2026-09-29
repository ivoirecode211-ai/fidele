from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from administration.audit import client_ip
from administration.models import AuditLog
from parcours.permissions import RoleAccess
from patients.models import Patient

from . import services


class DossierAccess(RoleAccess):
    """Tout le personnel qui soigne ou accueille ; chacun ne voit que ses sections."""
    roles = {"ADMIN", "DIRECTOR", "DOCTOR", "NURSE", "RECEPTION", "LAB", "PHARMACY", "ACCOUNTING", "REGISSEUR"}


def own_patients(user):
    return Patient.objects.filter(hospital=hospital_of(user))


class SearchView(APIView):
    permission_classes = [DossierAccess]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        qs = own_patients(request.user)
        if q:
            qs = qs.filter(Q(last_name__icontains=q) | Q(first_names__icontains=q) | Q(patient_number__icontains=q)
                           | Q(phone__icontains=q) | Q(insurance_number__icontains=q))
        total = qs.count()
        rows = list(qs.order_by("-created_at")[:30])
        return Response({"total": total, "patients": [services.ligne(p) for p in rows]})


class IdentityInput(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = services.CHAMPS_IDENTITE + services.CHAMPS_MEDICAUX
        extra_kwargs = {name: {"required": False} for name in services.CHAMPS_IDENTITE + services.CHAMPS_MEDICAUX}

    def validate_last_name(self, value):
        return value.strip().upper()


class RecordView(APIView):
    permission_classes = [DossierAccess]

    def get(self, request, pk):
        patient = get_object_or_404(own_patients(request.user).select_related("hospital"), pk=pk)
        # Qui a ouvert quel dossier, et quand : la traçabilité exigée pour des données de santé.
        AuditLog.objects.create(
            user=request.user, username=request.user.username, action="Consultation", module="Dossier patient",
            description=f"{patient.patient_number} — {patient.last_name} {patient.first_names}"[:255],
            method="GET", path=request.path[:255], status_code=200, ip_address=client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
        )
        return Response(services.dossier(patient, request.user))

    def patch(self, request, pk):
        patient = get_object_or_404(own_patients(request.user), pk=pk)
        user = request.user
        allowed = set()
        if user.is_superuser or user.role_codes & services.MODIFIER_IDENTITE:
            allowed |= set(services.CHAMPS_IDENTITE)
        if user.is_superuser or user.role_codes & services.MODIFIER_MEDICAL:
            allowed |= set(services.CHAMPS_MEDICAUX)
        refused = set(request.data) - allowed
        if refused:
            return Response({"detail": "Vous ne pouvez pas modifier : " + ", ".join(sorted(refused)) + "."},
                            status=status.HTTP_403_FORBIDDEN)
        serializer = IdentityInput(patient, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(services.dossier(patient, user))
