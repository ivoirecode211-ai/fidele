import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertCircle,
  BedDouble,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Droplets,
  HeartPulse,
  RefreshCw,
  Search,
  Thermometer,
  UserRound,
  Users,
  Weight,
  X,
  Stethoscope,
  ShieldCheck,
  Ruler,
  Wind,
} from "lucide-react";

import { useModuleView } from "../layouts/AppLayout";
import api from "../services/api";

import "../styles/nursing.css";

/*
 * ============================================================
 * DONNÉES
 * ============================================================
 *
 * Patients et constantes sont servis par l'API
 * (/api/parcours/soins/). Enregistrer les constantes envoie
 * le patient en Consultation.
 */

/*
 * ============================================================
 * NORMALISATION DES PATIENTS
 * ============================================================
 */

const normalizePatient = (patient, nursingVitals = {}) => {
  const patientId =
    patient?.id ??
    patient?.patientId ??
    patient?.identifiant ??
    patient?.numero ??
    patient?.code ??
    "";

  const savedVitals = nursingVitals?.[patientId] || {};

  return {
    ...patient,

    id: patientId,

    nom:
      patient?.nom ||
      patient?.lastName ||
      patient?.name ||
      "Patient",

    prenom:
      patient?.prenom ||
      patient?.firstName ||
      "",

    telephone:
      patient?.telephone ||
      patient?.phone ||
      patient?.tel ||
      "",

    telephoneParents:
      patient?.telephoneParents ||
      patient?.parentsPhone ||
      patient?.parentPhone ||
      "",

    sexe:
      patient?.sexe ||
      patient?.gender ||
      "",

    age:
      patient?.age ??
      "",

    dateNaissance:
      patient?.dateNaissance ||
      patient?.birthDate ||
      "",

    chambre:
      patient?.chambre ||
      patient?.room ||
      "",

    service:
      patient?.service ||
      patient?.department ||
      "Consultation",

    status:
      patient?.status ||
      patient?.statut ||
      "normal",

    temperature:
      savedVitals?.temperature ??
      patient?.temperature ??
      "",

    systolic:
      savedVitals?.systolic ??
      patient?.systolic ??
      patient?.tensionSystolique ??
      "",

    diastolic:
      savedVitals?.diastolic ??
      patient?.diastolic ??
      patient?.tensionDiastolique ??
      "",

    pulse:
      savedVitals?.pulse ??
      patient?.pulse ??
      patient?.frequenceCardiaque ??
      "",

    oxygen:
      savedVitals?.oxygen ??
      patient?.oxygen ??
      patient?.spo2 ??
      "",

    respiratoryRate:
      savedVitals?.respiratoryRate ??
      patient?.respiratoryRate ??
      patient?.frequenceRespiratoire ??
      "",

    glucose:
      savedVitals?.glucose ??
      patient?.glucose ??
      "",

    weight:
      savedVitals?.weight ??
      patient?.weight ??
      patient?.poids ??
      "",

    height:
      savedVitals?.height ??
      patient?.height ??
      patient?.taille ??
      "",

    nursingNotes:
      savedVitals?.nursingNotes ??
      patient?.nursingNotes ??
      "",

    lastVitalUpdate:
      savedVitals?.updatedAt ??
      patient?.lastVitalUpdate ??
      null,
  };
};

/*
 * ============================================================
 * VALIDATION DES VALEURS
 *
 * IMPORTANT :
 * Une donnée vide n'est JAMAIS considérée comme anormale.
 * Le rouge apparaît uniquement lorsqu'une valeur existe
 * réellement et se trouve hors de la plage normale.
 * ============================================================
 */

const hasValue = (value) => {
  return (
    value !== "" &&
    value !== null &&
    value !== undefined &&
    value !== "--" &&
    Number.isFinite(Number(value))
  );
};

/*
 * ============================================================
 * PLAGES NORMALES
 * ============================================================
 */

const isAbnormalTemperature = (value) => {
  if (!hasValue(value)) return false;

  const n = Number(value);

  return n < 36.5 || n > 37.5;
};

const isAbnormalSystolic = (value) => {
  if (!hasValue(value)) return false;

  const n = Number(value);

  return n < 90 || n >= 140;
};

const isAbnormalDiastolic = (value) => {
  if (!hasValue(value)) return false;

  const n = Number(value);

  return n < 60 || n >= 90;
};

const isAbnormalPulse = (value) => {
  if (!hasValue(value)) return false;

  const n = Number(value);

  return n < 60 || n > 100;
};

const isAbnormalOxygen = (value) => {
  if (!hasValue(value)) return false;

  const n = Number(value);

  return n < 95;
};

const isAbnormalRespiratoryRate = (value) => {
  if (!hasValue(value)) return false;

  const n = Number(value);

  return n < 12 || n > 20;
};

