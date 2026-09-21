"""Admission, facturation et journal des règlements. Les factures partagent billing.Invoice."""
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


def reference(prefix):
    return f"{prefix}-{timezone.localdate():%Y%m%d}-{uuid.uuid4().hex[:12].upper()}"


class Insurance(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=30, unique=True)
    rate = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)])
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=250, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.CheckConstraint(condition=Q(rate__gte=0, rate__lte=100), name="cash_insurance_rate")]


class Service(models.Model):
    name = models.CharField(max_length=100, unique=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]


class Benefit(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=150)
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    category = models.CharField(max_length=20, choices=[("CONSULTATION", "Consultation"), ("EXAM", "Examen"), ("CARE", "Soin"), ("STAY", "Hospitalisation"), ("OTHER", "Autre")])
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    covered = models.BooleanField(default=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.CheckConstraint(condition=Q(price__gte=0), name="cash_benefit_price")]


class CoverageRule(models.Model):
    insurance = models.ForeignKey(Insurance, on_delete=models.PROTECT, related_name="rules")
    benefit = models.ForeignKey(Benefit, on_delete=models.PROTECT)
    rate = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)])

    class Meta:
        constraints = [models.UniqueConstraint(fields=["insurance", "benefit"], name="cash_coverage_unique"), models.CheckConstraint(condition=Q(rate__gte=0, rate__lte=100), name="cash_rule_rate")]


class PatientCoverage(models.Model):
    patient = models.OneToOneField("patients.Patient", on_delete=models.PROTECT, related_name="coverage")
    insurance = models.ForeignKey(Insurance, on_delete=models.PROTECT)
    member_number = models.CharField(max_length=100)
    valid_until = models.DateField(null=True, blank=True)
    holder = models.CharField(max_length=180, blank=True)


class AdmissionDraft(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    data = models.JSONField(default=dict)
    step = models.PositiveSmallIntegerField(default=0)
    patient = models.ForeignKey("patients.Patient", null=True, blank=True, on_delete=models.PROTECT)
    submitted = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)


class Visit(models.Model):
    number = models.CharField(max_length=40, unique=True)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="visits")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)


class Session(models.Model):
    number = models.CharField(max_length=40, unique=True)
    cashier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cash_sessions")
    status = models.CharField(max_length=12, choices=[("OPEN", "Ouverte"), ("CLOSED", "À valider"), ("VALIDATED", "Validée")], default="OPEN")
    opened_at = models.DateTimeField(default=timezone.now)
    closed_at = models.DateTimeField(null=True)
    opening_float = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    expected_cash = models.DecimalField(max_digits=14, decimal_places=2, null=True)
    counted_cash = models.DecimalField(max_digits=14, decimal_places=2, null=True)
    closing_note = models.TextField(blank=True)
    closed_snapshot = models.JSONField(default=dict)
    validated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT, related_name="validated_cash_sessions")
    validated_at = models.DateTimeField(null=True)
    received_cash = models.DecimalField(max_digits=14, decimal_places=2, null=True)
    validation_note = models.TextField(blank=True)

    class Meta:
        ordering = ["-opened_at"]
        constraints = [models.UniqueConstraint(fields=["cashier"], condition=Q(status="OPEN"), name="cash_one_open_session"), models.CheckConstraint(condition=Q(opening_float__gte=0), name="cash_positive_float")]


class Bill(models.Model):
    invoice = models.OneToOneField("billing.Invoice", on_delete=models.PROTECT, related_name="cashier_bill")
    visit = models.ForeignKey(Visit, on_delete=models.PROTECT, related_name="bills")
    insurance = models.ForeignKey(Insurance, null=True, on_delete=models.PROTECT)
    patient_snapshot = models.JSONField(default=dict)
    insurance_snapshot = models.JSONField(default=dict)
    clinic_snapshot = models.JSONField(default=dict)
    patient_share = models.DecimalField(max_digits=14, decimal_places=2)
    insurance_share = models.DecimalField(max_digits=14, decimal_places=2)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)
    coverage_confirmed_at = models.DateTimeField(null=True)
    claim_status = models.CharField(max_length=15, choices=[("DUE", "À transmettre"), ("SENT", "Transmis"), ("DISPUTED", "Contesté"), ("PARTIAL", "Partiellement réglé"), ("PAID", "Réglé")], default="DUE")
    claim_note = models.TextField(blank=True)


