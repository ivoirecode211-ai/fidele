"""Journal d'audit : enregistre toute action qui modifie des données,
ainsi que les connexions (réussies ou non), avec l'adresse IP.

Branché comme middleware : aucun module n'a à s'en soucier.
"""
import json
import time

from .models import AuditLog

MUTATING = {"POST", "PUT", "PATCH", "DELETE"}
SECRET_KEYS = {"password", "password1", "password2", "old_password", "new_password", "token", "refresh", "access",
               "csrfmiddlewaretoken", "temporaryPassword"}
SKIPPED = ("/api/auth/refresh/", "/admin/jsi18n/")

# Préfixe d'URL -> module affiché dans le journal.
MODULES = [
    ("/api/parcours/caisse", "Caisse"),
    ("/api/parcours/soins", "Soins infirmiers"),
    ("/api/parcours/consultations", "Consultation"),
    ("/api/parcours/pharmacie", "Pharmacie"),
    ("/api/parcours/comptabilite", "Comptabilité"),
    ("/api/administration", "Administration"),
    ("/api/appointments", "Rendez-vous"),
    ("/api/hospitalization", "Hospitalisation"),
    ("/api/laboratory", "Laboratoire"),
    ("/api/stocks", "Stocks"),
    ("/api/rh", "Ressources humaines"),
    ("/api/maintenance", "Maintenance"),
    ("/api/hygiene", "Hygiène"),
    ("/api/auth", "Authentification"),
    ("/admin", "Admin Django"),
    ("/api", "API"),
]

# Fin d'URL -> action métier (sinon : d'après la méthode HTTP).
ACTIONS = {
    "consulter": "Prise en charge", "valider": "Validation", "constantes": "Constantes",
    "preparer": "Préparation", "servir": "Dispensation", "sortie": "Sortie d'hospitalisation",
    "statut": "Changement de statut", "demande": "Demande d'analyse", "resultat": "Résultat d'analyse",
}
METHOD_ACTIONS = {"POST": "Création", "PUT": "Modification", "PATCH": "Modification", "DELETE": "Suppression"}


def client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return (forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")) or None


def module_for(path):
    return next((label for prefix, label in MODULES if path.startswith(prefix)), "Autre")


def action_for(request, path):
    last = [part for part in path.strip("/").split("/") if part][-1:] or [""]
    return ACTIONS.get(last[0], METHOD_ACTIONS.get(request.method, request.method))


def clean(data):
    """Retire les secrets et tronque les valeurs longues."""
    if not isinstance(data, dict):
        return {}
    cleaned = {}
    for key, value in list(data.items())[:30]:
        if key in SECRET_KEYS or "password" in key.lower():
            continue
        text = value if isinstance(value, (int, float, bool)) or value is None else str(value)
        cleaned[key] = text[:200] if isinstance(text, str) else text
    return cleaned


def request_payload(request, body):
    if request.content_type == "application/json":
        try:
            return clean(json.loads(body or b"{}"))
        except (ValueError, UnicodeDecodeError):
            return {}
    if request.content_type == "multipart/form-data":
        return {}
    return clean(request.POST.dict()) if request.method == "POST" else {}


def describe(response):
    """Libellé lisible de l'objet concerné, si la réponse le donne."""
    data = getattr(response, "data", None)
    if isinstance(data, dict):
        for key in ("patient", "name", "produit", "equipment", "zone", "fournisseur", "title", "reference", "id"):
            if data.get(key) not in (None, ""):
                return str(data[key])[:120]
    return ""


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        if request.method not in MUTATING or path.startswith(SKIPPED) or not (path.startswith("/api/") or path.startswith("/admin/")):
            return self.get_response(request)

        # Un envoi de fichier n'est pas lu d'avance : un scan dépasse vite la limite de
        # lecture en mémoire de Django, et son contenu n'a rien à faire dans le journal.
        fichier = request.content_type == "multipart/form-data"
        body = b"" if fichier else request.body  # lu avant la vue, qui ne peut plus le relire ensuite
        started = time.monotonic()
        response = self.get_response(request)
        try:
            self.record(request, response, body, started)
        except Exception:  # le journal ne doit jamais faire échouer une action
            pass
        return response

    def record(self, request, response, body, started):
        path = request.path
        payload = request_payload(request, body)
        user = getattr(request, "user", None)
        user = user if getattr(user, "is_authenticated", False) else None

        if path in ("/api/auth/login/", "/admin/login/"):
            success = response.status_code == 200 if path.startswith("/api/") else response.status_code == 302
            action = "Connexion" if success else "Échec de connexion"
            username = payload.get("username", "")
            if success and user is None and username:
                from django.contrib.auth import get_user_model
                from django.db.models import Q

                user = get_user_model().objects.filter(Q(username=username) | Q(email__iexact=username)).first()
            description = "Connexion à l'application" if path.startswith("/api/") else "Connexion à l'admin Django"
        else:
            success = response.status_code < 400
            action = action_for(request, path)
            username = user.get_username() if user else ""
            description = describe(response)

        AuditLog.objects.create(
            user=user if user and user.is_authenticated else None,
            username=username,
            action=action,
            module=module_for(path),
            description=description,
            method=request.method,
            path=path[:255],
            status_code=response.status_code,
            success=success,
            ip_address=client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
            duration_ms=int((time.monotonic() - started) * 1000),
            details=payload,
        )
