from django.utils import timezone
from rest_framework import serializers
from patients.models import Patient
from .models import Insurance, Service, Benefit, CoverageRule, AdmissionDraft, ClinicSettings


class InsuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insurance
        fields = "__all__"


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"


class BenefitSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = Benefit
        fields = "__all__"


class RuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoverageRule
        fields = "__all__"


class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicSettings
        fields = ["name", "address", "phone", "legal_info"]


class DraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionDraft
        fields = ["id", "data", "step", "submitted", "updated_at"]
        read_only_fields = ["submitted", "updated_at"]

    def validate_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Le brouillon doit contenir un formulaire.")
        return value


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    coverage = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = ["id", "patient_number", "last_name", "first_names", "full_name", "birth_date", "sex",
            "nationality", "marital_status", "city", "locality", "phone", "emergency_contact", "emergency_phone",
            "emergency_relationship", "coverage"]

    def get_full_name(self, obj):
        return f"{obj.last_name} {obj.first_names}"

    def get_coverage(self, obj):
        coverage = getattr(obj, "coverage", None)
        if not coverage:
            return None
        return {"insurance_id": coverage.insurance_id, "name": coverage.insurance.name,
            "rate": str(coverage.insurance.rate), "member_number": coverage.member_number,
            "valid_until": str(coverage.valid_until) if coverage.valid_until else None, "holder": coverage.holder}


class AdmissionSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField(required=False, min_value=1)
    draft_id = serializers.IntegerField(required=False, min_value=1)
    last_name = serializers.CharField(max_length=120)
    first_names = serializers.CharField(max_length=180)
    birth_date = serializers.DateField()
    sex = serializers.ChoiceField(choices=["M", "F", "O"])
    nationality = serializers.CharField(max_length=80)
    marital_status = serializers.ChoiceField(choices=["SINGLE", "MARRIED", "PARTNER", "DIVORCED", "WIDOWED"])
    city = serializers.CharField(max_length=120)
    locality = serializers.CharField(max_length=120)
    phone = serializers.RegexField(r"^\+?[\d\s().-]{8,30}$", max_length=30, error_messages={"invalid": "Saisissez un numéro de téléphone valide."})
    emergency_contact = serializers.CharField(max_length=180, required=False, allow_blank=True, default="")
    emergency_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")
    emergency_relationship = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")
    insured = serializers.BooleanField()
    insurance_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    member_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    valid_until = serializers.DateField(required=False, allow_null=True)
    holder = serializers.CharField(max_length=180, required=False, allow_blank=True)

    def validate_birth_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("La naissance ne peut pas être dans le futur.")
        return value

    def validate(self, attrs):
        if attrs["insured"]:
            if not attrs.get("insurance_id") or not attrs.get("member_number"):
                raise serializers.ValidationError("Sélectionnez une assurance et renseignez le numéro d'assuré.")
            if attrs.get("valid_until") and attrs["valid_until"] < timezone.localdate():
                raise serializers.ValidationError({"valid_until": "La couverture est expirée."})
        return attrs
