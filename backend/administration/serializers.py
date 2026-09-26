from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import AdminDocument
from .services import ROLE_CODES, ROLE_LABELS, display_name, format_connection

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    """Un compte au format de la table « Utilisateurs » (Administration.jsx)."""
    name = serializers.SerializerMethodField()
    function = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    connection = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name", "function", "roles", "status", "connection", "email", "phone"]

    def get_name(self, obj):
        return display_name(obj)

    def get_function(self, obj):
        return obj.job_title or ROLE_LABELS.get(obj.role, "")

    def get_roles(self, obj):
        codes = [obj.role, *[code for code in obj.extra_roles if code != obj.role]]
        return [ROLE_LABELS.get(code, code) for code in codes]

    def get_status(self, obj):
        return "Actif" if obj.is_active else "Inactif"

    def get_connection(self, obj):
        return format_connection(obj.last_login)


class AdminUserInputSerializer(serializers.Serializer):
    """Reçoit le formulaire utilisateur (EMPTY_USER_FORM)."""
    name = serializers.CharField(max_length=180)
    function = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    roles = serializers.ListField(child=serializers.ChoiceField(choices=list(ROLE_CODES)), min_length=1)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")

    def validate_name(self, value):
        if len(value.split()) < 2:
            raise serializers.ValidationError("Indiquez le nom et le prénom (ex. KOUADIO Jean).")
        return value.strip()

    def validate_email(self, value):
        value = value.strip().lower()
        if value:
            others = User.objects.filter(email__iexact=value)
            if self.instance is not None:
                others = others.exclude(pk=self.instance.pk)
            if others.exists():
                raise serializers.ValidationError("Cette adresse e-mail est déjà utilisée.")
        return value

    def validate_roles(self, value):
        return list(dict.fromkeys(value))  # sans doublons, ordre conservé


class AdminDocumentSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()

    class Meta:
        model = AdminDocument
        fields = ["id", "name", "type", "date"]
        read_only_fields = ["id", "date"]

    def get_date(self, obj):
        return timezone.localtime(obj.created_at).strftime("%d/%m/%Y")
