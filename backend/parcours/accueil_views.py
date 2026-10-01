"""API du module Accueil & Caisse (src/accueil/ côté React).

Les noms de champs sont ceux des écrans de l'accueil : patients, fiches de
paiement, sessions et bilan. Une « fiche » est un passage en caisse
(Admission) ; les règles restent celles de caisse.py.
"""
from datetime import date, timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import hospital_of
from patients.models import Patient

from . import caisse
from .models import Admission, CashSession, Department, InsuranceCompany, MedicalService
from .services import next_patient_number, open_admission

# Tenir une caisse : enregistrer, facturer, encaisser.
CAISSIERS = {"ADMIN", "DIRECTOR", "ACCOUNTING", "RECEPTION"}


def est_caissier(user):
    return user.is_authenticated and user.has_role(*CAISSIERS)


def est_regisseur(user):
    return user.is_authenticated and caisse.is_regisseur(user)


class AccesAccueil(BasePermission):
    message = "Votre profil ne donne pas accès au module Accueil et Caisse."

    def has_permission(self, request, view):
        return est_caissier(request.user) or est_regisseur(request.user)


class AccesCaisse(BasePermission):
    message = "Votre profil ne tient pas de caisse."

    def has_permission(self, request, view):
        return est_caissier(request.user)


class AccesRegisseur(BasePermission):
    message = "Cette opération est réservée au régisseur."

    def has_permission(self, request, view):
        return est_regisseur(request.user)


def refus(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"detail": str(message)}, status=code)


def nom(agent):
    return (agent.get_full_name() or agent.username) if agent else ""


def montant(valeur):
    return str(Decimal(valeur or 0).quantize(Decimal("0.01")))


# ------------------------------------------------------------------ sérialisation

def etablissement(user):
    """Ce qui s'imprime sur le ticket, tel que l'administrateur de l'hôpital l'a réglé."""
    row = hospital_of(user)
    return {
        "id": row.pk, "nom": row.name, "code": row.code, "adresse": row.address, "ville": row.city,
        "quartier": row.district, "telephone": row.phone, "email": row.email, "devise": row.currency,
        "agrement": row.license_number, "mentions_legales": row.ticket_note,
        "souches": row.ticket_copies, "validite_jours": row.ticket_validity_days,
        "exclusions": row.ticket_exclusions, "logo": row.logo,
    }


def assurance_de(patient):
    """Le dossier garde le nom de l'organisme ; son taux vient du référentiel."""
    if not patient.insurance:
        return None
    return InsuranceCompany.objects.filter(name=patient.insurance, active=True).first()


def patient_data(patient):
    assurance = assurance_de(patient)
    return {
        "id": patient.pk,
        "patient_number": patient.patient_number,
        "last_name": patient.last_name,
        "first_names": patient.first_names,
        "nom_complet": f"{patient.last_name} {patient.first_names}".strip(),
        "birth_date": patient.birth_date.isoformat() if patient.birth_date else None,
        "sex": patient.sex,
        "phone": patient.phone,
        "address": patient.address,
        "city": patient.city,
        "locality": patient.locality,
        "email": patient.email,
        "profession": patient.profession,
        "emergency_contact": patient.emergency_contact,
        "emergency_phone": patient.emergency_phone,
        "emergency_relationship": patient.emergency_relationship,
        "a_assurance": assurance is not None,
        "assurance_nom": assurance.name if assurance else "",
        "insurance_number": patient.insurance_number,
        "taux_assurance": str(assurance.coverage) if assurance else "0",
        "created_at": patient.created_at.isoformat(),
    }


STATUT_FICHE = {Admission.PAID: "Payé", Admission.UNPAID: "En attente", Admission.INSURED: "Prise en charge assurance"}


