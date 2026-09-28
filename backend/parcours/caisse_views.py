"""API de la caisse : sessions, encaissement, annulation, ticket, régie."""
from datetime import date

from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from patients.models import Patient

from . import caisse
from .models import Admission, CashSession
from .permissions import CaisseAccess, RoleAccess
from .serializers import CaissePatientSerializer
from .services import age_from_birth_date


class RegieAccess(RoleAccess):
    roles = {"ADMIN", "DIRECTOR", "REGISSEUR"}
    write_roles = {"ADMIN", "REGISSEUR"}


def refused(error):
    return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)


def person(user):
    if user is None:
        return "—"
    return f"{user.last_name.upper()} {user.first_name}".strip() or user.username


def when(value):
    return timezone.localtime(value).strftime("%d/%m/%Y %H:%M") if value else "—"


def money(value):
    return float(value) if value is not None else None


def serialize_session(session):
    expected = caisse.expected_amount(session) if session.status == CashSession.OPEN else session.expected
    return {
        "id": session.pk,
        "caissier": person(session.cashier),
        "caissierId": session.cashier_id,
        "date": session.session_date.strftime("%d/%m/%Y"),
        "ouverteLe": when(session.opened_at),
        "fermeeLe": when(session.closed_at),
        "statut": session.status,
        "statutLibelle": session.get_status_display(),
        "attendu": money(expected),
        "compte": money(session.counted),
        "ecart": money(session.gap),
        "justification": session.justification,
        "valideePar": person(session.validated_by) if session.validated_by else "",
        "valideeLe": when(session.validated_at) if session.validated_at else "",
        "recu": money(session.received),
        "ecartValidation": money(session.validation_gap),
        "noteValidation": session.validation_note,
        "tickets": session.admissions.actives().filter(payment_status=Admission.PAID).count(),
    }


def own_admissions(user):
    return Admission.objects.of_hospital(hospital_of(user))


def admission_row(admission):
    return CaissePatientSerializer(admission).data


# ------------------------------------------------------------------ accueil

class PatientSearchView(APIView):
    """Patient déjà connu : recherche par nom, numéro de dossier ou téléphone."""
    permission_classes = [CaisseAccess]

    def get(self, request):
        term = request.query_params.get("q", "").strip()
        if len(term) < 2:
            return Response([])
        patients = Patient.objects.filter(hospital=hospital_of(request.user)).filter(
            Q(last_name__icontains=term) | Q(first_names__icontains=term)
            | Q(patient_number__icontains=term) | Q(phone__icontains=term)
        ).order_by("last_name", "first_names")[:15]
        return Response([
            {
                "patientId": p.patient_number,
                "nom": p.last_name,
                "prenom": p.first_names,
                "sexe": {"F": "Féminin", "M": "Masculin"}.get(p.sex, ""),
                "age": age_from_birth_date(p.birth_date),
                "dateNaissance": p.birth_date.isoformat() if p.birth_date else None,
                "telephone": p.phone,
                "parentContact": p.emergency_phone,
                "quartier": p.locality,
                "insuranceName": p.insurance,
                "insuranceNumber": p.insurance_number,
                "derniereVisite": when(p.admissions.order_by("-created_at").values_list("created_at", flat=True).first()),
            }
            for p in patients
        ])


class PayView(APIView):
    """Bouton « Encaisser »."""
    permission_classes = [CaisseAccess]

    def post(self, request, pk):
        try:
            admission = caisse.pay(admission=get_object_or_404(own_admissions(request.user), pk=pk), user=request.user)
        except caisse.CaisseError as error:
            return refused(error)
        return Response(admission_row(admission))


class CancelView(APIView):
    """Annulation d'un ticket par le régisseur (corbeille)."""
    permission_classes = [RegieAccess]

    def post(self, request, pk):
        try:
            admission = caisse.cancel(admission=get_object_or_404(own_admissions(request.user), pk=pk), user=request.user,
                                      reason=request.data.get("motif", ""))
        except caisse.CaisseError as error:
            return refused(error)
        return Response(admission_row(admission))


class TicketView(APIView):
    """Données du ticket imprimable ; « duplicata » à partir de la 2e impression."""
    permission_classes = [CaisseAccess]

    def post(self, request, pk):
        admission = get_object_or_404(own_admissions(request.user).select_related("patient", "created_by", "session__cashier"), pk=pk)
        Admission.objects.filter(pk=pk).update(printed_count=admission.printed_count + 1)
        settings_row = hospital_of(request.user)
        patient = admission.patient
        return Response({
            "etablissement": {
                "nom": settings_row.name, "slogan": settings_row.slogan, "adresse": settings_row.address,
                "telephone": settings_row.phone, "agrement": settings_row.license_number,
                "devise": settings_row.currency,
            },
            "reference": admission.reference,
            "duplicata": admission.printed_count >= 1,
            "date": when(admission.created_at),
            "encaisseLe": when(admission.paid_at) if admission.paid_at else "",
            "caissier": person(admission.session.cashier if admission.session else admission.created_by),
            "patient": f"{patient.last_name} {patient.first_names}",
            "dossier": patient.patient_number,
            "prestation": admission.service_name,
            "prix": money(admission.service_price),
            "assurance": admission.insurance_name,
            "taux": money(admission.insurance_coverage),
            "partAssurance": money(admission.service_price - admission.cost),
            "aPayer": money(admission.cost),
            "statut": "Annulé" if admission.cancelled_at else admission.get_payment_status_display(),
        })


