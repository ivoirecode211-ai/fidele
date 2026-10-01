import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.test import override_settings
from rest_framework.test import APITestCase

from patients.models import Patient
from billing.models import Invoice
from .models import (Insurance, Service, Benefit, CoverageRule, Session, Bill, Visit, Payment,
    Refund, ServiceQueue, AuditEvent, ClaimBatch, AdmissionDraft)
from .services import balances, session_totals

User = get_user_model()


@override_settings(LEGACY_CASHDESK=True)
class CashdeskTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(username="admin-caisse", role="ADMIN")
        cls.cashier = User.objects.create_user(username="accueil", role="RECEPTION")
        cls.accountant = User.objects.create_user(username="comptable-caisse", role="ACCOUNTING")
        cls.maintenance = User.objects.create_user(username="maintenance-caisse", role="MAINTENANCE")
        cls.service = Service.objects.create(name="Médecine générale")
        cls.lab = Service.objects.create(name="Laboratoire")
        cls.insurance = Insurance.objects.create(name="Partenaire", code="PART", rate=70)
        cls.consult = Benefit.objects.create(code="CONS", name="Consultation", price=10000,
            service=cls.service, category="CONSULTATION", covered=True)
        cls.exam = Benefit.objects.create(code="EXAM", name="Examen exclu", price=2000,
            service=cls.lab, category="EXAM", covered=False)

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def act(self, name, body, *, status=200, key=None):
        response = self.client.post(f"/api/cashdesk/actions/{name}/", body, format="json",
            HTTP_IDEMPOTENCY_KEY=str(key or uuid.uuid4()))
        self.assertEqual(response.status_code, status, response.data)
        return response.data

    def patient_body(self, insured=False):
        return {"last_name": "Kouadio", "first_names": "Awa", "birth_date": "1990-02-15", "sex": "F",
            "nationality": "Côte d’Ivoire", "marital_status": "SINGLE", "city": "Abidjan", "locality": "Cocody",
            "phone": "0700000000", "insured": insured, "insurance_id": self.insurance.pk if insured else None,
            "member_number": "ASS-001" if insured else ""}

    def make_bill(self, insured=False, lines=None):
        visit = self.act("admit", self.patient_body(insured))["visit_id"]
        rows = lines or [{"benefit": self.consult.pk, "quantity": 1}]
        priced = self.client.post("/api/cashdesk/quote/", {"visit_id": visit, "lines": rows}, format="json")
        self.assertEqual(priced.status_code, 200, priced.data)
        result = self.act("invoice", {"visit_id": visit, "lines": rows, "quote": priced.data})
        return Bill.objects.get(pk=result["bill_id"])

    def open(self, amount=0):
        return self.act("open", {"opening_float": amount})

    def pay(self, bill, amount, **kwargs):
        payer = kwargs.pop("payer", "PATIENT")
        return self.act("collect", {"bill_id": bill.pk, "payer": payer, "partial_reason": "Acompte autorisé",
            "payments": [{"mode": "CASH", "amount": amount, "tendered": amount}]}, **kwargs)

    def credit(self, bill, quantity=1):
        return self.act("credit", {"bill_id": bill.pk, "reason": "Prestation annulée", "lines": [{"line": bill.lines.first().pk, "quantity": quantity}]})

    def test_admission_creates_patient_and_visit_without_mandatory_emergency_contact(self):
        result = self.act("admit", self.patient_body())
        patient = Patient.objects.get(pk=result["patient_id"])
        self.assertTrue(patient.patient_number.startswith("PAT-"))
        self.assertEqual(patient.emergency_contact, "")
        self.assertEqual(Visit.objects.get(pk=result["visit_id"]).patient, patient)

    def test_admission_optional_contact_is_persisted(self):
        body = self.patient_body() | {"emergency_contact": "Parent", "emergency_phone": "0100000000", "emergency_relationship": "Mère"}
        result = self.act("admit", body)
        self.assertEqual(Patient.objects.get(pk=result["patient_id"]).emergency_phone, "0100000000")

    def test_admission_red_star_fields_validated_on_server(self):
        for field in ["last_name", "first_names", "birth_date", "sex", "nationality", "marital_status", "city", "locality", "phone"]:
            with self.subTest(field=field):
                body = self.patient_body()
                del body[field]
                self.act("admit", body, status=400)
        self.assertEqual(Patient.objects.count(), 0)

    def test_invalid_dates_and_coverages_rejected(self):
        self.act("admit", self.patient_body() | {"birth_date": "2999-01-01"}, status=400)
        self.act("admit", self.patient_body(True) | {"member_number": ""}, status=400)
        self.act("admit", self.patient_body(True) | {"valid_until": "2000-01-01"}, status=400)

    def test_admission_replay_does_not_duplicate_patient(self):
        key = uuid.uuid4()
        one = self.act("admit", self.patient_body(), key=key)
        self.assertEqual(self.act("admit", self.patient_body(), key=key), one)
        self.assertEqual(Patient.objects.count(), 1)
        self.assertEqual(Visit.objects.count(), 1)
        self.act("admit", self.patient_body() | {"first_names": "Autre"}, key=key, status=400)

    def test_existing_patient_new_visit_keeps_patient_identity(self):
        result = self.act("admit", self.patient_body())
        self.act("visit", {"patient_id": result["patient_id"]})
        self.act("admit", self.patient_body() | {"patient_id": result["patient_id"], "phone": "0500000000"})
        self.assertEqual(Patient.objects.count(), 1)
        self.assertEqual(Visit.objects.count(), 3)
        self.assertEqual(Patient.objects.get().phone, "0500000000")

    def test_drafts_are_private_and_consumed_only_once(self):
        draft = self.client.post("/api/cashdesk/drafts/", {"data": {"last_name": "Brouillon"}, "step": 0}, format="json")
        self.assertEqual(draft.status_code, 201)
        self.client.force_authenticate(self.cashier)
        self.assertEqual(self.client.get(f"/api/cashdesk/drafts/{draft.data['id']}/").status_code, 404)
        self.client.force_authenticate(self.admin)
        body = self.patient_body() | {"draft_id": draft.data["id"]}
        self.act("admit", body)
        self.act("admit", body, status=400)
        self.assertEqual(Patient.objects.count(), 1)

    def test_catalog_requires_manager_and_validates_rates(self):
        self.client.force_authenticate(self.cashier)
        self.assertEqual(self.client.get("/api/cashdesk/catalog/").status_code, 200)
        self.assertEqual(self.client.patch(f"/api/cashdesk/insurances/{self.insurance.pk}/", {"rate": 50}).status_code, 403)
        self.client.force_authenticate(self.admin)
        for rate in [-1, 101]:
            self.assertEqual(self.client.patch(f"/api/cashdesk/insurances/{self.insurance.pk}/", {"rate": rate}).status_code, 400)

    def test_maintenance_cannot_access_cash_or_patients(self):
        self.client.force_authenticate(self.maintenance)
        for path in ["catalog", "overview", "patients", "bills", "reports", "audit"]:
            self.assertEqual(self.client.get(f"/api/cashdesk/{path}/").status_code, 403)
        self.assertEqual(self.client.get("/api/patients/").status_code, 403)

    def test_anonymous_denied(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/cashdesk/catalog/").status_code, 401)

    def test_insurance_applies_per_eligible_line(self):
        bill = self.make_bill(True, [{"benefit": self.consult.pk, "quantity": 1}, {"benefit": self.exam.pk, "quantity": 1}])
        self.assertEqual(bill.invoice.total, Decimal("12000"))
        self.assertEqual(bill.patient_share, Decimal("5000"))
        self.assertEqual(bill.insurance_share, Decimal("7000"))

    def test_specific_contract_rate(self):
        CoverageRule.objects.create(insurance=self.insurance, benefit=self.consult, rate=40)
        bill = self.make_bill(True)
        self.assertEqual(bill.patient_share, Decimal("6000"))

    def test_zero_rate_does_not_fall_back_to_default(self):
        CoverageRule.objects.create(insurance=self.insurance, benefit=self.consult, rate=0)
        self.assertEqual(self.make_bill(True).patient_share, Decimal("10000"))

    def test_quote_changes_require_reconfirmation(self):
        visit = self.act("admit", self.patient_body())["visit_id"]
        rows = [{"benefit": self.consult.pk, "quantity": 1}]
        priced = self.client.post("/api/cashdesk/quote/", {"visit_id": visit, "lines": rows}, format="json").data
        Benefit.objects.filter(pk=self.consult.pk).update(price=12000)
        self.act("invoice", {"visit_id": visit, "lines": rows, "quote": priced}, status=400)
        self.assertEqual(Invoice.objects.count(), 0)

    def test_rate_and_identity_snapshots_remain_unchanged(self):
        bill = self.make_bill(True)
        Insurance.objects.filter(pk=self.insurance.pk).update(rate=20, name="Nouveau nom")
        Patient.objects.filter(pk=bill.visit.patient_id).update(last_name="Autre nom")
        Benefit.objects.filter(pk=self.consult.pk).update(price=1)
        result = self.client.get(f"/api/cashdesk/bills/{bill.pk}/").data
        self.assertEqual(result["insurance"]["name"], "Partenaire")
        self.assertEqual(result["patient"]["full_name"], "Kouadio Awa")
        self.assertEqual(result["patient_share"], "3000.00")

    def test_payment_requires_open_session(self):
        self.pay(self.make_bill(), 10000, status=400)
        self.assertEqual(Payment.objects.count(), 0)

    def test_partial_then_full_payment_with_change_and_replay(self):
        bill = self.make_bill()
        self.open()
        key = uuid.uuid4()
        self.pay(bill, 4000, key=key)
        self.pay(bill, 4000, key=key)
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(balances(bill)["patient_remaining"], Decimal("6000"))
        self.assertEqual(ServiceQueue.objects.count(), 0)
        self.act("collect", {"bill_id": bill.pk, "payments": [{"mode": "CASH", "amount": 6000, "tendered": 10000}]})
        self.assertEqual(balances(bill)["patient_remaining"], 0)
        self.assertEqual(ServiceQueue.objects.get().destination, "Infirmerie")
        self.assertEqual(session_totals(Session.objects.get())["expected_cash"], "10000.00")

    def test_partial_payment_requires_reason(self):
        bill = self.make_bill()
        self.open()
        self.act("collect", {"bill_id": bill.pk, "payments": [{"mode": "CASH", "amount": 5000}]}, status=400)

    def test_mixed_payment_and_reference_validation(self):
        bill = self.make_bill()
        self.open()
        rows = [{"mode": "CASH", "amount": 4000}, {"mode": "MOBILE", "amount": 6000, "reference": "MOB-1", "confirmed": False}]
        self.act("collect", {"bill_id": bill.pk, "payments": rows}, status=400)
        self.assertEqual(Payment.objects.count(), 0)
        rows[1]["confirmed"] = True
        self.act("collect", {"bill_id": bill.pk, "payments": rows})
        self.assertEqual(Payment.objects.count(), 2)
        self.assertEqual(session_totals(Session.objects.get())["expected_cash"], "4000.00")
        another = self.make_bill()
        self.act("collect", {"bill_id": another.pk, "payments": [rows[1]], "partial_reason": "Acompte"}, status=400)

    def test_overpayment_and_invalid_money_are_atomic(self):
        bill = self.make_bill()
        self.open()
        for amount in [10001, -1, "NaN", "Infinity", "0.001"]:
            self.pay(bill, amount, status=400)
        self.assertEqual(Payment.objects.count(), 0)

    def test_full_coverage_creates_no_fake_payment(self):
        Insurance.objects.filter(pk=self.insurance.pk).update(rate=100)
        bill = self.make_bill(True)
        self.assertEqual(ServiceQueue.objects.count(), 0)
        self.act("coverage", {"bill_id": bill.pk}, status=400)
        self.open()
        self.act("coverage", {"bill_id": bill.pk})
        self.assertEqual(Payment.objects.count(), 0)
        self.assertEqual(ServiceQueue.objects.count(), 1)
        self.assertEqual(session_totals(Session.objects.get())["expected_cash"], "0.00")

    def test_coverage_cannot_erase_patient_debt(self):
        bill = self.make_bill(True)
        self.open()
        self.act("coverage", {"bill_id": bill.pk}, status=400)

    def test_legacy_invoice_endpoints_cannot_change_cash_bill(self):
        bill = self.make_bill()
        self.assertEqual(self.client.patch(f"/api/billing/{bill.invoice_id}/", {"total": 0}).status_code, 403)
        self.assertEqual(self.client.delete(f"/api/billing/{bill.invoice_id}/").status_code, 403)
        item = bill.lines.first().item
        self.assertEqual(self.client.patch(f"/api/billing/items/{item.pk}/", {"quantity": 90}).status_code, 403)
        self.assertEqual(self.client.post("/api/billing/items/", {"invoice": bill.invoice_id, "label": "Injection", "quantity": 1, "unit_price": 1}).status_code, 403)

    def test_credit_and_refund_keep_auditable_history(self):
        bill = self.make_bill()
        self.open()
        result = self.pay(bill, 10000)
        self.credit(bill)
        self.act("refund", {"payment_id": result["payment_ids"][0], "amount": 10000, "reason": "Acte annulé"})
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(Refund.objects.count(), 1)
        self.assertTrue(balances(bill)["cancelled"])
        self.assertEqual(session_totals(Session.objects.get())["expected_cash"], "0.00")
        self.assertEqual(ServiceQueue.objects.get().status, "CANCELLED")

    def test_refund_without_credit_and_duplicate_credit_rejected(self):
        bill = self.make_bill()
        self.open()
        result = self.pay(bill, 10000)
        self.act("refund", {"payment_id": result["payment_ids"][0], "amount": 1, "reason": "Sans avoir"}, status=400)
        self.credit(bill)
        self.act("credit", {"bill_id": bill.pk, "reason": "Doublon", "lines": [{"line": bill.lines.first().pk, "quantity": 1}]}, status=400)

    def test_non_manager_cannot_credit_or_refund(self):
        bill = self.make_bill()
        self.client.force_authenticate(self.cashier)
        self.act("credit", {"bill_id": bill.pk, "reason": "Annulation", "lines": []}, status=403)
        self.act("refund", {}, status=403)

    def test_started_care_cannot_be_credited(self):
        bill = self.make_bill()
        self.open()
        self.pay(bill, 10000)
        entry = ServiceQueue.objects.get()
        response = self.client.patch("/api/cashdesk/queue/", {"id": entry.pk, "status": "RECEIVED"})
        self.assertEqual(response.status_code, 200)
        self.act("credit", {"bill_id": bill.pk, "reason": "Annulation", "lines": [{"line": bill.lines.first().pk, "quantity": 1}]}, status=400)

    def test_close_requires_difference_explanation_and_freezes_snapshot(self):
        bill = self.make_bill()
        self.open(5000)
        self.pay(bill, 10000)
        self.act("close", {"counted_cash": 14900}, status=400)
        self.act("close", {"counted_cash": 14900, "reason": "Écart de comptage"})
        session = Session.objects.get()
        self.assertEqual(session.expected_cash, Decimal("15000"))
        self.assertEqual(session.status, "CLOSED")
        another = self.make_bill()
        self.pay(another, 10000, status=400)
        self.open(1000)
        self.pay(another, 10000)
        session.refresh_from_db()
        self.assertEqual(session.closed_snapshot["expected_cash"], "15000.00")

    def test_handover_requires_another_responsible(self):
        self.open(1000)
        self.act("close", {"counted_cash": 1000})
        session = Session.objects.get()
        self.act("validate", {"session_id": session.pk, "received_cash": 1000}, status=400)
        self.client.force_authenticate(self.accountant)
        self.act("validate", {"session_id": session.pk, "received_cash": 900}, status=400)
        self.act("validate", {"session_id": session.pk, "received_cash": 1000})
        session.refresh_from_db()
        self.assertEqual(session.status, "VALIDATED")

    def test_movements_cannot_overdraw_and_require_receipt(self):
        self.open(1000)
        self.act("movement", {"kind": "OUT", "amount": 1001, "reason": "Fournitures"}, status=400)
        self.act("movement", {"kind": "HANDOVER", "amount": 400, "reason": "Remise au comptable"})
        session = Session.objects.get()
        self.assertEqual(session_totals(session)["expected_cash"], "600.00")
        movement = session.movements.get()
        self.act("receive-movement", {"movement_id": movement.pk}, status=400)
        self.client.force_authenticate(self.accountant)
        self.act("receive-movement", {"movement_id": movement.pk})

    def test_claim_settlement_is_distinct_from_patient_receipts(self):
        bill = self.make_bill(True)
        self.open()
        self.pay(bill, 3000)
        self.pay(bill, 7000, payer="INSURANCE", status=400)
        self.act("transmit", {"insurance_id": self.insurance.pk, "bill_ids": [bill.pk], "supporting_reference": "Archives dossier 01"})
        self.assertEqual(ClaimBatch.objects.count(), 1)
        self.pay(bill, 2000, payer="INSURANCE")
        bill.refresh_from_db()
        self.assertEqual(bill.claim_status, "PARTIAL")
        self.assertEqual(balances(bill)["insurance_remaining"], Decimal("5000"))
        self.pay(bill, 5000, payer="INSURANCE")
        bill.refresh_from_db()
        self.assertEqual(bill.claim_status, "PAID")

    def test_dispute_does_not_transfer_debt_to_patient(self):
        bill = self.make_bill(True)
        self.open()
        self.pay(bill, 3000)
        self.act("transmit", {"insurance_id": self.insurance.pk, "bill_ids": [bill.pk], "supporting_reference": "Archives"})
        self.act("dispute", {"bill_id": bill.pk, "reason": "Pièces manquantes"})
        self.pay(bill, 7000, payer="INSURANCE", status=400)
        self.assertEqual(balances(bill)["patient_remaining"], 0)
        self.act("dispute", {"bill_id": bill.pk, "reason": "Pièces reçues", "resolved": True})
        self.pay(bill, 7000, payer="INSURANCE")

    def test_report_uses_payment_date_and_separates_insurance_debt(self):
        bill = self.make_bill(True)
        Bill.objects.filter(pk=bill.pk).update(created_at=timezone.now() - timedelta(days=50))
        self.open()
        self.pay(bill, 3000)
        today = str(timezone.localdate())
        result = self.client.get("/api/cashdesk/reports/", {"start": today, "end": today}).data
        self.assertEqual(Decimal(result["totals"]["patient_collected"]), Decimal("3000"))
        self.assertEqual(Decimal(result["totals"]["insurance_collected"]), 0)
        self.assertEqual(Decimal(result["totals"]["billed"]), 0)

    def test_service_filter_attributes_only_that_service(self):
        bill = self.make_bill(False, [{"benefit": self.consult.pk, "quantity": 1}, {"benefit": self.exam.pk, "quantity": 1}])
        self.open()
        self.pay(bill, 12000)
        report = self.client.get("/api/cashdesk/reports/", {"service": self.lab.pk}).data
        self.assertEqual(Decimal(report["totals"]["patient_collected"]), Decimal("2000"))

    def test_cashier_cannot_use_report_filter_to_see_other_cashiers(self):
        bill = self.make_bill()
        self.open()
        self.pay(bill, 10000)
        self.client.force_authenticate(self.cashier)
        report = self.client.get("/api/cashdesk/reports/", {"cashier": self.admin.pk}).data
        self.assertEqual(Decimal(report["totals"]["patient_collected"]), 0)

    def test_print_reissue_is_logged_without_new_payment(self):
        bill = self.make_bill()
        first = self.act("print", {"kind": "invoice", "id": bill.pk})
        second = self.act("print", {"kind": "invoice", "id": bill.pk})
        self.assertFalse(first["duplicate"])
        self.assertTrue(second["duplicate"])
        self.assertEqual(Payment.objects.count(), 0)

    def test_api_reads_cover_every_workspace_section(self):
        bill = self.make_bill(True)
        self.open()
        for path in ["overview", "catalog", "patients", f"patients/{bill.visit.patient_id}",
                     f"visits/{bill.visit_id}", "bills", f"bills/{bill.pk}", "sessions", "claims", "batches", "clinic", "audit", "queue", "reports"]:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(f"/api/cashdesk/{path}/").status_code, 200)



class AncienneCaisseDesactiveeTests(APITestCase):
    """Sans LEGACY_CASHDESK, l'ancienne caisse (non cloisonnée par hôpital) ne répond plus."""

    def test_routes_fermees_par_defaut(self):
        from django.contrib.auth import get_user_model

        self.client.force_authenticate(get_user_model().objects.create_user(username="adm", password="x", role="ADMIN"))
        for url in ("/api/cashdesk/patients/", "/api/cashdesk/queue/", "/api/cashdesk/overview/"):
            self.assertEqual(self.client.get(url).status_code, 403, url)
