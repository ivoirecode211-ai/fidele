import secrets
import string

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

User = get_user_model()

ROLE_LABELS = dict(User.ROLE_CHOICES)
ROLE_CODES = {label: code for code, label in User.ROLE_CHOICES}

# Classe CSS de la pastille de rôle dans le graphique (administration.css).
ROLE_CLASSES = {
    "DOCTOR": "doctor",
    "NURSE": "nurse",
    "PHARMACY": "pharmacy",
    "RECEPTION": "secretary",
    "ACCOUNTING": "accounting",
}


def display_name(user):
    name = f"{user.last_name.upper()} {user.first_name}".strip()
    return name or user.username


def split_name(full_name):
    """« KOUADIO Jean Marc » -> (« Jean Marc », « KOUADIO »)."""
    parts = full_name.split()
    return " ".join(parts[1:]), parts[0].upper() if parts else ""


def role_distribution(users):
    """Répartition des rôles principaux : 5 plus fréquents + « Autres », en %."""
    counts = {}
    for user in users:
        counts[user.role] = counts.get(user.role, 0) + 1
    total = sum(counts.values())
    if not total:
        return []
    ranked = sorted(counts.items(), key=lambda item: -item[1])
    shown, rest = ranked[:5], ranked[5:]
    rows = [(ROLE_LABELS.get(code, code), n, ROLE_CLASSES.get(code, "other")) for code, n in shown]
    if rest:
        rows.append(("Autres", sum(n for _, n in rest), "other"))
    # Méthode du plus fort reste : les pourcentages affichés totalisent 100.
    exact = [n * 100 / total for _, n, _ in rows]
    rounded = [int(value) for value in exact]
    for index in sorted(range(len(rows)), key=lambda i: exact[i] - rounded[i], reverse=True)[: 100 - sum(rounded)]:
        rounded[index] += 1
    return [{"name": name, "percentage": pct, "className": css} for (name, _, css), pct in zip(rows, rounded)]


def temporary_password():
    alphabet = string.ascii_letters + string.digits
    core = "".join(secrets.choice(alphabet) for _ in range(10))
    return f"{core}@{secrets.randbelow(90) + 10}"


def ascii_slug(text):
    """« N'Guessan » -> « nguessan » : minuscules, sans accents, espaces ni apostrophes."""
    import unicodedata

    plain = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return "".join(ch for ch in plain.lower() if ch.isalnum())


def username_candidates(full_name):
    """Nomenclature : 1re lettre du 1er prénom + nom, puis du 2e prénom, puis
    2 lettres du 1er prénom, 2 lettres du 2e… (« KOUADIO Jean Marc » -> jkouadio,
    mkouadio, jekouadio, makouadio…)."""
    parts = full_name.split()
    if len(parts) < 2:
        return []
    last = ascii_slug(parts[0])
    firsts = [ascii_slug(part) for part in parts[1:] if ascii_slug(part)]
    candidates = []
    for size in range(1, max(len(first) for first in firsts) + 1):
        for first in firsts:
            if size <= len(first):
                candidate = f"{first[:size]}{last}"
                if candidate not in candidates:
                    candidates.append(candidate)
    return candidates


def suggest_username(full_name, exclude_pk=None):
    taken = User.objects.exclude(pk=exclude_pk) if exclude_pk else User.objects.all()
    candidates = username_candidates(full_name)
    for candidate in candidates:
        if not taken.filter(username__iexact=candidate).exists():
            return candidate
    if not candidates:
        return ""
    # Tous les prénoms épuisés : on numérote la première forme.
    index = 2
    while taken.filter(username__iexact=f"{candidates[0]}{index}").exists():
        index += 1
    return f"{candidates[0]}{index}"


@transaction.atomic
def save_user(*, data, user=None):
    """Crée ou modifie un compte. Renvoie (utilisateur, mot_de_passe_provisoire | None)."""
    codes = [ROLE_CODES[label] for label in data["roles"]]
    first_name, last_name = split_name(data["name"])
    password = None

    # Sans nom d'utilisateur saisi : on garde l'actuel, ou on applique la nomenclature.
    username = data.get("username") or (user.username if user else suggest_username(data["name"]))
    if user is None:
        user = User()
        if not data.get("password"):
            password = temporary_password()
            user.set_password(password)
    user.username = username
    if data.get("password"):
        user.set_password(data["password"])

    user.first_name = first_name
    user.last_name = last_name
    user.job_title = data.get("function", "")
    user.email = data.get("email", "")
    user.phone = data.get("phone", "")
    user.role = codes[0]
    user.extra_roles = [code for code in codes[1:] if code != codes[0]]
    if "ADMIN" not in codes:
        # Sans le rôle Administrateur, plus de droits d'administration.
        user.is_superuser = False
        user.is_staff = False
    user.save()
    return user, password


def deactivate_user(*, user, actor):
    if user.pk == actor.pk:
        raise ValueError("Vous ne pouvez pas désactiver votre propre compte.")
    user.is_active = False
    user.save(update_fields=["is_active"])
    return user


def format_connection(value):
    return timezone.localtime(value).strftime("%d/%m/%Y %H:%M") if value else "Jamais connecté"
