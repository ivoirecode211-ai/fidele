from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import BasePermission
from rest_framework.filters import SearchFilter
from accounts.tenancy import hospital_of

from .models import Patient
from .serializers import PatientSerializer

class PatientAccess(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and (request.user.has_role("ADMIN") or request.user.role_codes & {
            "ADMIN", "DIRECTOR", "RECEPTION", "ACCOUNTING", "DOCTOR", "NURSE", "LAB", "PHARMACY"}))


class PatientViewSet(viewsets.ModelViewSet):
    """Patients de l'hôpital de l'utilisateur, et de lui seul."""
    serializer_class = PatientSerializer
    permission_classes = [PatientAccess]
    filter_backends = [SearchFilter]
    search_fields = ["patient_number", "last_name", "first_names", "phone"]

    def get_queryset(self):
        return Patient.objects.filter(hospital=hospital_of(self.request.user)).order_by("-created_at")

    def perform_create(self, serializer):
        """Le numéro suit la nomenclature de l'hôpital ; ni l'un ni l'autre ne viennent du client."""
        from parcours.services import next_patient_number

        hospital = hospital_of(self.request.user)
        serializer.save(hospital=hospital, patient_number=next_patient_number(hospital))
