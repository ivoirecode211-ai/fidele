from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import BasePermission
from rest_framework.filters import SearchFilter
from .models import Patient
from .serializers import PatientSerializer

class PatientAccess(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and (request.user.is_superuser or request.user.role in {
            "ADMIN", "DIRECTOR", "RECEPTION", "ACCOUNTING", "DOCTOR", "NURSE", "LAB", "PHARMACY"}))


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [PatientAccess]
    filter_backends = [SearchFilter]
    search_fields = ["patient_number", "last_name", "first_names", "phone"]
