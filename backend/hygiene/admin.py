from django.contrib import admin

from .models import CleaningTask, HygieneAudit, HygieneProduct, WasteCollection


@admin.register(CleaningTask)
class CleaningTaskAdmin(admin.ModelAdmin):
    list_display = ["zone", "type", "responsible", "date", "hour", "status"]
    list_editable = ["status"]
    list_filter = ["status", "type"]
    search_fields = ["zone", "responsible"]
    date_hierarchy = "date"


@admin.register(HygieneProduct)
class HygieneProductAdmin(admin.ModelAdmin):
    list_display = ["name", "icon", "last_check"]


@admin.register(WasteCollection)
class WasteCollectionAdmin(admin.ModelAdmin):
    list_display = ["type", "quantity_kg", "date"]
    list_filter = ["type"]
    date_hierarchy = "date"


@admin.register(HygieneAudit)
class HygieneAuditAdmin(admin.ModelAdmin):
    list_display = ["date", "score", "compliant", "next_date"]
    list_filter = ["compliant"]
