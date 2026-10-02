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
from .models import Annonce, Conversation, PatientAccess, PushSubscription, Reminder


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
            "annonces": [annonce_data(a) for a in annonces_en_cours(self.patient.hospital)[:3]],
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


# ------------------------------------------------------------------ suivi des comptes

ETATS_COMPTE = ["Actif", "PIN provisoire", "Bloqué", "Désactivé", "Jamais connecté"]


def suivi_row(access):
    row = access_row(access.patient)
    row.update({
        "activatedAt": timezone.localtime(access.activated_at).strftime("%d/%m/%Y"),
        "activatedBy": (f"{access.activated_by.last_name.upper()} {access.activated_by.first_name}".strip()
                        if access.activated_by else ""),
        "neverConnected": access.last_login is None,
        "failedAttempts": access.failed_attempts,
    })
    return row


class SuiviView(APIView):
    """Tous les espaces activés de l'hôpital, avec les compteurs par état."""
    permission_classes = [AccessAdmin]

    def get(self, request):
        acces = list(PatientAccess.objects.filter(patient__hospital=hospital_of(request.user))
                     .select_related("patient", "activated_by").order_by("-activated_at"))
        rows = [suivi_row(a) for a in acces]
        compte = {e: 0 for e in ETATS_COMPTE}
        for r in rows:
            compte[r["status"]] += 1
            if r["neverConnected"] and r["status"] not in ("Désactivé",):
                compte["Jamais connecté"] += 1
        return Response({"comptes": rows, "compteurs": compte})


class SuiviActionView(APIView):
    """Débloquer un compte (après 5 erreurs de PIN), le désactiver ou le réactiver."""
    permission_classes = [AccessAdmin]

    def post(self, request, pk, action):
        access = get_object_or_404(PatientAccess, patient_id=pk, patient__hospital=hospital_of(request.user))
        if action == "debloquer":
            access.failed_attempts, access.locked_until = 0, None
        elif action == "desactiver":
            access.active = False
            access.token_version += 1   # le patient est déconnecté sur-le-champ
        elif action == "reactiver":
            access.active = True
        else:
            return refus("Action inconnue.", status.HTTP_404_NOT_FOUND)
        access.save()
        return Response(suivi_row(PatientAccess.objects.select_related("patient", "activated_by").get(pk=access.pk)))


# ------------------------------------------------------------------ annonces

def annonce_data(a):
    return {
        "id": a.id, "titre": a.titre, "texte": a.texte,
        "jusquAu": a.jusqu_au.isoformat() if a.jusqu_au else "",
        "retiree": a.retiree,
        "enCours": not a.retiree and (a.jusqu_au is None or a.jusqu_au >= timezone.localdate()),
        "publieeLe": timezone.localtime(a.created_at).strftime("%d/%m/%Y %H:%M"),
        "auteur": f"{a.created_by.last_name.upper()} {a.created_by.first_name}".strip() if a.created_by else "",
        "envoyees": a.envoyees,
    }


def annonces_en_cours(hospital):
    return (Annonce.objects.filter(hospital=hospital, retiree=False)
            .filter(Q(jusqu_au__isnull=True) | Q(jusqu_au__gte=timezone.localdate())))


class AnnoncesView(APIView):
    """L'accueil publie une information pour tous les patients de l'hôpital."""
    permission_classes = [AccessAdmin]

    def get(self, request):
        return Response([annonce_data(a) for a in Annonce.objects.filter(hospital=hospital_of(request.user))
                         .select_related("created_by")[:100]])

    def post(self, request):
        titre = str(request.data.get("titre", "")).strip()
        texte = str(request.data.get("texte", "")).strip()
        if not titre or not texte:
            return refus("Le titre et le texte de l'annonce sont obligatoires.")
        jusqu_au = request.data.get("jusquAu") or None
        if jusqu_au:
            from datetime import date
            try:
                jusqu_au = date.fromisoformat(str(jusqu_au))
            except ValueError:
                return refus("Date de fin invalide.")
            if jusqu_au < timezone.localdate():
                return refus("La date de fin est déjà passée.")
        hopital = hospital_of(request.user)
        annonce = Annonce.objects.create(hospital=hopital, titre=titre[:120], texte=texte[:1000],
                                         jusqu_au=jusqu_au, created_by=request.user)
        # Chaque patient de l'hôpital abonné aux notifications la reçoit sur son téléphone.
        envoyees = 0
        abonnes = Patient.objects.filter(hospital=hopital, push_subscriptions__isnull=False,
                                         portal_access__active=True).distinct()
        for patient in abonnes:
            envoyees += push.send(patient, title=titre[:60], body=texte[:120], url="/patient/espace", tag=f"annonce-{annonce.pk}")
        annonce.envoyees = envoyees
        annonce.save(update_fields=["envoyees"])
        return Response(annonce_data(annonce), status=status.HTTP_201_CREATED)


class AnnonceView(APIView):
    permission_classes = [AccessAdmin]

    def delete(self, request, pk):
        annonce = get_object_or_404(Annonce, pk=pk, hospital=hospital_of(request.user))
        annonce.retiree = True
        annonce.save(update_fields=["retiree"])
        return Response(annonce_data(annonce))


class AnnoncesPatientView(PatientView):
    """Les annonces en cours de l'hôpital du patient."""

    def get(self, request):
        return Response([annonce_data(a) for a in annonces_en_cours(self.patient.hospital)[:10]])


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
