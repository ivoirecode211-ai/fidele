from django.contrib import admin

from .models import Employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ["matricule", "nom", "prenom", "poste", "departement", "contrat", "statut", "dateEmbauche"]
    list_editable = ["statut"]
    list_filter = ["statut", "contrat", "departement"]
    search_fields = ["matricule", "nom", "prenom", "email", "telephone"]
