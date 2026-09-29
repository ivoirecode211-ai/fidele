from django.contrib import admin

from .models import Conversation, Intake, Message, PatientAccess, PushSubscription, Reminder


@admin.register(PatientAccess)
class PatientAccessAdmin(admin.ModelAdmin):
    """Le PIN n'est jamais visible : on le réinitialise depuis le module Espace patients."""
    list_display = ["patient", "active", "must_change_pin", "locked_until", "last_login", "activated_by"]
    list_filter = ["active", "must_change_pin"]
    search_fields = ["patient__patient_number", "patient__last_name"]
    exclude = ["pin_hash"]
    readonly_fields = ["token_version", "failed_attempts", "last_login", "activated_at"]


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ["from_patient", "text", "sent_at", "read_at"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["patient", "doctor", "updated_at"]
    search_fields = ["patient__patient_number", "patient__last_name", "doctor__last_name"]
    inlines = [MessageInline]


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ["patient", "medicine", "times", "start_date", "end_date", "active"]
    search_fields = ["patient__patient_number", "medicine"]


admin.site.register(Intake)
admin.site.register(PushSubscription)
