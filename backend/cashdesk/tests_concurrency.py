"""Les garanties de verrouillage se vérifient sur PostgreSQL, pas sur SQLite."""
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless

from django.contrib.auth import get_user_model
from django.db import connection, close_old_connections, connections
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from .models import Bill, Payment, Session
from .services import balances
from .tests import CashdeskTests


@skipUnless(connection.vendor == "postgresql", "Verrouillage transactionnel : PostgreSQL requis")
class ConcurrentCashdeskTests(TransactionTestCase):
    act = CashdeskTests.act
    patient_body = CashdeskTests.patient_body
    make_bill = CashdeskTests.make_bill
    open = CashdeskTests.open

    def setUp(self):
        CashdeskTests.setUpTestData.__func__(type(self))
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.bill = self.make_bill()
        self.open()
        self.client.force_authenticate(self.cashier)
        self.open()

    def parallel(self, specs):
        barrier = Barrier(len(specs))

        def run(spec):
            close_old_connections()
            try:
                actor, name, body, key = spec
                user = get_user_model().objects.get(pk=actor)
                client = APIClient()
                client.force_authenticate(user)
                barrier.wait(timeout=10)
                response = client.post(f"/api/cashdesk/actions/{name}/", body, format="json", HTTP_IDEMPOTENCY_KEY=str(key))
                return response.status_code, response.data
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=len(specs)) as pool:
            return list(pool.map(run, specs))

    def body(self):
        return {"bill_id": self.bill.pk, "payments": [{"mode": "CASH", "amount": 10000}]}

    def test_two_cashiers_cannot_pay_the_same_balance_twice(self):
        results = self.parallel([(self.admin.pk, "collect", self.body(), uuid.uuid4()),
                                 (self.cashier.pk, "collect", self.body(), uuid.uuid4())])
        self.assertEqual(sorted(r[0] for r in results), [200, 400], results)
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(balances(self.bill)["patient_remaining"], 0)

    def test_same_operation_returns_same_receipt_to_simultaneous_requests(self):
        key = uuid.uuid4()
        spec = (self.admin.pk, "collect", self.body(), key)
        results = self.parallel([spec, spec])
        self.assertEqual([r[0] for r in results], [200, 200], results)
        self.assertEqual(results[0][1], results[1][1])
        self.assertEqual(Payment.objects.count(), 1)

    def test_payment_and_closure_cannot_diverge_from_session_snapshot(self):
        results = self.parallel([(self.admin.pk, "collect", self.body(), uuid.uuid4()),
            (self.admin.pk, "close", {"counted_cash": 0, "reason": "Contrôle concurrent"}, uuid.uuid4())])
        session = Session.objects.get(cashier=self.admin)
        self.assertEqual(results[1][0], 200, results)
        actual = sum(p.amount for p in Payment.objects.filter(session=session))
        self.assertEqual(session.expected_cash, actual)
