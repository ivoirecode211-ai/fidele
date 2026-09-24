from django.contrib import admin

from .models import Admission, InsuranceCompany, MedicalService, VitalSigns

admin.site.register(MedicalService)
admin.site.register(InsuranceCompany)


@admin.register(Admission)
class AdmissionAdmin(admin.ModelAdmin):
    list_display = ["patient", "service_name", "cost", "statut", "created_at"]
    list_filter = ["statut", "service_name"]


@admin.register(VitalSigns)
class VitalSignsAdmin(admin.ModelAdmin):
    list_display = ["admission", "temperature", "systolic", "diastolic", "pulse", "oxygen", "recorded_at"]
