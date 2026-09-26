from django.contrib import admin

from .models import AdminDocument, AuditLog, GeneralSettings


@admin.register(AdminDocument)
class AdminDocumentAdmin(admin.ModelAdmin):
    list_display = ["name", "type", "created_by", "created_at"]
    list_filter = ["type"]
    search_fields = ["name"]


@admin.register(GeneralSettings)
class GeneralSettingsAdmin(admin.ModelAdmin):
    """Une seule fiche de paramètres pour l'établissement."""
    list_display = ["name", "phone", "email", "currency", "updated_at"]
    readonly_fields = ["updated_by", "updated_at"]

    def has_add_permission(self, request):
        return not GeneralSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Journal d'audit en lecture seule : il ne doit pas pouvoir être falsifié."""
    list_display = ["created_at", "username", "action", "module", "description", "ip_address", "status_code", "success"]
    list_filter = ["success", "module", "action"]
    search_fields = ["username", "description", "ip_address", "path", "user_agent"]
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
