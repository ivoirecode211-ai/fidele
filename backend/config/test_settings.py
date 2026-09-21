"""Base éphémère pour les tests isolés ; ne modifie jamais la base de développement."""
from .settings import *  # noqa: F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
SECRET_KEY = "isolated-tests-only-key-at-least-thirty-two-characters"
