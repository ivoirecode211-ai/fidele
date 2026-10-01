import re

from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from parcours.permissions import RoleAccess

from .models import Employee


class RhAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "HR"}


def employes(hospital):
    """Le personnel d'un hôpital : chaque établissement a ses employés et sa suite de matricules."""
    return Employee.objects.filter(hospital=hospital)


def next_matricule(hospital):
    numbers = [int(m.group(1)) for value in employes(hospital).values_list("matricule", flat=True)
               if (m := re.match(r"^EMP-(\d+)$", value))]
    return f"EMP-{max(numbers, default=0) + 1:04d}"


class EmployeeSerializer(serializers.ModelSerializer):
    """Mêmes champs que le formulaire de employees.jsx."""
    matricule = serializers.CharField(max_length=20, required=False, allow_blank=True)

    class Meta:
        model = Employee
        fields = ["id", "matricule", "nom", "prenom", "sexe", "telephone", "email", "poste",
                  "departement", "dateEmbauche", "contrat", "statut"]

    def validate_matricule(self, value):
        value = value.strip().upper()
        if value and employes(self.context["hospital"]).filter(matricule=value).exclude(
                pk=getattr(self.instance, "pk", None)).exists():
            raise serializers.ValidationError("Ce matricule est déjà attribué.")
        return value

    def create(self, validated_data):
        validated_data["matricule"] = validated_data.get("matricule") or next_matricule(self.context["hospital"])
        validated_data["hospital"] = self.context["hospital"]
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if not validated_data.get("matricule"):
            validated_data.pop("matricule", None)
        return super().update(instance, validated_data)


class EmployeesView(APIView):
    permission_classes = [RhAccess]

    def get(self, request):
        return Response(EmployeeSerializer(employes(hospital_of(request.user)), many=True).data)

    def post(self, request):
        serializer = EmployeeSerializer(data=request.data, context={"hospital": hospital_of(request.user)})
        serializer.is_valid(raise_exception=True)
        return Response(EmployeeSerializer(serializer.save()).data, status=status.HTTP_201_CREATED)


class EmployeeView(APIView):
    permission_classes = [RhAccess]

    def put(self, request, pk):
        hopital = hospital_of(request.user)
        serializer = EmployeeSerializer(get_object_or_404(employes(hopital), pk=pk), data=request.data,
                                        context={"hospital": hopital})
        serializer.is_valid(raise_exception=True)
        return Response(EmployeeSerializer(serializer.save()).data)

    def patch(self, request, pk):
        """Changement de statut (Actif, Congé, Suspendu, Inactif)."""
        hopital = hospital_of(request.user)
        serializer = EmployeeSerializer(get_object_or_404(employes(hopital), pk=pk), data=request.data,
                                        context={"hospital": hopital}, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(EmployeeSerializer(serializer.save()).data)

    def delete(self, request, pk):
        get_object_or_404(employes(hospital_of(request.user)), pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
