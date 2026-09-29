from django.contrib import admin

from .models import Equipment, EquipmentScan, Intervention


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "hospital", "category", "brand", "serial_number", "state", "installation_date"]
    list_filter = ["hospital", "category", "state", "acquisition"]
    search_fields = ["code", "name", "brand", "model_name", "serial_number", "supplier", "location"]
    readonly_fields = ["qr_token", "created_by", "created_at"]


@admin.register(Intervention)
class InterventionAdmin(admin.ModelAdmin):
    list_display = ["equipment", "date", "type", "priority", "status", "technician", "cost"]
    list_editable = ["status"]
    list_filter = ["status", "priority", "type"]
    search_fields = ["equipment__name", "equipment__code", "technician", "company", "description", "diagnosis"]
    date_hierarchy = "date"


@admin.register(EquipmentScan)
class EquipmentScanAdmin(admin.ModelAdmin):
    """Journal des scans, en lecture seule."""
    list_display = ["scanned_at", "equipment", "user", "ip_address"]
    search_fields = ["equipment__name", "equipment__code", "user__username"]
    date_hierarchy = "scanned_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
