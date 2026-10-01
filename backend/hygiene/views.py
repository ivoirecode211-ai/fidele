from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from parcours.permissions import RoleAccess

from .models import CleaningTask
from .services import overview, serialize_task


class HygieneAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR"}


class TaskInputSerializer(serializers.ModelSerializer):
    """Reçoit le formulaire de tâche (EMPTY_TASK_FORM)."""

    class Meta:
        model = CleaningTask
        fields = ["zone", "type", "responsible", "date", "hour"]


class OverviewView(APIView):
    permission_classes = [HygieneAccess]

    def get(self, request):
        return Response(overview(hospital_of(request.user)))


class TasksView(APIView):
    permission_classes = [HygieneAccess]

    def post(self, request):
        serializer = TaskInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = serializer.save(created_by=request.user, hospital=hospital_of(request.user))
        return Response(serialize_task(task), status=status.HTTP_201_CREATED)


class TaskView(APIView):
    permission_classes = [HygieneAccess]

    def put(self, request, pk):
        task = get_object_or_404(CleaningTask, pk=pk, hospital=hospital_of(request.user))
        serializer = TaskInputSerializer(task, data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serialize_task(serializer.save()))


class TaskStatusView(APIView):
    """Planifiée → En cours → Terminée."""
    permission_classes = [HygieneAccess]

    def post(self, request, pk):
        task = get_object_or_404(CleaningTask, pk=pk, hospital=hospital_of(request.user))
        new_status = request.data.get("status")
        if new_status not in dict(CleaningTask.STATUSES):
            return Response({"status": "Statut inconnu."}, status=status.HTTP_400_BAD_REQUEST)
        task.status = new_status
        task.completed_at = timezone.now() if new_status == "Terminée" else None
        task.save(update_fields=["status", "completed_at"])
        return Response(serialize_task(task))
