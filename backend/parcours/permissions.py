from rest_framework.permissions import SAFE_METHODS, BasePermission

# Les rôles suivent DEFAULT_ROLE_MODULES dans Modules.jsx.


class RoleAccess(BasePermission):
    """roles : lecture ; write_roles : actions (par défaut les mêmes rôles)."""
    roles = set()
    write_roles = None

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser or "ADMIN" in user.role_codes:
            return True
        allowed = self.roles if request.method in SAFE_METHODS or self.write_roles is None else self.write_roles
        return bool(user.role_codes & allowed)


class CaisseAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "RECEPTION", "ACCOUNTING", "REGISSEUR"}


class NursingAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "NURSE", "AIDE_SOIGNANT"}


class ConsultationAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "DOCTOR"}
    write_roles = {"ADMIN", "DOCTOR"}


class PharmacyAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "DOCTOR", "PHARMACY", "STOCK"}
    write_roles = {"ADMIN", "DIRECTOR", "PHARMACY"}


class AccountingAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "ACCOUNTING", "REGISSEUR"}
