from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from administration.audit import client_ip
from administration.models import AuditLog
from parcours.permissions import RoleAccess
from patients.models import Patient

from . import services


class DossierAccess(RoleAccess):
    """Tout le personnel qui soigne ou accueille ; chacun ne voit que ses sections."""
    roles = {"ADMIN", "DIRECTOR", "DOCTOR", "NURSE", "RECEPTION", "LAB", "PHARMACY", "ACCOUNTING", "REGISSEUR"}


def own_patients(user):
    return Patient.objects.filter(hospital=hospital_of(user))


class SearchView(APIView):
    permission_classes = [DossierAccess]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        qs = own_patients(request.user)
        if q:
            qs = qs.filter(Q(last_name__icontains=q) | Q(first_names__icontains=q) | Q(patient_number__icontains=q)
                           | Q(phone__icontains=q) | Q(insurance_number__icontains=q))
        total = qs.count()
        rows = list(qs.order_by("-created_at")[:30])
        return Response({"total": total, "patients": [services.ligne(p) for p in rows]})


def doublons(user):
    """Dossiers qui se ressemblent : même nom et même date de naissance, ou même nom et même téléphone."""
    from collections import defaultdict

    groupes = defaultdict(list)
    for p in own_patients(user).only("id", "patient_number", "last_name", "first_names", "sex", "birth_date",
                                     "phone", "insurance", "allergies", "created_at"):
        nom = " ".join(f"{p.last_name} {p.first_names}".lower().split())
        if p.birth_date:
            groupes[("naissance", nom, p.birth_date)].append(p)
        if p.phone and len(p.phone.strip()) >= 8:
            groupes[("telephone", nom, p.phone.replace(" ", ""))].append(p)
    vus, resultat = set(), []
    for (critere, _, valeur), patients in groupes.items():
        if len(patients) < 2:
            continue
        cle = tuple(sorted(x.pk for x in patients))
        if cle in vus:
            continue
        vus.add(cle)
        resultat.append({
            "critere": "Même nom et même date de naissance" if critere == "naissance" else "Même nom et même téléphone",
            "patients": [services.ligne(x) for x in sorted(patients, key=lambda x: x.created_at)],
        })
    return resultat


class ListesView(APIView):
    """Les listes de la barre latérale : patients du jour, récemment ouverts, hospitalisés, doublons."""
    permission_classes = [DossierAccess]

    def get(self, request, vue):
        from django.utils import timezone

        patients = own_patients(request.user)
        if vue == "jour":
            from parcours.models import Admission

            ids = (Admission.objects.of_hospital(hospital_of(request.user)).actives()
                   .filter(created_at__date=timezone.localdate()).order_by("-created_at").values_list("patient_id", flat=True))
            ordre = list(dict.fromkeys(ids))
            par_id = {p.pk: p for p in patients.filter(pk__in=ordre)}
            return Response({"patients": [services.ligne(par_id[i]) for i in ordre if i in par_id]})
        if vue == "recents":
            codes = (AuditLog.objects.filter(user=request.user, module="Dossier patient", action="Consultation")
                     .order_by("-created_at").values_list("description", "created_at")[:200])
            ordre, quand = [], {}
            for description, moment in codes:
                code = description.split(" — ")[0]
                if code not in quand:
                    quand[code] = timezone.localtime(moment).strftime("%d/%m/%Y %H:%M")
                    ordre.append(code)
            par_code = {p.patient_number: p for p in patients.filter(patient_number__in=ordre[:30])}
            return Response({"patients": [{**services.ligne(par_code[c]), "ouvertLe": quand[c]}
                                          for c in ordre[:30] if c in par_code]})
        if vue == "hospitalises":
            from hospitalization.models import Hospitalization

            sejours = (Hospitalization.objects.filter(patient__in=patients, discharge_date__isnull=True)
                       .select_related("patient", "bed__room").order_by("bed__room__name"))
            return Response({"patients": [{**services.ligne(h.patient), "lit": f"{h.bed.room.name} / {h.bed.number}",
                                           "depuis": timezone.localtime(h.admission_date).strftime("%d/%m/%Y"),
                                           "motif": h.reason} for h in sejours]})
        if vue == "doublons":
            return Response({"groupes": doublons(request.user)})
        return Response({"detail": "Liste inconnue."}, status=status.HTTP_404_NOT_FOUND)


class FusionView(APIView):
    """Fusionner deux dossiers d'un même patient : réservé à l'administration et à la direction."""
    permission_classes = [DossierAccess]

    def post(self, request):
        if not (request.user.is_superuser or request.user.has_role("ADMIN", "DIRECTOR")):
            return Response({"detail": "Seules l'administration et la direction peuvent fusionner des dossiers."},
                            status=status.HTTP_403_FORBIDDEN)
        garde = get_object_or_404(own_patients(request.user), pk=request.data.get("garde"))
        doublon = get_object_or_404(own_patients(request.user), pk=request.data.get("doublon"))
        if garde.pk == doublon.pk:
            return Response({"detail": "Choisissez deux dossiers différents."}, status=status.HTTP_400_BAD_REQUEST)
        description = f"{doublon.patient_number} fusionné dans {garde.patient_number} — {garde.last_name} {garde.first_names}"
        services.fusionner(garde=garde, doublon=doublon)
        AuditLog.objects.create(
            user=request.user, username=request.user.username, action="Fusion", module="Dossier patient",
            description=description[:255], method="POST", path=request.path[:255], status_code=200,
            ip_address=client_ip(request), user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
        )
        return Response(services.ligne(garde))


class IdentityInput(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = services.CHAMPS_IDENTITE + services.CHAMPS_MEDICAUX
        extra_kwargs = {name: {"required": False} for name in services.CHAMPS_IDENTITE + services.CHAMPS_MEDICAUX}

    def validate_last_name(self, value):
        return value.strip().upper()


class RecordView(APIView):
    permission_classes = [DossierAccess]

    def get(self, request, pk):
        patient = get_object_or_404(own_patients(request.user).select_related("hospital"), pk=pk)
        # Qui a ouvert quel dossier, et quand : la traçabilité exigée pour des données de santé.
        AuditLog.objects.create(
            user=request.user, username=request.user.username, action="Consultation", module="Dossier patient",
            description=f"{patient.patient_number} — {patient.last_name} {patient.first_names}"[:255],
            method="GET", path=request.path[:255], status_code=200, ip_address=client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
        )
        return Response(services.dossier(patient, request.user))

    def patch(self, request, pk):
        patient = get_object_or_404(own_patients(request.user), pk=pk)
        user = request.user
        allowed = set()
        if user.is_superuser or user.role_codes & services.MODIFIER_IDENTITE:
            allowed |= set(services.CHAMPS_IDENTITE)
        if user.is_superuser or user.role_codes & services.MODIFIER_MEDICAL:
            allowed |= set(services.CHAMPS_MEDICAUX)
        refused = set(request.data) - allowed
        if refused:
            return Response({"detail": "Vous ne pouvez pas modifier : " + ", ".join(sorted(refused)) + "."},
                            status=status.HTTP_403_FORBIDDEN)
        serializer = IdentityInput(patient, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(services.dossier(patient, user))
