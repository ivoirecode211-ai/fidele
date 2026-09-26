from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from parcours.permissions import RoleAccess

from .models import AdminDocument
from .serializers import AdminDocumentSerializer, AdminUserInputSerializer, AdminUserSerializer
from .services import ROLE_LABELS, deactivate_user, role_distribution, save_user

User = get_user_model()


class AdministrationAccess(RoleAccess):
    roles = {"ADMIN"}


class OverviewView(APIView):
    """Toutes les données de la page Administration."""
    permission_classes = [AdministrationAccess]

    def get(self, request):
        users = User.objects.order_by("-is_active", "last_name", "first_name")
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
        user, password = save_user(data=serializer.validated_data)
        return Response(
            {**AdminUserSerializer(user).data, "temporaryPassword": password, "username": user.username},
            status=status.HTTP_201_CREATED,
        )


class UserView(APIView):
    permission_classes = [AdministrationAccess]

    def put(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        serializer = AdminUserInputSerializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        user, _ = save_user(data=serializer.validated_data, user=user)
        return Response(AdminUserSerializer(user).data)

    def delete(self, request, pk):
        """« Supprimer » désactive le compte : l'historique reste rattaché."""
        user = get_object_or_404(User, pk=pk)
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
