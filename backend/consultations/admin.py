from django.contrib import admin

from .models import Consultation


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ["patient", "doctor", "diagnosis", "date_time", "completed_at"]
    list_filter = ["doctor"]
    search_fields = ["patient__last_name", "patient__patient_number", "diagnosis", "treatment"]
    date_hierarchy = "date_time"
