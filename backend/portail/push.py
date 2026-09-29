"""Notifications Web Push : le rappel arrive sur le téléphone même application fermée.

Norme ouverte (VAPID) : aucun compte chez un fournisseur. Les clés du serveur
sont créées au premier besoin et gardées en base.
"""
import base64
import json
import logging

from cryptography.hazmat.primitives import serialization
from django.conf import settings

from .models import PushKeys, PushSubscription

log = logging.getLogger(__name__)


def _b64(data):
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def keys():
    row = PushKeys.objects.first()
    if row:
        return row
    from py_vapid import Vapid01

    vapid = Vapid01()
    vapid.generate_keys()
    private_der = vapid.private_key.private_bytes(
        serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    public_raw = vapid.public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return PushKeys.objects.create(public_key=_b64(public_raw), private_key=_b64(private_der))


def public_key():
    return keys().public_key


def send(patient, *, title, body, url="/patient/espace", tag=None):
    """Envoie à tous les appareils du patient ; un abonnement expiré est oublié. Renvoie le nombre d'envois réussis."""
    from pywebpush import WebPushException, webpush

    sent = 0
    payload = json.dumps({"title": title, "body": body, "url": url, "tag": tag})
    contact = getattr(settings, "PUSH_CONTACT", "mailto:contact@masante.local")
    for sub in PushSubscription.objects.filter(patient=patient):
        try:
            webpush(
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=payload, vapid_private_key=keys().private_key, vapid_claims={"sub": contact}, ttl=3600,
            )
            sent += 1
        except WebPushException as error:
            status = getattr(error.response, "status_code", None)
            if status in (404, 410):
                sub.delete()  # le navigateur a retiré l'abonnement
            else:
                log.warning("Notification non envoyée à %s : %s", patient.patient_number, error)
    return sent