# ------------------------------------------------------------------ sessions

class SessionView(APIView):
    """Ma caisse : session en cours et historique ; ouvrir (POST) ; clôturer (PATCH)."""
    permission_classes = [CaisseAccess]

    def get(self, request):
        current = caisse.current_session(request.user)
        mine = CashSession.objects.filter(cashier=request.user).select_related("cashier", "validated_by")[:20]
        return Response({
            "session": serialize_session(current) if current else None,
            "mesSessions": [serialize_session(s) for s in mine],
            "regisseur": caisse.is_regisseur(request.user),
        })

    def post(self, request):
        return Response(serialize_session(caisse.open_session(request.user)), status=status.HTTP_201_CREATED)

    def patch(self, request):
        session = caisse.current_session(request.user)
        if session is None:
            return refused("Aucune caisse ouverte.")
        try:
            session = caisse.close_session(session=session, actor=request.user,
                                           counted=request.data.get("montantCompte"),
                                           justification=request.data.get("justification", ""))
        except (caisse.CaisseError, ArithmeticError, ValueError) as error:
            return refused(error)
        return Response(serialize_session(session))


# ------------------------------------------------------------------ régie

def parse_period(request):
    today = timezone.localdate()
    try:
        start = date.fromisoformat(request.query_params.get("du") or str(today))
        end = date.fromisoformat(request.query_params.get("au") or str(today))
    except ValueError:
        return today, today
    return (start, end) if start <= end else (end, start)


class RegieView(APIView):
    """Vue du régisseur : clôtures à valider, caisses ouvertes, historique, tickets, corbeille."""
    permission_classes = [RegieAccess]

    def get(self, request):
        start, end = parse_period(request)
        sessions = CashSession.objects.filter(hospital=hospital_of(request.user)).select_related("cashier", "validated_by")
        tickets = own_admissions(request.user).select_related("patient", "service").filter(created_at__date__range=(start, end))
        live = tickets.filter(cancelled_at__isnull=True)
        cancelled = tickets.filter(cancelled_at__isnull=False)
        total = lambda qs, field: money(qs.aggregate(t=Sum(field))["t"] or 0)  # noqa: E731
        return Response({
            "periode": {"du": str(start), "au": str(end)},
            "totaux": {
                "encaisse": total(live.filter(payment_status=Admission.PAID), "cost"),
                "aPayer": total(live.filter(payment_status=Admission.UNPAID), "cost"),
                "prisEnCharge": total(live.exclude(payment_status=Admission.UNPAID), "service_price")
                                - total(live.exclude(payment_status=Admission.UNPAID), "cost"),
                "annule": total(cancelled, "cost"),
                "tickets": live.count(),
                "ticketsAnnules": cancelled.count(),
            },
            "cloturesAValider": [serialize_session(s) for s in sessions.filter(status=CashSession.PENDING)],
            "caissesOuvertes": [serialize_session(s) for s in sessions.filter(status=CashSession.OPEN)],
            "historique": [serialize_session(s) for s in sessions.filter(session_date__range=(start, end))[:100]],
            "tickets": [admission_row(a) for a in live.order_by("-created_at")[:200]],
            "corbeille": [
                {**admission_row(a), "annuleLe": when(a.cancelled_at), "annulePar": person(a.cancelled_by)}
                for a in cancelled.select_related("cancelled_by").order_by("-cancelled_at")
            ],
        })


class RegieSessionView(APIView):
    """Le régisseur clôture la caisse d'un agent parti sans fermer, ou valide une clôture."""
    permission_classes = [RegieAccess]

    def post(self, request, pk, action):
        session = get_object_or_404(CashSession, pk=pk, hospital=hospital_of(request.user))
        try:
            if action == "cloturer":
                session = caisse.close_session(session=session, actor=request.user,
                                               counted=request.data.get("montantCompte"),
                                               justification=request.data.get("justification", ""))
            else:
                session = caisse.validate_session(session=session, regisseur=request.user,
                                                  received=request.data.get("montantRecu"),
                                                  note=request.data.get("note", ""))
        except (caisse.CaisseError, ArithmeticError, ValueError) as error:
            return refused(error)
        return Response(serialize_session(session))
