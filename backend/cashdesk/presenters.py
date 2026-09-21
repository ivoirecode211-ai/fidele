from . import services
from .models import Refund, ServiceQueue


def actor_name(user):
    return user.get_full_name() or user.username


def payment_data(payment):
    return {"id": payment.pk, "number": payment.number, "payer": payment.payer,
        "amount": str(payment.amount), "tendered": str(payment.tendered),
        "change": str(payment.tendered - payment.amount), "mode": payment.mode,
        "reference": payment.reference, "created_at": payment.created_at.isoformat(),
        "cashier": actor_name(payment.actor), "session": payment.session.number,
        "refunded": str(services.total(payment.refunds.all()))}


def bill_data(bill):
    balance = services.balances(bill)
    quantities = services.credited_quantities(bill)
    return {"id": bill.pk, "number": bill.invoice.number, "patient_id": bill.visit.patient_id,
        "visit_id": bill.visit_id, "visit_number": bill.visit.number,
        "patient": bill.patient_snapshot, "insurance": bill.insurance_snapshot,
        "insurance_id": bill.insurance_id, "clinic": bill.clinic_snapshot,
        "created_at": bill.created_at.isoformat(), "created_by": actor_name(bill.created_by),
        "total": str(bill.invoice.total), "patient_share": str(bill.patient_share),
        "insurance_share": str(bill.insurance_share),
        "balances": {k: str(v) if hasattr(v, "quantize") else v for k, v in balance.items()},
        "coverage_confirmed": bool(bill.coverage_confirmed_at), "claim_status": bill.claim_status,
        "claim_note": bill.claim_note,
        "lines": [{"id": line.pk, "label": line.item.label, "benefit": line.benefit_id,
            "service": line.service_id, "service_name": line.service_name,
            "quantity": line.item.quantity, "price": str(line.item.unit_price), "rate": str(line.rate),
            "patient_share": str(line.patient_share), "insurance_share": str(line.insurance_share),
            "credited_quantity": quantities.get(line.pk, 0),
            "queue": getattr(getattr(line, "queue_entry", None), "status", None)} for line in bill.lines.select_related("item", "queue_entry")],
        "payments": [payment_data(p) for p in bill.payments.select_related("actor", "session").order_by("created_at")],
        "credits": [{"id": c.pk, "number": c.number, "lines": c.lines, "reason": c.reason,
            "created_at": c.created_at.isoformat(), "patient_amount": str(c.patient_amount),
            "insurance_amount": str(c.insurance_amount)} for c in bill.credits.all()],
        "refunds": [{"id": r.pk, "number": r.number, "payment": r.payment_id,
            "amount": str(r.amount), "mode": r.mode, "reference": r.reference,
            "reason": r.reason, "cashier": actor_name(r.actor), "created_at": r.created_at.isoformat()}
            for r in Refund.objects.filter(payment__bill=bill).select_related("actor")],
    }


def session_data(session):
    totals = services.session_totals(session) if session.status == "OPEN" else session.closed_snapshot
    return {"id": session.pk, "number": session.number, "cashier_id": session.cashier_id,
        "cashier": actor_name(session.cashier), "status": session.status, "opening_float": str(session.opening_float),
        "opened_at": session.opened_at.isoformat(), "closed_at": session.closed_at.isoformat() if session.closed_at else None,
        "counted_cash": str(session.counted_cash) if session.counted_cash is not None else None,
        "closing_note": session.closing_note, "received_cash": str(session.received_cash) if session.received_cash is not None else None,
        "validation_note": session.validation_note, "validated_by": actor_name(session.validated_by) if session.validated_by else None,
        "totals": totals,
        "movements": [{"id": m.pk, "kind": m.kind, "amount": str(m.amount), "reason": m.reason,
            "created_at": m.created_at.isoformat(), "received": bool(m.received_at)} for m in session.movements.all()]}