def fiche_data(admission):
    patient, prestation = admission.patient, admission.service
    department = prestation.department
    quantite = admission.quantity or 1
    return {
        "id": admission.pk,
        "reference": admission.reference,
        "patient": patient.pk,
        "patient_nom": f"{patient.last_name} {patient.first_names}".strip(),
        "patient_code": patient.patient_number,
        "prestation": prestation.pk,
        "prestation_nom": admission.service_name,
        "service": department.pk if department else None,
        "service_nom": department.name if department else "",
        "quantite": quantite,
        "prix_unitaire": montant(admission.service_price / quantite),
        "montant_total": montant(admission.service_price),
        "taux_assurance": str(admission.insurance_coverage),
        "montant_assurance": montant(admission.service_price - admission.cost),
        "montant_patient": montant(admission.cost),
        "statut": admission.payment_status,
        "statut_display": STATUT_FICHE[admission.payment_status],
        "notes": admission.notes,
        "date_creation": admission.created_at.isoformat(),
        "annulee_le": admission.cancelled_at.isoformat() if admission.cancelled_at else None,
        "annulee_par_nom": nom(admission.cancelled_by),
        "motif_annulation": admission.cancel_reason,
        "creee_par_nom": nom(admission.created_by),
        # Ticket : identité du patient et règlement.
        "patient_naissance": patient.birth_date.isoformat() if patient.birth_date else None,
        "patient_sexe": patient.sex,
        "valide_par_nom": nom(admission.session.cashier) if admission.session_id else "",
        "valide_le": admission.paid_at.isoformat() if admission.paid_at else None,
        "montant_recu": None if admission.amount_received is None else montant(admission.amount_received),
        "monnaie_rendue": None if admission.amount_received is None else montant(admission.amount_received - admission.cost),
    }


def session_data(session):
    ouverte = session.status == CashSession.OPEN
    return {
        "id": session.pk,
        "ouverte_par": session.cashier_id,
        "ouverte_par_nom": nom(session.cashier),
        "ouverte_le": session.opened_at.isoformat(),
        "date_session": session.session_date.isoformat(),
        "heure_fin_prevue": None,
        "fermee_le": session.closed_at.isoformat() if session.closed_at else None,
        "montant_systeme": montant(caisse.expected_amount(session) if ouverte else session.expected),
        "montant_compte": None if session.counted is None else montant(session.counted),
        "ecart": None if session.gap is None else montant(session.gap),
        "justificatif": session.justification,
        "statut": session.status,
        "statut_display": session.get_status_display(),
        "valide_par_nom": nom(session.validated_by),
        "valide_le": session.validated_at.isoformat() if session.validated_at else None,
        "montant_recu": None if session.received is None else montant(session.received),
        "ecart_validation": None if session.validation_gap is None else montant(session.validation_gap),
        "note_validation": session.validation_note,
    }


FICHES = Admission.objects.select_related("patient", "service__department", "created_by", "cancelled_by", "session__cashier")
SESSIONS = CashSession.objects.select_related("cashier", "validated_by")


# ------------------------------------------------------------------ référentiels

class ReferentielsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        prestations = MedicalService.objects.filter(active=True, hospital=hospital_of(request.user)).select_related("department")
        return Response({
            "etablissement": etablissement(request.user),
            "services": [{"id": d.pk, "name": d.name, "active": d.active}
                         for d in Department.objects.filter(active=True)],
            "prestations": [
                {"id": p.pk, "code": "", "name": p.name, "price": str(p.price), "category": p.category,
                 "service": p.department_id, "service_nom": p.department.name if p.department else "",
                 "covered": True, "active": p.active}
                for p in prestations
            ],
            "assurances": [{"id": a.pk, "name": a.name, "code": "", "rate": str(a.coverage), "active": a.active}
                           for a in InsuranceCompany.objects.filter(active=True)],
        })


# ------------------------------------------------------------------ patients

