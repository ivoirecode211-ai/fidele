from django.contrib import admin

from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ["patient_number", "last_name", "first_names", "sex", "birth_date", "phone", "insurance", "created_at"]
    list_filter = ["sex", "insurance"]
    search_fields = ["patient_number", "last_name", "first_names", "phone", "insurance_number"]
    date_hierarchy = "created_at"
