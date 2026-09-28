from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of

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

    def get_queryset(self):
        return Admission.objects.of_hospital(hospital_of(self.request.user)).select_related("patient", "service")

    def post(self, request):
        serializer = CaissePatientInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        from .caisse import Duplicate

        try:
            admission = register_patient(data=serializer.validated_data, user=request.user)
        except Duplicate as duplicate:
            # Double saisie probable : on propose de réimprimer l'ancien ticket.
            return Response({"detail": str(duplicate), "doublon": CaissePatientSerializer(duplicate.admission).data},
                            status=status.HTTP_409_CONFLICT)
        return Response(CaissePatientSerializer(admission).data, status=status.HTTP_201_CREATED)


def nursing_queryset(user):
    return Admission.objects.of_hospital(hospital_of(user)).parcours_soins().select_related("patient").prefetch_related(
        Prefetch("vitals", queryset=VitalSigns.objects.order_by("-recorded_at", "-id"))
    )


class NursingPatientsView(generics.ListAPIView):
    """Patients passés à la caisse, avec leurs dernières constantes."""
    permission_classes = [NursingAccess]
    serializer_class = NursingPatientSerializer

    def get_queryset(self):
        return nursing_queryset(self.request.user)


class NursingVitalsView(APIView):
    """Bouton « Enregistrer » du formulaire Constantes."""
    permission_classes = [NursingAccess]

    def post(self, request, pk):
        admission = get_object_or_404(nursing_queryset(request.user), pk=pk)
        serializer = VitalsInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record_vitals(admission=admission, fields=serializer.to_model_fields(), user=request.user)
        return Response(NursingPatientSerializer(nursing_queryset(request.user).get(pk=pk)).data,
                        status=status.HTTP_201_CREATED)


def workflow_response(action):
    """Exécute une action du parcours ; un refus métier devient une 400 lisible."""
    try:
        return action()
    except WorkflowError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)


def consultation_queryset(user):
    queryset = nursing_queryset(user).filter(sent_to_consultation_at__isnull=False).select_related(
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
        admission = get_object_or_404(Admission.objects.of_hospital(hospital_of(request.user)), pk=pk)

        def action():
            start_consultation(admission=admission, user=request.user)
            return Response(ConsultationPatientSerializer(consultation_queryset(request.user).get(pk=pk)).data)

        return workflow_response(action)


class ConsultationValidateView(APIView):
    """Bouton « VALIDER »."""
    permission_classes = [ConsultationAccess]

    def post(self, request, pk):
        admission = get_object_or_404(Admission.objects.of_hospital(hospital_of(request.user)), pk=pk)
        serializer = ConsultationInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        def action():
            validate_consultation(admission=admission, data=serializer.validated_data, user=request.user)
            return Response(ConsultationPatientSerializer(consultation_queryset(request.user).get(pk=pk)).data)

        return workflow_response(action)


def prescription_queryset(user):
    return Prescription.objects.filter(consultation__admission__patient__hospital=hospital_of(user)).select_related(
        "patient", "doctor", "consultation", "served_by"
    ).prefetch_related("items").order_by("-id")


def prescription_from_code(code, user):
    return get_object_or_404(prescription_queryset(user), pk=int(code))


class PharmacyPrescriptionsView(APIView):
    permission_classes = [PharmacyAccess]

    def get(self, request):
        return Response(PharmacyPrescriptionSerializer(prescription_queryset(request.user), many=True).data)


class PharmacyPrepareView(APIView):
    permission_classes = [PharmacyAccess]

    def post(self, request, code):
        prescription = prescription_from_code(code, request.user)

        def action():
            prepare_prescription(prescription=prescription, user=request.user)
            return Response(PharmacyPrescriptionSerializer(prescription_from_code(code, request.user)).data)

        return workflow_response(action)


class PharmacyServeView(APIView):
    permission_classes = [PharmacyAccess]

    def post(self, request, code):
        prescription = prescription_from_code(code, request.user)

        def action():
            serve_prescription(prescription=prescription, user=request.user)
            return Response(PharmacyPrescriptionSerializer(prescription_from_code(code, request.user)).data)

        return workflow_response(action)


class PharmacyHistoryView(APIView):
    permission_classes = [PharmacyAccess]

    def get(self, request):
        served = prescription_queryset(request.user).filter(status="SERVED").order_by("-served_at", "-id")
        return Response(dispensing_history(served))


class PaymentsView(APIView):
    """Encaissements de la Caisse pour la Comptabilité."""
    permission_classes = [AccountingAccess]

    def get(self, request):
        admissions = Admission.objects.of_hospital(hospital_of(request.user)).encaissees().select_related("patient", "created_by").order_by("-created_at", "-id")
        return Response(PaymentSerializer(admissions, many=True).data)


class NotificationsView(APIView):
    """Pastille de notifications de l'en-tête : actions en attente pour l'utilisateur."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(notifications_for(request.user))
