"""Service d'hospitalisation, au format de Hospitalization.jsx.

Un séjour est décidé en consultation (bouton « Hospitaliser ») ; la page
gère les chambres, les lits et les sorties.
"""
from datetime import datetime, time

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from parcours.models import Admission
from parcours.permissions import RoleAccess
from parcours.services import age_from_birth_date, doctor_label

from .models import Bed, Hospitalization, Room


class WardAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "DOCTOR", "NURSE"}


def fmt(value):
    return value.strftime("%d/%m/%Y") if value else "—"


def stay_status(stay, today=None):
    today = today or timezone.localdate()
    if stay.discharge_date:
        return "Sortie"
    if stay.planned_discharge and stay.planned_discharge <= today:
        return "Sortie prévue"
    return "En cours"


def serialize_stay(stay):
    patient = stay.patient
    return {
        "id": stay.pk,
        "patient": f"{patient.last_name} {patient.first_names}",
        "dossier": patient.patient_number,
        "age": age_from_birth_date(patient.birth_date),
        "sexe": {"F": "Femme", "M": "Homme"}.get(patient.sex, ""),
        "service": stay.service or stay.bed.room.department,
        "chambre": stay.bed.room.name,
        "lit": stay.bed.number,
        "admission": fmt(timezone.localtime(stay.admission_date)),
        "sortiePrevue": fmt(stay.planned_discharge),
        "medecin": doctor_label(stay.doctor) if stay.doctor else "—",
        "motif": stay.reason,
        "status": stay_status(stay),
    }


def serialize_room(room):
    beds = list(room.beds.all())
    return {
        "id": room.pk,
        "number": room.name,
        "service": room.department,
        "type": room.type,
        "totalBeds": len(beds),
        "occupiedBeds": sum(1 for bed in beds if bed.status == "OCCUPIED"),
        "beds": [bed.number for bed in beds],
    }


def stays():
    return Hospitalization.objects.select_related("patient", "bed__room", "doctor").order_by("-admission_date", "-id")


class OverviewView(APIView):
    permission_classes = [WardAccess]

    def get(self, request):
        rooms = Room.objects.prefetch_related("beds").order_by("name")
        return Response({
            "hospitalizations": [serialize_stay(stay) for stay in stays()],
            "rooms": [serialize_room(room) for room in rooms],
        })


class BedsView(APIView):
    """« Ajout de lits » : ajoute un lit ; la chambre est créée si besoin."""
    permission_classes = [WardAccess]

    def post(self, request):
        name = str(request.data.get("room", "")).strip().upper()
        number = str(request.data.get("bed", "")).strip()
        if not name:
            return Response({"room": "Indiquez le numéro de la chambre."}, status=status.HTTP_400_BAD_REQUEST)
        if not number:
            return Response({"bed": "Indiquez le numéro du lit."}, status=status.HTTP_400_BAD_REQUEST)
        # Chambre saisie librement : créée si elle n'existe pas encore
        # (service et type se précisent ensuite dans l'admin).
        room = Room.objects.filter(name__iexact=name).first() or Room.objects.create(
            name=name, department="Non précisé", type="Standard"
        )
        if room.beds.filter(number__iexact=number).exists():
            return Response({"bed": f"Le lit {number} existe déjà dans la chambre {room.name}."},
                            status=status.HTTP_400_BAD_REQUEST)
        Bed.objects.create(room=room, number=number)
        return Response(serialize_room(Room.objects.prefetch_related("beds").get(pk=room.pk)),
                        status=status.HTTP_201_CREATED)


class StayInputSerializer(serializers.Serializer):
    """Reçoit le formulaire « Hospitaliser » de la Consultation."""
    admissionId = serializers.PrimaryKeyRelatedField(queryset=Admission.objects.select_related("patient"))
    chambre = serializers.CharField(max_length=100)
    lit = serializers.CharField(max_length=30)
    dateAdmission = serializers.DateField()
    dateSortie = serializers.DateField()

    def validate(self, attrs):
        if attrs["dateSortie"] < attrs["dateAdmission"]:
            raise serializers.ValidationError({"dateSortie": "La sortie prévue précède l'admission."})
        room = Room.objects.filter(name__iexact=attrs["chambre"].strip()).first()
        if room is None:
            known = ", ".join(Room.objects.order_by("name").values_list("name", flat=True)) or "aucune"
            raise serializers.ValidationError({"chambre": f"Chambre inconnue. Chambres existantes : {known}."})
        bed = room.beds.filter(number__iexact=attrs["lit"].strip()).first()
        if bed is None:
            known = ", ".join(room.beds.values_list("number", flat=True)) or "aucun"
            raise serializers.ValidationError({"lit": f"Lit inconnu dans la chambre {room.name}. Lits : {known}."})
        if bed.status == "OCCUPIED":
            raise serializers.ValidationError({"lit": f"Le lit {bed.number} de la chambre {room.name} est déjà occupé."})
        if attrs["admissionId"].hospitalizations.filter(discharge_date__isnull=True).exists():
            raise serializers.ValidationError({"admissionId": "Ce patient est déjà hospitalisé."})
        attrs["bed"] = bed
        return attrs


class BedTaken(Exception):
    """Le lit a été pris entre la validation et l'enregistrement."""


def open_stay(*, data, user, service=None):
    """Crée le séjour et occupe le lit ; `data` vient de StayInputSerializer."""
    bed = Bed.objects.select_for_update().get(pk=data["bed"].pk)
    if bed.status == "OCCUPIED":
        raise BedTaken("Ce lit vient d'être occupé.")
    admission = data["admissionId"]
    consultation = getattr(admission, "consultation", None)
    stay = Hospitalization.objects.create(
        patient=admission.patient,
        bed=bed,
        admission=admission,
        admission_date=timezone.make_aware(datetime.combine(data["dateAdmission"], time(hour=12))),
        planned_discharge=data["dateSortie"],
        service=service or admission.service_name,
        doctor=consultation.doctor if consultation else user,
        reason=(consultation.diagnosis if consultation else "") or admission.motif,
    )
    bed.status = "OCCUPIED"
    bed.save(update_fields=["status"])
    return stay


class StaysView(APIView):
    permission_classes = [WardAccess]

    @transaction.atomic
    def post(self, request):
        serializer = StayInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            stay = open_stay(data=serializer.validated_data, user=request.user)
        except BedTaken as taken:
            return Response({"lit": str(taken)}, status=status.HTTP_409_CONFLICT)
        return Response(serialize_stay(stays().get(pk=stay.pk)), status=status.HTTP_201_CREATED)


class DischargeView(APIView):
    """« Terminer l'hospitalisation » : sortie du patient, le lit se libère."""
    permission_classes = [WardAccess]

    @transaction.atomic
    def post(self, request, pk):
        stay = get_object_or_404(stays().select_for_update(of=("self",)), pk=pk)
        if stay.discharge_date is None:
            stay.discharge_date = timezone.now()
            stay.save(update_fields=["discharge_date"])
            Bed.objects.filter(pk=stay.bed_id).update(status="AVAILABLE")
        return Response(serialize_stay(stays().get(pk=pk)))
