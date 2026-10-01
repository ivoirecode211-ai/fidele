from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from accounts.tenancy import hospital_of

from .models import Room, Bed, Hospitalization
from .serializers import RoomSerializer, BedSerializer, HospitalizationSerializer

# Routes génériques, en lecture seule : on admet, on ajoute un lit et on donne une sortie
# par /service/, qui applique les règles (lit libre, hôpital du patient).

class RoomViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Room.objects.filter(hospital=hospital_of(self.request.user))

class BedViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BedSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bed.objects.select_related("room").filter(room__hospital=hospital_of(self.request.user))

class HospitalizationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = HospitalizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (Hospitalization.objects.select_related("patient", "bed")
                .filter(patient__hospital=hospital_of(self.request.user)))
