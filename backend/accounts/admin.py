from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Hospital, User


class RolesField(forms.MultipleChoiceField):
    widget = forms.CheckboxSelectMultiple


class UserForm(forms.ModelForm):
    extra_roles = RolesField(choices=User.ROLE_CHOICES, required=False, label="Rôles supplémentaires")

    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserForm
    list_display = ["username", "email", "last_name", "first_name", "hospital", "role", "job_title", "is_active", "last_login"]
    list_filter = ["hospital", "role", "is_active", "is_superuser"]
    search_fields = ["username", "email", "first_name", "last_name", "phone"]
    ordering = ["last_name", "first_name"]
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Identité", {"fields": ("first_name", "last_name", "email", "phone", "job_title", "department")}),
        ("Rôles dans MA SANTÉ", {"fields": ("hospital", "role", "extra_roles"),
                                 "description": "Sans hôpital, le rôle « Administrateur » est celui de la plateforme "
                                                "(tous les droits, admin Django comprise). Avec un hôpital, il "
                                                "administre cet hôpital seulement."}),
        ("Accès", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("username", "email", "first_name", "last_name", "hospital", "role",
                                                  "password1", "password2")}),
    )


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "city", "district", "phone", "active", "created_at"]
    list_filter = ["active", "city"]
    search_fields = ["name", "code", "city", "district"]
    readonly_fields = ["created_at", "updated_at", "updated_by"]
