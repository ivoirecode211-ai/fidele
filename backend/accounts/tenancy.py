"""Multitenant : chaque hôpital ne voit que ses propres données.

Toute lecture ou écriture de données médicales ou financières passe par
`hospital_of(user)`. Un compte sans hôpital (la plateforme, ou un compte
antérieur au multitenant) travaille dans le premier hôpital actif.
"""
import itertools
import re
import unicodedata

from .models import Hospital

# Mots ignorés pour l'acronyme : « Centre de Santé de Boundiali » -> CSB.
MOTS_VIDES = {"DE", "DU", "DES", "LA", "LE", "LES", "L", "D", "ET", "EN", "A", "AU", "AUX", "SUR"}


def hospital_of(user):
    if getattr(user, "hospital_id", None):
        return user.hospital
    return Hospital.objects.filter(active=True).order_by("pk").first()


def code_candidates(name):
    """Codes de 3 lettres possibles, du plus parlant au moins parlant."""
    plain = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().upper()
    # On découpe sur les espaces et la ponctuation, puis on ne garde que les lettres :
    # « CHU-2 de Bouaké » -> CHU, BOUAKE.
    words = [re.sub(r"[^A-Z]", "", w) for w in re.split(r"[^A-Z0-9]+", plain)]
    words = [w for w in words if w and w not in MOTS_VIDES] or ["HOPITAL"]
    initials = "".join(w[0] for w in words)
    letters = "".join(words)
    candidates = []
    if len(initials) >= 3:
        candidates += ["".join(c) for c in itertools.combinations(initials, 3)]
    # Toujours la première lettre du nom en tête, puis les lettres qui suivent, dans l'ordre.
    candidates += [letters[0] + "".join(c) for c in itertools.combinations(letters[1:], 2)]
    candidates += [initials[0] + letters[1 if len(letters) > 1 else 0] + chr(x) for x in range(ord("A"), ord("Z") + 1)]
    return list(dict.fromkeys(c for c in candidates if len(c) == 3))


def unique_code(name, exclude_pk=None):
    taken = Hospital.objects.exclude(pk=exclude_pk) if exclude_pk else Hospital.objects.all()
    used = set(taken.values_list("code", flat=True))
    for candidate in code_candidates(name):
        if candidate not in used:
            return candidate
    for combo in itertools.product("ABCDEFGHIJKLMNOPQRSTUVWXYZ", repeat=3):
        if "".join(combo) not in used:
            return "".join(combo)
    raise ValueError("Plus aucun code d'hôpital disponible.")
