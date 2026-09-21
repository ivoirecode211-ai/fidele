from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404

from billing.models import Invoice, InvoiceItem
from patients.models import Patient
from .models import (
    Insurance, Benefit, PatientCoverage, AdmissionDraft, Visit, Session, Bill, BillLine,
    Payment, CreditNote, Refund, CashMovement, ClaimBatch, ServiceQueue, ClinicSettings,
    AuditEvent, PaymentAllocation, RefundAllocation, reference,
)

MANAGERS = {"ADMIN", "DIRECTOR", "ACCOUNTING"}
CASHIERS = MANAGERS | {"RECEPTION"}
ZERO = Decimal("0.00")


def manager(user):
    return user.is_superuser or user.role in MANAGERS


def require_manager(user):
    if not manager(user):
        raise PermissionDenied("Cette opération est réservée au responsable de caisse.")


def money(value, *, positive=False):
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount < 0 or amount > Decimal("9999999999.99"):
            raise ValueError
        if amount != amount.quantize(Decimal("0.01")):
            raise ValueError
        if positive and amount == 0:
            raise ValueError
        return amount.quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError("Saisissez un montant valide, avec au plus deux décimales.")


def identifier(value):
    try:
        number = int(str(value))
        if number <= 0:
            raise ValueError
        return number
    except (ValueError, TypeError):
        raise ValidationError("Identifiant invalide.")


def fetch(model, value, lock=False):
    qs = model.objects.select_for_update() if lock else model.objects
    return get_object_or_404(qs, pk=identifier(value))


def note(value):
    value = str(value or "").strip()
    if len(value) < 3 or len(value) > 1000:
        raise ValidationError("Renseignez un motif de 3 à 1 000 caractères.")
    return value


def total(qs, field="amount"):
    return qs.aggregate(value=Sum(field))["value"] or ZERO


def audit(user, action, obj, details=None):
    AuditEvent.objects.create(actor=user, action=action, object_id=str(obj.pk), details=details or {})


def open_session(user):
    session = Session.objects.select_for_update().filter(cashier=user, status="OPEN").first()
    if not session:
        raise ValidationError("Ouvrez votre caisse avant cette opération.")
    return session


def balances(bill):
    result = {}
    for payer, field in [("PATIENT", "patient"), ("INSURANCE", "insurance")]:
        paid = total(bill.payments.filter(payer=payer))
        refunded = total(Refund.objects.filter(payment__bill=bill, payment__payer=payer))
        credited = total(bill.credits.all(), f"{field}_amount")
        due = getattr(bill, f"{field}_share") - credited
        result.update({f"{field}_due": due, f"{field}_paid": paid - refunded,
                       f"{field}_remaining": max(due - paid + refunded, ZERO),
                       f"{field}_refundable": max(paid - refunded - due, ZERO),
                       f"{field}_credit": credited})
    result["cancelled"] = result["patient_due"] + result["insurance_due"] == 0 and bill.credits.exists()
    result["patient_status"] = "CANCELLED" if result["cancelled"] else (
        "PAID" if result["patient_remaining"] == 0 else "PARTIAL" if result["patient_paid"] > 0 else "UNPAID")
    return result


def synchronize(bill):
    balance = balances(bill)
    invoice = bill.invoice
    invoice.amount_paid = balance["patient_paid"] + balance["insurance_paid"]
    remaining = balance["patient_remaining"] + balance["insurance_remaining"]
    invoice.status = "PAID" if remaining == 0 else "PARTIAL" if invoice.amount_paid else "UNPAID"
    invoice.save(update_fields=["amount_paid", "status"])
    if bill.insurance_share:
        if balance["insurance_remaining"] == 0:
            bill.claim_status = "PAID"
        elif balance["insurance_paid"] > 0:
            bill.claim_status = "PARTIAL"
        elif bill.claim_status == "PAID":
            bill.claim_status = "SENT" if bill.batches.exists() else "DUE"
        bill.save(update_fields=["claim_status"])
    credited = credited_quantities(bill)
    for line in bill.lines.select_related("item"):
        if credited.get(line.pk, 0) >= line.item.quantity:
            ServiceQueue.objects.filter(line=line).update(status="CANCELLED")
        elif balance["patient_remaining"] == 0 and not balance["cancelled"] and (
            bill.patient_share > 0 or bill.coverage_confirmed_at):
            destination = "Infirmerie" if line.category == "CONSULTATION" else line.service_name
            ServiceQueue.objects.get_or_create(line=line, defaults={"destination": destination})
    return balance


