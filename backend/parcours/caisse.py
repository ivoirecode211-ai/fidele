"""Caisse : sessions, encaissement, annulation, doublons.

Toute transition passe par ici, jamais par une vue :

    Accueil  -> passage « à payer » (ou « pris en charge » si l'assurance couvre 100 %)
    Caisse   -> encaissé dans la session ouverte du caissier -> file de l'infirmerie
    Clôture  -> montant compté, écart justifié -> « en attente de validation »
    Régie    -> fonds reçus, écart justifié -> « validée »
"""
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import Admission, CashSession

REGISSEURS = {"ADMIN", "REGISSEUR"}
# Même patient, même prestation dans ce délai : presque toujours une double saisie.
DUPLICATE_WINDOW = timedelta(days=15)


class CaisseError(Exception):
    """Action refusée par les règles de la caisse (message affiché tel quel)."""


class Duplicate(CaisseError):
    def __init__(self, admission):
        super().__init__("Un ticket existe déjà pour ce patient et cette prestation.")
        self.admission = admission


def is_regisseur(user):
    return user.has_role(*REGISSEURS)


def ticket_reference(admission):
    return f"TCK-{timezone.localtime(admission.created_at):%Y}-{admission.pk:06d}"


def recent_duplicate(patient, service):
    return (Admission.objects.actives()
            .filter(patient=patient, service=service, created_at__gte=timezone.now() - DUPLICATE_WINDOW)
            .order_by("-created_at").first())


# ------------------------------------------------------------------ sessions

def current_session(user):
    return CashSession.objects.filter(cashier=user, status=CashSession.OPEN).first()


def expected_amount(session):
    """Somme réellement encaissée sur cette session (tickets annulés exclus)."""
    return (Admission.objects.actives()
            .filter(session=session, payment_status=Admission.PAID)
            .aggregate(total=Sum("cost"))["total"] or Decimal("0"))


def open_session(user):
    return current_session(user) or CashSession.objects.create(cashier=user)


@transaction.atomic
def close_session(*, session, actor, counted, justification=""):
    session = CashSession.objects.select_for_update().get(pk=session.pk)
    if session.status != CashSession.OPEN:
        raise CaisseError("Cette caisse est déjà clôturée.")
    if session.cashier_id != actor.pk and not is_regisseur(actor):
        raise CaisseError("Seul le régisseur peut clôturer la caisse d'un autre agent.")
    if counted in (None, ""):
        raise CaisseError("Indiquez le montant compté en caisse.")
    counted = Decimal(str(counted))
    expected = expected_amount(session)
    if counted != expected and not justification.strip():
        raise CaisseError(f"Écart de {counted - expected:+,.0f} FCFA : il doit être justifié.".replace(",", " "))
    session.expected = expected
    session.counted = counted
    session.gap = counted - expected
    session.justification = justification.strip()
    session.closed_at = timezone.now()
    session.closed_by = actor
    session.status = CashSession.PENDING
    session.save()
    return session


@transaction.atomic
def validate_session(*, session, regisseur, received, note=""):
    session = CashSession.objects.select_for_update().get(pk=session.pk)
    if not is_regisseur(regisseur):
        raise CaisseError("Seul un régisseur valide une clôture.")
    if session.status != CashSession.PENDING:
        raise CaisseError("Seule une caisse clôturée, en attente de validation, peut être validée.")
    if session.cashier_id == regisseur.pk and not regisseur.is_superuser:
        raise CaisseError("Un caissier ne valide pas sa propre caisse.")
    if received in (None, ""):
        raise CaisseError("Indiquez le montant réellement reçu.")
    received = Decimal(str(received))
    gap = received - (session.counted or Decimal("0"))
    if gap and not note.strip():
        raise CaisseError("Un écart entre le montant compté et le montant reçu doit être justifié.")
    session.received = received
    session.validation_gap = gap
    session.validation_note = note.strip()
    session.validated_by = regisseur
    session.validated_at = timezone.now()
    session.status = CashSession.VALIDATED
    session.save()
    return session


# ------------------------------------------------------------------ tickets

@transaction.atomic
def pay(*, admission, user):
    """Encaisse un ticket dans la session ouverte du caissier."""
    session = current_session(user)
    if session is None:
        raise CaisseError("Votre caisse est fermée. Ouvrez-la avant d'encaisser.")
    admission = Admission.objects.select_for_update().get(pk=admission.pk)
    if admission.cancelled_at:
        raise CaisseError("Ce ticket a été annulé : il ne peut plus être encaissé.")
    if admission.payment_status != Admission.UNPAID:
        raise CaisseError("Ce ticket est déjà réglé.")
    admission.payment_status = Admission.PAID
    admission.paid_at = timezone.now()
    admission.session = session
    admission.save(update_fields=["payment_status", "paid_at", "session"])
    return admission


@transaction.atomic
def cancel(*, admission, user, reason):
    """Annulation par le régisseur : le ticket va en corbeille, horodaté et signé."""
    if not is_regisseur(user):
        raise CaisseError("Seul le régisseur peut annuler un ticket.")
    reason = (reason or "").strip()
    if len(reason) < 5:
        raise CaisseError("Indiquez le motif de l'annulation (au moins cinq caractères).")
    admission = Admission.objects.select_for_update().get(pk=admission.pk)
    if admission.cancelled_at:
        raise CaisseError("Ce ticket est déjà annulé.")
    started = admission.sent_to_consultation_at or admission.vitals.exists() or hasattr(admission, "consultation")
    if started:
        raise CaisseError("Les soins ont déjà commencé pour ce patient : l'annulation doit être traitée avec le service.")
    admission.cancelled_at = timezone.now()
    admission.cancelled_by = user
    admission.cancel_reason = reason
    admission.save(update_fields=["cancelled_at", "cancelled_by", "cancel_reason"])
    return admission
