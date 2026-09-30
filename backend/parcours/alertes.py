"""Notifications du personnel : pastille, son et push.

Les compteurs viennent de `notifications_for` (l'état réel du parcours, propre
à chaque personne : rôle, hôpital, spécialités). Ce module retient ce que la
personne a déjà vu et ce qui lui a déjà été envoyé, pour ne signaler que les
nouveautés :

- la pastille compte ce qui est arrivé depuis le dernier clic sur la cloche ;
- le push part quand un compteur augmente (commande `alerter_personnel`,
  à lancer chaque minute, comme `envoyer_rappels`).

Les clés VAPID sont celles de l'Espace patient (portail.push).
"""
import json
import logging

from django.conf import settings

from .models import AbonnementPush, EtatNotifications
from .services import notifications_for

log = logging.getLogger(__name__)


def etat(user):
    return EtatNotifications.objects.get_or_create(user=user)[0]


def _suivre(memoire, items):
    """Un compteur qui baisse (patient reçu, ordonnance servie) redescend la mémoire :
    l'arrivée suivante comptera comme une nouveauté."""
    suite = {item["id"]: min(memoire.get(item["id"], 0), item["count"]) for item in items}
    return suite, suite != memoire


def pour(user):
    """Les notifications de la personne, avec les nouveautés depuis son dernier clic."""
    data = notifications_for(user)
    if user.is_platform:
        return {**data, "nouveaux": 0}
    e = etat(user)
    vues, change = _suivre(e.vues, data["items"])
    if change:
        e.vues = vues
        e.save(update_fields=["vues"])
    for item in data["items"]:
        item["nouveau"] = item["count"] - vues.get(item["id"], 0)
    return {**data, "nouveaux": sum(item["nouveau"] for item in data["items"])}


def marquer_vues(user):
    """Clic sur la cloche : tout ce qui est affiché est vu, la pastille s'efface."""
    e = etat(user)
    e.vues = {item["id"]: item["count"] for item in notifications_for(user)["items"]}
    e.save(update_fields=["vues"])
    return pour(user)


def abonner(user, subscription):
    keys = subscription.get("keys") or {}
    endpoint, p256dh, auth = subscription.get("endpoint"), keys.get("p256dh"), keys.get("auth")
    if not (endpoint and p256dh and auth):
        return None
    # Un navigateur partagé change de main : l'abonnement suit la dernière personne connectée.
    return AbonnementPush.objects.update_or_create(endpoint=endpoint, defaults={"user": user, "p256dh": p256dh, "auth": auth})[0]


def desabonner(user, endpoint):
    AbonnementPush.objects.filter(user=user, endpoint=endpoint).delete()


def cle_publique():
    from portail.push import public_key

    return public_key()


def envoyer(user, *, title, body, url="/modules", tag=None):
    """Envoie à tous les navigateurs abonnés de la personne. Renvoie le nombre d'envois réussis."""
    from pywebpush import WebPushException, webpush

    from portail.push import keys

    sent = 0
    payload = json.dumps({"title": title, "body": body, "url": url, "tag": tag})
    contact = getattr(settings, "PUSH_CONTACT", "mailto:contact@masante.local")
    for sub in AbonnementPush.objects.filter(user=user):
        try:
            webpush(
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=payload, vapid_private_key=keys().private_key, vapid_claims={"sub": contact}, ttl=900,
            )
            sent += 1
        except WebPushException as error:
            status = getattr(error.response, "status_code", None)
            if status in (404, 410):
                sub.delete()  # le navigateur a retiré l'abonnement
            else:
                log.warning("Notification non envoyée à %s : %s", user.username, error)
    return sent


def alerter(user):
    """Push des compteurs qui ont augmenté depuis le dernier envoi. Renvoie le nombre de notifications."""
    items = notifications_for(user)["items"]
    e = etat(user)
    envoyees, _ = _suivre(e.envoyees, items)
    nombre = 0
    for item in items:
        if item["count"] > envoyees.get(item["id"], 0):
            envoyer(user, title="MA SANTÉ", body=f"{item['count']} {item['label']}", url=item["link"], tag=f"ms-{item['id']}")
            nombre += 1
        envoyees[item["id"]] = item["count"]
    if envoyees != e.envoyees:
        e.envoyees = envoyees
        e.save(update_fields=["envoyees"])
    return nombre


def alerter_personnel():
    from django.contrib.auth import get_user_model

    User = get_user_model()
    total = 0
    for user in User.objects.filter(is_active=True, abonnements_push__isnull=False).distinct():
        total += alerter(user)
    return total
