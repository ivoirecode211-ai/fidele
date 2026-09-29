"""Connexion du patient : code patient + PIN à 6 chiffres.

Le jeton remis au patient est signé par le serveur (clé secrète Django) et
porte le numéro de version de son accès : changer ou réinitialiser le PIN
invalide aussitôt tous les jetons déjà émis. Il se présente dans l'en-tête
« Authorization: Patient <jeton> » : les API du personnel, qui n'acceptent
que « Bearer », le refusent d'office, et inversement.
"""
import re
import secrets

from django.core import signing
from django.utils import timezone
from datetime import timedelta
from rest_framework import exceptions
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.permissions import BasePermission
from rest_framework.throttling import SimpleRateThrottle

from .models import PatientAccess

SALT = "portail.patient"
# Un téléphone personnel : la session tient un mois, le PIN la protège.
TOKEN_MAX_AGE = 60 * 60 * 24 * 30
KEYWORD = b"patient"


class CodeInvalide(Exception):
    """PIN refusé : le message est affiché tel quel au patient."""


def pin_valide(pin):
    """Six chiffres, et pas un code que n'importe qui essaierait en premier."""
    if not re.fullmatch(r"\d{6}", pin or ""):
        raise CodeInvalide("Le code doit comporter exactement 6 chiffres.")
    digits = [int(c) for c in pin]
    steps = {b - a for a, b in zip(digits, digits[1:])}
    if len(set(pin)) == 1 or steps in ({1}, {-1}) or pin in {"121212", "112233", "123123", "010203"}:
        raise CodeInvalide("Ce code est trop facile à deviner. Choisissez-en un autre.")
    return pin


def pin_provisoire():
    """Six chiffres tirés au hasard (jamais un code trivial)."""
    while True:
        pin = f"{secrets.randbelow(10 ** 6):06d}"
        try:
            return pin_valide(pin)
        except CodeInvalide:
            continue


def emettre_jeton(access):
    return signing.dumps({"a": access.pk, "v": access.token_version}, salt=SALT, compress=True)


class PatientPrincipal:
    """Ce que `request.user` vaut dans l'espace patient."""
    is_authenticated = True
    is_anonymous = False
    is_platform = False

    def __init__(self, access):
        self.access = access
        self.patient = access.patient

    def __str__(self):
        return f"patient {self.patient.patient_number}"


class PatientAuthentication(BaseAuthentication):
    def authenticate_header(self, request):
        return "Patient"

    def authenticate(self, request):
        header = get_authorization_header(request).split()
        if not header or header[0].lower() != KEYWORD:
            return None
        if len(header) != 2:
            raise exceptions.AuthenticationFailed("En-tête d'authentification invalide.")
        try:
            data = signing.loads(header[1].decode(), salt=SALT, max_age=TOKEN_MAX_AGE)
        except signing.SignatureExpired:
            raise exceptions.AuthenticationFailed("Votre session a expiré. Reconnectez-vous.")
        except signing.BadSignature:
            raise exceptions.AuthenticationFailed("Session invalide. Reconnectez-vous.")
        access = (PatientAccess.objects.select_related("patient", "patient__hospital")
                  .filter(pk=data.get("a"), active=True).first())
        if access is None or access.token_version != data.get("v"):
            raise exceptions.AuthenticationFailed("Votre session n'est plus valable. Reconnectez-vous.")
        return PatientPrincipal(access), None


class IsPatient(BasePermission):
    message = "Réservé à l'espace patient."

    def has_permission(self, request, view):
        return isinstance(request.user, PatientPrincipal)


class IsPatientReady(IsPatient):
    """Connecté, et PIN personnel déjà choisi (le PIN provisoire n'ouvre que son changement)."""
    message = "Choisissez d'abord votre code personnel."

    def has_permission(self, request, view):
        return super().has_permission(request, view) and not request.user.access.must_change_pin


class LoginThrottle(SimpleRateThrottle):
    """Au plus 20 tentatives par minute depuis une même adresse, en plus du blocage par dossier."""
    rate = "20/min"
    scope = "portail-connexion"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


def connecter(*, code, pin):
    """Vérifie code + PIN ; bloque le dossier 15 minutes après 5 échecs.

    Le même message répond à un code inconnu et à un PIN faux : on ne révèle
    pas quels dossiers existent.
    """
    refus = CodeInvalide("Code patient ou code PIN incorrect.")
    access = (PatientAccess.objects.select_related("patient", "patient__hospital")
              .filter(patient__patient_number__iexact=(code or "").strip(), active=True).first())
    if access is None:
        raise refus
    if access.locked:
        minutes = max(1, int((access.locked_until - timezone.now()).total_seconds() // 60) + 1)
        raise CodeInvalide(f"Trop d'essais. Réessayez dans {minutes} minute(s), ou adressez-vous à l'accueil.")
    if not access.check_pin(pin or ""):
        access.failed_attempts += 1
        if access.failed_attempts >= PatientAccess.MAX_FAILURES:
            access.locked_until = timezone.now() + timedelta(minutes=PatientAccess.LOCK_MINUTES)
            access.failed_attempts = 0
        access.save(update_fields=["failed_attempts", "locked_until"])
        raise refus
    access.failed_attempts = 0
    access.locked_until = None
    access.last_login = timezone.now()
    access.save(update_fields=["failed_attempts", "locked_until", "last_login"])
    return access
