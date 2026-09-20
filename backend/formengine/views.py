from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import services
from .models import FormInstance
from .serializers import FormInstanceSerializer


class FormInstanceViewSet(viewsets.ModelViewSet):
    serializer_class = FormInstanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = FormInstance.objects.all().order_by("-updated_at")

        form_key = self.request.query_params.get("form_key")
        if form_key:
            qs = qs.filter(form_key=form_key)

        instance_status = self.request.query_params.get("status")
        if instance_status:
            qs = qs.filter(status=instance_status)

        patient = self.request.query_params.get("patient")
        if patient:
            qs = qs.filter(patient_id=patient)

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def save_step(self, request, pk=None):
        instance = self.get_object()

        try:
            services.save_step(
                instance,
                step_id=request.data.get("step_id"),
                data=request.data.get("data", {}),
                complete=bool(request.data.get("complete")),
            )
        except services.InvalidStepData as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        instance = services.submit_instance(self.get_object())
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        instance = services.cancel_instance(self.get_object())
        return Response(self.get_serializer(instance).data)
