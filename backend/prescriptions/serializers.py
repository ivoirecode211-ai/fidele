from rest_framework import serializers
from .models import Prescription, PrescriptionItem

class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = "__all__"
        read_only_fields = ["prescription"]

class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, read_only=True)

    class Meta:
        model = Prescription
        fields = "__all__"
        read_only_fields = [
            "doctor", "date", "consultation", "status", "prepared_by", "prepared_at", "served_by", "served_at",
        ]