const isAbnormalGlucose = (value) => {
  if (!hasValue(value)) return false;

  const n = Number(value);

  return n < 0.7 || n > 1.1;
};

const isAbnormalBloodPressure = (systolic, diastolic) => {
  return (
    (hasValue(systolic) && isAbnormalSystolic(systolic)) ||
    (hasValue(diastolic) && isAbnormalDiastolic(diastolic))
  );
};

/*
 * ============================================================
 * DÉTECTION GLOBALE D'ANOMALIE
 * ============================================================
 */

const hasAbnormalVitals = (patient) => {
  return (
    isAbnormalTemperature(patient.temperature) ||
    isAbnormalBloodPressure(
      patient.systolic,
      patient.diastolic
    ) ||
    isAbnormalPulse(patient.pulse) ||
    isAbnormalOxygen(patient.oxygen) ||
    isAbnormalRespiratoryRate(patient.respiratoryRate) ||
    isAbnormalGlucose(patient.glucose)
  );
};

/*
 * ============================================================
 * FORMATAGE
 * ============================================================
 */

const displayValue = (value, suffix = "") => {
  if (!hasValue(value)) {
    return "--";
  }

  return `${value}${suffix}`;
};

const formatDateTime = (date) => {
  if (!date) {
    return "Non enregistré";
  }

  try {
    return new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Non enregistré";
  }
};

/*
 * ============================================================
 * COMPOSANT INPUT CONSTANTE
 * ============================================================
 */

function VitalInput({
  label,
  value,
  onChange,
  unit,
  type = "number",
  abnormal = false,
  placeholder = "",
}) {
  return (
    <div className="nursing-form-group">
      <label>{label}</label>

      <div className="nursing-input-wrapper">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={
            abnormal
              ? "nursing-input-abnormal"
              : ""
          }
        />

        {unit && (
          <span className="nursing-input-unit">
            {unit}
          </span>
        )}
      </div>

      {abnormal && (
        <small className="nursing-form-warning">
          Valeur anormale
        </small>
      )}
    </div>
  );
}

/*
 * ============================================================
 * COMPOSANT PRINCIPAL
 * ============================================================
 */

