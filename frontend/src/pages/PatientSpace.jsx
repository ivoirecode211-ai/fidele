import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  FileText,
  FlaskConical,
  HeartPulse,
  LogOut,
  Pill,
  RefreshCw,
  Stethoscope,
  UserRound,
  Thermometer,
  Weight,
  Clock3,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Download,
  Plus,
  Grid2X2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/patientSpace.css";

const API_BASE_URL = "http://127.0.0.1:8000/api";

// ============================================================
// DONNÉES DE DÉMONSTRATION
// ============================================================
// Ces données servent uniquement à prévisualiser l'interface lorsque
// l'API Django n'est pas encore disponible ou renvoie une liste vide.
// Pour la production, passer ENABLE_DEMO_FALLBACK à false.
const ENABLE_DEMO_FALLBACK = true;

const DEMO_PATIENT_DATA = {
  patient: {
    id: 1,
    first_name: "Jean",
    last_name: "KOUASSI",
    username: "kouassi.jean",
    age: 35,
    blood_group: "O+",
    phone: "07 08 09 10 11",
    birth_date: "1991-04-18",
  },

  consultations: [
    {
      id: 1,
      date: "2026-09-24",
      doctor_name: "Dr. KOUAME Jean",
      motif: "Fièvre et maux de tête",
      diagnostic: "Syndrome grippal",
      observation: "Repos, hydratation et surveillance de la température.",
    },
    {
      id: 2,
      date: "2026-09-12",
      doctor_name: "Dr. N'GUESSAN Marie",
      motif: "Contrôle médical",
      diagnostic: "État général satisfaisant",
      observation: "Poursuite du suivi médical.",
    },
    {
      id: 3,
      date: "2026-07-05",
      doctor_name: "Dr. KOUAME Jean",
      motif: "Douleurs abdominales",
      diagnostic: "Gastrite",
      observation: "Traitement prescrit et contrôle recommandé.",
    },
    {
      id: 4,
      date: "2026-05-18",
      doctor_name: "Dr. BAH Leon",
      motif: "Toux persistante",
      diagnostic: "Bronchite légère",
      observation: "Hydratation et traitement symptomatique.",
    },
    {
      id: 5,
      date: "2026-03-03",
      doctor_name: "Dr. KOUASSI Paul",
      motif: "Consultation générale",
      diagnostic: "Bonne santé",
      observation: "Aucun signe clinique particulier.",
    },
  ],

  constants: [
    { id: 1, date: "2026-09-24", temperature: 36.8, tension: "12/8", pouls: 78, poids: 72, observation: "-" },
    { id: 2, date: "2026-09-18", temperature: 36.6, tension: "11/7", pouls: 76, poids: 71, observation: "RAS" },
    { id: 3, date: "2026-09-12", temperature: 36.7, tension: "12/8", pouls: 80, poids: 72, observation: "-" },
    { id: 4, date: "2026-09-05", temperature: 37.0, tension: "13/9", pouls: 82, poids: 73, observation: "Légère fatigue" },
    { id: 5, date: "2026-08-28", temperature: 36.5, tension: "12/8", pouls: 76, poids: 72, observation: "RAS" },
  ],

  prescriptions: [
    { id: 1, date: "2026-09-24", doctor_name: "Dr. KOUAME Jean", medicine_name: "Paracétamol 500 mg", dosage: "1 comprimé 3 fois/jour", duration: "7 jours" },
    { id: 2, date: "2026-09-24", doctor_name: "Dr. KOUAME Jean", medicine_name: "Amoxicilline 500 mg", dosage: "1 comprimé 3 fois/jour", duration: "7 jours" },
    { id: 3, date: "2026-07-05", doctor_name: "Dr. KOUAME Jean", medicine_name: "Oméprazole 20 mg", dosage: "1 comprimé le matin", duration: "14 jours" },
  ],

  laboratoryResults: [
    { id: 1, date: "2026-09-24", exam_name: "Numération Formule Sanguine (NFS)", result: "Résultats dans la norme" },
    { id: 2, date: "2026-09-24", exam_name: "Glycémie", result: "0,92 g/L — normale" },
    { id: 3, date: "2026-08-15", exam_name: "Bilan lipidique", result: "Résultats disponibles" },
    { id: 4, date: "2026-07-01", exam_name: "Fonction rénale", result: "Résultats dans la norme" },
    { id: 5, date: "2026-05-22", exam_name: "Sérologie VIH", result: "Résultat disponible" },
  ],
};


