from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


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
    list_display = ["username", "email", "last_name", "first_name", "role", "job_title", "is_active", "last_login"]
    list_filter = ["role", "is_active", "is_superuser"]
    search_fields = ["username", "email", "first_name", "last_name", "phone"]
    ordering = ["last_name", "first_name"]
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Identité", {"fields": ("first_name", "last_name", "email", "phone", "job_title", "department")}),
        ("Rôles dans MA SANTÉ", {"fields": ("role", "extra_roles"),
                                 "description": "Le rôle « Administrateur » donne tous les droits, admin Django comprise."}),
        ("Accès", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("username", "email", "first_name", "last_name", "role",
                                                  "password1", "password2")}),
    )
