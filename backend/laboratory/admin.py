from django.contrib import admin

from .models import LabExam, LabRequest, LabResult


@admin.register(LabExam)
class LabExamAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "price", "unit", "reference", "active"]
    list_editable = ["price", "unit", "reference", "active"]
    list_filter = ["category", "active"]
    search_fields = ["name", "code"]


class LabResultInline(admin.TabularInline):
    model = LabResult
    extra = 0


@admin.register(LabRequest)
class LabRequestAdmin(admin.ModelAdmin):
    list_display = ["__str__", "admission", "status", "priority", "requested_at", "completed_by"]
    list_filter = ["status", "priority"]
    search_fields = ["admission__patient__last_name", "admission__patient__patient_number"]
    inlines = [LabResultInline]
