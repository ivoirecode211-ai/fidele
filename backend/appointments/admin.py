from django.contrib import admin

from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ["patient", "professional", "date_time", "service", "reason", "status"]
    list_filter = ["status", "service"]
    search_fields = ["patient__last_name", "patient__patient_number", "reason"]
    date_hierarchy = "date_time"
