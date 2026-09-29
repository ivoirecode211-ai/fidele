from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from parcours.permissions import RoleAccess
from patients.models import Patient
from prescriptions.models import PrescriptionItem

from . import push, services
from .auth import (CodeInvalide, IsPatient, IsPatientReady, LoginThrottle, PatientAuthentication, connecter,
                   emettre_jeton, pin_provisoire, pin_valide)
from .models import Conversation, PatientAccess, PushSubscription, Reminder


def refus(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"detail": str(message)}, status=code)


class PatientView(APIView):
    """Base des vues de l'espace patient : jeton patient, PIN personnel déjà choisi."""
    authentication_classes = [PatientAuthentication]
    permission_classes = [IsPatientReady]

    @property
    def patient(self):
        return self.request.user.patient


# ================================================================== connexion

class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        try:
            access = connecter(code=request.data.get("code"), pin=str(request.data.get("pin", "")))
        except CodeInvalide as error:
            return refus(error, status.HTTP_401_UNAUTHORIZED)
        return Response({"token": emettre_jeton(access), "mustChangePin": access.must_change_pin,
                         "patient": services.identite(access.patient)})


class PinView(APIView):
    """Choisir son code personnel (obligatoire après le PIN provisoire), ou le changer."""
    authentication_classes = [PatientAuthentication]
    permission_classes = [IsPatient]

    def post(self, request):
        access = request.user.access
        if not access.check_pin(str(request.data.get("current", ""))):
            return refus("Le code actuel est incorrect.")
        try:
            pin = pin_valide(str(request.data.get("new", "")))
        except CodeInvalide as error:
            return refus(error)
        if access.check_pin(pin):
            return refus("Choisissez un code différent de l'actuel.")
        access.set_pin(pin, temporary=False)
        access.save()
        return Response({"token": emettre_jeton(access), "mustChangePin": False})


# ================================================================== espace patient

class HomeView(PatientView):
    def get(self, request):
        rdv = services.rendez_vous(self.patient)["upcoming"]
        fils = services.fils_du_patient(self.patient)
        dernieres = services.dossier(self.patient)["consultations"][:1]
        return Response({
            "patient": services.identite(self.patient),
            "nextAppointment": rdv[0] if rdv else None,
            "todayIntakes": services.prises_du_jour(self.patient),
            "unreadMessages": sum(f["unread"] for f in fils),
            "lastConsultation": dernieres[0] if dernieres else None,
        })


class RecordView(PatientView):
    def get(self, request):
        return Response(services.dossier(self.patient))


class AppointmentsView(PatientView):
    def get(self, request):
        return Response(services.rendez_vous(self.patient))


class MedicinesView(PatientView):
    def get(self, request):
        return Response(services.medicaments(self.patient))


class ReminderView(PatientView):
    """Activer, régler ou couper le rappel d'un médicament de ses ordonnances."""

    def post(self, request, item_id):
        item = get_object_or_404(PrescriptionItem, pk=item_id, prescription__patient=self.patient)
        try:
            services.programmer_rappel(patient=self.patient, item=item, times=request.data.get("times") or [],
                                       end_date=request.data.get("endDate") or None,
                                       active=bool(request.data.get("active", True)))
        except ValueError as error:
            return refus(error)
        return Response(services.medicaments(self.patient))


class IntakeView(PatientView):
    """« J'ai pris mon médicament. »"""

    def post(self, request, reminder_id):
        reminder = get_object_or_404(Reminder, pk=reminder_id, patient=self.patient)
        time = str(request.data.get("time", ""))
        if time not in reminder.times:
            return refus("Heure de prise inconnue.")
        services.marquer_prise(reminder=reminder, time=time)
        return Response({"todayIntakes": services.prises_du_jour(self.patient)})


class ThreadsView(PatientView):
    def get(self, request):
        return Response(services.fils_du_patient(self.patient))


class ThreadView(PatientView):
    def get(self, request, doctor_id):
        conv = services.conversation(self.patient, doctor_id)
        if conv is None:
            return refus("Ce médecin ne vous a pas consulté.", status.HTTP_404_NOT_FOUND)
        services.lire(conv, by_patient=True)
        return Response({"doctor": services.docteur(conv.doctor),
                         "messages": [services.message_data(m) for m in conv.messages.all()]})

    def post(self, request, doctor_id):
        conv = services.conversation(self.patient, doctor_id)
        if conv is None:
            return refus("Ce médecin ne vous a pas consulté.", status.HTTP_404_NOT_FOUND)
        try:
            message = services.ecrire(conversation=conv, text=request.data.get("text"), from_patient=True)
        except ValueError as error:
            return refus(error)
        return Response(services.message_data(message), status=status.HTTP_201_CREATED)


class PushView(PatientView):
    """Clé publique du serveur (GET), abonnement d'un téléphone (POST), désabonnement (DELETE)."""

    def get(self, request):
        return Response({"publicKey": push.public_key(),
                         "devices": PushSubscription.objects.filter(patient=self.patient).count()})

    def post(self, request):
        sub = request.data.get("subscription") or {}
        keys = sub.get("keys") or {}
        if not sub.get("endpoint", "").startswith("https://") or not keys.get("p256dh") or not keys.get("auth"):
            return refus("Abonnement aux notifications invalide.")
        PushSubscription.objects.update_or_create(
            endpoint=sub["endpoint"], defaults={"patient": self.patient, "p256dh": keys["p256dh"], "auth": keys["auth"]})
        return Response({"subscribed": True}, status=status.HTTP_201_CREATED)

    def delete(self, request):
        PushSubscription.objects.filter(patient=self.patient, endpoint=request.data.get("endpoint", "")).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PushTestView(PatientView):
    def post(self, request):
        sent = push.send(self.patient, title="MA SANTÉ", body="Les rappels de médicaments sont activés sur ce téléphone.",
                         tag="test")
        return Response({"sent": sent})