export default function Nursing() {
  const [patients, setPatients] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [patientFilter, setPatientFilter] =
    useState("all");

  const [selectedPatient, setSelectedPatient] =
    useState(null);

  const [showVitalsModal, setShowVitalsModal] =
    useState(false);

  const [showDossierModal, setShowDossierModal] =
    useState(false);

  const [vitalsForm, setVitalsForm] = useState({
    temperature: "",
    systolic: "",
    diastolic: "",
    pulse: "",
    oxygen: "",
    respiratoryRate: "",
    glucose: "",
    weight: "",
    height: "",
    nursingNotes: "",
  });

  const [lastRefresh, setLastRefresh] =
    useState(new Date());

  /*
   * ==========================================================
   * CHARGEMENT
   * ==========================================================
   */

  const refreshPatients = async () => {
    try {
      const response = await api.get(
        "/parcours/soins/patients/"
      );

      const normalized = response.data.map(
        (patient) =>
          normalizePatient(patient)
      );

      setPatients(normalized);
      setLastRefresh(new Date());
    } catch (error) {
      console.error(
        "Erreur de chargement des patients :",
        error
      );
    }
  };

  useEffect(() => {
    refreshPatients();

    const handleStorage = () => {
      refreshPatients();
    };

    const handlePatientAdded = () => {
      refreshPatients();
    };

    const handleVitalsUpdated = () => {
      refreshPatients();
    };

    const handleFocus = () => {
      refreshPatients();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "sante:patient-added",
      handlePatientAdded
    );

    window.addEventListener(
      "ma-sante-nursing-vitals-updated",
      handleVitalsUpdated
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "sante:patient-added",
        handlePatientAdded
      );

      window.removeEventListener(
        "ma-sante-nursing-vitals-updated",
        handleVitalsUpdated
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, []);

  /*
   * ==========================================================
   * SOUS-MODULES : patients en attente de constantes (écran
   * d'arrivée) et patients reçus, dont les constantes sont prises.
   * ==========================================================
   */

  const vue = useModuleView("/nursing");

  const vuePatients = useMemo(
    () => patients.filter((patient) =>
      vue.id === "recus" ? patient.sentToConsultation : !patient.sentToConsultation
    ),
    [patients, vue.id]
  );

  /*
   * ==========================================================
   * STATISTIQUES
   * ==========================================================
   */

  const abnormalPatients = useMemo(() => {
    return vuePatients.filter(hasAbnormalVitals);
  }, [vuePatients]);

  const urgentPatients = useMemo(() => {
    return vuePatients.filter(
      (patient) =>
        patient.status === "urgent" ||
        patient.statut === "urgent"
    );
  }, [vuePatients]);

  const surveillancePatients = useMemo(() => {
    return vuePatients.filter((patient) => {
      const abnormal = hasAbnormalVitals(patient);

      return (
        abnormal ||
        patient.status === "surveillance" ||
        patient.statut === "surveillance"
      );
    });
  }, [vuePatients]);

  /*
   * ==========================================================
   * FILTRE DES PATIENTS
   * ==========================================================
   */

  const filteredPatients = useMemo(() => {
    const term =
      searchTerm.trim().toLowerCase();

    return vuePatients.filter((patient) => {
      const fullName =
        `${patient.prenom || ""} ${
          patient.nom || ""
        }`.trim();

      const searchableText = [
        fullName,
        patient.nom,
        patient.prenom,
        patient.id,
        patient.telephone,
        patient.telephoneParents,
        patient.service,
        patient.chambre,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !term ||
        searchableText.includes(term);

      const state =
        patient.status ||
        patient.statut ||
        "normal";

      const matchesFilter =
        patientFilter === "all" ||
        (patientFilter === "urgent" &&
          state === "urgent") ||
        (patientFilter === "surveillance" &&
          state === "surveillance") ||
        (patientFilter === "abnormal" &&
          hasAbnormalVitals(patient));

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [
    vuePatients,
    searchTerm,
    patientFilter,
  ]);

  /*
   * ==========================================================
   * FORMULAIRE
   * ==========================================================
   */

  const openVitalsModal = (patient) => {
    setSelectedPatient(patient);

    setVitalsForm({
      temperature:
        patient.temperature ?? "",

      systolic:
        patient.systolic ?? "",

      diastolic:
        patient.diastolic ?? "",

      pulse:
        patient.pulse ?? "",

      oxygen:
        patient.oxygen ?? "",

      respiratoryRate:
        patient.respiratoryRate ?? "",

      glucose:
        patient.glucose ?? "",

      weight:
        patient.weight ?? "",

      height:
        patient.height ?? "",

      nursingNotes:
        patient.nursingNotes ?? "",
    });

    setShowVitalsModal(true);
  };

  const closeVitalsModal = () => {
    setShowVitalsModal(false);
    setSelectedPatient(null);

    setVitalsForm({
      temperature: "",
      systolic: "",
      diastolic: "",
      pulse: "",
      oxygen: "",
      respiratoryRate: "",
      glucose: "",
      weight: "",
      height: "",
      nursingNotes: "",
    });
  };

  const openDossierModal = (patient) => {
    setSelectedPatient(patient);
    setShowDossierModal(true);
  };

  const closeDossierModal = () => {
    setShowDossierModal(false);
    setSelectedPatient(null);
  };

  /*
   * ==========================================================
   * MODIFICATION DU FORMULAIRE
   * ==========================================================
   */

  const updateVitalField = (
    field,
    value
  ) => {
    setVitalsForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /*
   * ==========================================================
   * SAUVEGARDE DES CONSTANTES
   * ==========================================================
   */

  const saveVitals = async () => {
    if (!selectedPatient) {
      return;
    }

    try {
      await api.post(
        `/parcours/soins/patients/${selectedPatient.admissionId}/constantes/`,
        vitalsForm
      );

      await refreshPatients();

      window.dispatchEvent(
        new CustomEvent(
          "ma-sante-nursing-vitals-updated"
        )
      );

      closeVitalsModal();
    } catch (error) {
      const errors = error.response?.data;

      alert(
        errors && typeof errors === "object"
          ? Object.values(errors).flat().join("\n")
          : "Impossible d'enregistrer les constantes. Veuillez réessayer."
      );
    }
  };

  /*
   * ==========================================================
   * CLASSES COULEURS
   * ==========================================================
   */

  const vitalClass = (abnormal) => {
    return abnormal
      ? "nursing-vital-mini nursing-vital-abnormal"
      : "nursing-vital-mini";
  };

  const abnormalValueClass = (
    abnormal
  ) => {
    return abnormal
      ? "nursing-abnormal-value"
      : "";
  };

  /*
   * ==========================================================
   * NOM PATIENT
   * ==========================================================
   */

  const getPatientFullName = (
    patient
  ) => {
    return (
      `${patient?.prenom || ""} ${
        patient?.nom || ""
      }`.trim() ||
      "Patient sans nom"
    );
  };

  /*
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <div className="nursing-page">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="nursing-header">


        <div className="nursing-header-actions">

          <button
            type="button"
            className="nursing-refresh-button"
            onClick={refreshPatients}
          >
            <RefreshCw size={17} />

            Actualiser
          </button>

          <span className="nursing-last-refresh">
            <Clock3 size={14} />

            Mise à jour{" "}
            {lastRefresh.toLocaleTimeString(
              "fr-FR",
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </span>

        </div>

      </div>

      {/* ======================================================
          ALERTE
          ====================================================== */}

      {abnormalPatients.length > 0 && (
        <div className="nursing-alert-banner">

          <div className="nursing-alert-icon">
            <AlertCircle size={22} />
          </div>

          <div className="nursing-alert-content">

            <strong>
              Constantes anormales détectées
            </strong>

            <span>
              {abnormalPatients.length} patient
              {abnormalPatients.length > 1
                ? "s"
                : ""}{" "}
              nécessite
              {abnormalPatients.length > 1
                ? "nt"
                : ""}{" "}
              une surveillance.
            </span>

          </div>

          <button
            type="button"
            onClick={() =>
              setPatientFilter("abnormal")
            }
          >
            Voir les patients
            <ChevronRight size={17} />
          </button>

        </div>
      )}

      {/* ======================================================
          STATISTIQUES
          ====================================================== */}

      <div className="nursing-stats-grid">

        <div className="nursing-stat-card">

          <div className="nursing-stat-icon nursing-stat-blue">
            <Users size={22} />
          </div>

          <div>
            <span>
              Patients
            </span>

            <strong>
              {vuePatients.length}
            </strong>
          </div>

        </div>

        <div className="nursing-stat-card">

          <div className="nursing-stat-icon nursing-stat-red">
            <AlertCircle size={22} />
          </div>

          <div>
            <span>
              Constantes anormales
            </span>

            <strong>
              {abnormalPatients.length}
            </strong>
          </div>

        </div>

        <div className="nursing-stat-card">

          <div className="nursing-stat-icon nursing-stat-orange">
            <Bell size={22} />
          </div>

          <div>
            <span>
              À surveiller
            </span>

            <strong>
              {surveillancePatients.length}
            </strong>
          </div>

        </div>

      </div>

      {/* ======================================================
          FILTRES
          ====================================================== */}

      <div className="nursing-toolbar">

        <div className="nursing-search">

          <Search size={18} />

          <input
            type="text"
            placeholder="Rechercher un patient..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() =>
                setSearchTerm("")
              }
              className="nursing-clear-search"
            >
              <X size={16} />
            </button>
          )}

        </div>

        <div className="nursing-filters">

          <button
            type="button"
            className={
              patientFilter === "all"
                ? "nursing-filter active"
                : "nursing-filter"
            }
            onClick={() =>
              setPatientFilter("all")
            }
          >
            Tous
          </button>

          <button
            type="button"
            className={
              patientFilter === "urgent"
                ? "nursing-filter active"
                : "nursing-filter"
            }
            onClick={() =>
              setPatientFilter("urgent")
            }
          >
            Urgents
          </button>

          <button
            type="button"
            className={
              patientFilter === "surveillance"
                ? "nursing-filter active"
                : "nursing-filter"
            }
            onClick={() =>
              setPatientFilter("surveillance")
            }
          >
            Surveillance
          </button>

          <button
            type="button"
            className={
              patientFilter === "abnormal"
                ? "nursing-filter active"
                : "nursing-filter"
            }
            onClick={() =>
              setPatientFilter("abnormal")
            }
          >
            Anormaux
          </button>

        </div>

      </div>

      {/* ======================================================
          LISTE PATIENTS
          ====================================================== */}

      <div className="nursing-section">

        <div className="nursing-section-header">

          <div>
            <h2>
              {vue.label}
            </h2>

            <p>
              {filteredPatients.length} patient
              {filteredPatients.length > 1
                ? "s"
                : ""}{" "}
              affiché
              {filteredPatients.length > 1
                ? "s"
                : ""}
            </p>
          </div>

        </div>

        {vuePatients.length === 0 ? (
          <div className="nursing-empty-state">

            <div className="nursing-empty-icon">
              <Users size={34} />
            </div>

            <h3>
              {vue.id === "recus"
                ? "Aucun patient reçu"
                : "Aucun patient en attente"}
            </h3>

            <p>
              {vue.id === "recus"
                ? "Les patients dont vous avez pris les constantes apparaîtront ici."
                : "Les patients payés à la caisse apparaîtront automatiquement ici."}
            </p>

            <button
              type="button"
              onClick={refreshPatients}
            >
              <RefreshCw size={17} />
              Actualiser
            </button>

          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="nursing-empty-state">

            <div className="nursing-empty-icon">
              <Search size={34} />
            </div>

            <h3>
              Aucun résultat
            </h3>

            <p>
              Aucun patient ne correspond
              aux critères sélectionnés.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setPatientFilter("all");
              }}
            >
              Réinitialiser
            </button>

          </div>
        ) : (
          <div className="nursing-patients-list">

            {filteredPatients.map(
              (patient) => {
                const abnormal =
                  hasAbnormalVitals(
                    patient
                  );

                const temperatureAbnormal =
                  isAbnormalTemperature(
                    patient.temperature
                  );

                const bloodPressureAbnormal =
                  isAbnormalBloodPressure(
                    patient.systolic,
                    patient.diastolic
                  );

                const pulseAbnormal =
                  isAbnormalPulse(
                    patient.pulse
                  );

                const oxygenAbnormal =
                  isAbnormalOxygen(
                    patient.oxygen
                  );

                const respiratoryAbnormal =
                  isAbnormalRespiratoryRate(
                    patient.respiratoryRate
                  );

                const glucoseAbnormal =
                  isAbnormalGlucose(
                    patient.glucose
                  );

                const fullName =
                  getPatientFullName(
                    patient
                  );

                return (
                  <div
                    className="nursing-patient-card"
                    key={patient.id}
                  >

                    {/* PATIENT */}

                    <div className="nursing-patient-main">

                      <div className="nursing-patient-avatar">
                        <UserRound size={23} />
                      </div>

                      <div className="nursing-patient-info">

                        <div className="nursing-patient-name-row">

                          <h3>
                            {fullName}
                          </h3>

                          {abnormal && (
                            <span className="nursing-status-abnormal">
                              À surveiller
                            </span>
                          )}

                        </div>

                        <div className="nursing-patient-meta">

                          <span>
                            ID :{" "}
                            {patient.id ||
                              "--"}
                          </span>

                          {patient.age !==
                            "" && (
                            <span>
                              {patient.age} ans
                            </span>
                          )}

                          {patient.sexe && (
                            <span>
                              {patient.sexe}
                            </span>
                          )}

                          {patient.service && (
                            <span>
                              {patient.service}
                            </span>
                          )}

                          {patient.chambre && (
                            <span>
                              Chambre{" "}
                              {patient.chambre}
                            </span>
                          )}

                        </div>

                      </div>

                    </div>

                    {/* CONSTANTES */}

                    <div className="nursing-vitals-row">

                      <div
                        className={vitalClass(
                          temperatureAbnormal
                        )}
                      >
                        <Thermometer
                          size={16}
                        />

                        <div>
                          <span>
                            Température
                          </span>

                          <strong>
                            {displayValue(
                              patient.temperature,
                              " °C"
                            )}
                          </strong>
                        </div>
                      </div>

                      <div
                        className={vitalClass(
                          bloodPressureAbnormal
                        )}
                      >
                        <Activity
                          size={16}
                        />

                        <div>
                          <span>
                            Tension
                          </span>

                          <strong>
                            {hasValue(
                              patient.systolic
                            ) ||
                            hasValue(
                              patient.diastolic
                            )
                              ? `${hasValue(
                                  patient.systolic
                                )
                                  ? patient.systolic
                                  : "--"}/${hasValue(
                                      patient.diastolic
                                    )
                                    ? patient.diastolic
                                    : "--"}`
                              : "--"}
                          </strong>
                        </div>
                      </div>

                      <div
                        className={vitalClass(
                          pulseAbnormal
                        )}
                      >
                        <HeartPulse
                          size={16}
                        />

                        <div>
                          <span>
                            Pouls
                          </span>

                          <strong>
                            {displayValue(
                              patient.pulse,
                              " bpm"
                            )}
                          </strong>
                        </div>
                      </div>

                      <div
                        className={vitalClass(
                          oxygenAbnormal
                        )}
                      >
                        <Droplets
                          size={16}
                        />

                        <div>
                          <span>
                            SpO₂
                          </span>

                          <strong>
                            {displayValue(
                              patient.oxygen,
                              " %"
                            )}
                          </strong>
                        </div>
                      </div>

                      <div
                        className={vitalClass(
                          respiratoryAbnormal
                        )}
                      >
                        <Wind size={16} />

                        <div>
                          <span>
                            Respiration
                          </span>

                          <strong>
                            {displayValue(
                              patient.respiratoryRate,
                              " /min"
                            )}
                          </strong>
                        </div>
                      </div>

                      <div
                        className={vitalClass(
                          glucoseAbnormal
                        )}
                      >
                        <Activity
                          size={16}
                        />

                        <div>
                          <span>
                            Glycémie
                          </span>

                          <strong>
                            {displayValue(
                              patient.glucose,
                              " g/L"
                            )}
                          </strong>
                        </div>
                      </div>

                    </div>

                    {/* ACTIONS */}

                    <div className="nursing-patient-actions">

                      <button
                        type="button"
                        className="nursing-secondary-button"
                        onClick={() =>
                          openDossierModal(
                            patient
                          )
                        }
                      >
                        <Stethoscope
                          size={16}
                        />

                        Dossier
                      </button>

                      <button
                        type="button"
                        className="nursing-primary-button"
                        onClick={() =>
                          openVitalsModal(
                            patient
                          )
                        }
                      >
                        <Activity
                          size={16}
                        />

                        Constantes
                      </button>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>

      {/* ======================================================
          MODALE CONSTANTES
          ====================================================== */}

      {showVitalsModal &&
        selectedPatient && (
          <div
            className="nursing-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeVitalsModal();
              }
            }}
          >

            <div className="nursing-modal">

              <div className="nursing-modal-header">

                <div>

                  <h2>
                    Constantes vitales
                  </h2>

                  <p>
                    {
                      getPatientFullName(
                        selectedPatient
                      )
                    }
                  </p>

                </div>

                <button
                  type="button"
                  className="nursing-modal-close"
                  onClick={
                    closeVitalsModal
                  }
                >
                  <X size={20} />
                </button>

              </div>

              <div className="nursing-modal-body">

                <div className="nursing-patient-summary">

                  <div className="nursing-summary-icon">
                    <UserRound size={22} />
                  </div>

                  <div>

                    <strong>
                      {
                        getPatientFullName(
                          selectedPatient
                        )
                      }
                    </strong>

                    <span>
                      ID :{" "}
                      {selectedPatient.id ||
                        "--"}
                    </span>

                  </div>

                </div>

                <div className="nursing-form-grid">

                  <VitalInput
                    label="Température"
                    value={
                      vitalsForm.temperature
                    }
                    onChange={(value) =>
                      updateVitalField(
                        "temperature",
                        value
                      )
                    }
                    unit="°C"
                    placeholder="36.5"
                    abnormal={isAbnormalTemperature(
                      vitalsForm.temperature
                    )}
                  />

                  <VitalInput
                    label="Tension systolique"
                    value={
                      vitalsForm.systolic
                    }
                    onChange={(value) =>
                      updateVitalField(
                        "systolic",
                        value
                      )
                    }
                    unit="mmHg"
                    placeholder="120"
                    abnormal={isAbnormalSystolic(
                      vitalsForm.systolic
                    )}
                  />

                  <VitalInput
                    label="Tension diastolique"
                    value={
                      vitalsForm.diastolic
                    }
                    onChange={(value) =>
                      updateVitalField(
                        "diastolic",
                        value
                      )
                    }
                    unit="mmHg"
                    placeholder="80"
                    abnormal={isAbnormalDiastolic(
                      vitalsForm.diastolic
                    )}
                  />

                  <VitalInput
                    label="Pouls"
                    value={
                      vitalsForm.pulse
                    }
                    onChange={(value) =>
                      updateVitalField(
                        "pulse",
                        value
                      )
                    }
                    unit="bpm"
                    placeholder="72"
                    abnormal={isAbnormalPulse(
                      vitalsForm.pulse
                    )}
                  />

                  <VitalInput
                    label="Saturation SpO₂"
                    value={
                      vitalsForm.oxygen
                    }
                    onChange={(value) =>
                      updateVitalField(
                        "oxygen",
                        value
                      )
                    }
                    unit="%"
                    placeholder="98"
                    abnormal={isAbnormalOxygen(
                      vitalsForm.oxygen
                    )}
                  />

                  <VitalInput
                    label="Fréquence respiratoire"
                    value={
                      vitalsForm.respiratoryRate
                    }
                    onChange={(value) =>
                      updateVitalField(
                        "respiratoryRate",
                        value
                      )
                    }
                    unit="/min"
                    placeholder="16"
                    abnormal={isAbnormalRespiratoryRate(
                      vitalsForm.respiratoryRate
                    )}
                  />

                  <VitalInput
                    label="Glycémie"
                    value={
                      vitalsForm.glucose
                    }
                    onChange={(value) =>
                      updateVitalField(
                        "glucose",
                        value
                      )
                    }
                    unit="g/L"
                    placeholder="0.90"
                    abnormal={isAbnormalGlucose(
                      vitalsForm.glucose
                    )}
                  />

                  <VitalInput
                    label="Poids"
                    value={
                      vitalsForm.weight
                    }
                    onChange={(value) =>
                      updateVitalField(
                        "weight",
                        value
                      )
                    }
                    unit="kg"
                    placeholder="70"
                    abnormal={false}
                  />

                  <VitalInput
                    label="Taille"
                    value={
                      vitalsForm.height
                    }
                    onChange={(value) =>
                      updateVitalField(
                        "height",
                        value
                      )
                    }
                    unit="cm"
                    placeholder="175"
                    abnormal={false}
                  />

                </div>

                <div className="nursing-form-group nursing-notes-group">

                  <label>
                    Observations infirmières
                  </label>

                  <textarea
                    value={
                      vitalsForm.nursingNotes
                    }
                    onChange={(event) =>
                      updateVitalField(
                        "nursingNotes",
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Ajouter une observation, une remarque ou une consigne..."
                  />

                </div>

                <div className="nursing-normal-range">

                  <ShieldCheck size={18} />

                  <div>

                    <strong>
                      Plages de référence
                    </strong>

                    <span>
                      Température : 36,5–37,5 °C
                      · Tension : 90–139 / 60–89
                      mmHg · Pouls : 60–100 bpm ·
                      SpO₂ : ≥ 95 % · Respiration :
                      12–20/min · Glycémie :
                      0,70–1,10 g/L
                    </span>

                  </div>

                </div>

              </div>

              <div className="nursing-modal-footer">

                <button
                  type="button"
                  className="nursing-secondary-button"
                  onClick={
                    closeVitalsModal
                  }
                >
                  Annuler
                </button>

                <button
                  type="button"
                  className="nursing-primary-button"
                  onClick={saveVitals}
                >
                  <CheckCircle2
                    size={17}
                  />

                  Enregistrer
                </button>

              </div>

            </div>

          </div>
        )}

      {/* ======================================================
          MODALE DOSSIER PATIENT
          ====================================================== */}

      {showDossierModal &&
        selectedPatient && (
          <div
            className="nursing-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeDossierModal();
              }
            }}
          >

            <div className="nursing-modal nursing-dossier-modal">

              <div className="nursing-modal-header">

                <div>

                  <h2>
                    Dossier patient
                  </h2>

                  <p>
                    Informations et constantes
                  </p>

                </div>

                <button
                  type="button"
                  className="nursing-modal-close"
                  onClick={
                    closeDossierModal
                  }
                >
                  <X size={20} />
                </button>

              </div>

              <div className="nursing-modal-body">

                {/* IDENTITÉ */}

                <div className="nursing-detail-card">

                  <div className="nursing-detail-card-header">

                    <div className="nursing-detail-icon">
                      <UserRound size={19} />
                    </div>

                    <div>
                      <h3>
                        Identité
                      </h3>

                      <span>
                        Informations du patient
                      </span>
                    </div>

                  </div>

                  <div className="nursing-detail-grid">

                    <div>
                      <span>
                        Nom complet
                      </span>

                      <strong>
                        {
                          getPatientFullName(
                            selectedPatient
                          )
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Identifiant
                      </span>

                      <strong>
                        {selectedPatient.id ||
                          "--"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Téléphone
                      </span>

                      <strong>
                        {selectedPatient.telephone ||
                          "--"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Téléphone parent
                      </span>

                      <strong>
                        {selectedPatient.telephoneParents ||
                          "--"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Âge
                      </span>

                      <strong>
                        {selectedPatient.age !==
                        ""
                          ? `${selectedPatient.age} ans`
                          : "--"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Sexe
                      </span>

                      <strong>
                        {selectedPatient.sexe ||
                          "--"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Service
                      </span>

                      <strong>
                        {selectedPatient.service ||
                          "--"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Chambre
                      </span>

                      <strong>
                        {selectedPatient.chambre ||
                          "--"}
                      </strong>
                    </div>

                  </div>

                </div>

                {/* CONSTANTES */}

                <div className="nursing-detail-card">

                  <div className="nursing-detail-card-header">

                    <div className="nursing-detail-icon">
                      <HeartPulse size={19} />
                    </div>

                    <div>
                      <h3>
                        Dernières constantes
                      </h3>

                      <span>
                        Surveillance infirmière
                      </span>
                    </div>

                  </div>

                  <div className="nursing-detail-grid nursing-vitals-detail-grid">

                    <div
                      className={
                        isAbnormalTemperature(
                          selectedPatient.temperature
                        )
                          ? "nursing-detail-abnormal"
                          : ""
                      }
                    >
                      <span>
                        Température
                      </span>

                      <strong
                        className={abnormalValueClass(
                          isAbnormalTemperature(
                            selectedPatient.temperature
                          )
                        )}
                      >
                        {displayValue(
                          selectedPatient.temperature,
                          " °C"
                        )}
                      </strong>
                    </div>

                    <div
                      className={
                        isAbnormalBloodPressure(
                          selectedPatient.systolic,
                          selectedPatient.diastolic
                        )
                          ? "nursing-detail-abnormal"
                          : ""
                      }
                    >
                      <span>
                        Tension
                      </span>

                      <strong
                        className={abnormalValueClass(
                          isAbnormalBloodPressure(
                            selectedPatient.systolic,
                            selectedPatient.diastolic
                          )
                        )}
                      >
                        {hasValue(
                          selectedPatient.systolic
                        ) ||
                        hasValue(
                          selectedPatient.diastolic
                        )
                          ? `${
                              hasValue(
                                selectedPatient.systolic
                              )
                                ? selectedPatient.systolic
                                : "--"
                            }/${
                              hasValue(
                                selectedPatient.diastolic
                              )
                                ? selectedPatient.diastolic
                                : "--"
                            } mmHg`
                          : "--"}
                      </strong>
                    </div>

                    <div
                      className={
                        isAbnormalPulse(
                          selectedPatient.pulse
                        )
                          ? "nursing-detail-abnormal"
                          : ""
                      }
                    >
                      <span>
                        Pouls
                      </span>

                      <strong
                        className={abnormalValueClass(
                          isAbnormalPulse(
                            selectedPatient.pulse
                          )
                        )}
                      >
                        {displayValue(
                          selectedPatient.pulse,
                          " bpm"
                        )}
                      </strong>
                    </div>

                    <div
                      className={
                        isAbnormalOxygen(
                          selectedPatient.oxygen
                        )
                          ? "nursing-detail-abnormal"
                          : ""
                      }
                    >
                      <span>
                        SpO₂
                      </span>

                      <strong
                        className={abnormalValueClass(
                          isAbnormalOxygen(
                            selectedPatient.oxygen
                          )
                        )}
                      >
                        {displayValue(
                          selectedPatient.oxygen,
                          " %"
                        )}
                      </strong>
                    </div>

                    <div
                      className={
                        isAbnormalRespiratoryRate(
                          selectedPatient.respiratoryRate
                        )
                          ? "nursing-detail-abnormal"
                          : ""
                      }
                    >
                      <span>
                        Respiration
                      </span>

                      <strong
                        className={abnormalValueClass(
                          isAbnormalRespiratoryRate(
                            selectedPatient.respiratoryRate
                          )
                        )}
                      >
                        {displayValue(
                          selectedPatient.respiratoryRate,
                          " /min"
                        )}
                      </strong>
                    </div>

                    <div
                      className={
                        isAbnormalGlucose(
                          selectedPatient.glucose
                        )
                          ? "nursing-detail-abnormal"
                          : ""
                      }
                    >
                      <span>
                        Glycémie
                      </span>

                      <strong
                        className={abnormalValueClass(
                          isAbnormalGlucose(
                            selectedPatient.glucose
                          )
                        )}
                      >
                        {displayValue(
                          selectedPatient.glucose,
                          " g/L"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Poids
                      </span>

                      <strong>
                        {displayValue(
                          selectedPatient.weight,
                          " kg"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Taille
                      </span>

                      <strong>
                        {displayValue(
                          selectedPatient.height,
                          " cm"
                        )}
                      </strong>
                    </div>

                  </div>

                </div>

                {/* OBSERVATIONS */}

                <div className="nursing-detail-card">

                  <div className="nursing-detail-card-header">

                    <div className="nursing-detail-icon">
                      <Stethoscope size={19} />
                    </div>

                    <div>
                      <h3>
                        Observations
                      </h3>

                      <span>
                        Notes infirmières
                      </span>
                    </div>

                  </div>

                  <div className="nursing-notes-display">

                    {selectedPatient.nursingNotes ? (
                      <p>
                        {
                          selectedPatient.nursingNotes
                        }
                      </p>
                    ) : (
                      <span>
                        Aucune observation
                        enregistrée.
                      </span>
                    )}

                  </div>

                </div>

                {/* DERNIÈRE MISE À JOUR */}

                <div className="nursing-last-update-card">

                  <Clock3 size={17} />

                  <span>
                    Dernière mise à jour :{" "}
                    <strong>
                      {formatDateTime(
                        selectedPatient.lastVitalUpdate
                      )}
                    </strong>
                  </span>

                </div>

              </div>

              <div className="nursing-modal-footer">

                <button
                  type="button"
                  className="nursing-secondary-button"
                  onClick={
                    closeDossierModal
                  }
                >
                  Fermer
                </button>

                <button
                  type="button"
                  className="nursing-primary-button"
                  onClick={() => {
                    closeDossierModal();
                    openVitalsModal(
                      selectedPatient
                    );
                  }}
                >
                  <Activity size={17} />

                  Modifier les constantes
                </button>

              </div>

            </div>

          </div>
        )}

      {/* ======================================================
          FOOTER
          ====================================================== */}

      <div className="nursing-footer">

        <div>
          <ShieldCheck size={16} />

          <span>
            Surveillance infirmière
          </span>
        </div>

        <span>
          MA SANTÉ
        </span>

      </div>

    </div>
  );
}