"""API du module Médecine générale (/api/consultations/medecine/), aux noms de champs de l'écran."""
from datetime import date

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ia.groq import IaIndisponible
from parcours.permissions import ConsultationAccess
from parcours.services import WorkflowError

from . import medecine
from .models import Consultation


def admission_de(request, pk):
    return get_object_or_404(medecine.admissions_du_medecin(request.user), pk=pk)


def refus(erreur):
    if isinstance(erreur, medecine.ErreursFormulaire):
        return Response({"champs": erreur.erreurs}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"detail": str(erreur)}, status=status.HTTP_400_BAD_REQUEST)


def periode(request):
    aujourd_hui = timezone.localdate()
    try:
        du = date.fromisoformat(request.query_params.get("du") or aujourd_hui.isoformat())
        au = date.fromisoformat(request.query_params.get("au") or aujourd_hui.isoformat())
    except ValueError:
        du = au = aujourd_hui
    return min(du, au), max(du, au)


class FileView(APIView):
    """Patients à consulter, consultations en cours, patients consultés sur la période."""
    permission_classes = [ConsultationAccess]

    def get(self, request):
        return Response(medecine.file_attente(request.user, *periode(request)))


class ReferencesView(APIView):
    permission_classes = [ConsultationAccess]

    def get(self, request):
        return Response(medecine.references(request.user))


class SuiviView(APIView):
    """Ordonnances, examens, rendez-vous et séjours décidés par le médecin."""
    permission_classes = [ConsultationAccess]

    def get(self, request):
        return Response(medecine.suivi(request.user))


class DossierView(APIView):
    """GET : le dossier (reprise d'un brouillon). POST : le médecin prend le patient."""
    permission_classes = [ConsultationAccess]

    def get(self, request, pk):
        return Response(medecine.dossier(admission_de(request, pk)))

    def post(self, request, pk):
        admission = admission_de(request, pk)
        try:
            medecine.ouvrir(admission=admission, user=request.user)
        except WorkflowError as erreur:
            return refus(erreur)
        return Response(medecine.dossier(admission))


class EtapeView(APIView):
    """Enregistrement d'une étape (« Enregistrer et continuer ») ou automatique pendant la saisie."""
    permission_classes = [ConsultationAccess]

    def post(self, request, pk):
        admission = admission_de(request, pk)
        try:
            consultation = medecine.enregistrer_etape(
                admission=admission, user=request.user, etape=request.data.get("etape"),
                valeurs=request.data.get("valeurs") or {}, complete=bool(request.data.get("complete")),
            )
        except WorkflowError as erreur:
            return refus(erreur)
        return Response({"etapeCourante": consultation.current_step, "etapesFaites": consultation.completed_steps})


class TerminerView(APIView):
    permission_classes = [ConsultationAccess]

    def post(self, request, pk):
        admission = admission_de(request, pk)
        try:
            medecine.terminer(admission=admission, user=request.user, valeurs=request.data.get("valeurs"))
        except (WorkflowError, medecine.ErreursFormulaire) as erreur:
            return refus(erreur)
        return Response(medecine.dossier(admission))


class PropositionView(APIView):
    """Bouton IA d'une rubrique : diagnostic, examens, ordonnance ou conseils."""
    permission_classes = [ConsultationAccess]

    def post(self, request, pk):
        from ia.clinique import proposer

        admission = admission_de(request, pk)
        valeurs = request.data.get("valeurs") or {}
        try:
            medecine.ouvrir(admission=admission, user=request.user)
            consultation = Consultation.objects.select_related("admission__patient").get(admission=admission)
            proposition = proposer(consultation=consultation, cible=request.data.get("cible"),
                                   valeurs=valeurs if isinstance(valeurs, dict) else {})
        except (WorkflowError, IaIndisponible) as erreur:
            return refus(erreur)
        return Response(proposition)


class ConversationsView(APIView):
    """Historique : les patients avec qui le médecin a échangé avec l'assistant. ?q= nom ou n° de dossier."""
    permission_classes = [ConsultationAccess]

    def get(self, request):
        from django.db.models import Q

        from accounts.tenancy import hospital_of

        consultations = Consultation.objects.filter(
            admission__patient__hospital=hospital_of(request.user), ia_echange_le__isnull=False,
        ).select_related("patient").order_by("-ia_echange_le")
        if not request.user.has_role("DIRECTOR"):
            consultations = consultations.filter(doctor=request.user)
        terme = (request.query_params.get("q") or "").strip()
        for mot in terme.split():
            consultations = consultations.filter(
                Q(patient__last_name__icontains=mot) | Q(patient__first_names__icontains=mot)
                | Q(patient__patient_number__icontains=mot)
            )
        return Response([{
            "admissionId": c.admission_id,
            "patient": f"{c.patient.last_name} {c.patient.first_names}",
            "numero": c.patient.patient_number,
            "diagnostic": c.diagnosis,
            "dernier": apercu(c.ia_messages[-1]["content"] if c.ia_messages else ""),
            "le": timezone.localtime(c.ia_echange_le).isoformat(),
            "messages": len(c.ia_messages),
        } for c in consultations[:100]])


def apercu(texte):
    """Le début du dernier message, en texte simple : ni gras, ni puces, ni sauts de ligne."""
    import re

    simple = re.sub(r"[*#_`]+", "", texte)
    simple = re.sub(r"^\s*(?:[-•]|\d+[.)])\s+", "", simple, flags=re.M)
    return " ".join(simple.split())[:140]


class ConversationView(APIView):
    """GET : la conversation d'un patient. POST { question, valeurs } : une question, sa réponse."""
    permission_classes = [ConsultationAccess]

    def consultation(self, request, pk):
        admission = admission_de(request, pk)
        return medecine.ouvrir(admission=admission, user=request.user)

    def get(self, request, pk):
        try:
            consultation = self.consultation(request, pk)
        except WorkflowError as erreur:
            return refus(erreur)
        return Response(fiche_conversation(consultation))

    def post(self, request, pk):
        from ia.clinique import discuter

        try:
            consultation = self.consultation(request, pk)
            consultation = Consultation.objects.select_related("admission__patient").get(pk=consultation.pk)
            discuter(consultation=consultation, question=request.data.get("question"),
                     valeurs=request.data.get("valeurs"))
        except (WorkflowError, IaIndisponible) as erreur:
            return refus(erreur)
        return Response(fiche_conversation(consultation))


def fiche_conversation(consultation):
    patient = consultation.patient
    return {
        "admissionId": consultation.admission_id,
        "patient": f"{patient.last_name} {patient.first_names}",
        "numero": patient.patient_number,
        "ageTexte": medecine.age_texte(patient.birth_date),
        "diagnostic": consultation.diagnosis or (consultation.ai_trace.get("diagnostic") or {}).get("diagnostic", ""),
        "messages": [{"role": m["role"], "content": m["content"]} for m in consultation.ia_messages],
    }
