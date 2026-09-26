from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from parcours.permissions import RoleAccess

from .models import CATEGORIES, Intervention
from .services import change_status, create_intervention, overview, serialize_intervention


class MaintenanceAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "MAINTENANCE"}


class InterventionInputSerializer(serializers.Serializer):
    """Reçoit le formulaire « Nouvelle intervention » (EMPTY_INTERVENTION)."""
    equipment = serializers.CharField(max_length=150)
    category = serializers.ChoiceField(choices=[c for c, _ in CATEGORIES])
    technician = serializers.CharField(max_length=120)
    date = serializers.DateField()
    time = serializers.TimeField(required=False, allow_null=True)
    type = serializers.ChoiceField(choices=[c for c, _ in Intervention.TYPES])
    priority = serializers.ChoiceField(choices=[c for c, _ in Intervention.PRIORITIES])
    description = serializers.CharField(required=False, allow_blank=True, default="")

    def to_internal_value(self, data):
        data = {**data, "time": data.get("time") or None}
        return super().to_internal_value(data)


class OverviewView(APIView):
    permission_classes = [MaintenanceAccess]

    def get(self, request):
        return Response(overview())


class InterventionsView(APIView):
    permission_classes = [MaintenanceAccess]

    def post(self, request):
        serializer = InterventionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        intervention = create_intervention(data=serializer.validated_data, user=request.user)
        return Response(serialize_intervention(intervention), status=status.HTTP_201_CREATED)


class InterventionStatusView(APIView):
    """Faire avancer une intervention : En attente → En cours → Terminée."""
    permission_classes = [MaintenanceAccess]

    def post(self, request, pk):
        intervention = get_object_or_404(Intervention.objects.select_related("equipment"), pk=pk)
        new_status = request.data.get("status")
        if new_status not in dict(Intervention.STATUSES):
            return Response({"status": "Statut inconnu."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serialize_intervention(change_status(intervention=intervention, status=new_status)))
