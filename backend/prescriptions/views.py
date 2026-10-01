from rest_framework import viewsets

from accounts.tenancy import hospital_of
from parcours.permissions import RoleAccess

from .models import Prescription, PrescriptionItem
from .serializers import PrescriptionItemSerializer, PrescriptionSerializer


class LectureOrdonnances(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "DOCTOR", "PHARMACY"}


class PrescriptionViewSet(viewsets.ReadOnlyModelViewSet):
    """Route générique, en lecture seule : les ordonnances naissent en consultation et se délivrent
    à la Pharmacie (/api/parcours/pharmacie/). Limitée à l'hôpital de l'utilisateur."""
    serializer_class = PrescriptionSerializer
    permission_classes = [LectureOrdonnances]

    def get_queryset(self):
        return (Prescription.objects.filter(patient__hospital=hospital_of(self.request.user))
                .select_related("patient", "doctor").prefetch_related("items"))


class PrescriptionItemViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PrescriptionItemSerializer
    permission_classes = [LectureOrdonnances]

    def get_queryset(self):
        return PrescriptionItem.objects.filter(prescription__patient__hospital=hospital_of(self.request.user))
