from datetime import date
from decimal import Decimal
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .views import CashView
from .models import BillLine, PaymentAllocation, RefundAllocation, CreditNote, Session
from . import services
from .presenters import actor_name


class ReportsView(CashView):
    def get(self, request):
        try:
            start = date.fromisoformat(request.query_params.get("start", str(timezone.localdate().replace(day=1))))
            end = date.fromisoformat(request.query_params.get("end", str(timezone.localdate())))
            if end < start:
                raise ValueError
        except ValueError:
            raise ValidationError("La période sélectionnée est invalide.")
        user_id = request.user.pk if not services.manager(request.user) else request.query_params.get("cashier")
        insurance = request.query_params.get("insurance")
        service = request.query_params.get("service")
        benefit = request.query_params.get("benefit")
        mode = request.query_params.get("mode")
        if mode and mode not in dict(services.Payment.MODES):
            raise ValidationError("Mode invalide.")

        lines = BillLine.objects.select_related("bill__invoice", "bill__created_by", "item")
        if insurance == "none":
            lines = lines.filter(bill__insurance__isnull=True)
        elif insurance:
            lines = lines.filter(bill__insurance_id=services.identifier(insurance))
        if service:
            lines = lines.filter(service_id=services.identifier(service))
        if benefit:
            lines = lines.filter(benefit_id=services.identifier(benefit))
        receipts = PaymentAllocation.objects.select_related("payment__actor", "payment__bill__invoice", "line__item").filter(
            line__in=lines, payment__created_at__date__range=(start, end))
        refunds = RefundAllocation.objects.select_related("refund__actor", "refund__payment__bill__invoice", "line__item").filter(
            line__in=lines, refund__created_at__date__range=(start, end))
        billed = lines.filter(bill__created_at__date__range=(start, end))
        if user_id:
            uid = services.identifier(user_id)
            receipts = receipts.filter(payment__actor_id=uid)
            refunds = refunds.filter(refund__actor_id=uid)
            billed = billed.filter(bill__created_by_id=uid)
        if mode:
            receipts = receipts.filter(payment__mode=mode)
            refunds = refunds.filter(refund__mode=mode)
        totals = {"billed": Decimal(0), "patient_collected": Decimal(0), "insurance_collected": Decimal(0),
            "refunded": Decimal(0), "patient_outstanding": Decimal(0), "insurance_outstanding": Decimal(0), "credits": Decimal(0)}
        rows, per_benefit = [], {}
        for line in billed:
            totals["billed"] += line.patient_share + line.insurance_share
            totals["patient_outstanding"] += max(services.line_balance(line, "PATIENT"), Decimal(0))
            totals["insurance_outstanding"] += max(services.line_balance(line, "INSURANCE"), Decimal(0))
        eligible = set(lines.values_list("pk", flat=True))
        credits = CreditNote.objects.filter(created_at__date__range=(start, end))
        if user_id:
            credits = credits.filter(actor_id=uid)
        for credit in credits:
            for row in credit.lines:
                if row["line"] in eligible:
                    totals["credits"] += Decimal(row["patient"]) + Decimal(row["insurance"])
        for allocation in receipts:
            p = allocation.payment
            totals["patient_collected" if p.payer == "PATIENT" else "insurance_collected"] += allocation.amount
            label = allocation.line.item.label
            per_benefit[label] = per_benefit.get(label, Decimal(0)) + allocation.amount
            rows.append({"date": p.created_at.isoformat(), "number": p.number, "invoice": p.bill.invoice.number,
                "patient": p.bill.patient_snapshot["full_name"], "cashier": actor_name(p.actor), "payer": p.payer,
                "mode": p.mode, "prestation": label, "amount": str(allocation.amount), "kind": "PAYMENT"})
        for allocation in refunds:
            r = allocation.refund
            totals["refunded"] += allocation.amount
            label = allocation.line.item.label
            per_benefit[label] = per_benefit.get(label, Decimal(0)) - allocation.amount
            rows.append({"date": r.created_at.isoformat(), "number": r.number, "invoice": r.payment.bill.invoice.number,
                "patient": r.payment.bill.patient_snapshot["full_name"], "cashier": actor_name(r.actor), "payer": r.payment.payer,
                "mode": r.mode, "prestation": label, "amount": str(-allocation.amount), "kind": "REFUND"})
        totals["net_collected"] = totals["patient_collected"] + totals["insurance_collected"] - totals["refunded"]
        return Response({"start": start, "end": end, "totals": {k: str(v) for k, v in totals.items()},
            "per_benefit": [{"name": k, "net": str(v)} for k, v in per_benefit.items()],
            "rows": sorted(rows, key=lambda r: r["date"], reverse=True),
            "balances_label": "Soldes actuels des factures créées sur la période"})
