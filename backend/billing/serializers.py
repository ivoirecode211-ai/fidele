from rest_framework import serializers
from .models import Invoice, InvoiceItem

class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = "__all__"

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    remaining = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = "__all__"

    def get_remaining(self, obj):
        if hasattr(obj, "cashier_bill"):
            from cashdesk.services import balances
            result = balances(obj.cashier_bill)
            return result["patient_remaining"] + result["insurance_remaining"]
        return max(obj.total - obj.amount_paid, 0)