# ================================================================== côté personnel

class AccessAdmin(RoleAccess):
    """Activer l'espace patient : l'accueil, la direction, l'administration."""
    roles = {"ADMIN", "DIRECTOR", "RECEPTION"}


def access_row(patient):
    access = getattr(patient, "portal_access", None)
    return {
        "id": patient.pk,
        "code": patient.patient_number,
        "name": f"{patient.last_name} {patient.first_names}".strip(),
        "phone": patient.phone,
        "status": "Aucun accès" if access is None else "Désactivé" if not access.active
        else "Bloqué" if access.locked else "PIN provisoire" if access.must_change_pin else "Actif",
        "lastLogin": timezone.localtime(access.last_login).strftime("%d/%m/%Y %H:%M")
        if access and access.last_login else None,
    }


class AccessListView(APIView):
    permission_classes = [AccessAdmin]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        qs = Patient.objects.filter(hospital=hospital_of(request.user)).select_related("portal_access")
        if q:
            qs = qs.filter(Q(last_name__icontains=q) | Q(first_names__icontains=q)
                           | Q(patient_number__icontains=q) | Q(phone__icontains=q))
        rows = list(qs.order_by("-created_at")[:25])
        return Response({"hospital": hospital_of(request.user).name, "patients": [access_row(p) for p in rows]})


class AccessActionView(APIView):
    """Activer / réinitialiser (nouveau PIN provisoire, montré une seule fois) ou désactiver."""
    permission_classes = [AccessAdmin]

    def post(self, request, pk, action):
        patient = get_object_or_404(Patient, pk=pk, hospital=hospital_of(request.user))
        if action == "desactiver":
            PatientAccess.objects.filter(patient=patient).update(active=False)
            patient.refresh_from_db()
            return Response(access_row(patient))
        if action != "activer":
            return refus("Action inconnue.", status.HTTP_404_NOT_FOUND)
        pin = pin_provisoire()
        access = PatientAccess.objects.filter(patient=patient).first() or PatientAccess(patient=patient)
        access.set_pin(pin, temporary=True)
        access.active = True
        access.activated_by = request.user
        access.activated_at = timezone.now()
        access.save()
        patient.refresh_from_db()
        return Response({**access_row(patient), "temporaryPin": pin,
                         "hospital": patient.hospital.name if patient.hospital_id else ""})


class DoctorAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "DOCTOR"}


class DoctorThreadsView(APIView):
    """Boîte de réception du médecin : ses patients qui lui ont écrit."""
    permission_classes = [DoctorAccess]

    def get(self, request):
        convs = (Conversation.objects.filter(doctor=request.user, patient__hospital=hospital_of(request.user))
                 .select_related("patient")
                 .annotate(unread=Count("messages", filter=Q(messages__from_patient=True, messages__read_at__isnull=True)))
                 .prefetch_related("messages"))
        rows = []
        for conv in convs:
            messages = list(conv.messages.all())
            if not messages:
                continue
            rows.append({"patientId": conv.patient_id, "patient": f"{conv.patient.last_name} {conv.patient.first_names}",
                         "code": conv.patient.patient_number, "unread": conv.unread,
                         "lastMessage": services.message_data(messages[-1])})
        return Response(sorted(rows, key=lambda r: r["lastMessage"]["sentAtIso"], reverse=True))


class DoctorThreadView(APIView):
    permission_classes = [DoctorAccess]

    def conversation(self, request, patient_id):
        patient = get_object_or_404(Patient, pk=patient_id, hospital=hospital_of(request.user))
        if request.user.pk not in services.medecins_du_patient(patient):
            return None, patient
        conv, _ = Conversation.objects.get_or_create(patient=patient, doctor=request.user)
        return conv, patient

    def get(self, request, patient_id):
        conv, patient = self.conversation(request, patient_id)
        if conv is None:
            return refus("Vous n'avez pas consulté ce patient.", status.HTTP_404_NOT_FOUND)
        services.lire(conv, by_patient=False)
        return Response({"patient": f"{patient.last_name} {patient.first_names}", "code": patient.patient_number,
                         "messages": [services.message_data(m) for m in conv.messages.all()]})

    def post(self, request, patient_id):
        conv, patient = self.conversation(request, patient_id)
        if conv is None:
            return refus("Vous n'avez pas consulté ce patient.", status.HTTP_404_NOT_FOUND)
        try:
            message = services.ecrire(conversation=conv, text=request.data.get("text"), from_patient=False)
        except ValueError as error:
            return refus(error)
        push.send(patient, title=f"Message de {services.docteur(request.user)}", body=message.text[:120],
                  url="/patient/espace?onglet=messages", tag=f"msg-{request.user.pk}")
        return Response(services.message_data(message), status=status.HTTP_201_CREATED)
