from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from accounts.models import Hospital

from .models import AdminDocument, AuditLog
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
        fields = ["id", "username", "name", "function", "roles", "status", "connection", "email", "phone"]

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
    username = serializers.RegexField(
        r"^[a-z0-9._-]{3,150}$", required=False, allow_blank=True, default="",
        error_messages={"invalid": "Nom d'utilisateur : minuscules, chiffres, point, tiret ou soulignement (3 caractères minimum)."},
    )
    password = serializers.CharField(required=False, allow_blank=True, default="", write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        value = value.strip().lower()
        if value:
            others = User.objects.filter(username__iexact=value)
            if self.instance is not None:
                others = others.exclude(pk=self.instance.pk)
            if others.exists():
                raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate_password(self, value):
        if value:
            from django.contrib.auth.password_validation import validate_password

            validate_password(value, user=self.instance)
        return value

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


class GeneralSettingsSerializer(serializers.ModelSerializer):
    """« Paramètres généraux » : l'hôpital de l'utilisateur, complété par son administrateur."""

    class Meta:
        model = Hospital
        fields = ["name", "code", "slogan", "address", "city", "district", "phone", "email", "currency",
                  "license_number", "opening_hours", "ticket_copies", "ticket_validity_days",
                  "ticket_note", "ticket_exclusions"]
        # Le code termine les numéros de dossier déjà émis : il ne change plus.
        read_only_fields = ["code"]


class AuditLogSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ["id", "date", "user", "action", "module", "description", "method", "path", "status_code",
                  "success", "ip_address", "user_agent", "duration_ms", "details"]

    def get_date(self, obj):
        return timezone.localtime(obj.created_at).strftime("%d/%m/%Y %H:%M:%S")

    def get_user(self, obj):
        if obj.user:
            return display_name(obj.user)
        return obj.username or "Anonyme"
