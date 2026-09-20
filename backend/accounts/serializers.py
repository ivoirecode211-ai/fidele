from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["name"] = user.get_full_name() or user.username
        return token

    def validate(self, attrs):
        # L'écran de connexion et la documentation invitent à se
        # connecter avec l'adresse e-mail ; le champ USERNAME_FIELD
        # de Django reste "username". On résout l'e-mail vers le
        # username correspondant avant la validation standard.
        login = attrs.get(self.username_field)
        if login and "@" in login:
            user = User.objects.filter(email__iexact=login).first()
            if user:
                attrs[self.username_field] = user.username
        return super().validate(attrs)

class UserSerializer(serializers.ModelSerializer):
    role_label = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "role_label", "phone", "department"]
