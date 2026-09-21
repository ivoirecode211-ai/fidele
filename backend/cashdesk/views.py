import hashlib
import json
import uuid
from datetime import date

from django.contrib.auth import get_user_model
from django.core.serializers.json import DjangoJSONEncoder
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from patients.models import Patient
from .models import *  # noqa: F403
from .serializers import (InsuranceSerializer, ServiceSerializer, BenefitSerializer, RuleSerializer,
    PatientSerializer, DraftSerializer, ClinicSerializer)
from . import services
from .presenters import bill_data, session_data, actor_name, payment_data


class CashAccess(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and (request.user.is_superuser or request.user.role in services.CASHIERS))


class CashView(APIView):
    permission_classes = [CashAccess]


class CatalogueViewSet(viewsets.ModelViewSet):
    permission_classes = [CashAccess]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        services.require_manager(self.request.user)
        with transaction.atomic():
            if serializer.Meta.model is CoverageRule:
                Insurance.objects.select_for_update().get(pk=serializer.validated_data["insurance"].pk)
            obj = serializer.save()
            services.audit(self.request.user, f"creation_{obj._meta.model_name}", obj, serializer.data)

    def perform_update(self, serializer):
        services.require_manager(self.request.user)
        with transaction.atomic():
            if isinstance(serializer.instance, CoverageRule):
                Insurance.objects.select_for_update().get(pk=serializer.instance.insurance_id)
                incoming = serializer.validated_data.get("insurance")
                if incoming and incoming.pk != serializer.instance.insurance_id:
                    raise ValidationError("Créez une nouvelle règle pour changer d'organisme.")
            serializer.instance = type(serializer.instance).objects.select_for_update().get(pk=serializer.instance.pk)
            before = self.get_serializer(serializer.instance).data
            obj = serializer.save()
            services.audit(self.request.user, f"modification_{obj._meta.model_name}", obj, {"before": before, "after": serializer.data})


class InsuranceViewSet(CatalogueViewSet):
    queryset = Insurance.objects.all()
    serializer_class = InsuranceSerializer


class ServiceViewSet(CatalogueViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer


class BenefitViewSet(CatalogueViewSet):
    queryset = Benefit.objects.select_related("service").all()
    serializer_class = BenefitSerializer


class RuleViewSet(CatalogueViewSet):
    queryset = CoverageRule.objects.all()
    serializer_class = RuleSerializer


class DraftViewSet(viewsets.ModelViewSet):
    permission_classes = [CashAccess]
    serializer_class = DraftSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return AdmissionDraft.objects.filter(owner=self.request.user, submitted=False).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


def paginate(request, qs, serializer):
    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except ValueError:
        raise ValidationError("Page invalide.")
    size = 25
    return Response({"count": qs.count(), "page": page,
        "results": [serializer(obj) for obj in qs[(page - 1) * size:page * size]]})


class PatientsView(CashView):
    def get(self, request):
        qs = Patient.objects.select_related("coverage__insurance").order_by("last_name", "first_names")
        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(last_name__icontains=q) | Q(first_names__icontains=q) | Q(phone__icontains=q) | Q(patient_number__icontains=q))
        return paginate(request, qs, lambda p: PatientSerializer(p).data)


class PatientView(CashView):
    def get(self, request, pk):
        return Response(PatientSerializer(services.fetch(Patient, pk)).data)


class VisitView(CashView):
    def get(self, request, pk):
        obj = services.fetch(Visit, pk)
        clinic, _ = ClinicSettings.objects.get_or_create(pk=1)
        return Response({"id": obj.pk, "number": obj.number, "created_at": obj.created_at,
            "patient": PatientSerializer(obj.patient).data, "clinic": ClinicSerializer(clinic).data,
            "created_by": actor_name(obj.created_by)})


class BillsView(CashView):
    def get(self, request):
        qs = Bill.objects.select_related("invoice", "visit", "created_by").order_by("-created_at")
        patient = request.query_params.get("patient")
        if patient:
            qs = qs.filter(visit__patient_id=services.identifier(patient))
        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(invoice__number__icontains=q) | Q(visit__patient__last_name__icontains=q)
                | Q(visit__patient__first_names__icontains=q) | Q(visit__patient__patient_number__icontains=q)
                | Q(payments__number__icontains=q)).distinct()
        return paginate(request, qs, bill_data)


class BillView(CashView):
    def get(self, request, pk):
        return Response(bill_data(services.fetch(Bill, pk)))


class QuoteView(CashView):
    def post(self, request):
        return Response(services.quote(request.data))


class ActionView(CashView):
    def post(self, request, action):
        handler = services.ACTIONS.get(action)
        if not handler:
            raise ValidationError("Opération inconnue.")
        if not isinstance(request.data, dict):
            raise ValidationError("Requête invalide.")
        try:
            key = uuid.UUID(request.headers.get("Idempotency-Key", ""))
        except (ValueError, AttributeError):
            raise ValidationError("La clé de l'opération est manquante. Actualisez la page.")
        fingerprint = hashlib.sha256(json.dumps([action, request.data], sort_keys=True, cls=DjangoJSONEncoder).encode()).hexdigest()
        try:
            with transaction.atomic():
                # Même utilisateur : requêtes sérialisées, réponse persistée dans la même transaction.
                get_user_model().objects.select_for_update().get(pk=request.user.pk)
                operation = Operation.objects.filter(actor=request.user, key=key).first()
                if operation:
                    if operation.fingerprint != fingerprint:
                        raise ValidationError("Cette clé a déjà servi pour une autre opération.")
                    return Response(operation.response)
                result = handler(request.user, request.data)
                Operation.objects.create(actor=request.user, key=key, fingerprint=fingerprint, response=result)
                return Response(result)
        except IntegrityError:
            raise ValidationError("Une opération concurrente a déjà enregistré ces données. Actualisez avant de réessayer.")


