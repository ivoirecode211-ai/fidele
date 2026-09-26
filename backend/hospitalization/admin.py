from django.contrib import admin

from .models import Bed, Hospitalization, Room


class BedInline(admin.TabularInline):
    model = Bed
    extra = 1


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["name", "department", "type"]
    inlines = [BedInline]


admin.site.register(Hospitalization)
