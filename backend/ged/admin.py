from django.contrib import admin

from .models import Document, IdentiteArchive


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("titre", "type", "patient", "identite", "stockage", "created_at", "supprime_le")
    list_filter = ("type", "stockage", "hospital")
    search_fields = ("titre", "mots_cles", "patient__last_name", "patient__patient_number")


@admin.register(IdentiteArchive)
class IdentiteArchiveAdmin(admin.ModelAdmin):
    list_display = ("nom", "prenoms", "numero_registre", "annee_registre", "patient")
    search_fields = ("nom", "prenoms", "numero_registre")