export default function PatientSpace() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(false);

  const [patient, setPatient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [constants, setConstants] = useState([]);
  const [laboratoryResults, setLaboratoryResults] = useState([]);

  const token = useMemo(
    () =>
      localStorage.getItem("access_token") ||
      localStorage.getItem("access") ||
      localStorage.getItem("token"),
    []
  );

  const getHeaders = () => ({
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  });

  async function fetchData(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Erreur API ${response.status}`);
    }

    return response.json();
  }

  async function loadPatientData(refresh = false) {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError("");
      setDemoMode(false);

      const results = await Promise.allSettled([
        fetchData("/patients/me/"),
        fetchData("/consultations/my/"),
        fetchData("/prescriptions/my/"),
        fetchData("/consultations/my/constants/"),
        fetchData("/laboratory/my/results/"),
      ]);

      const [
        patientResult,
        consultationsResult,
        prescriptionsResult,
        constantsResult,
        laboratoryResult,
      ] = results;

      let usedDemo = false;

      if (patientResult.status === "fulfilled" && patientResult.value) {
        setPatient(patientResult.value);
      } else if (ENABLE_DEMO_FALLBACK) {
        setPatient(DEMO_PATIENT_DATA.patient);
        usedDemo = true;
      }

      if (consultationsResult.status === "fulfilled") {
        const data = consultationsResult.value;
        const list = Array.isArray(data) ? data : data?.results || [];
        if (list.length > 0 || !ENABLE_DEMO_FALLBACK) {
          setConsultations(list);
        } else {
          setConsultations(DEMO_PATIENT_DATA.consultations);
          usedDemo = true;
        }
      } else if (ENABLE_DEMO_FALLBACK) {
        setConsultations(DEMO_PATIENT_DATA.consultations);
        usedDemo = true;
      }

      if (prescriptionsResult.status === "fulfilled") {
        const data = prescriptionsResult.value;
        const list = Array.isArray(data) ? data : data?.results || [];
        if (list.length > 0 || !ENABLE_DEMO_FALLBACK) {
          setPrescriptions(list);
        } else {
          setPrescriptions(DEMO_PATIENT_DATA.prescriptions);
          usedDemo = true;
        }
      } else if (ENABLE_DEMO_FALLBACK) {
        setPrescriptions(DEMO_PATIENT_DATA.prescriptions);
        usedDemo = true;
      }

      if (constantsResult.status === "fulfilled") {
        const data = constantsResult.value;
        const list = Array.isArray(data) ? data : data?.results || [];
        if (list.length > 0 || !ENABLE_DEMO_FALLBACK) {
          setConstants(list);
        } else {
          setConstants(DEMO_PATIENT_DATA.constants);
          usedDemo = true;
        }
      } else if (ENABLE_DEMO_FALLBACK) {
        setConstants(DEMO_PATIENT_DATA.constants);
        usedDemo = true;
      }

      if (laboratoryResult.status === "fulfilled") {
        const data = laboratoryResult.value;
        const list = Array.isArray(data) ? data : data?.results || [];
        if (list.length > 0 || !ENABLE_DEMO_FALLBACK) {
          setLaboratoryResults(list);
        } else {
          setLaboratoryResults(DEMO_PATIENT_DATA.laboratoryResults);
          usedDemo = true;
        }
      } else if (ENABLE_DEMO_FALLBACK) {
        setLaboratoryResults(DEMO_PATIENT_DATA.laboratoryResults);
        usedDemo = true;
      }

      const allFailed = results.every(
        (result) => result.status === "rejected"
      );

      if (allFailed && !ENABLE_DEMO_FALLBACK) {
        setError(
          "Les données du portail patient ne sont pas encore disponibles."
        );
      }

      setDemoMode(usedDemo);
    } catch (err) {
      if (ENABLE_DEMO_FALLBACK) {
        setPatient(DEMO_PATIENT_DATA.patient);
        setConsultations(DEMO_PATIENT_DATA.consultations);
        setPrescriptions(DEMO_PATIENT_DATA.prescriptions);
        setConstants(DEMO_PATIENT_DATA.constants);
        setLaboratoryResults(DEMO_PATIENT_DATA.laboratoryResults);
        setDemoMode(true);
        setError("");
      } else {
        setError(
          err.message ||
            "Impossible de charger les données du patient."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPatientData();
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", {
      replace: true,
    });
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function getPatientName() {
    const firstName =
      patient?.first_name ||
      patient?.prenom ||
      user?.first_name ||
      "";

    const lastName =
      patient?.last_name ||
      patient?.nom ||
      user?.last_name ||
      "";

    return (
      `${firstName} ${lastName}`.trim() ||
      user?.username ||
      "Patient"
    );
  }

  const patientName = getPatientName();

  const latestConstants =
    constants.length > 0 ? constants[0] : null;

  const latestConsultation =
    consultations.length > 0 ? consultations[0] : null;

  const latestPrescription =
    prescriptions.length > 0 ? prescriptions[0] : null;

  const latestResult =
    laboratoryResults.length > 0
      ? laboratoryResults[0]
      : null;

  const sectionMeta = {
    overview: {
      eyebrow: "ESPACE PATIENT",
      title: `Bonjour, ${patientName}`,
      description:
        "Retrouvez rapidement vos informations médicales et vos dernières activités.",
    },

    constants: {
      eyebrow: "SUIVI MÉDICAL",
      title: "Mes constantes",
      description:
        "Consultez vos dernières mesures et l'historique de vos constantes médicales.",
    },

    consultations: {
      eyebrow: "HISTORIQUE MÉDICAL",
      title: "Mes consultations",
      description:
        "Retrouvez l'historique de vos consultations et les informations communiquées par vos médecins.",
    },

    prescriptions: {
      eyebrow: "TRAITEMENTS",
      title: "Mes ordonnances",
      description:
        "Consultez vos prescriptions, médicaments, posologies et durées de traitement.",
    },

    laboratory: {
      eyebrow: "ANALYSES MÉDICALES",
      title: "Mes résultats",
      description:
        "Consultez les résultats de vos analyses médicales disponibles.",
    },
  }[activeSection];

  return (
    <div className="patient-space-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="patient-space-header">

        <div className="patient-space-brand">

          <div className="patient-space-brand-icon">
            <Activity size={25} />
          </div>

          <div>
            <strong>MA SANTÉ</strong>
            <span>Espace patients</span>
          </div>

        </div>

        <div className="patient-space-header-right">

          <div className="patient-space-user">

            <div>
              <strong>{patientName}</strong>
              <span>Patient</span>
            </div>

            <div className="patient-space-avatar">
              <UserRound size={21} />
            </div>

          </div>

          <button
            type="button"
            className="patient-space-logout"
            onClick={handleLogout}
            title="Déconnexion"
          >
            <LogOut size={18} />
          </button>

        </div>

      </header>


      {/* =====================================================
          BODY
      ===================================================== */}

      <div className="patient-space-body">

        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside className="patient-space-sidebar">

          {/* IDENTITÉ MA SANTÉ */}
          <div className="patient-sidebar-brand">
            <div className="patient-sidebar-brand-icon">
              <Plus size={34} strokeWidth={5} />
            </div>

            <div className="patient-sidebar-brand-text">
              <strong>MA SANTÉ</strong>
              <span>Clinique &amp; Gestion<br />Hospitalière</span>
            </div>
          </div>

          {/* ONGLETS DU PATIENT */}
          <nav className="patient-space-menu">

            <button
              type="button"
              className={
                activeSection === "overview"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveSection("overview")
              }
            >
              <Activity size={19} />
              <span>Vue d'ensemble</span>
            </button>

            <button
              type="button"
              className={
                activeSection === "constants"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveSection("constants")
              }
            >
              <HeartPulse size={19} />
              <span>Mes constantes</span>
            </button>

            <button
              type="button"
              className={
                activeSection === "consultations"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveSection("consultations")
              }
            >
              <Stethoscope size={19} />
              <span>Mes consultations</span>
            </button>

            <button
              type="button"
              className={
                activeSection === "prescriptions"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveSection("prescriptions")
              }
            >
              <Pill size={19} />
              <span>Mes ordonnances</span>
            </button>

            <button
              type="button"
              className={
                activeSection === "laboratory"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveSection("laboratory")
              }
            >
              <FlaskConical size={19} />
              <span>Mes résultats</span>
            </button>

          </nav>

          {/* ACTIONS EN BAS DE LA BARRE */}
          <div className="patient-sidebar-bottom">

            <button
              type="button"
              className="patient-sidebar-action"
              onClick={() => navigate("/modules")}
              title="Retour aux modules"
            >
              <Grid2X2 size={20} />
              <span>Retour aux modules</span>
            </button>

            <button
              type="button"
              className="patient-sidebar-action patient-sidebar-logout"
              onClick={handleLogout}
              title="Déconnexion"
            >
              <LogOut size={20} />
              <span>Déconnexion</span>
            </button>

          </div>

        </aside>


        {/* ===================================================
            CONTENU
        =================================================== */}

        <main className="patient-space-content">

          <div className="patient-space-title">

            <div>
              <span>{sectionMeta.eyebrow}</span>

              <h1>{sectionMeta.title}</h1>

              <p>{sectionMeta.description}</p>
            </div>

            <button
              type="button"
              className="patient-space-refresh"
              onClick={() => loadPatientData(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "patient-space-spin"
                    : ""
                }
              />

              Actualiser
            </button>

          </div>


          {error && (
            <div className="patient-space-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {demoMode && (
            <div className="patient-space-demo-banner">
              <ClipboardList size={18} />
              <div>
                <strong>Mode démonstration</strong>
                <span>Des données patient de démonstration sont affichées pour prévisualiser l'interface. Elles seront remplacées automatiquement par les données Django disponibles.</span>
              </div>
            </div>
          )}


          {loading ? (

            <div className="patient-space-loading">

              <RefreshCw
                size={32}
                className="patient-space-spin"
              />

              <span>
                Chargement de vos informations...
              </span>

            </div>

          ) : (

            <>

              {/* =================================================
                  VUE D'ENSEMBLE
              ================================================= */}

              {activeSection === "overview" && (

                <div className="patient-dashboard">

                  <div className="patient-welcome-card">

                    <div>

                      <span>VOTRE ESPACE PERSONNEL</span>

                      <h2>
                        Bienvenue dans votre espace santé
                      </h2>

                      <p>
                        Consultez vos informations médicales,
                        vos traitements et vos résultats depuis
                        un seul espace.
                      </p>

                    </div>

                    <div className="patient-welcome-icon">
                      <HeartPulse size={54} />
                    </div>

                  </div>


                  <div className="patient-space-stat-grid">

                    <button
                      type="button"
                      onClick={() =>
                        setActiveSection("consultations")
                      }
                    >
                      <div className="patient-stat-icon">
                        <Stethoscope size={24} />
                      </div>

                      <div>
                        <span>Consultations</span>
                        <strong>
                          {consultations.length}
                        </strong>
                      </div>

                      <ChevronRight size={18} />
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        setActiveSection("constants")
                      }
                    >
                      <div className="patient-stat-icon">
                        <HeartPulse size={24} />
                      </div>

                      <div>
                        <span>Constantes</span>
                        <strong>
                          {constants.length}
                        </strong>
                      </div>

                      <ChevronRight size={18} />
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        setActiveSection("prescriptions")
                      }
                    >
                      <div className="patient-stat-icon">
                        <Pill size={24} />
                      </div>

                      <div>
                        <span>Ordonnances</span>
                        <strong>
                          {prescriptions.length}
                        </strong>
                      </div>

                      <ChevronRight size={18} />
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        setActiveSection("laboratory")
                      }
                    >
                      <div className="patient-stat-icon">
                        <FlaskConical size={24} />
                      </div>

                      <div>
                        <span>Résultats</span>
                        <strong>
                          {laboratoryResults.length}
                        </strong>
                      </div>

                      <ChevronRight size={18} />
                    </button>

                  </div>


                  {/* DERNIERE CONSULTATION */}

                  <section className="patient-space-card">

                    <div className="patient-space-card-title">

                      <div>
                        <small>DERNIÈRE ACTIVITÉ</small>
                        <h2>
                          Dernière consultation
                        </h2>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveSection("consultations")
                        }
                      >
                        Voir tout
                        <ChevronRight size={16} />
                      </button>

                    </div>


                    {latestConsultation ? (

                      <div className="patient-last-activity">

                        <div className="patient-date-box">
                          <CalendarDays size={19} />
                          <span>
                            {formatDate(
                              latestConsultation.date ||
                                latestConsultation.created_at
                            )}
                          </span>
                        </div>

                        <div className="patient-doctor-box">

                          <div className="patient-round-icon">
                            <Stethoscope size={20} />
                          </div>

                          <div>
                            <strong>
                              {latestConsultation.doctor_name ||
                                latestConsultation.medecin_name ||
                                latestConsultation.doctor ||
                                "Médecin"}
                            </strong>

                            <span>
                              Consultation médicale
                            </span>
                          </div>

                        </div>

                        <div className="patient-activity-status">
                          <CheckCircle2 size={16} />
                          Consultation enregistrée
                        </div>

                      </div>

                    ) : (

                      <div className="patient-space-empty-inline">
                        <FileText size={25} />
                        <span>
                          Aucune consultation enregistrée.
                        </span>
                      </div>

                    )}

                  </section>


                  {/* CONSTANTES */}

                  <section className="patient-space-card">

                    <div className="patient-space-card-title">

                      <div>
                        <small>DERNIÈRES DONNÉES</small>
                        <h2>
                          Mes constantes
                        </h2>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveSection("constants")
                        }
                      >
                        Voir l'historique
                        <ChevronRight size={16} />
                      </button>

                    </div>


                    {latestConstants ? (

                      <div className="patient-vitals-grid">

                        <div>
                          <Thermometer size={20} />

                          <span>Température</span>

                          <strong>
                            {latestConstants.temperature ?? "—"}
                          </strong>

                          <small>°C</small>
                        </div>


                        <div>
                          <Activity size={20} />

                          <span>Tension</span>

                          <strong>
                            {latestConstants.tension ||
                              latestConstants.blood_pressure ||
                              "—"}
                          </strong>

                          <small>mmHg</small>
                        </div>


                        <div>
                          <HeartPulse size={20} />

                          <span>Pouls</span>

                          <strong>
                            {latestConstants.pouls ??
                              latestConstants.heart_rate ??
                              "—"}
                          </strong>

                          <small>bpm</small>
                        </div>


                        <div>
                          <Weight size={20} />

                          <span>Poids</span>

                          <strong>
                            {latestConstants.poids ??
                              latestConstants.weight ??
                              "—"}
                          </strong>

                          <small>kg</small>
                        </div>

                      </div>

                    ) : (

                      <div className="patient-space-empty">
                        <HeartPulse size={40} />
                        <h3>
                          Aucune constante
                        </h3>
                        <p>
                          Vos constantes apparaîtront ici.
                        </p>
                      </div>

                    )}

                  </section>


                  {/* INFORMATIONS PERSONNELLES */}

                  <div className="patient-overview-bottom-grid">

                    <section className="patient-health-priority-card">
                      <div className="patient-health-illustration">
                        <HeartPulse size={42} />
                      </div>
                      <div>
                        <small>VOTRE SANTÉ, NOTRE PRIORITÉ</small>
                        <h3>Votre espace santé en toute sécurité</h3>
                        <p>
                          Consultez vos informations médicales, vos traitements et vos résultats depuis un espace personnel sécurisé.
                        </p>
                      </div>
                    </section>

                    <section className="patient-personal-info-card">
                      <div className="patient-space-card-title">
                        <div>
                          <small>PROFIL PATIENT</small>
                          <h2>Informations personnelles</h2>
                        </div>
                        <UserRound size={22} />
                      </div>

                      <div className="patient-personal-info-grid">
                        <div><UserRound size={17} /><span><b>Nom</b>{patientName}</span></div>
                        <div><CalendarDays size={17} /><span><b>Âge</b>{patient?.age ?? "35"} ans</span></div>
                        <div><HeartPulse size={17} /><span><b>Groupe sanguin</b>{patient?.blood_group || patient?.groupe_sanguin || "O+"}</span></div>
                        <div><Clock3 size={17} /><span><b>Téléphone</b>{patient?.phone || patient?.telephone || "07 08 09 10 11"}</span></div>
                      </div>
                    </section>

                  </div>


                  {/* ACTIVITE RAPIDE */}

                  <div className="patient-quick-grid">

                    <button
                      type="button"
                      onClick={() =>
                        setActiveSection("prescriptions")
                      }
                    >
                      <Pill size={22} />

                      <div>
                        <span>Dernière ordonnance</span>

                        <strong>
                          {latestPrescription
                            ? formatDate(
                                latestPrescription.date ||
                                  latestPrescription.created_at
                              )
                            : "Aucune ordonnance"}
                        </strong>
                      </div>

                      <ChevronRight size={17} />
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        setActiveSection("laboratory")
                      }
                    >
                      <FlaskConical size={22} />

                      <div>
                        <span>Dernier résultat</span>

                        <strong>
                          {latestResult
                            ? formatDate(
                                latestResult.date ||
                                  latestResult.created_at
                              )
                            : "Aucun résultat"}
                        </strong>
                      </div>

                      <ChevronRight size={17} />
                    </button>

                  </div>

                </div>
              )}


              {/* =================================================
                  CONSTANTES
              ================================================= */}

              {activeSection === "constants" && (

                <div className="patient-section-layout">

                  {latestConstants && (

                    <section className="patient-space-card">

                      <div className="patient-space-card-title">

                        <div>
                          <small>DERNIÈRE MESURE</small>
                          <h2>
                            Votre état actuel
                          </h2>
                        </div>

                      </div>


                      <div className="patient-vitals-large-grid">

                        <div className="vital-large temperature">
                          <Thermometer size={25} />

                          <span>Température</span>

                          <strong>
                            {latestConstants.temperature ?? "—"}
                            <small> °C</small>
                          </strong>
                        </div>


                        <div className="vital-large tension">
                          <Activity size={25} />

                          <span>Tension artérielle</span>

                          <strong>
                            {latestConstants.tension ||
                              latestConstants.blood_pressure ||
                              "—"}
                            <small> mmHg</small>
                          </strong>
                        </div>


                        <div className="vital-large pulse">
                          <HeartPulse size={25} />

                          <span>Fréquence cardiaque</span>

                          <strong>
                            {latestConstants.pouls ??
                              latestConstants.heart_rate ??
                              "—"}
                            <small> bpm</small>
                          </strong>
                        </div>


                        <div className="vital-large weight">
                          <Weight size={25} />

                          <span>Poids</span>

                          <strong>
                            {latestConstants.poids ??
                              latestConstants.weight ??
                              "—"}
                            <small> kg</small>
                          </strong>
                        </div>

                      </div>

                    </section>

                  )}


                  <section className="patient-space-card">

                    <div className="patient-space-card-title">

                      <div>
                        <small>HISTORIQUE</small>
                        <h2>
                          Historique de mes constantes
                        </h2>
                      </div>

                    </div>


                    {constants.length > 0 ? (

                      <div className="patient-constants-table">

                        <div className="patient-table-head">
                          <span>Date</span>
                          <span>Température</span>
                          <span>Tension</span>
                          <span>Pouls</span>
                          <span>Poids</span>
                        </div>


                        {constants.map(
                          (item, index) => (

                            <div
                              className="patient-table-row"
                              key={
                                item.id || index
                              }
                            >

                              <span>
                                <CalendarDays size={15} />
                                {formatDate(
                                  item.date ||
                                    item.created_at
                                )}
                              </span>

                              <strong>
                                {item.temperature ?? "—"} °C
                              </strong>

                              <strong>
                                {item.tension ||
                                  item.blood_pressure ||
                                  "—"}{" "}
                                mmHg
                              </strong>

                              <strong>
                                {item.pouls ??
                                  item.heart_rate ??
                                  "—"}{" "}
                                bpm
                              </strong>

                              <strong>
                                {item.poids ??
                                  item.weight ??
                                  "—"}{" "}
                                kg
                              </strong>

                            </div>

                          )
                        )}

                      </div>

                    ) : (

                      <div className="patient-space-empty">
                        <HeartPulse size={42} />

                        <h3>
                          Aucune constante disponible
                        </h3>

                        <p>
                          Les constantes prises pendant vos
                          soins apparaîtront ici.
                        </p>
                      </div>

                    )}

                  </section>

                </div>
              )}


              {/* =================================================
                  CONSULTATIONS
              ================================================= */}

              {activeSection === "consultations" && (

                <section className="patient-space-card">

                  <div className="patient-space-card-title">

                    <div>
                      <small>HISTORIQUE MÉDICAL</small>

                      <h2>
                        Historique de mes consultations
                      </h2>
                    </div>

                  </div>


                  {consultations.length > 0 ? (

                    <div className="patient-medical-timeline">

                      {consultations.map(
                        (item, index) => (

                          <article
                            className="patient-medical-item"
                            key={
                              item.id || index
                            }
                          >

                            <div className="patient-timeline-icon">
                              <Stethoscope size={20} />
                            </div>

                            <div className="patient-timeline-content">

                              <div className="patient-timeline-header">

                                <div>
                                  <span>
                                    CONSULTATION MÉDICALE
                                  </span>

                                  <h3>
                                    {item.doctor_name ||
                                      item.medecin_name ||
                                      item.doctor ||
                                      "Médecin"}
                                  </h3>
                                </div>

                                <div className="patient-timeline-date">
                                  <CalendarDays size={15} />

                                  {formatDate(
                                    item.date ||
                                      item.created_at
                                  )}
                                </div>

                              </div>


                              <div className="patient-consultation-fields">

                                <div>
                                  <small>
                                    Motif de consultation
                                  </small>

                                  <p>
                                    {item.motif ||
                                      item.reason ||
                                      "Non renseigné"}
                                  </p>
                                </div>


                                <div>
                                  <small>
                                    Diagnostic
                                  </small>

                                  <p>
                                    {item.diagnostic ||
                                      item.diagnosis ||
                                      "Non renseigné"}
                                  </p>
                                </div>


                                <div className="full">

                                  <small>
                                    Observations du médecin
                                  </small>

                                  <p>
                                    {item.observation ||
                                      item.observations ||
                                      item.notes ||
                                      "Aucune observation"}
                                  </p>

                                </div>

                              </div>

                            </div>

                          </article>

                        )
                      )}

                    </div>

                  ) : (

                    <div className="patient-space-empty">
                      <Stethoscope size={42} />

                      <h3>
                        Aucune consultation
                      </h3>

                      <p>
                        Votre historique médical apparaîtra ici.
                      </p>
                    </div>

                  )}

                </section>
              )}


              {/* =================================================
                  ORDONNANCES
              ================================================= */}

              {activeSection === "prescriptions" && (

                <section className="patient-space-card">

                  <div className="patient-space-card-title">

                    <div>
                      <small>TRAITEMENTS</small>

                      <h2>
                        Mes ordonnances
                      </h2>
                    </div>

                  </div>


                  {prescriptions.length > 0 ? (

                    <div className="patient-prescription-grid">

                      {prescriptions.map(
                        (item, index) => (

                          <article
                            className="patient-prescription-card"
                            key={
                              item.id || index
                            }
                          >

                            <div className="prescription-card-top">

                              <div className="prescription-icon">
                                <Pill size={23} />
                              </div>

                              <div>

                                <span>
                                  ORDONNANCE
                                </span>

                                <strong>
                                  {formatDate(
                                    item.date ||
                                      item.created_at
                                  )}
                                </strong>

                              </div>

                            </div>


                            <div className="prescription-doctor">

                              <Stethoscope size={16} />

                              <span>
                                Prescrite par{" "}
                                <strong>
                                  {item.doctor_name ||
                                    item.medecin_name ||
                                    "Médecin"}
                                </strong>
                              </span>

                            </div>


                            <div className="prescription-details">

                              <div>
                                <small>
                                  MÉDICAMENT
                                </small>

                                <strong>
                                  {item.medicine_name ||
                                    item.medication ||
                                    item.medicament ||
                                    "Non renseigné"}
                                </strong>
                              </div>


                              <div>
                                <small>
                                  POSOLOGIE
                                </small>

                                <strong>
                                  {item.dosage ||
                                    item.posologie ||
                                    "Non renseignée"}
                                </strong>
                              </div>


                              <div>
                                <small>
                                  DURÉE
                                </small>

                                <strong>
                                  {item.duration ||
                                    item.duree ||
                                    "Non renseignée"}
                                </strong>
                              </div>

                            </div>


                            <div className="prescription-footer">

                              <span>
                                <CheckCircle2 size={15} />
                                Prescription enregistrée
                              </span>

                            </div>

                          </article>

                        )
                      )}

                    </div>

                  ) : (

                    <div className="patient-space-empty">
                      <Pill size={42} />

                      <h3>
                        Aucune ordonnance
                      </h3>

                      <p>
                        Vos ordonnances prescrites
                        apparaîtront ici.
                      </p>
                    </div>

                  )}

                </section>
              )}


              {/* =================================================
                  LABORATOIRE
              ================================================= */}

              {activeSection === "laboratory" && (

                <section className="patient-space-card">

                  <div className="patient-space-card-title">

                    <div>
                      <small>ANALYSES MÉDICALES</small>

                      <h2>
                        Mes résultats de laboratoire
                      </h2>
                    </div>

                  </div>


                  {laboratoryResults.length > 0 ? (

                    <div className="patient-results-list">

                      {laboratoryResults.map(
                        (item, index) => (

                          <article
                            className="patient-result-card"
                            key={
                              item.id || index
                            }
                          >

                            <div className="result-icon">
                              <FlaskConical size={24} />
                            </div>


                            <div className="result-main">

                              <div className="result-header">

                                <div>

                                  <span>
                                    ANALYSE MÉDICALE
                                  </span>

                                  <h3>
                                    {item.exam_name ||
                                      item.analysis_name ||
                                      item.examen ||
                                      "Analyse médicale"}
                                  </h3>

                                </div>

                                <div className="result-date">
                                  <CalendarDays size={15} />

                                  {formatDate(
                                    item.date ||
                                      item.created_at
                                  )}
                                </div>

                              </div>


                              <div className="result-value">

                                <small>
                                  RÉSULTAT
                                </small>

                                <p>
                                  {item.result ||
                                    item.resultat ||
                                    item.value ||
                                    "Résultat non renseigné"}
                                </p>

                              </div>


                              <div className="result-footer">

                                <span>
                                  <CheckCircle2 size={15} />
                                  Résultat disponible
                                </span>

                                {item.file_url && (
                                  <a
                                    href={item.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <Download size={15} />
                                    Télécharger
                                  </a>
                                )}

                              </div>

                            </div>

                          </article>

                        )
                      )}

                    </div>

                  ) : (

                    <div className="patient-space-empty">
                      <FlaskConical size={42} />

                      <h3>
                        Aucun résultat
                      </h3>

                      <p>
                        Vos résultats de laboratoire
                        apparaîtront ici.
                      </p>
                    </div>

                  )}

                </section>
              )}

            </>

          )}

        </main>

      </div>

    </div>
  );
}