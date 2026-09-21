from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .models import Invoice, InvoiceItem
from .serializers import InvoiceSerializer, InvoiceItemSerializer

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("patient").prefetch_related("items")
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def perform_update(self, serializer):
        self._check_managed(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_managed(instance)
        instance.delete()

    @staticmethod
    def _check_managed(invoice):
        if hasattr(invoice, "cashier_bill"):
            raise PermissionDenied("Utilisez les opérations de caisse pour cette facture.")

class InvoiceItemViewSet(viewsets.ModelViewSet):
    queryset = InvoiceItem.objects.all()
    serializer_class = InvoiceItemSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        InvoiceViewSet._check_managed(serializer.validated_data["invoice"])
        serializer.save()

    def perform_update(self, serializer):
        InvoiceViewSet._check_managed(serializer.instance.invoice)
        InvoiceViewSet._check_managed(serializer.validated_data.get("invoice", serializer.instance.invoice))
        serializer.save()

    def perform_destroy(self, instance):
        InvoiceViewSet._check_managed(instance.invoice)
        instance.delete()
