"""Espace de la plateforme : création des hôpitaux et de leur administrateur.

Réservé aux comptes sans hôpital (super-utilisateurs). L'administrateur d'un
hôpital complète ensuite lui-même sa fiche dans Administration → Paramètres.
"""
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from administration.serializers import AdminUserInputSerializer
from administration.services import display_name, format_connection, save_user

from .models import Hospital, User
from .tenancy import unique_code


class PlatformAccess(BasePermission):
    message = "Cet espace est réservé à la plateforme."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_platform)


class HospitalInput(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = ["name", "phone", "email", "city", "district", "active"]
        extra_kwargs = {
            "phone": {"required": True, "allow_blank": False},
            "city": {"required": True, "allow_blank": False},
            "district": {"required": True, "allow_blank": False},
        }


def hospital_data(hospital):
    return {
        "id": hospital.pk,
        "name": hospital.name,
        "code": hospital.code,
        "phone": hospital.phone,
        "email": hospital.email,
        "city": hospital.city,
        "district": hospital.district,
        "active": hospital.active,
        "createdAt": timezone.localtime(hospital.created_at).strftime("%d/%m/%Y"),
        "admins": getattr(hospital, "nb_admins", 0),
        "users": getattr(hospital, "nb_users", 0),
        "patients": getattr(hospital, "nb_patients", 0),
    }


def hospitals():
    return Hospital.objects.annotate(
        nb_users=Count("users", distinct=True),
        nb_admins=Count("users", filter=Q(users__role="ADMIN"), distinct=True),
        nb_patients=Count("patients", distinct=True),
    )


class HospitalsView(APIView):
    permission_classes = [PlatformAccess]

    def get(self, request):
        return Response([hospital_data(h) for h in hospitals()])

    def post(self, request):
        serializer = HospitalInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        hospital = serializer.save(code=unique_code(serializer.validated_data["name"]), updated_by=request.user)
        return Response(hospital_data(hospitals().get(pk=hospital.pk)), status=status.HTTP_201_CREATED)


class HospitalView(APIView):
    permission_classes = [PlatformAccess]

    def patch(self, request, pk):
        hospital = get_object_or_404(Hospital, pk=pk)
        serializer = HospitalInput(hospital, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(hospital_data(hospitals().get(pk=pk)))


class HospitalCodeView(APIView):
    """Code proposé pendant la saisie du nom (tiré de l'acronyme)."""
    permission_classes = [PlatformAccess]

    def get(self, request):
        name = request.query_params.get("name", "").strip()
        return Response({"code": unique_code(name) if name else ""})


def admin_data(user):
    return {
        "id": user.pk,
        "name": display_name(user),
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "hospital": user.hospital.name,
        "hospitalId": user.hospital_id,
        "hospitalCode": user.hospital.code,
        "status": "Actif" if user.is_active else "Inactif",
        "connection": format_connection(user.last_login),
    }


class AdminsView(APIView):
    """Administrateurs des hôpitaux : un compte ADMIN rattaché à un hôpital."""
    permission_classes = [PlatformAccess]

    def get(self, request):
        admins = (User.objects.filter(hospital__isnull=False, role="ADMIN").select_related("hospital")
                  .order_by("hospital__name", "last_name"))
        return Response([admin_data(u) for u in admins])

    def post(self, request):
        hospital = get_object_or_404(Hospital, pk=request.data.get("hospital"))
        serializer = AdminUserInputSerializer(data={**request.data, "roles": ["Administrateur"],
                                                    "function": "Administrateur de l'hôpital"})
        serializer.is_valid(raise_exception=True)
        user, password = save_user(data=serializer.validated_data, hospital=hospital)
        return Response({**admin_data(user), "temporaryPassword": password}, status=status.HTTP_201_CREATED)