def session_totals(session):
    by_mode = {mode: total(session.payments.filter(mode=mode)) - total(session.refunds.filter(mode=mode))
               for mode, _ in Payment.MODES}
    incoming = total(session.movements.filter(kind="IN"))
    outgoing = total(session.movements.filter(kind__in=["OUT", "HANDOVER"]))
    return {"by_mode": {k: str(v) for k, v in by_mode.items()},
            "expected_cash": str(session.opening_float + by_mode["CASH"] + incoming - outgoing),
            "incoming": str(incoming), "outgoing": str(outgoing),
            "refunds": str(total(session.refunds.all())), "receipts": session.payments.count()}


def admit(user, data):
    from .serializers import AdmissionSerializer
    serializer = AdmissionSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    values = dict(serializer.validated_data)
    draft_id = values.pop("draft_id", None)
    patient_id = values.pop("patient_id", None)
    draft = None
    if draft_id:
        draft = get_object_or_404(AdmissionDraft.objects.select_for_update(), pk=draft_id, owner=user)
        if draft.submitted:
            raise ValidationError("Ce brouillon a déjà été enregistré. Ouvrez le dossier existant.")
    insured = values.pop("insured")
    insurance_id = values.pop("insurance_id", None)
    member_number = values.pop("member_number", "")
    valid_until = values.pop("valid_until", None)
    holder = values.pop("holder", "")
    if patient_id:
        patient = fetch(Patient, patient_id, lock=True)
        for key, value in values.items():
            setattr(patient, key, value)
        patient.save()
    else:
        # Les homonymes sont possibles : le rapprochement est proposé, jamais fusionné implicitement.
        patient = Patient.objects.create(patient_number=reference("PAT"), **values)
    if insured:
        insurance = fetch(Insurance, insurance_id, lock=True)
        if not insurance.active:
            raise ValidationError("Cette assurance est désactivée.")
        PatientCoverage.objects.update_or_create(patient=patient, defaults={"insurance": insurance,
            "member_number": member_number, "valid_until": valid_until, "holder": holder})
        patient.insurance, patient.insurance_number = insurance.name, member_number
    else:
        PatientCoverage.objects.filter(patient=patient).delete()
        patient.insurance = patient.insurance_number = ""
    patient.save(update_fields=["insurance", "insurance_number"])
    visit = Visit.objects.create(number=reference("ADM"), patient=patient, created_by=user)
    if draft:
        draft.submitted, draft.patient = True, patient
        draft.save()
    audit(user, "admission", visit, {"patient": patient.pk})
    return {"patient_id": patient.pk, "visit_id": visit.pk, "number": visit.number}


def new_visit(user, data):
    patient = fetch(Patient, data.get("patient_id"), lock=True)
    visit = Visit.objects.create(number=reference("ADM"), patient=patient, created_by=user)
    audit(user, "nouvelle_visite", visit)
    return {"patient_id": patient.pk, "visit_id": visit.pk, "number": visit.number}