class BillLine(models.Model):
    bill = models.ForeignKey(Bill, on_delete=models.PROTECT, related_name="lines")
    item = models.OneToOneField("billing.InvoiceItem", on_delete=models.PROTECT)
    benefit = models.ForeignKey(Benefit, on_delete=models.PROTECT)
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    service_name = models.CharField(max_length=100)
    category = models.CharField(max_length=20)
    rate = models.DecimalField(max_digits=5, decimal_places=2)
    insurance_share = models.DecimalField(max_digits=14, decimal_places=2)
    patient_share = models.DecimalField(max_digits=14, decimal_places=2)


class Payment(models.Model):
    MODES = [("CASH", "Espèces"), ("MOBILE", "Mobile Money"), ("CARD", "Carte"), ("TRANSFER", "Virement")]
    number = models.CharField(max_length=40, unique=True)
    bill = models.ForeignKey(Bill, on_delete=models.PROTECT, related_name="payments")
    payer = models.CharField(max_length=10, choices=[("PATIENT", "Patient"), ("INSURANCE", "Assurance")])
    session = models.ForeignKey(Session, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    tendered = models.DecimalField(max_digits=14, decimal_places=2)
    mode = models.CharField(max_length=10, choices=MODES)
    reference = models.CharField(max_length=100, blank=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(amount__gt=0), name="cash_payment_positive"),
            models.UniqueConstraint(fields=["mode", "reference"], condition=~Q(mode="CASH"), name="cash_electronic_reference")]


class PaymentAllocation(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="allocations")
    line = models.ForeignKey(BillLine, on_delete=models.PROTECT, related_name="allocations")
    amount = models.DecimalField(max_digits=14, decimal_places=2)


class CreditNote(models.Model):
    number = models.CharField(max_length=40, unique=True)
    bill = models.ForeignKey(Bill, on_delete=models.PROTECT, related_name="credits")
    lines = models.JSONField(default=list)
    patient_amount = models.DecimalField(max_digits=14, decimal_places=2)
    insurance_amount = models.DecimalField(max_digits=14, decimal_places=2)
    reason = models.TextField()
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)


class Refund(models.Model):
    number = models.CharField(max_length=40, unique=True)
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="refunds")
    session = models.ForeignKey(Session, on_delete=models.PROTECT, related_name="refunds")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    mode = models.CharField(max_length=10, choices=Payment.MODES)
    reference = models.CharField(max_length=100, blank=True)
    reason = models.TextField()
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)


class RefundAllocation(models.Model):
    refund = models.ForeignKey(Refund, on_delete=models.PROTECT, related_name="allocations")
    line = models.ForeignKey(BillLine, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=14, decimal_places=2)


class CashMovement(models.Model):
    session = models.ForeignKey(Session, on_delete=models.PROTECT, related_name="movements")
    kind = models.CharField(max_length=12, choices=[("IN", "Apport"), ("OUT", "Sortie"), ("HANDOVER", "Versement intermédiaire")])
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    reason = models.TextField()
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT, related_name="received_cash_movements")
    received_at = models.DateTimeField(null=True)


class ClaimBatch(models.Model):
    number = models.CharField(max_length=40, unique=True)
    insurance = models.ForeignKey(Insurance, on_delete=models.PROTECT)
    bills = models.ManyToManyField(Bill, related_name="batches")
    snapshot = models.JSONField(default=list)
    supporting_reference = models.CharField(max_length=250)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)


class ServiceQueue(models.Model):
    line = models.OneToOneField(BillLine, on_delete=models.PROTECT, related_name="queue_entry")
    destination = models.CharField(max_length=120)
    status = models.CharField(max_length=12, choices=[("WAITING", "En attente"), ("RECEIVED", "Reçu"), ("DONE", "Terminé"), ("CANCELLED", "Annulé")], default="WAITING")
    created_at = models.DateTimeField(default=timezone.now)


class ClinicSettings(models.Model):
    name = models.CharField(max_length=160, default="Ma Santé")
    address = models.CharField(max_length=250, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    legal_info = models.CharField(max_length=300, blank=True)


class AuditEvent(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=80)
    object_id = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)


class Operation(models.Model):
    """Réponse atomique rejouable après double clic ou coupure réseau."""
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    key = models.UUIDField()
    fingerprint = models.CharField(max_length=64)
    response = models.JSONField(default=dict)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["actor", "key"], name="cash_operation_unique")]
