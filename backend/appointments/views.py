from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from accounts.tenancy import hospital_of

from .models import Appointment
from .serializers import AppointmentSerializer

class AppointmentViewSet(viewsets.ModelViewSet):
    """Rendez-vous des patients de l'hôpital de l'utilisateur."""
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (Appointment.objects.select_related("patient", "professional")
                .filter(patient__hospital=hospital_of(self.request.user)))
