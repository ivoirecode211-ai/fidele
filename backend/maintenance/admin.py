from django.contrib import admin

from .models import Equipment, Intervention


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "location", "availability", "maintenance_interval_days"]
    list_filter = ["category"]
    search_fields = ["name", "location"]


@admin.register(Intervention)
class InterventionAdmin(admin.ModelAdmin):
    list_display = ["equipment", "date", "type", "priority", "status", "technician"]
    list_editable = ["status"]
    list_filter = ["status", "priority", "type"]
    search_fields = ["equipment__name", "technician", "description"]
    date_hierarchy = "date"