class PatientEcriture(serializers.Serializer):
    last_name = serializers.CharField(max_length=120)
    first_names = serializers.CharField(max_length=180)
    birth_date = serializers.DateField(required=False, allow_null=True)
    sex = serializers.ChoiceField(choices=Patient.SEX_CHOICES)
    phone = serializers.CharField(max_length=30)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    city = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    locality = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    profession = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    emergency_contact = serializers.CharField(max_length=180, required=False, allow_blank=True, default="")
    emergency_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")
    emergency_relationship = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")
    assurance = serializers.PrimaryKeyRelatedField(queryset=InsuranceCompany.objects.filter(active=True),
                                                   required=False, allow_null=True)
    numero_assurance = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")

    def validate_birth_date(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("La date de naissance ne peut pas être dans le futur.")
        return value

    def validate(self, attrs):
        if attrs.get("assurance") and not attrs.get("numero_assurance", "").strip():
            raise serializers.ValidationError({"numero_assurance": "Veuillez renseigner le numéro d'assuré."})
        return attrs


def creer_patient(data, hospital):
    assurance = data.pop("assurance", None)
    numero = data.pop("numero_assurance", "").strip()
    data["last_name"] = data["last_name"].strip().upper()
    data["insurance"] = assurance.name if assurance else ""
    data["insurance_number"] = numero if assurance else ""
    for _ in range(5):
        number = next_patient_number(hospital)
        try:
            with transaction.atomic():
                return Patient.objects.create(hospital=hospital, patient_number=number, **data)
        except IntegrityError:
            # Deux agents ont obtenu le même numéro : on recalcule.
            if not Patient.objects.filter(patient_number=number).exists():
                raise
    raise IntegrityError("Impossible d'attribuer un numéro de patient.")


class PatientsView(APIView):
    """Recherche (dix premiers dossiers et le nombre restant) et enregistrement."""
    permission_classes = [AccesCaisse]
    LIMITE = 10

    def get(self, request):
        qs = Patient.objects.filter(hospital=hospital_of(request.user)).order_by("-created_at")
        recherche = request.query_params.get("q", "").strip()
        if recherche:
            qs = qs.filter(Q(last_name__icontains=recherche) | Q(first_names__icontains=recherche)
                           | Q(phone__icontains=recherche) | Q(patient_number__icontains=recherche)
                           | Q(insurance_number__icontains=recherche))
        total = qs.count()
        lignes = list(qs[:self.LIMITE])
        return Response({"total": total, "resultats": [patient_data(p) for p in lignes],
                         "reste": max(total - len(lignes), 0)})

    def post(self, request):
        serializer = PatientEcriture(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(patient_data(creer_patient(dict(serializer.validated_data), hospital_of(request.user))),
                        status=status.HTTP_201_CREATED)


# ------------------------------------------------------------------ fiches

class FicheEcriture(serializers.Serializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    service = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False, allow_null=True)
    prestation = serializers.PrimaryKeyRelatedField(queryset=MedicalService.objects.filter(active=True))
    quantite = serializers.IntegerField(min_value=1, max_value=50, default=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


def fiche_recente(patient, department):
    """Même patient, même service, moins de quinze jours : presque toujours un doublon."""
    since = timezone.now() - timedelta(days=caisse.validity_days(patient.hospital))
    return (FICHES.actives()
            .filter(patient=patient, service__department=department, created_at__gte=since)
            .order_by("-created_at").first())


class FichesView(APIView):
    permission_classes = [AccesCaisse]

    def get(self, request):
        params = request.query_params
        qs = (FICHES.of_hospital(hospital_of(request.user))
              .filter(cancelled_at__isnull=params.get("corbeille") != "1").order_by("-created_at"))
        if params.get("statut"):
            qs = qs.filter(payment_status=params["statut"])
        if params.get("patient"):
            qs = qs.filter(patient_id=params["patient"])
        return Response([fiche_data(a) for a in qs[:500]])

    def post(self, request):
        serializer = FicheEcriture(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        patient, prestation = data["patient"], data["prestation"]
        if prestation.hospital_id != hospital_of(request.user).pk:
            return Response({"prestation": ["Prestation inconnue dans cet hôpital."]}, status=status.HTTP_400_BAD_REQUEST)
        if patient.hospital_id != hospital_of(request.user).pk:
            return refus("Ce patient appartient à un autre hôpital.", status.HTTP_404_NOT_FOUND)
        department = data.get("service") or prestation.department
        delai = caisse.validity_days(patient.hospital)

        existante = fiche_recente(patient, department) if department else None
        if existante:
            return Response({
                "detail": "Une fiche existe déjà pour ce patient dans ce service.",
                "fiche_existante": fiche_data(existante),
                "delai_jours": delai,
            }, status=status.HTTP_409_CONFLICT)

        try:
            admission = caisse_open(patient, prestation, data, request.user)
        except caisse.Duplicate as doublon:
            return Response({
                "detail": str(doublon), "fiche_existante": fiche_data(doublon.admission),
                "delai_jours": delai,
            }, status=status.HTTP_409_CONFLICT)
        return Response(fiche_data(FICHES.get(pk=admission.pk)), status=status.HTTP_201_CREATED)


def caisse_open(patient, prestation, data, user):
    return open_admission(patient=patient, user=user, data={
        "service": prestation, "assuranceId": assurance_de(patient),
        "insuranceNumber": patient.insurance_number, "quantite": data["quantite"], "notes": data["notes"],
    })


class FicheValiderView(APIView):
    """Règlement en caisse (ou validation d'une prise en charge totale)."""
    permission_classes = [AccesCaisse]

    def post(self, request, pk):
        admission = get_object_or_404(Admission.objects.of_hospital(hospital_of(request.user)), pk=pk)
        try:
            if admission.payment_status == Admission.INSURED and not admission.cancelled_at:
                session = caisse.current_session(request.user)
                if session is None:
                    raise caisse.CaisseError("Votre caisse est fermée. Ouvrez-la avant de valider un paiement.")
                if admission.session_id is None:
                    admission.session = session
                    admission.paid_at = timezone.now()
                    admission.save(update_fields=["session", "paid_at"])
            else:
                caisse.pay(admission=admission, user=request.user, received=request.data.get("montant_recu"))
        except (caisse.CaisseError, ArithmeticError) as error:
            return refus(error)
        return Response(fiche_data(FICHES.get(pk=pk)))


class FicheAnnulerView(APIView):
    permission_classes = [AccesRegisseur]

    def post(self, request, pk):
        try:
            caisse.cancel(admission=get_object_or_404(Admission.objects.of_hospital(hospital_of(request.user)), pk=pk),
                          user=request.user,
                          reason=request.data.get("motif", ""))
        except caisse.CaisseError as error:
            return refus(error)
        return Response(fiche_data(FICHES.get(pk=pk)))


# ------------------------------------------------------------------ sessions

class SessionView(APIView):
    permission_classes = [AccesCaisse]

    def get(self, request):
        session = caisse.current_session(request.user)
        return Response(session_data(session) if session else None)

    def post(self, request):
        return Response(session_data(caisse.open_session(request.user)), status=status.HTTP_201_CREATED)

    def patch(self, request):
        session = caisse.current_session(request.user)
        if session is None:
            return refus("Aucune caisse ouverte à clôturer.")
        try:
            session = caisse.close_session(session=session, actor=request.user,
                                           counted=request.data.get("montant_compte"),
                                           justification=request.data.get("justificatif", ""))
        except (caisse.CaisseError, ArithmeticError, ValueError) as error:
            return refus(error)
        return Response(session_data(session))


class SessionRegieView(APIView):
    """Le régisseur clôture une caisse restée ouverte, ou valide une clôture."""
    permission_classes = [AccesRegisseur]

    def post(self, request, pk, action):
        if action not in ("cloturer", "valider"):
            return refus("Action inconnue.", status.HTTP_404_NOT_FOUND)
        session = get_object_or_404(CashSession, pk=pk, hospital=hospital_of(request.user))
        try:
            if action == "cloturer":
                session = caisse.close_session(session=session, actor=request.user,
                                               counted=request.data.get("montant_compte"),
                                               justification=request.data.get("justificatif", ""))
            else:
                session = caisse.validate_session(session=session, regisseur=request.user,
                                                  received=request.data.get("montant_recu"),
                                                  note=request.data.get("note", ""))
        except (caisse.CaisseError, ArithmeticError, ValueError) as error:
            return refus(error)
        return Response(session_data(session))


# ------------------------------------------------------------------ bilan

def somme(queryset, champ):
    return montant(queryset.aggregate(t=Sum(champ))["t"])


def totaux(fiches, sessions):
    """Toujours recalculés depuis les lignes vivantes, jamais stockés."""
    vivantes, annulees = fiches.filter(cancelled_at__isnull=True), fiches.filter(cancelled_at__isnull=False)
    return {
        "encaisse": somme(vivantes.filter(payment_status=Admission.PAID), "cost"),
        "pris_en_charge": somme(vivantes.filter(payment_status=Admission.INSURED), "service_price"),
        "annule": somme(annulees, "cost"),
        "tickets": vivantes.count(),
        "tickets_annules": annulees.count(),
        "sessions": sessions.count(),
        "ecarts": somme(sessions, "gap"),
    }


class BilanView(APIView):
    """Servi selon ce que le compte occupe : sa caisse s'il en tient une, la régie s'il est régisseur."""
    permission_classes = [AccesAccueil]

    def get(self, request):
        aujourdhui = timezone.localdate()
        try:
            du = date.fromisoformat(request.query_params.get("du") or str(aujourdhui))
            au = date.fromisoformat(request.query_params.get("au") or str(aujourdhui))
        except ValueError:
            return refus("Les dates de la période sont invalides.")
        if au < du:
            return refus("La fin de période précède son début.")

        caissier, regisseur = est_caissier(request.user), est_regisseur(request.user)
        donnees = {
            "caissier": caissier, "regisseur": regisseur,
            "responsable": request.user.has_role("ADMIN", "DIRECTOR", "REGISSEUR", "ACCOUNTING"),
            "periode": {"du": str(du), "au": str(au)},
            "etablissement": etablissement(request.user),
        }
        hospital = hospital_of(request.user)
        fiches = FICHES.of_hospital(hospital)
        sessions = SESSIONS.filter(hospital=hospital)

        if caissier:
            courante = caisse.current_session(request.user)
            miennes = sessions.filter(cashier=request.user)
            sur_periode = miennes.filter(session_date__range=(du, au))
            fiches_periode = fiches.filter(session__in=sur_periode)
            donnees.update({
                "session": session_data(courante) if courante else None,
                "operations": [fiche_data(a) for a in fiches.actives().filter(session=courante)] if courante else [],
                "mes_sessions": [session_data(s) for s in miennes[:20]],
                "bilan_periode": {
                    **totaux(fiches_periode, sur_periode),
                    "sessions_detail": [session_data(s) for s in sur_periode],
                    "lignes": [fiche_data(a) for a in fiches_periode.filter(cancelled_at__isnull=True)],
                },
            })

        if regisseur:
            sur_periode = sessions.filter(session_date__range=(du, au))
            fiches_periode = fiches.filter(created_at__date__range=(du, au))
            par_caissier = (sur_periode.values("cashier__username", "cashier__first_name", "cashier__last_name")
                            .annotate(nb=Count("id"), attendu=Sum("expected"), compte=Sum("counted"), ecart=Sum("gap"))
                            .order_by("-attendu"))
            donnees.update({
                "clotures_a_valider": [session_data(s) for s in sessions.filter(status=CashSession.PENDING)],
                "caisses_ouvertes": [session_data(s) for s in sessions.filter(status=CashSession.OPEN)],
                # Une caisse d'un jour passé, clôturée ou validée pendant la période, y figure aussi :
                # sinon elle disparaissait de la régie au moment même où on la validait.
                "toutes_sessions": [session_data(s) for s in sessions.filter(
                    Q(session_date__range=(du, au)) | Q(closed_at__date__range=(du, au))
                    | Q(validated_at__date__range=(du, au))).order_by("-session_date", "-pk")[:100]],
                "toutes_fiches": [fiche_data(a) for a in
                                  fiches_periode.filter(cancelled_at__isnull=True).order_by("-created_at")[:200]],
                "corbeille": [fiche_data(a) for a in
                              fiches.filter(cancelled_at__isnull=False).order_by("-cancelled_at")[:100]],
                "totaux": totaux(fiches_periode, sur_periode),
                "totaux_par_caissier": [
                    {
                        "caissier": f"{ligne['cashier__first_name']} {ligne['cashier__last_name']}".strip()
                        or ligne["cashier__username"],
                        "sessions": ligne["nb"],
                        "attendu": montant(ligne["attendu"]),
                        "compte": montant(ligne["compte"]),
                        "ecart": montant(ligne["ecart"]),
                    }
                    for ligne in par_caissier
                ],
            })

        return Response(donnees)
