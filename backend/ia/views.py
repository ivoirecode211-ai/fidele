from rest_framework.response import Response
from rest_framework.views import APIView

from parcours.permissions import RoleAccess

from .services import overview


class IaAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "DOCTOR"}


class OverviewView(APIView):
    permission_classes = [IaAccess]

    def get(self, request):
        return Response(overview())
