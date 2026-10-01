from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of

from . import alertes

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
    prescription_code,
)
from .services import (
    WorkflowError,
    doctor_label,
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
            "services": MedicalServiceSerializer(
                MedicalService.objects.filter(active=True, hospital=hospital_of(request.user)), many=True).data,
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
        # Chaque hôpital a son catalogue : une prestation d'un autre hôpital n'existe pas ici.
        if serializer.validated_data["service"].hospital_id != hospital_of(request.user).pk:
            return Response({"service": ["Prestation inconnue dans cet hôpital."]}, status=status.HTTP_400_BAD_REQUEST)
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


class PharmacyReceiptView(APIView):
    """Reçu de dispensation : l'établissement, le patient, chaque médicament avec sa posologie et son prix."""
    permission_classes = [PharmacyAccess]

    def get(self, request, code):
        from django.utils import timezone
        from stocks.models import Product

        from .accueil_views import assurance_de, etablissement

        prescription = prescription_from_code(code, request.user)
        patient = prescription.patient
        catalogue = {p.name.lower().strip(): p for p in Product.objects.filter(category="Médicament")}
        lignes, total = [], 0
        for item in prescription.items.all():
            produit = catalogue.get(item.medicine.lower().strip())
            quantite = max(item.quantity, 1)
            prix = float(produit.price) if produit else None
            montant = prix * quantite if prix is not None else None
            total += montant or 0
            lignes.append({
                "medicament": item.medicine,
                "posologie": " · ".join(x for x in (item.dose, item.frequency, item.duration) if x),
                "consignes": item.instructions,
                "quantite": quantite,
                "unite": produit.unit if produit else "",
                "prix_unitaire": prix,
                "montant": montant,
            })
        pharmacien = prescription.served_by or request.user
        servie = prescription.status == "SERVED"
        # Tiers payant : l'organisme du patient prend sa part, le patient règle le reste.
        assurance = assurance_de(patient)
        taux = float(assurance.coverage) if assurance else 0
        part_assurance = round(total * taux / 100)
        return Response({
            "etablissement": etablissement(request.user),
            "recu": {
                "reference": f"ORD-{prescription_code(prescription)}",
                "statut": "Délivrée" if servie else "Non encore délivrée",
                "servie": servie,
                "date": timezone.localtime(prescription.served_at or timezone.now()).isoformat(),
                "patient_nom": f"{patient.last_name} {patient.first_names}".strip(),
                "patient_code": patient.patient_number,
                "patient_sexe": patient.sex,
                "patient_naissance": patient.birth_date.isoformat() if patient.birth_date else None,
                "medecin": doctor_label(prescription.doctor),
                "date_prescription": prescription.date.isoformat() if prescription.date else None,
                "assurance": {"nom": assurance.name, "taux": taux, "numero": patient.insurance_number} if assurance else None,
                "pharmacien": pharmacien.get_full_name() or pharmacien.username,
                "instructions": prescription.instructions,
                "lignes": lignes,
                "total": total,
                "part_assurance": part_assurance,
                "net_a_payer": total - part_assurance,
                "hors_catalogue": sum(1 for ligne in lignes if ligne["prix_unitaire"] is None),
            },
        })


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
        return Response(alertes.pour(request.user))


class NotificationsVuesView(APIView):
    """Clic sur la cloche : la pastille s'efface jusqu'à la prochaine nouveauté."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response(alertes.marquer_vues(request.user))


class NotificationsPushView(APIView):
    """Abonnement du navigateur aux notifications push (application fermée)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"publicKey": alertes.cle_publique()})

    def post(self, request):
        if not alertes.abonner(request.user, request.data.get("subscription") or {}):
            return Response({"detail": "Abonnement aux notifications invalide."}, status=status.HTTP_400_BAD_REQUEST)
        # Ce qui attend déjà ne sonne pas une seconde fois : seul ce qui arrive ensuite partira.
        alertes.alerter(request.user)
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request):
        alertes.desabonner(request.user, request.data.get("endpoint", ""))
        return Response(status=status.HTTP_204_NO_CONTENT)
