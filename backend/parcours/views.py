from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Admission, InsuranceCompany, MedicalService, VitalSigns
from prescriptions.models import Prescription

from .permissions import AccountingAccess, CaisseAccess, ConsultationAccess, NursingAccess, PharmacyAccess
from .serializers import (
    CaissePatientInputSerializer,
    CaissePatientSerializer,
    ConsultationInputSerializer,
    ConsultationPatientSerializer,
    InsuranceCompanySerializer,
    MedicalServiceSerializer,
    NursingPatientSerializer,
    PaymentSerializer,
    PharmacyPrescriptionSerializer,
    VitalsInputSerializer,
    dispensing_history,
)
from .services import (
    WorkflowError,
    notifications_for,
    prepare_prescription,
    record_vitals,
    register_patient,
    serve_prescription,
    start_consultation,
    validate_consultation,
)


class CatalogueView(APIView):
    """Services et assurances proposés dans le formulaire « Nouveau patient »."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "services": MedicalServiceSerializer(MedicalService.objects.filter(active=True), many=True).data,
            "insurances": InsuranceCompanySerializer(InsuranceCompany.objects.filter(active=True), many=True).data,
        })


class CaissePatientsView(generics.ListAPIView):
    """Liste des passages en caisse (GET) et enregistrement d'un nouveau patient (POST)."""
    permission_classes = [CaisseAccess]
    serializer_class = CaissePatientSerializer
    queryset = Admission.objects.select_related("patient")

    def post(self, request):
        serializer = CaissePatientInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admission = register_patient(data=serializer.validated_data, user=request.user)
        return Response(CaissePatientSerializer(admission).data, status=status.HTTP_201_CREATED)


def nursing_queryset():
    return Admission.objects.select_related("patient").prefetch_related(
        Prefetch("vitals", queryset=VitalSigns.objects.order_by("-recorded_at", "-id"))
    )


class NursingPatientsView(generics.ListAPIView):
    """Patients passés à la caisse, avec leurs dernières constantes."""
    permission_classes = [NursingAccess]
    serializer_class = NursingPatientSerializer

    def get_queryset(self):
        return nursing_queryset()


class NursingVitalsView(APIView):
    """Bouton « Enregistrer » du formulaire Constantes."""
    permission_classes = [NursingAccess]

    def post(self, request, pk):
        admission = get_object_or_404(Admission, pk=pk)
        serializer = VitalsInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record_vitals(admission=admission, fields=serializer.to_model_fields(), user=request.user)
        return Response(NursingPatientSerializer(nursing_queryset().get(pk=pk)).data, status=status.HTTP_201_CREATED)


def workflow_response(action):
    """Exécute une action du parcours ; un refus métier devient une 400 lisible."""
    try:
        return action()
    except WorkflowError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)


def consultation_queryset(user):
    queryset = nursing_queryset().filter(sent_to_consultation_at__isnull=False).select_related(
        "consultation__doctor"
    ).order_by("sent_to_consultation_at", "id")
    if user.has_role("ADMIN", "DIRECTOR"):
        return queryset
    # Un médecin voit la file d'attente et ses propres patients.
    return queryset.filter(Q(consultation__isnull=True) | Q(consultation__doctor=user))


class ConsultationPatientsView(generics.ListAPIView):
    """Patients envoyés par Soins infirmiers (onglets Consultations, Mes patients, Ordonnances)."""
    permission_classes = [ConsultationAccess]
    serializer_class = ConsultationPatientSerializer

    def get_queryset(self):
        return consultation_queryset(self.request.user)


class ConsultationStartView(APIView):
    """Bouton « Consulter »."""
    permission_classes = [ConsultationAccess]

    def post(self, request, pk):
        admission = get_object_or_404(Admission, pk=pk)

        def action():
            start_consultation(admission=admission, user=request.user)
            return Response(ConsultationPatientSerializer(consultation_queryset(request.user).get(pk=pk)).data)

        return workflow_response(action)


class ConsultationValidateView(APIView):
    """Bouton « VALIDER »."""
    permission_classes = [ConsultationAccess]

    def post(self, request, pk):
        admission = get_object_or_404(Admission, pk=pk)
        serializer = ConsultationInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        def action():
            validate_consultation(admission=admission, data=serializer.validated_data, user=request.user)
            return Response(ConsultationPatientSerializer(consultation_queryset(request.user).get(pk=pk)).data)

        return workflow_response(action)


def prescription_queryset():
    return Prescription.objects.filter(consultation__isnull=False).select_related(
        "patient", "doctor", "consultation", "served_by"
    ).prefetch_related("items").order_by("-id")


def prescription_from_code(code):
    return get_object_or_404(prescription_queryset(), pk=int(code))


class PharmacyPrescriptionsView(APIView):
    permission_classes = [PharmacyAccess]

    def get(self, request):
        return Response(PharmacyPrescriptionSerializer(prescription_queryset(), many=True).data)


class PharmacyPrepareView(APIView):
    permission_classes = [PharmacyAccess]

    def post(self, request, code):
        prescription = prescription_from_code(code)

        def action():
            prepare_prescription(prescription=prescription, user=request.user)
            return Response(PharmacyPrescriptionSerializer(prescription_from_code(code)).data)

        return workflow_response(action)


class PharmacyServeView(APIView):
    permission_classes = [PharmacyAccess]

    def post(self, request, code):
        prescription = prescription_from_code(code)

        def action():
            serve_prescription(prescription=prescription, user=request.user)
            return Response(PharmacyPrescriptionSerializer(prescription_from_code(code)).data)

        return workflow_response(action)


class PharmacyHistoryView(APIView):
    permission_classes = [PharmacyAccess]

    def get(self, request):
        served = prescription_queryset().filter(status="SERVED").order_by("-served_at", "-id")
        return Response(dispensing_history(served))


class PaymentsView(APIView):
    """Encaissements de la Caisse pour la Comptabilité."""
    permission_classes = [AccountingAccess]

    def get(self, request):
        admissions = Admission.objects.select_related("patient", "created_by").order_by("-created_at", "-id")
        return Response(PaymentSerializer(admissions, many=True).data)


class NotificationsView(APIView):
    """Pastille de notifications de l'en-tête : actions en attente pour l'utilisateur."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(notifications_for(request.user))
