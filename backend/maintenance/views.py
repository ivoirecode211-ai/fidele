from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from administration.audit import client_ip
from parcours.permissions import RoleAccess

from .models import ACQUISITIONS, CATEGORIES, Equipment, Intervention
from .services import (change_status, close_intervention, create_equipment, create_intervention,
                       equipment_row, equipment_sheet, overview, record_scan, regenerate_token,
                       serialize_intervention)

User = get_user_model()


class MaintenanceAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "MAINTENANCE"}


def own_equipments(user):
    return Equipment.objects.filter(hospital=hospital_of(user)).prefetch_related("interventions")


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
    company = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")
    technician_user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)

    def to_internal_value(self, data):
        data = {**data, "time": data.get("time") or None}
        return super().to_internal_value(data)


class OverviewView(APIView):
    permission_classes = [MaintenanceAccess]

    def get(self, request):
        return Response(overview(hospital_of(request.user)))


class InterventionsView(APIView):
    permission_classes = [MaintenanceAccess]

    def post(self, request):
        serializer = InterventionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        intervention = create_intervention(data=serializer.validated_data, user=request.user,
                                           hospital=hospital_of(request.user))
        return Response(serialize_intervention(intervention), status=status.HTTP_201_CREATED)


def own_intervention(request, pk):
    return get_object_or_404(Intervention.objects.select_related("equipment"),
                             pk=pk, equipment__hospital=hospital_of(request.user))


class InterventionStatusView(APIView):
    """Faire avancer une intervention : En attente → En cours → Terminée."""
    permission_classes = [MaintenanceAccess]

    def post(self, request, pk):
        intervention = own_intervention(request, pk)
        new_status = request.data.get("status")
        if new_status not in dict(Intervention.STATUSES):
            return Response({"status": "Statut inconnu."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serialize_intervention(change_status(intervention=intervention, status=new_status)))


class CloseInput(serializers.Serializer):
    diagnosis = serializers.CharField(required=False, allow_blank=True, default="")
    work_done = serializers.CharField(allow_blank=False,
                                      error_messages={"blank": "Décrivez les travaux réalisés."})
    parts = serializers.CharField(required=False, allow_blank=True, default="")
    cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False, allow_null=True)
    duration_minutes = serializers.IntegerField(min_value=0, required=False, allow_null=True)


class InterventionCloseView(APIView):
    """Clôture avec compte rendu (diagnostic, travaux, pièces, coût, durée)."""
    permission_classes = [MaintenanceAccess]

    def post(self, request, pk):
        intervention = own_intervention(request, pk)
        serializer = CloseInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        close_intervention(intervention=intervention, data=serializer.validated_data, user=request.user)
        equipment = own_equipments(request.user).get(pk=intervention.equipment_id)
        return Response(equipment_sheet(equipment))


# ------------------------------------------------------------------ parc et QR codes

class EquipmentInput(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = ["name", "category", "brand", "model_name", "serial_number", "supplier", "acquisition",
                  "installation_date", "warranty_end", "service", "location", "state", "notes",
                  "maintenance_interval_days"]

    def validate_name(self, value):
        others = Equipment.objects.filter(hospital=self.context["hospital"], name__iexact=value.strip())
        if self.instance is not None:
            others = others.exclude(pk=self.instance.pk)
        if others.exists():
            raise serializers.ValidationError("Un équipement porte déjà ce nom dans l'hôpital.")
        return value.strip()

    def validate(self, attrs):
        start = attrs.get("installation_date", getattr(self.instance, "installation_date", None))
        end = attrs.get("warranty_end", getattr(self.instance, "warranty_end", None))
        if start and end and end < start:
            raise serializers.ValidationError({"warranty_end": "La garantie ne peut finir avant l'installation."})
        return attrs


class EquipmentsView(APIView):
    """Parc de l'hôpital (GET) et ajout d'un appareil (POST)."""
    permission_classes = [MaintenanceAccess]

    def get(self, request):
        return Response({
            "equipments": [equipment_row(e) for e in own_equipments(request.user)],
            "categories": [c for c, _ in CATEGORIES],
            "acquisitions": [c for c, _ in ACQUISITIONS],
            "states": [c for c, _ in Equipment.STATES],
            "hospital": {"name": hospital_of(request.user).name, "code": hospital_of(request.user).code},
        })

    def post(self, request):
        hospital = hospital_of(request.user)
        serializer = EquipmentInput(data=request.data, context={"hospital": hospital})
        serializer.is_valid(raise_exception=True)
        equipment = create_equipment(data=serializer.validated_data, user=request.user, hospital=hospital)
        return Response(equipment_row(own_equipments(request.user).get(pk=equipment.pk)),
                        status=status.HTTP_201_CREATED)


class EquipmentView(APIView):
    """Fiche complète (GET) et modification (PATCH)."""
    permission_classes = [MaintenanceAccess]

    def get(self, request, pk):
        return Response(equipment_sheet(get_object_or_404(own_equipments(request.user), pk=pk)))

    def patch(self, request, pk):
        equipment = get_object_or_404(own_equipments(request.user), pk=pk)
        serializer = EquipmentInput(equipment, data=request.data, partial=True,
                                    context={"hospital": hospital_of(request.user)})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(equipment_sheet(own_equipments(request.user).get(pk=pk)))


class EquipmentTokenView(APIView):
    """Nouvelle étiquette : l'ancien QR code ne mène plus à rien."""
    permission_classes = [MaintenanceAccess]

    def post(self, request, pk):
        equipment = regenerate_token(get_object_or_404(own_equipments(request.user), pk=pk))
        return Response(equipment_row(own_equipments(request.user).get(pk=equipment.pk)))


class ScanView(APIView):
    """Étiquette scannée : tout agent connecté de l'hôpital voit la fiche, et le scan est tracé.

    Un jeton inconnu, révoqué ou d'un autre hôpital répond 404 : rien ne dit
    qu'un appareil existe ailleurs.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, token):
        equipment = get_object_or_404(own_equipments(request.user), qr_token=token)
        record_scan(equipment=equipment, user=request.user, ip_address=client_ip(request))
        sheet = equipment_sheet(equipment)
        sheet["canEdit"] = request.user.has_role(*MaintenanceAccess.roles)
        return Response(sheet)
