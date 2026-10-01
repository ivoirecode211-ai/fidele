from rest_framework import viewsets

from accounts.tenancy import hospital_of
from parcours.permissions import RoleAccess

from .models import Consultation
from .serializers import ConsultationSerializer


class LectureConsultations(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "DOCTOR"}


class ConsultationViewSet(viewsets.ReadOnlyModelViewSet):
    """Route générique, en lecture seule : les consultations se mènent dans /api/consultations/medecine/.

    Limitée à l'hôpital de l'utilisateur ; les consultations confidentielles (VIH) restent réservées
    aux médecins et à l'administrateur, comme dans le Dossier patient.
    """
    serializer_class = ConsultationSerializer
    permission_classes = [LectureConsultations]

    def get_queryset(self):
        from dossier.services import CONFIDENTIELLES, LECTEURS_CONFIDENTIELS

        user = self.request.user
        qs = Consultation.objects.select_related("patient", "doctor").filter(patient__hospital=hospital_of(user))
        if not (user.is_superuser or user.role_codes & LECTEURS_CONFIDENTIELS):
            qs = qs.exclude(specialite__in=CONFIDENTIELLES)
        return qs
