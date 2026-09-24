from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from .models import Admission, InsuranceCompany, MedicalService, VitalSigns
from .services import age_from_birth_date, doctor_label

SEX_LABELS = {"F": "Féminin", "M": "Masculin"}
SEX_CODES = {label: code for code, label in SEX_LABELS.items()}


class MedicalServiceSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = MedicalService
        fields = ["id", "name", "price"]


class InsuranceCompanySerializer(serializers.ModelSerializer):
    coverage = serializers.DecimalField(max_digits=5, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = InsuranceCompany
        fields = ["id", "name", "coverage"]


class CaissePatientInputSerializer(serializers.Serializer):
    """Reçoit tel quel le formData du formulaire « Nouveau patient »."""
    nom = serializers.CharField(max_length=120)
    prenom = serializers.CharField(max_length=180)
    sexe = serializers.ChoiceField(choices=list(SEX_CODES))
    age = serializers.IntegerField(min_value=0, max_value=130)
    dateNaissance = serializers.DateField(required=False, allow_null=True)
    service = serializers.PrimaryKeyRelatedField(queryset=MedicalService.objects.filter(active=True))
    telephone = serializers.CharField(max_length=30)
    parentContact = serializers.CharField(max_length=30)
    assurance = serializers.ChoiceField(choices=["Oui", "Non"], default="Non")
    assuranceId = serializers.PrimaryKeyRelatedField(
        queryset=InsuranceCompany.objects.filter(active=True), required=False, allow_null=True
    )
    insuranceNumber = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    quartier = serializers.CharField(max_length=120)

    def to_internal_value(self, data):
        # Le formulaire envoie "" pour les champs non renseignés.
        data = {key: (None if value == "" and key in {"dateNaissance", "assuranceId"} else value) for key, value in data.items()}
        return super().to_internal_value(data)

    def validate_dateNaissance(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("La date de naissance ne peut pas être dans le futur.")
        return value

    def validate(self, attrs):
        attrs["sexe"] = SEX_CODES[attrs["sexe"]]
        if attrs["assurance"] == "Oui":
            if not attrs.get("assuranceId"):
                raise serializers.ValidationError({"assuranceId": "Veuillez sélectionner l'assurance du patient."})
            if not attrs.get("insuranceNumber", "").strip():
                raise serializers.ValidationError({"insuranceNumber": "Veuillez renseigner le numéro d'assurance du patient."})
        else:
            attrs["assuranceId"] = None
            attrs["insuranceNumber"] = ""
        return attrs


class CaissePatientSerializer(serializers.ModelSerializer):
    """Un passage en caisse, au format de la liste de Caisse.jsx."""
    id = serializers.CharField(source="patient.patient_number")
    admissionId = serializers.IntegerField(source="pk")
    patient = serializers.SerializerMethodField()
    sexe = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    dateNaissance = serializers.DateField(source="patient.birth_date")
    service = serializers.CharField(source="service_name")
    telephone = serializers.CharField(source="patient.phone")
    parentContact = serializers.CharField(source="patient.emergency_phone")
    cost = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    insurance = serializers.SerializerMethodField()
    insuranceName = serializers.CharField(source="insurance_name")
    insuranceNumber = serializers.CharField(source="insurance_number")
    insuranceCoverage = serializers.DecimalField(
        source="insurance_coverage", max_digits=5, decimal_places=2, coerce_to_string=False
    )
    quartier = serializers.CharField(source="patient.locality")
    dateEnregistrement = serializers.DateTimeField(source="created_at")

    class Meta:
        model = Admission
        fields = [
            "id", "admissionId", "patient", "sexe", "age", "dateNaissance", "service", "telephone",
            "parentContact", "cost", "insurance", "insuranceName", "insuranceNumber", "insuranceCoverage",
            "quartier", "dateEnregistrement",
        ]

    def get_patient(self, obj):
        return f"{obj.patient.last_name} {obj.patient.first_names}"

    def get_sexe(self, obj):
        return SEX_LABELS.get(obj.patient.sex, "")

    def get_age(self, obj):
        return age_from_birth_date(obj.patient.birth_date)

    def get_insurance(self, obj):
        return "Oui" if obj.insurance_id else "Non"


def latest_vitals(admission):
    """Dernières constantes ; la vue précharge « vitals » du plus récent au plus ancien."""
    return next(iter(admission.vitals.all()), None)


def number(value):
    return float(value) if value is not None else None


class NursingPatientSerializer(serializers.ModelSerializer):
    """Un passage en caisse vu par Soins infirmiers (normalizePatient de Nursing.jsx)."""
    id = serializers.CharField(source="patient.patient_number")
    admissionId = serializers.IntegerField(source="pk")
    numero = serializers.SerializerMethodField()
    nom = serializers.CharField(source="patient.last_name")
    prenom = serializers.CharField(source="patient.first_names")
    patient = serializers.SerializerMethodField()
    sexe = serializers.CharField(source="patient.sex")
    age = serializers.SerializerMethodField()
    dateNaissance = serializers.DateField(source="patient.birth_date")
    telephone = serializers.CharField(source="patient.phone")
    telephoneParents = serializers.CharField(source="patient.emergency_phone")
    quartier = serializers.CharField(source="patient.locality")
    service = serializers.CharField(source="service_name")
    sentToConsultation = serializers.SerializerMethodField()
    vitals = serializers.SerializerMethodField()

    class Meta:
        model = Admission
        fields = [
            "id", "admissionId", "numero", "nom", "prenom", "patient", "sexe", "age", "dateNaissance",
            "telephone", "telephoneParents", "quartier", "service", "motif", "statut", "sentToConsultation", "vitals",
        ]

    def get_numero(self, obj):
        return obj.patient.patient_number.removeprefix("PAT-")

    def get_patient(self, obj):
        return f"{obj.patient.last_name} {obj.patient.first_names}"

    def get_age(self, obj):
        return age_from_birth_date(obj.patient.birth_date)

    def get_sentToConsultation(self, obj):
        return obj.sent_to_consultation_at is not None

    def get_vitals(self, obj):
        vitals = latest_vitals(obj)
        if vitals is None:
            return {}
        return {
            "temperature": number(vitals.temperature),
            "systolic": vitals.systolic,
            "diastolic": vitals.diastolic,
            "pulse": vitals.pulse,
            "oxygen": vitals.oxygen,
            "respiratoryRate": vitals.respiratory_rate,
            "glucose": number(vitals.glucose),
            "weight": number(vitals.weight),
            "height": number(vitals.height),
            "nursingNotes": vitals.notes,
            "updatedAt": vitals.recorded_at,
        }

    def to_representation(self, obj):
        # Les constantes sont aussi posées à plat : c'est ce que lit la page.
        data = super().to_representation(obj)
        vitals = data.pop("vitals")
        data.update({key: value for key, value in vitals.items() if value is not None and key != "updatedAt"})
        data["lastVitalUpdate"] = vitals.get("updatedAt")
        return data


class VitalsInputSerializer(serializers.Serializer):
    """Reçoit le vitalsForm du formulaire « Constantes ». Les bornes écartent les
    saisies impossibles, pas les valeurs anormales (celles-ci sont signalées en rouge)."""
    temperature = serializers.DecimalField(max_digits=4, decimal_places=1, min_value=30, max_value=45, required=False, allow_null=True)
    systolic = serializers.IntegerField(min_value=40, max_value=300, required=False, allow_null=True)
    diastolic = serializers.IntegerField(min_value=20, max_value=200, required=False, allow_null=True)
    pulse = serializers.IntegerField(min_value=20, max_value=250, required=False, allow_null=True)
    oxygen = serializers.IntegerField(min_value=50, max_value=100, required=False, allow_null=True)
    respiratoryRate = serializers.IntegerField(min_value=4, max_value=80, required=False, allow_null=True)
    glucose = serializers.DecimalField(max_digits=4, decimal_places=2, min_value=Decimal("0.1"), max_value=10, required=False, allow_null=True)
    weight = serializers.DecimalField(max_digits=5, decimal_places=1, min_value=Decimal("0.3"), max_value=400, required=False, allow_null=True)
    height = serializers.DecimalField(max_digits=4, decimal_places=1, min_value=20, max_value=260, required=False, allow_null=True)
    nursingNotes = serializers.CharField(required=False, allow_blank=True, default="")

    MEASURES = ["temperature", "systolic", "diastolic", "pulse", "oxygen", "respiratoryRate", "glucose", "weight", "height"]

    def to_internal_value(self, data):
        # Les champs laissés vides arrivent en "" ; la virgule décimale est acceptée.
        cleaned = {}
        for key, value in data.items():
            if key in self.MEASURES and isinstance(value, str):
                value = value.strip().replace(",", ".") or None
            cleaned[key] = value
        return super().to_internal_value(cleaned)

    def validate(self, attrs):
        if all(attrs.get(key) is None for key in self.MEASURES) and not attrs.get("nursingNotes", "").strip():
            raise serializers.ValidationError("Veuillez saisir au moins une constante.")
        systolic, diastolic = attrs.get("systolic"), attrs.get("diastolic")
        if systolic is not None and diastolic is not None and diastolic >= systolic:
            raise serializers.ValidationError({"diastolic": "La tension diastolique doit être inférieure à la systolique."})
        return attrs

    def to_model_fields(self):
        data = self.validated_data
        return {
            "temperature": data.get("temperature"),
            "systolic": data.get("systolic"),
            "diastolic": data.get("diastolic"),
            "pulse": data.get("pulse"),
            "oxygen": data.get("oxygen"),
            "respiratory_rate": data.get("respiratoryRate"),
            "glucose": data.get("glucose"),
            "weight": data.get("weight"),
            "height": data.get("height"),
            "notes": data.get("nursingNotes", "").strip(),
        }


def local_time(value):
    return timezone.localtime(value).strftime("%H:%M") if value else ""


class ConsultationPatientSerializer(NursingPatientSerializer):
    """Un patient envoyé par Soins infirmiers, au format de Consultations.jsx."""
    parentContact = serializers.CharField(source="patient.emergency_phone")
    insurance = serializers.SerializerMethodField()
    insuranceName = serializers.CharField(source="insurance_name")
    insuranceNumber = serializers.CharField(source="insurance_number")
    heure = serializers.SerializerMethodField()
    doctor = serializers.SerializerMethodField()
    symptomes = serializers.SerializerMethodField()
    diagnostic = serializers.SerializerMethodField()
    traitement = serializers.SerializerMethodField()
    prescription = serializers.SerializerMethodField()
    observations = serializers.SerializerMethodField()
    dateConsultation = serializers.SerializerMethodField()

    class Meta(NursingPatientSerializer.Meta):
        fields = NursingPatientSerializer.Meta.fields + [
            "parentContact", "insurance", "insuranceName", "insuranceNumber", "heure", "doctor",
            "symptomes", "diagnostic", "traitement", "prescription", "observations", "dateConsultation",
        ]

    def _consultation(self, obj):
        return getattr(obj, "consultation", None)

    def _text(self, obj, field):
        consultation = self._consultation(obj)
        return getattr(consultation, field) if consultation else ""

    def get_insurance(self, obj):
        return "Oui" if obj.insurance_id else "Non"

    def get_heure(self, obj):
        return local_time(obj.sent_to_consultation_at or obj.created_at)

    def get_doctor(self, obj):
        consultation = self._consultation(obj)
        return doctor_label(consultation.doctor) if consultation else ""

    def get_symptomes(self, obj):
        return self._text(obj, "symptoms")

    def get_diagnostic(self, obj):
        return self._text(obj, "diagnosis")

    def get_traitement(self, obj):
        return self._text(obj, "treatment")

    def get_prescription(self, obj):
        return self._text(obj, "treatment")

    def get_observations(self, obj):
        return self._text(obj, "observations")

    def get_dateConsultation(self, obj):
        consultation = self._consultation(obj)
        return consultation.completed_at if consultation else None


class ConsultationInputSerializer(serializers.Serializer):
    """Reçoit le formulaireMedical de la fenêtre de consultation."""
    symptomes = serializers.CharField(required=False, allow_blank=True, default="")
    diagnostic = serializers.CharField(required=False, allow_blank=True, default="")
    traitement = serializers.CharField(required=False, allow_blank=True, default="")
    observations = serializers.CharField(required=False, allow_blank=True, default="")


PRESCRIPTION_STATUS = {
    "TO_PREPARE": ("À préparer", "prepare"),
    "READY": ("Prête", "ready"),
    "SERVED": ("Servie", "served"),
}


def prescription_code(prescription):
    return f"{prescription.pk:03d}"


class PharmacyPrescriptionSerializer(serializers.Serializer):
    """Une ordonnance au format de pharmacy.jsx."""

    def to_representation(self, obj):
        status, status_class = PRESCRIPTION_STATUS[obj.status]
        return {
            "id": prescription_code(obj),
            "patientId": obj.patient.patient_number,
            "patient": f"{obj.patient.last_name} {obj.patient.first_names}",
            "doctor": doctor_label(obj.doctor),
            "medicines": [item.medicine for item in obj.items.all()],
            "instructions": obj.instructions,
            "status": status,
            "statusClass": status_class,
            "date": obj.consultation.completed_at if obj.consultation_id else None,
        }


def dispensing_history(prescriptions):
    """Historique : chaque médicament servi est une ligne (servePrescription de pharmacy.jsx)."""
    rows = []
    for prescription in prescriptions:
        served_at = timezone.localtime(prescription.served_at)
        pharmacist = prescription.served_by
        for index, item in enumerate(prescription.items.all()):
            rows.append({
                "id": f"{prescription_code(prescription)}-{item.pk}",
                "prescriptionId": prescription_code(prescription),
                "patient": f"{prescription.patient.last_name} {prescription.patient.first_names}",
                "doctor": doctor_label(prescription.doctor),
                "medicine": item.medicine,
                "quantity": item.quantity,
                "pharmacist": pharmacist.get_full_name() or pharmacist.username,
                "date": served_at.strftime("%d/%m/%Y"),
                "time": served_at.strftime("%H:%M"),
                "timestamp": int(served_at.timestamp() * 1000),
            })
    return rows


class PaymentSerializer(serializers.Serializer):
    """Un encaissement de la Caisse au format de Billing.jsx (normalizePayment)."""

    def to_representation(self, obj):
        cashier = obj.created_by
        return {
            "id": f"CAISSE-{timezone.localtime(obj.created_at).year}-{obj.pk:03d}",
            "patient": f"{obj.patient.last_name} {obj.patient.first_names}",
            "patientId": obj.patient.patient_number,
            "date": obj.created_at,
            "totalAmount": float(obj.service_price),
            "patientAmount": float(obj.cost),
            "insuranceAmount": float(obj.service_price - obj.cost),
            "cashier": cashier.get_full_name() or cashier.username,
            "service": obj.service_name,
            "insuranceName": obj.insurance_name,
        }