class SessionsView(CashView):
    def get(self, request):
        qs = Session.objects.select_related("cashier", "validated_by").all()
        if not services.manager(request.user):
            qs = qs.filter(cashier=request.user)
        return paginate(request, qs, session_data)


class SessionView(CashView):
    def get(self, request, pk):
        session = services.fetch(Session, pk)
        if session.cashier_id != request.user.pk and not services.manager(request.user):
            raise PermissionDenied()
        return Response(session_data(session))


class OverviewView(CashView):
    def get(self, request):
        session = Session.objects.filter(cashier=request.user, status="OPEN").first()
        return Response({"manager": services.manager(request.user), "user_id": request.user.pk,
            "session": session_data(session) if session else None,
            "drafts": DraftSerializer(AdmissionDraft.objects.filter(owner=request.user, submitted=False).order_by("-updated_at"), many=True).data})


class CatalogView(CashView):
    def get(self, request):
        clinic, _ = ClinicSettings.objects.get_or_create(pk=1)
        staff = get_user_model().objects.filter(Q(role__in=services.CASHIERS) | Q(is_superuser=True)).order_by("last_name", "username")
        return Response({"insurances": InsuranceSerializer(Insurance.objects.all(), many=True).data,
            "services": ServiceSerializer(Service.objects.all(), many=True).data,
            "benefits": BenefitSerializer(Benefit.objects.select_related("service").all(), many=True).data,
            "rules": RuleSerializer(CoverageRule.objects.all(), many=True).data,
            "clinic": ClinicSerializer(clinic).data,
            "staff": [{"id": u.pk, "name": actor_name(u)} for u in staff] if services.manager(request.user) else []})


class ClaimsView(CashView):
    def get(self, request):
        services.require_manager(request.user)
        qs = Bill.objects.filter(insurance_share__gt=0).order_by("-created_at")
        if request.query_params.get("insurance"):
            qs = qs.filter(insurance_id=services.identifier(request.query_params["insurance"]))
        return paginate(request, qs, bill_data)


class BatchesView(CashView):
    def get(self, request):
        services.require_manager(request.user)
        return paginate(request, ClaimBatch.objects.select_related("insurance", "created_by").order_by("-created_at"),
            lambda b: {"id": b.pk, "number": b.number, "insurance": b.insurance.name, "rows": b.snapshot,
                "supporting_reference": b.supporting_reference, "created_at": b.created_at,
                "created_by": actor_name(b.created_by)})


class ClinicView(CashView):
    def get(self, request):
        obj, _ = ClinicSettings.objects.get_or_create(pk=1)
        return Response(ClinicSerializer(obj).data)

    def patch(self, request):
        services.require_manager(request.user)
        with transaction.atomic():
            obj, _ = ClinicSettings.objects.select_for_update().get_or_create(pk=1)
            serializer = ClinicSerializer(obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            services.audit(request.user, "parametres_recu", obj, serializer.data)
            return Response(serializer.data)


class QueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in services.CASHIERS | {"NURSE", "DOCTOR", "LAB"} and not request.user.is_superuser:
            raise PermissionDenied()
        qs = ServiceQueue.objects.select_related("line__bill__visit__patient", "line__item").order_by("created_at")
        return paginate(request, qs, lambda e: {"id": e.pk, "patient": str(e.line.bill.visit.patient),
            "destination": e.destination, "prestation": e.line.item.label, "status": e.status,
            "created_at": e.created_at})

    def patch(self, request):
        if request.user.role not in {"ADMIN", "DIRECTOR", "NURSE", "DOCTOR", "LAB"} and not request.user.is_superuser:
            raise PermissionDenied("Le service de soins met à jour la prise en charge.")
        with transaction.atomic():
            obj = services.fetch(ServiceQueue, request.data.get("id"))
            Bill.objects.select_for_update().get(pk=obj.line.bill_id)
            obj = services.fetch(ServiceQueue, obj.pk, lock=True)
            expected = {"WAITING": "RECEIVED", "RECEIVED": "DONE"}.get(obj.status)
            if request.data.get("status") != expected or expected is None:
                raise ValidationError("Cette transition n'est pas possible.")
            obj.status = expected
            obj.save(update_fields=["status"])
            services.audit(request.user, "orientation", obj, {"status": expected})
        return Response({"id": obj.pk, "status": obj.status})


class AuditView(CashView):
    def get(self, request):
        qs = AuditEvent.objects.select_related("actor").order_by("-created_at")
        if not services.manager(request.user):
            qs = qs.filter(actor=request.user)
        return paginate(request, qs, lambda e: {"id": e.pk, "actor": actor_name(e.actor),
            "action": e.action, "object_id": e.object_id, "details": e.details, "created_at": e.created_at})
