from rest_framework.response import Response
from rest_framework.views import APIView

from parcours.permissions import RoleAccess

from .services import overview


class ArchivesAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR"}


class OverviewView(APIView):
    permission_classes = [ArchivesAccess]

    def get(self, request):
        year = request.query_params.get("year")
        return Response(overview(int(year) if year and year.isdigit() else None))