def quote(data):
    visit = fetch(Visit, data.get("visit_id"))
    coverage = PatientCoverage.objects.select_related("insurance").filter(patient=visit.patient).first()
    insurance = coverage.insurance if coverage else None
    if coverage and (not insurance.active or (coverage.valid_until and coverage.valid_until < timezone.localdate())):
        raise ValidationError("La couverture est expirée ou désactivée. Mettez le dossier à jour avant de facturer.")
    source = data.get("lines")
    if not isinstance(source, list) or not 1 <= len(source) <= 50:
        raise ValidationError("Ajoutez entre 1 et 50 prestations.")
    lines, seen = [], set()
    for row in source:
        if not isinstance(row, dict):
            raise ValidationError("Ligne de prestation invalide.")
        benefit = fetch(Benefit, row.get("benefit"))
        if not benefit.active or not benefit.service.active:
            raise ValidationError("Une prestation sélectionnée est désactivée.")
        if benefit.pk in seen:
            raise ValidationError("Regroupez les quantités d'une même prestation sur une ligne.")
        seen.add(benefit.pk)
        quantity = identifier(row.get("quantity"))
        if quantity > 1000:
            raise ValidationError("La quantité maximale est de 1 000.")
        rate = ZERO
        if insurance and benefit.covered:
            rule = insurance.rules.filter(benefit=benefit).first()
            rate = rule.rate if rule else insurance.rate
        amount = money(benefit.price * quantity)
        insurance_share = (amount * rate / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        lines.append({"benefit": benefit.pk, "name": benefit.name, "service": benefit.service_id,
            "service_name": benefit.service.name, "category": benefit.category, "quantity": quantity,
            "price": str(benefit.price), "rate": str(rate), "total": str(amount),
            "insurance_share": str(insurance_share), "patient_share": str(amount - insurance_share)})
    return {"lines": lines, "total": str(money(sum(Decimal(l["total"]) for l in lines))),
        "patient_share": str(sum(Decimal(l["patient_share"]) for l in lines)),
        "insurance_share": str(sum(Decimal(l["insurance_share"]) for l in lines))}


def create_bill(user, data):
    from .serializers import PatientSerializer
    visit = fetch(Visit, data.get("visit_id"), lock=True)
    Patient.objects.select_for_update().get(pk=visit.patient_id)
    coverage = PatientCoverage.objects.filter(patient=visit.patient).first()
    if coverage:
        Insurance.objects.select_for_update().get(pk=coverage.insurance_id)
    quote(data)  # Valide les identifiants avant le verrouillage.
    # Les mises à jour du catalogue verrouillent ces mêmes lignes.
    list(Benefit.objects.select_for_update().filter(pk__in=[identifier(r["benefit"]) for r in data["lines"]]).order_by("pk"))
    priced = quote(data)
    if data.get("quote") != priced:
        raise ValidationError("Les tarifs ont changé. Recalculez puis confirmez les nouveaux montants.")
    invoice = Invoice.objects.create(patient=visit.patient, number=reference("FAC"), total=priced["total"])
    clinic, _ = ClinicSettings.objects.get_or_create(pk=1)
    bill = Bill.objects.create(invoice=invoice, visit=visit,
        insurance_id=coverage.insurance_id if coverage else None,
        insurance_snapshot={"name": coverage.insurance.name, "member_number": coverage.member_number,
            "rate": str(coverage.insurance.rate), "holder": coverage.holder,
            "valid_until": str(coverage.valid_until or "")} if coverage else {},
        patient_snapshot={k: v for k, v in PatientSerializer(visit.patient).data.items() if k in ["full_name", "patient_number", "birth_date", "sex"]},
        clinic_snapshot={k: getattr(clinic, k) for k in ["name", "address", "phone", "legal_info"]},
        patient_share=priced["patient_share"], insurance_share=priced["insurance_share"], created_by=user)
    for line in priced["lines"]:
        item = InvoiceItem.objects.create(invoice=invoice, label=line["name"], quantity=line["quantity"], unit_price=line["price"])
        BillLine.objects.create(bill=bill, item=item, benefit_id=line["benefit"], service_id=line["service"],
            service_name=line["service_name"], category=line["category"], rate=line["rate"],
            patient_share=line["patient_share"], insurance_share=line["insurance_share"])
    audit(user, "facturation", bill, priced)
    return {"bill_id": bill.pk}


def collect(user, data):
    session = open_session(user)
    bill = fetch(Bill, data.get("bill_id"), lock=True)
    payer = data.get("payer", "PATIENT")
    if payer not in ["PATIENT", "INSURANCE"]:
        raise ValidationError("Payeur invalide.")
    if payer == "INSURANCE":
        require_manager(user)
        if not bill.insurance_id or bill.claim_status not in ["SENT", "PARTIAL"]:
            raise ValidationError("Transmettez le bordereau et résolvez les contestations avant le règlement de l'assurance.")
    remaining = balances(bill)[f"{payer.lower()}_remaining"]
    rows = data.get("payments")
    if not isinstance(rows, list) or not 1 <= len(rows) <= 4:
        raise ValidationError("Ajoutez de un à quatre moyens de règlement.")
    parsed = []
    references = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValidationError("Règlement invalide.")
        mode = row.get("mode")
        if mode not in dict(Payment.MODES):
            raise ValidationError("Mode de règlement invalide.")
        amount = money(row.get("amount"), positive=True)
        ref = str(row.get("reference", "")).strip()
        if len(ref) > 100:
            raise ValidationError("La référence est trop longue.")
        if mode != "CASH" and (not ref or row.get("confirmed") is not True):
            raise ValidationError("Vérifiez le paiement électronique et renseignez sa référence.")
        if mode != "CASH" and ((mode, ref) in references or Payment.objects.filter(mode=mode, reference=ref).exists()):
            raise ValidationError("Cette référence de règlement est déjà enregistrée.")
        references.add((mode, ref))
        tendered = money(row.get("tendered", amount)) if mode == "CASH" else amount
        if tendered < amount:
            raise ValidationError("Le montant remis est inférieur au montant encaissé.")
        parsed.append((mode, amount, ref, tendered))
    amount = sum(row[1] for row in parsed)
    if amount > remaining:
        raise ValidationError("Le règlement dépasse le reste à payer. Actualisez la facture.")
    partial_note = ""
    if amount < remaining:
        partial_note = note(data.get("partial_reason"))
    ids = []
    for mode, amount, ref, tendered in parsed:
        payment = Payment.objects.create(number=reference("REC"), bill=bill, payer=payer,
            session=session, amount=amount, tendered=tendered, mode=mode, reference=ref, actor=user)
        unallocated = amount
        for line in bill.lines.order_by("pk"):
            available = line_balance(line, payer)
            allocated = min(unallocated, max(available, ZERO))
            if allocated:
                PaymentAllocation.objects.create(payment=payment, line=line, amount=allocated)
                unallocated -= allocated
        if unallocated:
            raise ValidationError("Le montant ne correspond pas aux prestations restant à régler.")
        ids.append(payment.pk)
    synchronize(bill)
    audit(user, "reglement", bill, {"payments": ids, "payer": payer, "partial_reason": partial_note})
    return {"bill_id": bill.pk, "payment_ids": ids}


def confirm_coverage(user, data):
    open_session(user)
    bill = fetch(Bill, data.get("bill_id"), lock=True)
    if balances(bill)["cancelled"] or bill.patient_share != 0:
        raise ValidationError("Cette facture nécessite un règlement patient.")
    if not bill.coverage_confirmed_at:
        bill.coverage_confirmed_at = timezone.now()
        bill.save(update_fields=["coverage_confirmed_at"])
        audit(user, "prise_en_charge", bill)
    synchronize(bill)
    return {"bill_id": bill.pk}


def credited_quantities(bill):
    result = {}
    for credit in bill.credits.all():
        for row in credit.lines:
            result[row["line"]] = result.get(row["line"], 0) + row["quantity"]
    return result


def line_balance(line, payer):
    field = payer.lower()
    credits = sum(Decimal(row[field]) for credit in line.bill.credits.all() for row in credit.lines if row["line"] == line.pk)
    paid = total(line.allocations.filter(payment__payer=payer))
    refunded = total(RefundAllocation.objects.filter(line=line, refund__payment__payer=payer))
    return getattr(line, f"{field}_share") - credits - paid + refunded


def credit(user, data):
    require_manager(user)
    bill = fetch(Bill, data.get("bill_id"), lock=True)
    reason = note(data.get("reason"))
    quantities = credited_quantities(bill)
    rows, ptotal, itotal, seen = [], ZERO, ZERO, set()
    requested = data.get("lines")
    if not isinstance(requested, list) or not requested:
        raise ValidationError("Sélectionnez les prestations à annuler.")
    for row in requested:
        line = get_object_or_404(bill.lines.select_related("item"), pk=identifier(row.get("line")))
        quantity = identifier(row.get("quantity"))
        previous = quantities.get(line.pk, 0)
        if line.pk in seen or quantity + previous > line.item.quantity:
            raise ValidationError("Une quantité dépasse les prestations restant à annuler.")
        if ServiceQueue.objects.filter(line=line, status__in=["RECEIVED", "DONE"]).exists():
            raise ValidationError("Cette prestation est déjà prise en charge. Faites rectifier son état par le service concerné.")
        seen.add(line.pk)
        # Différence des cumuls arrondis : plusieurs avoirs ne peuvent pas créer un centime.
        insurer = ((line.insurance_share * (quantity + previous) / line.item.quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                   - (line.insurance_share * previous / line.item.quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        patient = line.item.unit_price * quantity - insurer
        ptotal += patient
        itotal += insurer
        rows.append({"line": line.pk, "label": line.item.label, "quantity": quantity, "patient": str(patient), "insurance": str(insurer)})
    obj = CreditNote.objects.create(number=reference("AVO"), bill=bill, lines=rows,
        patient_amount=ptotal, insurance_amount=itotal, reason=reason, actor=user)
    if bill.batches.exists() and itotal:
        bill.claim_status = "DISPUTED"
        bill.claim_note = f"Avoir {obj.number} à rapprocher du bordereau. {reason}"
        bill.save(update_fields=["claim_status", "claim_note"])
    synchronize(bill)
    audit(user, "avoir", obj, {"bill": bill.pk})
    return {"bill_id": bill.pk, "credit_id": obj.pk}


def refund(user, data):
    require_manager(user)
    session = open_session(user)
    payment = fetch(Payment, data.get("payment_id"))
    bill = fetch(Bill, payment.bill_id, lock=True)
    amount = money(data.get("amount"), positive=True)
    refundable = balances(bill)[f"{payment.payer.lower()}_refundable"]
    if amount > min(refundable, payment.amount - total(payment.refunds.all())):
        raise ValidationError("Le remboursement dépasse le montant disponible après avoir.")
    reason = note(data.get("reason"))
    ref = str(data.get("reference", "")).strip()
    if payment.mode != "CASH" and (not ref or data.get("confirmed") is not True):
        raise ValidationError("Confirmez le remboursement électronique avec sa référence.")
    if payment.mode == "CASH" and amount > Decimal(session_totals(session)["expected_cash"]):
        raise ValidationError("Les espèces disponibles dans cette caisse sont insuffisantes.")
    obj = Refund.objects.create(number=reference("RMB"), payment=payment, session=session,
        amount=amount, mode=payment.mode, reference=ref[:100], reason=reason, actor=user)
    unallocated = amount
    for allocation in payment.allocations.select_related("line").order_by("line_id"):
        capacity = allocation.amount - total(RefundAllocation.objects.filter(refund__payment=payment, line=allocation.line))
        available = min(capacity, max(-line_balance(allocation.line, payment.payer), ZERO))
        allocated = min(unallocated, available)
        if allocated:
            RefundAllocation.objects.create(refund=obj, line=allocation.line, amount=allocated)
            unallocated -= allocated
    if unallocated:
        raise ValidationError("Choisissez le règlement correspondant à la prestation créditée.")
    synchronize(bill)
    audit(user, "remboursement", obj, {"bill": bill.pk})
    return {"bill_id": bill.pk, "refund_id": obj.pk}


def start_session(user, data):
    if Session.objects.filter(cashier=user, status="OPEN").exists():
        raise ValidationError("Votre caisse est déjà ouverte.")
    obj = Session.objects.create(number=reference("CAI"), cashier=user, opening_float=money(data.get("opening_float", 0)))
    audit(user, "ouverture", obj)
    return {"session_id": obj.pk}


def close_session(user, data):
    session = open_session(user)
    snapshot = session_totals(session)
    counted = money(data.get("counted_cash"))
    reason = note(data.get("reason")) if counted != Decimal(snapshot["expected_cash"]) else str(data.get("reason", ""))[:1000]
    session.counted_cash, session.expected_cash = counted, Decimal(snapshot["expected_cash"])
    session.closed_at, session.status = timezone.now(), "CLOSED"
    session.closed_snapshot, session.closing_note = snapshot, reason
    session.save()
    audit(user, "cloture", session, snapshot)
    return {"session_id": session.pk}


def validate_handover(user, data):
    require_manager(user)
    session = fetch(Session, data.get("session_id"), lock=True)
    if session.cashier_id == user.pk:
        raise ValidationError("Le versement doit être validé par un autre responsable.")
    if session.status != "CLOSED":
        raise ValidationError("Ce versement n'est pas en attente de validation.")
    amount = money(data.get("received_cash"))
    reason = note(data.get("reason")) if amount != session.counted_cash else str(data.get("reason", ""))[:1000]
    session.received_cash, session.validation_note = amount, reason
    session.validated_by, session.validated_at, session.status = user, timezone.now(), "VALIDATED"
    session.save()
    audit(user, "validation_versement", session)
    return {"session_id": session.pk}


def movement(user, data):
    session = open_session(user)
    kind = data.get("kind")
    if kind not in ["IN", "OUT", "HANDOVER"]:
        raise ValidationError("Type de mouvement invalide.")
    if kind != "HANDOVER":
        require_manager(user)
    amount = money(data.get("amount"), positive=True)
    if kind != "IN" and amount > Decimal(session_totals(session)["expected_cash"]):
        raise ValidationError("Les espèces disponibles sont insuffisantes.")
    obj = CashMovement.objects.create(session=session, kind=kind, amount=amount, reason=note(data.get("reason")), actor=user)
    audit(user, "mouvement", obj)
    return {"session_id": session.pk}


def receive_movement(user, data):
    require_manager(user)
    obj = fetch(CashMovement, data.get("movement_id"), lock=True)
    if obj.kind != "HANDOVER" or obj.received_at or obj.actor_id == user.pk:
        raise ValidationError("Ce versement ne peut pas être validé par cet utilisateur.")
    obj.received_by, obj.received_at = user, timezone.now()
    obj.save(update_fields=["received_by", "received_at"])
    audit(user, "reception_versement", obj)
    return {"movement_id": obj.pk}


def transmit_claim(user, data):
    require_manager(user)
    insurance = fetch(Insurance, data.get("insurance_id"))
    ids = data.get("bill_ids")
    if not isinstance(ids, list) or not 1 <= len(ids) <= 100:
        raise ValidationError("Sélectionnez de 1 à 100 factures.")
    ids = [identifier(pk) for pk in ids]
    bills = list(Bill.objects.select_for_update().filter(pk__in=ids).order_by("pk"))
    if len(bills) != len(set(ids)):
        raise ValidationError("Une facture est introuvable.")
    rows = []
    for bill in bills:
        balance = balances(bill)
        if bill.insurance_id != insurance.pk or bill.claim_status != "DUE" or balance["insurance_remaining"] <= 0:
            raise ValidationError("Une facture ne peut pas être transmise à cette assurance.")
        if balance["patient_remaining"] or (bill.patient_share == 0 and not bill.coverage_confirmed_at):
            raise ValidationError("Validez la part patient ou la prise en charge avant la transmission.")
        rows.append({"bill_id": bill.pk, "number": bill.invoice.number, "patient": bill.patient_snapshot,
            "insurance": bill.insurance_snapshot, "amount": str(balance["insurance_remaining"])})
    obj = ClaimBatch.objects.create(number=reference("BOR"), insurance=insurance, snapshot=rows,
        supporting_reference=note(data.get("supporting_reference"))[:250], created_by=user)
    obj.bills.set(bills)
    Bill.objects.filter(pk__in=ids).update(claim_status="SENT")
    audit(user, "transmission_assurance", obj)
    return {"batch_id": obj.pk}


def dispute_claim(user, data):
    require_manager(user)
    bill = fetch(Bill, data.get("bill_id"), lock=True)
    if not bill.insurance_id or not bill.batches.exists():
        raise ValidationError("Aucun dossier transmis pour cette facture.")
    bill.claim_status = "SENT" if data.get("resolved") is True else "DISPUTED"
    bill.claim_note = note(data.get("reason"))
    bill.save(update_fields=["claim_status", "claim_note"])
    audit(user, "suivi_assurance", bill, {"status": bill.claim_status, "note": bill.claim_note})
    return {"bill_id": bill.pk}


def print_document(user, data):
    models = {"admission": Visit, "invoice": Bill, "receipt": Payment, "credit": CreditNote, "refund": Refund}
    kind = data.get("kind")
    if kind not in models:
        raise ValidationError("Document inconnu.")
    obj = fetch(models[kind], data.get("id"), lock=True)
    action_name = f"impression_{kind}"
    duplicate = AuditEvent.objects.filter(action=action_name, object_id=str(obj.pk)).exists()
    audit(user, action_name, obj, {"duplicate": duplicate})
    return {"duplicate": duplicate}


ACTIONS = {"print": print_document, "admit": admit, "visit": new_visit, "invoice": create_bill, "collect": collect,
    "coverage": confirm_coverage, "credit": credit, "refund": refund, "open": start_session,
    "close": close_session, "validate": validate_handover, "movement": movement,
    "receive-movement": receive_movement, "transmit": transmit_claim, "dispute": dispute_claim}
