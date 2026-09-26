from django.contrib import admin

from .models import Prescription, PrescriptionItem


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 0


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ["id", "patient", "doctor", "status", "date", "served_by", "served_at"]
    list_filter = ["status"]
    search_fields = ["patient__last_name", "patient__patient_number", "instructions"]
    inlines = [PrescriptionItemInline]
