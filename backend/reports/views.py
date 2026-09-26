from rest_framework.response import Response
from rest_framework.views import APIView

from parcours.permissions import RoleAccess

from .detail import report_detail
from .services import overview


class ReportsAccess(RoleAccess):
    # Module « Rapports et statistiques » (DEFAULT_ROLE_MODULES).
    roles = {"ADMIN", "DIRECTOR", "DOCTOR", "ACCOUNTING", "HR", "REGISSEUR"}


class OverviewView(APIView):
    permission_classes = [ReportsAccess]

    def get(self, request):
        return Response(overview(request.query_params.get("period")))


class DetailView(APIView):
    """Rapport complet : chiffres clés et détail de chaque événement de la période."""
    permission_classes = [ReportsAccess]

    def get(self, request, report_id):
        try:
            return Response(report_detail(report_id))
        except (ValueError, KeyError):
            return Response({"detail": "Rapport inconnu."}, status=404)
