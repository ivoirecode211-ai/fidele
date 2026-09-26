from django.db import models
from patients.models import Patient

class Invoice(models.Model):
    class Meta:
        verbose_name = "facture"
        verbose_name_plural = "factures"

    STATUS = [("UNPAID", "Impayée"), ("PARTIAL", "Partiellement payée"), ("PAID", "Payée")]
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name="invoices")
    number = models.CharField(max_length=50, unique=True)
    date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS, default="UNPAID")
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)

class InvoiceItem(models.Model):
    class Meta:
        verbose_name = "ligne de facture"
        verbose_name_plural = "lignes de facture"

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    label = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
