from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Q

from accounts.tenancy import hospital_of
from parcours.permissions import RoleAccess

from .models import AdminDocument, AuditLog
from .serializers import (
    AdminDocumentSerializer,
    AdminUserInputSerializer,
    AdminUserSerializer,
    AuditLogSerializer,
    GeneralSettingsSerializer,
)
from .services import ROLE_LABELS, deactivate_user, role_distribution, save_user, suggest_username

User = get_user_model()


class AdministrationAccess(RoleAccess):
    roles = {"ADMIN"}


class OverviewView(APIView):
    """Toutes les données de la page Administration."""
    permission_classes = [AdministrationAccess]

    def get(self, request):
        users = User.objects.filter(hospital=hospital_of(request.user)).order_by("-is_active", "last_name", "first_name")
        active = [user for user in users if user.is_active]
        documents = AdminDocument.objects.all()
        return Response({
            "stats": {
                "activeUsers": len(active),
                "roles": len({code for user in active for code in user.role_codes}),
                "documents": documents.count(),
            },
            "users": AdminUserSerializer(users, many=True).data,
            "roleDistribution": role_distribution(active),
            "availableRoles": list(ROLE_LABELS.values()),
            "documents": AdminDocumentSerializer(documents, many=True).data,
        })


class UsersView(APIView):
    permission_classes = [AdministrationAccess]

    def post(self, request):
        serializer = AdminUserInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, password = save_user(data=serializer.validated_data, hospital=hospital_of(request.user))
        return Response(
            {**AdminUserSerializer(user).data, "temporaryPassword": password, "username": user.username},
            status=status.HTTP_201_CREATED,
        )


class UserView(APIView):
    permission_classes = [AdministrationAccess]

    def put(self, request, pk):
        user = get_object_or_404(User, pk=pk, hospital=hospital_of(request.user))
        serializer = AdminUserInputSerializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        if user.pk == request.user.pk and "Administrateur" not in serializer.validated_data["roles"]:
            return Response({"roles": "Vous ne pouvez pas retirer votre propre rôle d'Administrateur."},
                            status=status.HTTP_400_BAD_REQUEST)
        user, _ = save_user(data=serializer.validated_data, user=user)
        return Response(AdminUserSerializer(user).data)

    def delete(self, request, pk):
        """« Supprimer » désactive le compte : l'historique reste rattaché."""
        user = get_object_or_404(User, pk=pk, hospital=hospital_of(request.user))
        try:
            deactivate_user(user=user, actor=request.user)
        except ValueError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(AdminUserSerializer(user).data)


class DocumentsView(APIView):
    permission_classes = [AdministrationAccess]

    def post(self, request):
        serializer = AdminDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save(created_by=request.user)
        return Response(AdminDocumentSerializer(document).data, status=status.HTTP_201_CREATED)


class GeneralSettingsView(APIView):
    """« Paramètres généraux » : lecture pour tous les connectés, modification par l'Admin."""

    def get_permissions(self):
        from rest_framework.permissions import IsAuthenticated

        return [IsAuthenticated()] if self.request.method == "GET" else [AdministrationAccess()]

    def get(self, request):
        return Response(GeneralSettingsSerializer(hospital_of(request.user)).data)

    def put(self, request):
        serializer = GeneralSettingsSerializer(hospital_of(request.user), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(serializer.data)


# Formats reconnus à leurs premiers octets : l'extension ou le type annoncé par le navigateur ne suffisent pas.
SIGNATURES_LOGO = {b"\x89PNG\r\n\x1a\n": "image/png", b"\xff\xd8\xff": "image/jpeg"}
TAILLE_MAX_LOGO = 300 * 1024


def type_image(debut):
    for signature, mime in SIGNATURES_LOGO.items():
        if debut.startswith(signature):
            return mime
    if debut[:4] == b"RIFF" and debut[8:12] == b"WEBP":
        return "image/webp"
    return None


class LogoView(APIView):
    """Logo de l'hôpital, imprimé sur les tickets, reçus et documents : déposé ou retiré par l'Admin."""
    permission_classes = [AdministrationAccess]

    def post(self, request):
        import base64

        fichier = request.FILES.get("logo")
        if fichier is None:
            return Response({"detail": "Choisissez une image."}, status=status.HTTP_400_BAD_REQUEST)
        if fichier.size > TAILLE_MAX_LOGO:
            return Response({"detail": "Le logo dépasse 300 Ko : réduisez l'image puis réessayez."},
                            status=status.HTTP_400_BAD_REQUEST)
        contenu = fichier.read()
        mime = type_image(contenu[:12])
        if mime is None:
            return Response({"detail": "Format non reconnu : utilisez une image PNG, JPEG ou WebP."},
                            status=status.HTTP_400_BAD_REQUEST)
        hopital = hospital_of(request.user)
        hopital.logo = f"data:{mime};base64,{base64.b64encode(contenu).decode()}"
        hopital.updated_by = request.user
        hopital.save(update_fields=["logo", "updated_by", "updated_at"])
        return Response({"logo": hopital.logo})

    def delete(self, request):
        hopital = hospital_of(request.user)
        hopital.logo = ""
        hopital.updated_by = request.user
        hopital.save(update_fields=["logo", "updated_by", "updated_at"])
        return Response({"logo": ""})


class AuditLogView(APIView):
    """Journal d'audit, du plus récent au plus ancien (200 lignes maximum)."""
    permission_classes = [AdministrationAccess]

    def get(self, request):
        logs = AuditLog.objects.select_related("user").filter(user__hospital=hospital_of(request.user))
        search = request.query_params.get("q", "").strip()
        if search:
            logs = logs.filter(
                Q(username__icontains=search) | Q(user__last_name__icontains=search)
                | Q(user__first_name__icontains=search) | Q(action__icontains=search)
                | Q(description__icontains=search) | Q(ip_address__icontains=search) | Q(path__icontains=search)
            )
        module = request.query_params.get("module")
        if module:
            logs = logs.filter(module=module)
        if request.query_params.get("failures") == "1":
            logs = logs.filter(success=False)
        return Response({
            "modules": sorted(AuditLog.objects.filter(user__hospital=hospital_of(request.user))
                              .values_list("module", flat=True).distinct()),
            "logs": AuditLogSerializer(logs[:200], many=True).data,
        })


class UsernameSuggestionView(APIView):
    """Nom d'utilisateur proposé pendant la saisie du nom (nomenclature de la clinique)."""
    permission_classes = [AdministrationAccess]

    def get(self, request):
        exclude = request.query_params.get("exclude")
        return Response({
            "username": suggest_username(request.query_params.get("name", ""),
                                         exclude_pk=int(exclude) if exclude and exclude.isdigit() else None),
        })
