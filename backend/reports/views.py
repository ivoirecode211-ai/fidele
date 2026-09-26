from rest_framework.response import Response
from rest_framework.views import APIView

from parcours.permissions import RoleAccess

from .services import overview


class ReportsAccess(RoleAccess):
    # Module « Rapports et statistiques » (DEFAULT_ROLE_MODULES).
    roles = {"ADMIN", "DIRECTOR", "DOCTOR", "ACCOUNTING", "HR"}


class OverviewView(APIView):
    permission_classes = [ReportsAccess]

    def get(self, request):
        return Response(overview(request.query_params.get("period")))
