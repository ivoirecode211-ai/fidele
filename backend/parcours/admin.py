from django.contrib import admin

from .models import Admission, InsuranceCompany, MedicalService, VitalSigns


@admin.register(MedicalService)
class MedicalServiceAdmin(admin.ModelAdmin):
    list_display = ["name", "price", "active"]
    list_editable = ["price", "active"]
    search_fields = ["name"]


@admin.register(InsuranceCompany)
class InsuranceCompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "coverage", "active"]
    list_editable = ["coverage", "active"]
    search_fields = ["name"]


class VitalSignsInline(admin.TabularInline):
    model = VitalSigns
    extra = 0
    fields = ["recorded_at", "temperature", "systolic", "diastolic", "pulse", "oxygen", "glucose", "recorded_by"]
    readonly_fields = fields


@admin.register(Admission)
class AdmissionAdmin(admin.ModelAdmin):
    list_display = ["patient", "service_name", "insurance_name", "cost", "statut", "created_by", "created_at"]
    list_filter = ["statut", "service_name", "insurance_name"]
    search_fields = ["patient__patient_number", "patient__last_name", "patient__first_names"]
    date_hierarchy = "created_at"
    inlines = [VitalSignsInline]


@admin.register(VitalSigns)
class VitalSignsAdmin(admin.ModelAdmin):
    list_display = ["admission", "temperature", "systolic", "diastolic", "pulse", "oxygen", "recorded_by", "recorded_at"]
    search_fields = ["admission__patient__last_name", "admission__patient__patient_number"]
    date_hierarchy = "recorded_at"
