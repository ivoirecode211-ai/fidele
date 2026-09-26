from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from parcours.permissions import RoleAccess

from . import services


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(services.get_summary())


class DirectionAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR"}


class DirectionView(APIView):
    """Tableau de bord de la Direction, calculé sur les données de tous les modules."""
    permission_classes = [DirectionAccess]

    def get(self, request):
        return Response(services.direction_overview())
