from django.contrib import admin

from .models import Bed, Hospitalization, Room


class BedInline(admin.TabularInline):
    model = Bed
    extra = 1


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["name", "department", "type"]
    list_editable = ["department", "type"]
    search_fields = ["name", "department"]
    inlines = [BedInline]


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = ["room", "number", "status"]
    list_filter = ["status", "room"]


@admin.register(Hospitalization)
class HospitalizationAdmin(admin.ModelAdmin):
    list_display = ["patient", "bed", "admission_date", "planned_discharge", "discharge_date", "doctor"]
    list_filter = ["bed__room"]
    search_fields = ["patient__last_name", "patient__patient_number", "reason"]
