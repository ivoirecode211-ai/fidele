"""Agenda des rendez-vous, au format de Appointments.jsx.

Un rendez-vous naît d'une consultation (bouton RDV) ou d'un rendez-vous
existant (« nouveau rendez-vous pour ce patient »).
"""
from datetime import datetime

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from parcours.permissions import RoleAccess
from parcours.services import doctor_label
from patients.models import Patient

from .models import Appointment

User = get_user_model()

LABELS = {"CONFIRMED": "Confirmé", "WAITING": "En attente", "PROGRAMMED": "En attente",
          "CANCELLED": "Annulé", "DONE": "Terminé", "ABSENT": "Absent", "IN_CONSULTATION": "En consultation"}
CODES = {"Confirmé": "CONFIRMED", "En attente": "WAITING", "Annulé": "CANCELLED"}


class AgendaAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "DOCTOR", "NURSE", "RECEPTION"}


def serialize(appointment):
    when = timezone.localtime(appointment.date_time)
    patient = appointment.patient
    return {
        "id": appointment.pk,
        "patientId": patient.patient_number,
        "patient": f"{patient.last_name} {patient.first_names}",
        "phone": patient.phone,
        "doctorId": appointment.professional_id,
        "doctor": doctor_label(appointment.professional),
        "service": appointment.service,
        "date": when.date().isoformat(),
        "time": when.strftime("%H:%M"),
        "motif": appointment.reason,
        "status": LABELS.get(appointment.status, appointment.status),
    }


class AppointmentInputSerializer(serializers.Serializer):
    patientId = serializers.SlugRelatedField(slug_field="patient_number", queryset=Patient.objects.all())
    doctorId = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(is_active=True), required=False, allow_null=True)
    service = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    date = serializers.DateField()
    time = serializers.TimeField()
    motif = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(choices=list(CODES), required=False, default="En attente")

    def validate(self, attrs):
        moment = timezone.make_aware(datetime.combine(attrs["date"], attrs["time"]))
        if moment < timezone.now() and attrs.get("status") != "Annulé":
            raise serializers.ValidationError({"date": "Le rendez-vous ne peut pas être fixé dans le passé."})
        attrs["date_time"] = moment
        return attrs


def fields_from(data, user):
    return {
        "patient": data["patientId"],
        "professional": data.get("doctorId") or user,
        "service": data.get("service") or "Médecine générale",
        "date_time": data["date_time"],
        "reason": data.get("motif") or "Suivi médical",
        "status": CODES[data.get("status", "En attente")],
    }


def queryset():
    return Appointment.objects.select_related("patient", "professional").order_by("date_time")


class AgendaView(APIView):
    permission_classes = [AgendaAccess]

    def get(self, request):
        return Response([serialize(item) for item in queryset()])

    def post(self, request):
        serializer = AppointmentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment = Appointment.objects.create(**fields_from(serializer.validated_data, request.user))
        return Response(serialize(appointment), status=status.HTTP_201_CREATED)


class AgendaItemView(APIView):
    permission_classes = [AgendaAccess]

    def put(self, request, pk):
        appointment = get_object_or_404(queryset(), pk=pk)
        serializer = AppointmentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for field, value in fields_from(serializer.validated_data, appointment.professional).items():
            setattr(appointment, field, value)
        appointment.save()
        return Response(serialize(appointment))

    def delete(self, request, pk):
        get_object_or_404(Appointment, pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AgendaStatusView(APIView):
    permission_classes = [AgendaAccess]

    def post(self, request, pk):
        appointment = get_object_or_404(queryset(), pk=pk)
        label = request.data.get("status")
        if label not in CODES:
            return Response({"status": "Statut inconnu."}, status=status.HTTP_400_BAD_REQUEST)
        appointment.status = CODES[label]
        appointment.save(update_fields=["status"])
        return Response(serialize(appointment))
