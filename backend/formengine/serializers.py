from rest_framework import serializers

from .models import FormInstance


class FormInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormInstance
        fields = "__all__"
        read_only_fields = [
            "created_by",
            "status",
            "current_step",
            "data",
            "completed_steps",
            "created_at",
            "updated_at",
            "submitted_at",
        ]
