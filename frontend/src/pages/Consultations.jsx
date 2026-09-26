import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import api from "../services/api";

import Logo from "../components/Logo";

import SidebarFooter from "../components/SidebarFooter";

import UserBadge from "../components/UserBadge";

import NotificationBell from "../components/NotificationBell";

import "../styles/Consultations.css";


import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  ClipboardList,
  ClipboardX,
  Clock3,
  FileCheck2,
  FileText,
  FlaskConical,
  FolderOpen,
  Home,
  Hourglass,
  Info,
  MessageSquare,
  Search,
  Stethoscope,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";
/*
 * ============================================================
 * PATIENTS
 * ============================================================
 *
 * Servis par l'API (/api/parcours/consultations/) : seuls les
 * patients envoyés par Soins infirmiers apparaissent.
 */


/*
 * ============================================================
 * NORMALISATION DU NOM DU MÉDECIN
 * ============================================================
 */

function normalizeDoctorName(
  name = ""
) {
  return name
    .toLowerCase()
    .replace(
      /^dr\.?\s*/i,
      ""
    )
    .trim()
    .split(/\s+/)[0];
}


/*
 * ============================================================
 * COMPOSANT PRINCIPAL
 * ============================================================
 */

export default function Consultations() {

  const {
    user,
  } = useAuth();

  const navigate =
    useNavigate();


  /*
   * ==========================================================
   * MÉDECIN CONNECTÉ
   * ==========================================================
   */

  const currentDoctor =
    `Dr. ${(user?.last_name || "").toUpperCase()} ${user?.first_name || ""}`.trim();


  /*
   * ==========================================================
   * VUE ACTIVE
   * ==========================================================
   *
   * consultations = page principale
   * patients      = page Mes patients
   * ordonnances   = page Ordonnances
   */

  const [
    vueActive,
    setVueActive,
  ] = useState("consultations");


  /*
   * ==========================================================
   * ÉTATS
   * ==========================================================
   */

  const [
    consultations,
    setConsultations,
  ] = useState([]);


  const [
    recherche,
    setRecherche,
  ] = useState("");


  const [
    recherchePatients,
    setRecherchePatients,
  ] = useState("");


  const [
    modal,
    setModal,
  ] = useState(null);


  const [
    patientSelectionne,
    setPatientSelectionne,
  ] = useState(null);


  const [
    nouvelleConsultation,
    setNouvelleConsultation,
  ] = useState({
    patient: "",
    motif: "",
    heure: "",
  });


  /*
   * ==========================================================
   * FORMULAIRE MÉDICAL
   * ==========================================================
   */

  const [
    formulaireMedical,
    setFormulaireMedical,
  ] = useState({
    symptomes: "",
    diagnostic: "",
    traitement: "",
    observations: "",
  });


  /*
   * ==========================================================
   * FORMULAIRE RENDEZ-VOUS
   * ==========================================================
   */

  const [
    rendezVous,
    setRendezVous,
  ] = useState({
    date: "",
    heure: "",
    motif: "",
  });


  /*
   * ==========================================================
   * FORMULAIRE HOSPITALISATION
   * ==========================================================
   */

  const [
    hospitalisation,
    setHospitalisation,
  ] = useState({
    chambre: "",
    lit: "",
    dateAdmission: "",
    dateSortie: "",
  });


  /*
   * ==========================================================
   * SYNCHRONISATION AVEC LA CAISSE
   * ==========================================================
   */

  useEffect(() => {

    const synchroniserPatients =
      () => {

        api
          .get("/parcours/consultations/")
          .then((response) =>
            setConsultations(response.data)
          )
          .catch((error) =>
            console.error(
              "Erreur de récupération des patients :",
              error
            )
          );
      };


    synchroniserPatients();


    window.addEventListener(
      "focus",
      synchroniserPatients
    );


    return () => {

      window.removeEventListener(
        "focus",
        synchroniserPatients
      );

    };

  }, []);


  /*
   * ==========================================================
   * PATIENTS DU MÉDECIN CONNECTÉ
   * ==========================================================
   */

  const patientsDuMedecin =
    useMemo(() => {

      return consultations.filter(
        (consultation) => {

          if (
            !consultation.doctor
          ) {
            return true;
          }

          return (
            normalizeDoctorName(
              consultation.doctor
            ) ===
            normalizeDoctorName(
              currentDoctor
            )
          );
        }
      );

    }, [consultations]);


  /*
   * ==========================================================
   * PATIENTS DÉJÀ CONSULTÉS
   * ==========================================================
   */

  const patientsConsultes =
    useMemo(() => {

      return patientsDuMedecin.filter(
        (patient) =>
          patient.statut ===
          "Terminée"
      );

    }, [patientsDuMedecin]);


  /*
   * ==========================================================
   * PATIENTS AVEC ORDONNANCE
   * ==========================================================
   *
   * Une ordonnance est automatiquement créée à partir
   * du champ "Traitement / Prescription" saisi lors
   * de la consultation.
   */

  const patientsAvecOrdonnance =
    useMemo(() => {

      return patientsConsultes.filter(
        (patient) => {

          const prescription =
            patient.prescription ||
            patient.traitement ||
            "";

          return (
            typeof prescription === "string" &&
            prescription.trim() !== ""
          );
        }
      );

    }, [patientsConsultes]);


  /*
   * ==========================================================
   * RECHERCHE CONSULTATIONS
   * ==========================================================
   */

  const consultationsFiltrees =
    useMemo(() => {

      const texte =
        recherche
          .trim()
          .toLowerCase();


      if (!texte) {
        return patientsDuMedecin;
      }


      return patientsDuMedecin.filter(
        (consultation) =>

          (consultation.patient || "")
            .toLowerCase()
            .includes(texte) ||

          (consultation.motif || "")
            .toLowerCase()
            .includes(texte) ||

          (consultation.statut || "")
            .toLowerCase()
            .includes(texte) ||

          (consultation.telephone || "")
            .toLowerCase()
            .includes(texte) ||

          (consultation.parentContact || "")
            .toLowerCase()
            .includes(texte) ||

          (consultation.service || "")
            .toLowerCase()
            .includes(texte) ||

          (consultation.insuranceName || "")
            .toLowerCase()
            .includes(texte) ||

          (consultation.insurance || "")
            .toLowerCase()
            .includes(texte) ||

          String(
            consultation.id || ""
          )
            .toLowerCase()
            .includes(texte) ||

          String(
            consultation.numero || ""
          )
            .toLowerCase()
            .includes(texte)
      );

    }, [
      recherche,
      patientsDuMedecin,
    ]);


  /*
   * ==========================================================
   * RECHERCHE MES PATIENTS
   * ==========================================================
   */

  const patientsConsultesFiltres =
    useMemo(() => {

      const texte =
        recherchePatients
          .trim()
          .toLowerCase();


      if (!texte) {
        return patientsConsultes;
      }


      return patientsConsultes.filter(
        (patient) =>

          (patient.patient || "")
            .toLowerCase()
            .includes(texte) ||

          (patient.service || "")
            .toLowerCase()
            .includes(texte) ||

          (patient.diagnostic || "")
            .toLowerCase()
            .includes(texte) ||

          (patient.telephone || "")
            .toLowerCase()
            .includes(texte) ||

          (patient.parentContact || "")
            .toLowerCase()
            .includes(texte) ||

          String(
            patient.numero || ""
          )
            .toLowerCase()
            .includes(texte) ||

          String(
            patient.id || ""
          )
            .toLowerCase()
            .includes(texte)
      );

    }, [
      recherchePatients,
      patientsConsultes,
    ]);





  /*
   * ==========================================================
   * OUVRIR CONSULTATION
   * ==========================================================
   */

  const ouvrirConsultation =
    (consultation) => {

      setPatientSelectionne(
        consultation
      );


      setFormulaireMedical({
        symptomes:
          consultation.symptomes ||
          "",

        diagnostic:
          consultation.diagnostic ||
          "",

        traitement:
          consultation.prescription ||
          consultation.traitement ||
          "",

        observations:
          consultation.observations ||
          "",
      });


      if (
        consultation.statut !==
          "Terminée" &&
        !consultation.admissionId
      ) {

        /*
         * Consultation créée depuis « Nouvelle consultation » :
         * elle n'est rattachée à aucun passage en caisse.
         */

        setConsultations(
          (liste) =>
            liste.map(
              (item) =>
                item.id ===
                consultation.id
                  ? {
                      ...item,
                      statut:
                        "En cours",
                    }
                  : item
            )
        );

      } else if (
        consultation.statut !==
        "Terminée"
      ) {

        api
          .post(
            `/parcours/consultations/${consultation.admissionId}/consulter/`
          )
          .then((response) =>
            setConsultations(
              (liste) =>
                liste.map(
                  (item) =>
                    item.admissionId ===
                    consultation.admissionId
                      ? response.data
                      : item
                )
            )
          )
          .catch((error) => {

            alert(
              error.response?.data?.detail ||
                "Impossible de démarrer la consultation."
            );

            setModal(null);
          });
      }


      setModal(
        "consultation"
      );
    };


  /*
   * ==========================================================
   * OUVRIR FORMULAIRE RENDEZ-VOUS
   * ==========================================================
   */

  const ouvrirRendezVous =
    (patient) => {

      setPatientSelectionne(
        patient
      );


      setRendezVous({
        date: "",
        heure: "",
        motif: "",
      });


      setModal(
        "rendezvous-form"
      );
    };


  /*
   * ==========================================================
   * ENREGISTRER RENDEZ-VOUS
   * ==========================================================
   */

  const enregistrerRendezVous =
    async (e) => {

      e.preventDefault();


      if (
        !patientSelectionne ||
        !rendezVous.date ||
        !rendezVous.heure
      ) {
        return;
      }


      /*
       * Le rendez-vous est enregistré dans l'agenda
       * (module Rendez-vous) au nom du médecin connecté.
       */

      try {

        await api.post(
          "/appointments/agenda/",
          {
            patientId:
              patientSelectionne.id,
            service:
              patientSelectionne.service ||
              "Médecine générale",
            date:
              rendezVous.date,
            time:
              rendezVous.heure,
            motif:
              rendezVous.motif ||
              "Suivi médical",
          }
        );

      } catch (error) {

        const errors = error.response?.data;

        alert(
          errors && typeof errors === "object"
            ? Object.values(errors).flat().join("\n")
            : "Impossible d'enregistrer le rendez-vous."
        );

        return;
      }


      setRendezVous({
        date: "",
        heure: "",
        motif: "",
      });


      setModal(
        "rendezvous-confirme"
      );
    };


  /*
   * ==========================================================
   * OUVRIR FORMULAIRE HOSPITALISATION
   * ==========================================================
   */

  const ouvrirHospitalisation =
    (patient) => {

      setPatientSelectionne(
        patient
      );

      const maintenant =
        new Date();

      const dateLocale =
        `${maintenant.getFullYear()}-${String(
          maintenant.getMonth() + 1
        ).padStart(2, "0")}-${String(
          maintenant.getDate()
        ).padStart(2, "0")}`;

      setHospitalisation({
        chambre: "",
        lit: "",
        dateAdmission: dateLocale,
        dateSortie: "",
      });

      setModal(
        "hospitalisation-form"
      );
    };


  /*
   * ==========================================================
   * ENREGISTRER HOSPITALISATION
   * ==========================================================
   */

  const enregistrerHospitalisation =
    async (e) => {

      e.preventDefault();

      if (
        !patientSelectionne ||
        !hospitalisation.chambre ||
        !hospitalisation.lit ||
        !hospitalisation.dateAdmission ||
        !hospitalisation.dateSortie
      ) {
        return;
      }

      /*
       * Le séjour est enregistré par le service d'hospitalisation :
       * le lit doit exister et être libre.
       */

      if (!patientSelectionne.admissionId) {
        alert(
          "Ce patient n'est rattaché à aucun passage en caisse : il ne peut pas être hospitalisé."
        );
        return;
      }

      try {

        await api.post(
          "/hospitalization/service/sejours/",
          {
            admissionId:
              patientSelectionne.admissionId,
            chambre:
              hospitalisation.chambre,
            lit:
              hospitalisation.lit,
            dateAdmission:
              hospitalisation.dateAdmission,
            dateSortie:
              hospitalisation.dateSortie,
          }
        );

      } catch (error) {

        const errors = error.response?.data;

        alert(
          errors && typeof errors === "object"
            ? Object.values(errors).flat().join("\n")
            : "Impossible d'enregistrer l'hospitalisation."
        );

        return;
      }


      /*
       * Le patient est également marqué comme hospitalisé
       * dans la liste des consultations.
       */

      const patientHospitalise =
        {
          ...patientSelectionne,
          statut:
            "Hospitalisé",
          chambre:
            hospitalisation.chambre,
          lit:
            hospitalisation.lit,
          dateAdmission:
            hospitalisation.dateAdmission,
          dateSortie:
            hospitalisation.dateSortie,
        };


      setConsultations(
        (liste) =>
          liste.map(
            (item) =>
              item.id ===
              patientSelectionne.id
                ? patientHospitalise
                : item
          )
      );




      setHospitalisation({
        chambre: "",
        lit: "",
        dateAdmission: "",
        dateSortie: "",
      });


      /*
       * Après validation, le patient est transféré
       * directement vers le module HOSPITALISATION.
       */

      navigate(
        "/hospitalization"
      );

    };


  /*
   * ==========================================================
   * CHANGER STATUT
   * ==========================================================
   */

  const changerStatut = (
    id,
    statut
  ) => {

    setConsultations(
      (liste) =>
        liste.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  statut,
                }
              : item
        )
    );
  };


  /*
   * ==========================================================
   * MODIFICATION FORMULAIRE MÉDICAL
   * ==========================================================
   */

  const handleMedicalChange =
    (event) => {

      const {
        name,
        value,
      } = event.target;

      setFormulaireMedical(
        (current) => ({
          ...current,
          [name]: value,
        })
      );
    };


  /*
   * ==========================================================
   * VALIDER LA CONSULTATION
   * ==========================================================
   */

  const validerConsultation =
    async () => {

      if (
        !patientSelectionne
      ) {
        return;
      }


      if (
        !patientSelectionne.admissionId
      ) {

        alert(
          "Cette consultation n'est rattachée à aucun patient enregistré à la Caisse : elle ne peut pas être validée."
        );

        return;
      }


      /*
       * Le backend clôture la consultation et transmet
       * l'ordonnance (champ Traitement / Prescription,
       * un médicament par ligne) à la Pharmacie.
       */

      let patientMisAJour;

      try {

        const response =
          await api.post(
            `/parcours/consultations/${patientSelectionne.admissionId}/valider/`,
            formulaireMedical
          );

        patientMisAJour =
          response.data;

      } catch (error) {

        alert(
          error.response?.data?.detail ||
            "Impossible de valider la consultation. Veuillez réessayer."
        );

        return;
      }


      setConsultations(
        (liste) =>
          liste.map(
            (item) =>
              item.admissionId ===
              patientMisAJour.admissionId
                ? patientMisAJour
                : item
          )
      );


      window.dispatchEvent(
        new CustomEvent(
          "sante:consultation-updated",
          {
            detail:
              patientMisAJour,
          }
        )
      );


      setPatientSelectionne(
        patientMisAJour
      );


      setFormulaireMedical({
        symptomes: "",
        diagnostic: "",
        traitement: "",
        observations: "",
      });


      setModal(
        "consultation-terminee"
      );
    };


  /*
   * ==========================================================
   * NOUVELLE CONSULTATION
   * ==========================================================
   */

  const enregistrerConsultation =
    (e) => {

      e.preventDefault();


      if (
        !nouvelleConsultation.patient ||
        !nouvelleConsultation.motif ||
        !nouvelleConsultation.heure
      ) {
        return;
      }


      const nouvelle = {

        id: Date.now(),

        numero:
          String(
            consultations.length + 1
          ).padStart(3, "0"),

        patient:
          nouvelleConsultation.patient,

        motif:
          nouvelleConsultation.motif,

        heure:
          nouvelleConsultation.heure,

        statut:
          "À venir",

        age:
          "--",

        sexe:
          "--",

        doctor:
          currentDoctor,

        telephone:
          "",

        parentContact:
          "",

        service:
          "Médecine générale",

        insurance:
          "Non",

        insuranceName:
          "",

        symptomes:
          "",

        diagnostic:
          "",

        traitement:
          "",

        prescription:
          "",

        observations:
          "",

        dateConsultation:
          null,
      };


      setConsultations(
        (liste) => [
          ...liste,
          nouvelle,
        ]
      );


      setNouvelleConsultation({
        patient: "",
        motif: "",
        heure: "",
      });


      setModal(null);
    };


  /*
   * ==========================================================
   * FERMER MODAL
   * ==========================================================
   */

  const fermerModal = () => {

    setModal(null);

    setPatientSelectionne(
      null
    );
  };


  /*
   * ==========================================================
   * AFFICHAGE DATE
   * ==========================================================
   */

  const afficherDateConsultation =
    (date) => {

      if (!date) {
        return "--";
      }

      try {

        return new Date(
          date
        ).toLocaleDateString(
          "fr-FR",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }
        );

      } catch {
        return "--";
      }
    };


  return (

    <div className="consultations-page">


      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside className="medecin-sidebar">


        {/* LOGO */}

        <div className="sidebar-logo">

          <div className="sidebar-heart">

            <Logo
              size={26}
              inverted
            />

          </div>

          <div className="sidebar-brand">

            <strong>
              MA SANTÉ
            </strong>

            <span>
              Gestion de Clinique
            </span>

          </div>

        </div>


        {/* MENU */}

        <nav className="medecin-menu">


          <button
            className={`medecin-menu-item ${
              vueActive === "consultations" &&
              !modal
                ? "active"
                : ""
            }`}
            onClick={() => {

              setVueActive(
                "consultations"
              );

              setModal(null);

              setPatientSelectionne(
                null
              );

            }}
          >

            <span className="menu-icon">
              <Home size={18} strokeWidth={2} aria-hidden="true" />
            </span>

            <span>
              Accueil
            </span>

          </button>


          <button
            className={`medecin-menu-item ${
              vueActive === "patients"
                ? "selected"
                : ""
            }`}
            onClick={() => {

              setVueActive(
                "patients"
              );

              setModal(null);

              setPatientSelectionne(
                null
              );

              setRecherchePatients("");

            }}
          >

            <span className="menu-icon">
              <Users size={18} strokeWidth={2} aria-hidden="true" />
            </span>

            <span>
              Mes patients
            </span>

          </button>


          <button
            className={`medecin-menu-item ${
              vueActive === "consultations"
                ? "selected"
                : ""
            }`}
            onClick={() => {

              setVueActive(
                "consultations"
              );

              setModal(null);

              setPatientSelectionne(
                null
              );

            }}
          >

            <span className="menu-icon">
              <Stethoscope size={18} strokeWidth={2} aria-hidden="true" />
            </span>

            <span>
              Consultations
            </span>

          </button>


          {/* ==================================================
              ORDONNANCES
          ================================================== */}

          <button
            className={`medecin-menu-item ${
              vueActive === "ordonnances"
                ? "selected"
                : ""
            }`}
            onClick={() => {

              setVueActive(
                "ordonnances"
              );

              setModal(null);

              setPatientSelectionne(
                null
              );

            }}
          >

            <span className="menu-icon">
              <ClipboardList size={18} strokeWidth={2} aria-hidden="true" />
            </span>

            <span>
              Ordonnances
            </span>

          </button>


          <button
            className="medecin-menu-item"
            onClick={() =>
              setModal(
                "examens"
              )
            }
          >

            <span className="menu-icon">
              <FlaskConical size={18} strokeWidth={2} aria-hidden="true" />
            </span>

            <span>
              Examens
            </span>

          </button>
          
          <button
            className="medecin-menu-item"
            onClick={() =>
              setModal(
                "messages"
              )
            }
          >

            <span className="menu-icon">
              <MessageSquare size={18} strokeWidth={2} aria-hidden="true" />
            </span>

            <span>
              Messages
            </span>

          </button>

        </nav>


        <SidebarFooter />

      </aside>


      {/* ======================================================
          CONTENU PRINCIPAL
      ====================================================== */}

      <main className="medecin-main">


        {/* HEADER */}

        <header className="medecin-header">

          <div className="header-title">

            <h1>
              Espace Médecin
            </h1>

            <p>
              Gestion des consultations et suivi des patients
            </p>

          </div>


          <div className="ms-header-tools">
            <NotificationBell />

            <div className="doctor-profile">

              <UserBadge />

              <button
                className="profile-arrow"
                title="Profil"
                onClick={() =>
                  setModal(
                    "profil"
                  )
                }
              >
                <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
              </button>

            </div>
          </div>

        </header>


        {/* ====================================================
            PAGE MES PATIENTS
        ==================================================== */}

        {vueActive === "patients" ? (

          <section className="medecin-content">


            {/* EN-TÊTE PAGE */}

            <div className="section-heading">

              <div>

                <h2>
                  Mes patients
                </h2>

                <p>
                  Liste complète des patients déjà consultés
                </p>

              </div>


              <div className="consultation-counter">

                <span>
                  {
                    patientsConsultesFiltres.length
                  }
                </span>

                <small>
                  patients
                </small>

              </div>

            </div>


            {/* BARRE DE RECHERCHE */}

            <div className="consultation-toolbar">

              <div className="search-box">

                <span className="search-icon">
                  <Search size={18} strokeWidth={2} aria-hidden="true" />
                </span>

                <input
                  type="text"
                  placeholder="Rechercher un patient, téléphone, diagnostic..."
                  value={
                    recherchePatients
                  }
                  onChange={(e) =>
                    setRecherchePatients(
                      e.target.value
                    )
                  }
                />


                {recherchePatients && (

                  <button
                    className="clear-search"
                    onClick={() =>
                      setRecherchePatients(
                        ""
                      )
                    }
                  >
                    <X size={16} strokeWidth={2} aria-hidden="true" />
                  </button>

                )}

              </div>


              <button
                className="btn-primary new-consultation-btn"
                onClick={() =>
                  setVueActive(
                    "consultations"
                  )
                }
              >

                <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />

                <span>
                  Retour aux consultations
                </span>

              </button>

            </div>


            {/* STATISTIQUES PATIENTS */}

            <div className="quick-stats">


              <div className="quick-stat">

                <div className="quick-stat-icon blue">
                  <Users size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <div>

                  <strong>
                    {
                      patientsConsultes.length
                    }
                  </strong>

                  <span>
                    Patients consultés
                  </span>

                </div>

              </div>


              <div className="quick-stat">

                <div className="quick-stat-icon green">
                  <UserRound size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <div>

                  <strong>
                    {
                      patientsConsultes.filter(
                        (patient) =>
                          patient.sexe ===
                          "F"
                      ).length
                    }
                  </strong>

                  <span>
                    Patients féminins
                  </span>

                </div>

              </div>


              <div className="quick-stat">

                <div className="quick-stat-icon orange">
                  <UserRound size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <div>

                  <strong>
                    {
                      patientsConsultes.filter(
                        (patient) =>
                          patient.sexe ===
                          "M"
                      ).length
                    }
                  </strong>

                  <span>
                    Patients masculins
                  </span>

                </div>

              </div>


              <div className="quick-stat">

                <div className="quick-stat-icon purple">
                  <FileCheck2 size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <div>

                  <strong>
                    {
                      patientsConsultes.filter(
                        (patient) =>
                          patient.diagnostic
                      ).length
                    }
                  </strong>

                  <span>
                    Dossiers renseignés
                  </span>

                </div>

              </div>

            </div>


            {/* GRANDE CARTE PATIENTS */}

            <div className="consultations-card mes-patients-card">


              <div className="table-header">

                <div>

                  <h3>
                    Liste complète des patients
                  </h3>

                  <span>
                    Patients dont la consultation a été validée
                  </span>

                </div>


                <div className="table-date">

                  {
                    patientsConsultesFiltres.length
                  }{" "}
                  patient
                  {
                    patientsConsultesFiltres.length >
                    1
                      ? "s"
                      : ""
                  }

                </div>

              </div>


              <div className="table-wrapper">

                <table className="consultations-table patients-complete-table">

                  <thead>

                    <tr>

                      <th>
                        Identifiant
                      </th>

                      <th>
                        Patient
                      </th>

                      <th>
                        Sexe
                      </th>

                      <th>
                        Service
                      </th>

                      <th>
                        Téléphone
                      </th>

                      <th>
                        N° parent
                      </th>

                      <th>
                        Diagnostic
                      </th>

                      <th>
                        Date consultation
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {patientsConsultesFiltres.length >
                    0 ? (

                      patientsConsultesFiltres.map(
                        (
                          patient
                        ) => (

                          <tr
                            key={
                              patient.id
                            }
                          >

                            <td className="number-cell">

                              {
                                String(
                                  patient.id
                                ).startsWith(
                                  "PAT-"
                                )
                                  ? patient.id
                                  : `PAT-${String(
                                      patient.numero ||
                                        patient.id
                                    ).padStart(
                                      3,
                                      "0"
                                    )}`
                              }

                            </td>


                            <td>

                              <div className="patient-cell">

                                <div>

                                  <strong>
                                    {
                                      patient.patient
                                    }
                                  </strong>

                                  <small>

                                    {
                                      patient.age !==
                                        "--" &&
                                      patient.age
                                        ? `${patient.age} ans`
                                        : "Âge non renseigné"
                                    }

                                  </small>

                                </div>

                              </div>

                            </td>


                            <td>

                              <span className="motif-text">

                                {
                                  patient.sexe ===
                                  "F"
                                    ? "Féminin"
                                    : patient.sexe ===
                                      "M"
                                    ? "Masculin"
                                    : "--"
                                }

                              </span>

                            </td>


                            <td>

                              <span className="motif-text">

                                {
                                  patient.service ||
                                  "Médecine générale"
                                }

                              </span>

                            </td>


                            <td>

                              <span className="heure-text">

                                {
                                  patient.telephone ||
                                  "--"
                                }

                              </span>

                            </td>


                            <td>

                              <span className="heure-text">

                                {
                                  patient.parentContact ||
                                  "--"
                                }

                              </span>

                            </td>


                            <td>

                              <span
                                className="motif-text"
                                title={
                                  patient.diagnostic ||
                                  "Non renseigné"
                                }
                              >

                                {
                                  patient.diagnostic ||
                                  "Non renseigné"
                                }

                              </span>

                            </td>


                            <td>

                              <span className="heure-text">

                                {
                                  afficherDateConsultation(
                                    patient.dateConsultation
                                  )
                                }

                              </span>

                            </td>


                            <td>

                              <div className="row-actions">

                                <button
                                  type="button"
                                  className="btn-primary"
                                  onClick={() =>
                                    ouvrirConsultation(
                                      patient
                                    )
                                  }
                                >
                                  Modifier
                                </button>

                              </div>

                            </td>

                          </tr>

                        )
                      )

                    ) : (

                      <tr>

                        <td
                          colSpan="9"
                          className="empty-table"
                        >

                          <div className="empty-icon">
                            <Users size={28} strokeWidth={2} aria-hidden="true" />
                          </div>

                          <strong>
                            Aucun patient consulté
                          </strong>

                          <span>
                            Les patients dont les consultations sont validées apparaîtront automatiquement ici.
                          </span>

                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>


              <div className="patients-page-footer">

                <span>

                  Affichage de{" "}
                  <strong>
                    {
                      patientsConsultesFiltres.length
                    }
                  </strong>{" "}
                  patient
                  {
                    patientsConsultesFiltres.length >
                    1
                      ? "s"
                      : ""
                  }

                </span>


                <span>
                  Tous les patients sont enregistrés localement.
                </span>

              </div>

            </div>


          </section>

        ) : vueActive === "ordonnances" ? (

          /* ==================================================
             PAGE ORDONNANCES
          ================================================== */

          <section className="medecin-content ordonnance-page">


            {/* EN-TÊTE */}

            <div className="section-heading">

              <div>

                <h2>
                  Ordonnances
                </h2>

                <p>
                  Prescriptions médicales délivrées aux patients
                </p>

              </div>


              <div className="consultation-counter">

                <span>
                  {
                    patientsAvecOrdonnance.length
                  }
                </span>

                <small>
                  ordonnance
                  {
                    patientsAvecOrdonnance.length >
                    1
                      ? "s"
                      : ""
                  }
                </small>

              </div>

            </div>


            {/* STATISTIQUES */}

            <div className="quick-stats">


              <div className="quick-stat">

                <div className="quick-stat-icon blue">
                  <ClipboardList size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <div>

                  <strong>
                    {
                      patientsAvecOrdonnance.length
                    }
                  </strong>

                  <span>
                    Ordonnances délivrées
                  </span>

                </div>

              </div>


              <div className="quick-stat">

                <div className="quick-stat-icon green">
                  <UserCheck size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <div>

                  <strong>
                    {
                      patientsConsultes.length
                    }
                  </strong>

                  <span>
                    Patients consultés
                  </span>

                </div>

              </div>


              <div className="quick-stat">

                <div className="quick-stat-icon orange">
                  <ClipboardX size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <div>

                  <strong>
                    {
                      patientsConsultes.filter(
                        (patient) =>
                          !(
                            patient.prescription ||
                            patient.traitement ||
                            ""
                          ).trim()
                      ).length
                    }
                  </strong>

                  <span>
                    Sans prescription
                  </span>

                </div>

              </div>


              <div className="quick-stat">

                <div className="quick-stat-icon purple">
                  <CircleCheck size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <div>

                  <strong>
                    {
                      patientsAvecOrdonnance.filter(
                        (patient) =>
                          patient.dateConsultation
                      ).length
                    }
                  </strong>

                  <span>
                    Consultations validées
                  </span>

                </div>

              </div>

            </div>


            {/* CARTE ORDONNANCES */}

            <div className="consultations-card">


              <div className="table-header">

                <div>

                  <h3>
                    Liste des ordonnances
                  </h3>

                  <span>
                    Prescriptions enregistrées lors des consultations
                  </span>

                </div>


                <div className="table-date">

                  {
                    patientsAvecOrdonnance.length
                  }{" "}
                  ordonnance
                  {
                    patientsAvecOrdonnance.length >
                    1
                      ? "s"
                      : ""
                  }

                </div>

              </div>


              <div className="table-wrapper">

                <table className="consultations-table">

                  <thead>

                    <tr>

                      <th>
                        Identifiant
                      </th>

                      <th>
                        Patient
                      </th>

                      <th>
                        Téléphone
                      </th>

                      <th>
                        Service
                      </th>

                      <th>
                        Diagnostic
                      </th>

                      <th>
                        Prescription
                      </th>

                      <th>
                        Date
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {patientsAvecOrdonnance.length >
                    0 ? (

                      patientsAvecOrdonnance.map(
                        (
                          patient
                        ) => {

                          const prescription =
                            patient.prescription ||
                            patient.traitement ||
                            "";

                          return (

                            <tr
                              key={
                                patient.id
                              }
                            >


                              {/* IDENTIFIANT */}

                              <td className="number-cell">

                                {
                                  String(
                                    patient.id
                                  ).startsWith(
                                    "PAT-"
                                  )
                                    ? patient.id
                                    : `PAT-${String(
                                        patient.numero ||
                                          patient.id
                                      ).padStart(
                                        3,
                                        "0"
                                      )}`
                                }

                              </td>


                              {/* PATIENT */}

                              <td>

                                <div className="patient-cell">

                                  <div>

                                    <strong>
                                      {
                                        patient.patient
                                      }
                                    </strong>

                                    <small>

                                      {
                                        patient.age !==
                                          "--" &&
                                        patient.age
                                          ? `${patient.age} ans`
                                          : "Âge non renseigné"
                                      }

                                    </small>

                                  </div>

                                </div>

                              </td>


                              {/* TÉLÉPHONE */}

                              <td>

                                <span className="heure-text">

                                  {
                                    patient.telephone ||
                                    "--"
                                  }

                                </span>

                              </td>


                              {/* SERVICE */}

                              <td>

                                <span className="motif-text">

                                  {
                                    patient.service ||
                                    "Médecine générale"
                                  }

                                </span>

                              </td>


                              {/* DIAGNOSTIC */}

                              <td>

                                <span
                                  className="motif-text"
                                  title={
                                    patient.diagnostic ||
                                    "Non renseigné"
                                  }
                                >

                                  {
                                    patient.diagnostic ||
                                    "Non renseigné"
                                  }

                                </span>

                              </td>


                              {/* PRESCRIPTION */}

                              <td>

                                <div
                                  className="prescription-preview"
                                  title={
                                    prescription
                                  }
                                >

                                  {
                                    prescription.length >
                                    80
                                      ? `${prescription.substring(
                                          0,
                                          80
                                        )}...`
                                      : prescription
                                  }

                                </div>

                              </td>


                              {/* DATE */}

                              <td>

                                <span className="heure-text">

                                  {
                                    afficherDateConsultation(
                                      patient.dateConsultation
                                    )
                                  }

                                </span>

                              </td>


                              {/* ACTION */}

                              <td>

                                <div className="row-actions">

                                  <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => {

                                      setPatientSelectionne(
                                        patient
                                      );

                                      setModal(
                                        "ordonnance"
                                      );

                                    }}
                                  >
                                    Voir
                                  </button>

                                </div>

                              </td>

                            </tr>

                          );
                        }

                      )

                    ) : (

                      <tr>

                        <td
                          colSpan="8"
                          className="empty-table"
                        >

                          <div className="empty-icon">
                            <ClipboardList size={28} strokeWidth={2} aria-hidden="true" />
                          </div>

                          <strong>
                            Aucune ordonnance
                          </strong>

                          <span>
                            Les prescriptions saisies par les médecins lors des consultations apparaîtront automatiquement ici.
                          </span>

                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>


              {/* PIED DE PAGE */}

              <div className="patients-page-footer">

                <span>

                  Affichage de{" "}
                  <strong>
                    {
                      patientsAvecOrdonnance.length
                    }
                  </strong>{" "}
                  ordonnance
                  {
                    patientsAvecOrdonnance.length >
                    1
                      ? "s"
                      : ""
                  }

                </span>


                <span>
                  Les ordonnances sont liées aux consultations validées.
                </span>

              </div>

            </div>


          </section>

        ) : (


          /* ==================================================
             PAGE CONSULTATIONS
          ================================================== */

          <section className="medecin-content">


            {/* TITRE */}

            <div className="section-heading">

              <div>

                <h2>
                  Mes consultations du jour
                </h2>

                <p>
                  Jeudi 17 septembre 2026
                </p>

              </div>


              <div className="consultation-counter">

                <span>
                  {
                    consultationsFiltrees.length
                  }
                </span>

                <small>
                  consultations
                </small>

              </div>

            </div>


            {/* RECHERCHE */}

            <div className="consultation-toolbar">

              <div className="search-box">

                <span className="search-icon">
                  <Search size={18} strokeWidth={2} aria-hidden="true" />
                </span>

                <input
                  type="text"
                  placeholder="Rechercher un patient..."
                  value={
                    recherche
                  }
                  onChange={(e) =>
                    setRecherche(
                      e.target.value
                    )
                  }
                />

                {recherche && (

                  <button
                    className="clear-search"
                    onClick={() =>
                      setRecherche(
                        ""
                      )
                    }
                  >
                    <X size={16} strokeWidth={2} aria-hidden="true" />
                  </button>

                )}

              </div>
            </div>


            {/* STATISTIQUES */}

            <div className="quick-stats">


              <div className="quick-stat">

                <div className="quick-stat-icon blue">
                  <CalendarDays size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <div>

                  <strong>
                    {
                      consultationsFiltrees.length
                    }
                  </strong>

                  <span>
                    Total aujourd'hui
                  </span>

                </div>

              </div>


              <div className="quick-stat">

                <div className="quick-stat-icon green">
                  <Activity size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <div>

                  <strong>
                    {
                      patientsDuMedecin.filter(
                        (c) =>
                          c.statut ===
                          "En cours"
                      ).length
                    }
                  </strong>

                  <span>
                    En cours
                  </span>

                </div>

              </div>


              <div className="quick-stat">

                <div className="quick-stat-icon orange">
                  <Hourglass size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <div>

                  <strong>
                    {
                      patientsDuMedecin.filter(
                        (c) =>
                          c.statut ===
                          "En attente"
                      ).length
                    }
                  </strong>

                  <span>
                    En attente
                  </span>

                </div>

              </div>


              <div className="quick-stat">

                <div className="quick-stat-icon purple">
                  <Clock3 size={20} strokeWidth={2} aria-hidden="true" />
                </div>

                <div>

                  <strong>
                    {
                      patientsDuMedecin.filter(
                        (c) =>
                          c.statut ===
                          "À venir"
                      ).length
                    }
                  </strong>

                  <span>
                    À venir
                  </span>

                </div>

              </div>

            </div>


            {/* TABLEAU */}

            <div className="consultations-card">

              <div className="table-header">

                <div>

                  <h3>
                    Liste des consultations
                  </h3>

                  <span>
                    Planning médical du jour
                  </span>

                </div>


                <div className="table-date">
                  Aujourd'hui
                </div>

              </div>


              <div className="table-wrapper">

                <table className="consultations-table">

                  <thead>

                    <tr>

                      <th>
                        Identifiant
                      </th>

                      <th>
                        Patient
                      </th>

                      <th>
                        Sexe
                      </th>

                      <th>
                        Service
                      </th>

                      <th>
                        Téléphone
                      </th>

                      <th>
                        N° parent
                      </th>

                      <th>
                        Assurance
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {consultationsFiltrees.length >
                    0 ? (

                      consultationsFiltrees.map(
                        (
                          consultation
                        ) => (

                          <tr
                            key={
                              consultation.id
                            }
                            onDoubleClick={() =>
                              ouvrirConsultation(
                                consultation
                              )
                            }
                          >

                            <td className="number-cell">

                              {
                                String(
                                  consultation.id
                                ).startsWith("PAT-")
                                  ? consultation.id
                                  : `PAT-${String(
                                      consultation.numero ||
                                        consultation.id
                                    ).padStart(
                                      3,
                                      "0"
                                    )}`
                              }

                            </td>


                            <td>

                              <div className="patient-cell">

                                <div>

                                  <strong>
                                    {
                                      consultation.patient
                                    }
                                  </strong>

                                  <small>

                                    {
                                      consultation.age !==
                                        "--" &&
                                      consultation.age
                                        ? `${consultation.age} ans`
                                        : "Patient"
                                    }

                                  </small>

                                </div>

                              </div>

                            </td>


                            <td>

                              <span className="motif-text">

                                {
                                  consultation.sexe ===
                                  "F"
                                    ? "Féminin"
                                    : consultation.sexe ===
                                      "M"
                                    ? "Masculin"
                                    : "--"
                                }

                              </span>

                            </td>


                            <td>

                              <span className="motif-text">

                                {
                                  consultation.service ||
                                  "Médecine générale"
                                }

                              </span>

                            </td>


                            <td>

                              <span className="heure-text">

                                {
                                  consultation.telephone ||
                                  "--"
                                }

                              </span>

                            </td>


                            <td>

                              <span className="heure-text">

                                {
                                  consultation.parentContact ||
                                  "--"
                                }

                              </span>

                            </td>


                            <td>

                              <span className="motif-text">

                                {
                                  consultation.insuranceName ||
                                  consultation.insurance ||
                                  "Non"
                                }

                              </span>

                            </td>


                            <td>

                              <div className="row-actions">

                                <button
                                  type="button"
                                  className="btn-primary"
                                  onClick={() =>
                                    ouvrirConsultation(
                                      consultation
                                    )
                                  }
                                >
                                  Consulter
                                </button>


                                <button
                                  type="button"
                                  className="btn-rdv"
                                  onClick={(e) => {

                                    e.stopPropagation();

                                    ouvrirRendezVous(
                                      consultation
                                    );

                                  }}
                                >
                                  RDV
                                </button>


                                <button
                                  type="button"
                                  className="btn-hospitaliser"
                                  onClick={(e) => {

                                    e.stopPropagation();

                                    ouvrirHospitalisation(
                                      consultation
                                    );

                                  }}
                                >
                                  Hospitaliser
                                </button>

                              </div>

                            </td>

                          </tr>

                        )
                      )

                    ) : (

                      <tr>

                        <td
                          colSpan="8"
                          className="empty-table"
                        >

                          <div className="empty-icon">
                            <Search size={28} strokeWidth={2} aria-hidden="true" />
                          </div>

                          <strong>
                            Aucun patient trouvé
                          </strong>

                          <span>
                            Essayez une autre recherche.
                          </span>

                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>


              {/* ACTIONS RAPIDES */}

              <div className="quick-actions">


                <button
                  className="quick-action-btn"
                  onClick={() =>
                    setModal(
                      "patient"
                    )
                  }
                >

                  <span className="action-icon blue-icon">
                    <UserPlus size={18} strokeWidth={2} aria-hidden="true" />
                  </span>

                  <span>
                    Nouveau patient
                  </span>

                </button>


                <button
                  className="quick-action-btn"
                  onClick={() => {

                    if (
                      consultationsFiltrees.length >
                      0
                    ) {

                      setPatientSelectionne(
                        consultationsFiltrees[0]
                      );

                    }

                    setModal(
                      "dossier"
                    );

                  }}
                >

                  <span className="action-icon blue-icon">
                    <FolderOpen size={18} strokeWidth={2} aria-hidden="true" />
                  </span>

                  <span>
                    Dossier patient
                  </span>

                </button>


                {/* ==================================================
                    ACCÈS DIRECT AUX ORDONNANCES
                ================================================== */}

                <button
                  className="quick-action-btn"
                  onClick={() => {

                    setVueActive(
                      "ordonnances"
                    );

                    setModal(null);

                    setPatientSelectionne(
                      null
                    );

                  }}
                >

                  <span className="action-icon blue-icon">
                    <ClipboardList size={18} strokeWidth={2} aria-hidden="true" />
                  </span>

                  <span>
                    Ordonnances
                  </span>

                </button>


                <button
                  className="quick-action-btn"
                  onClick={() => {

                    if (
                      consultationsFiltrees.length >
                      0
                    ) {

                      setPatientSelectionne(
                        consultationsFiltrees[0]
                      );

                    }

                    setModal(
                      "compte-rendu"
                    );

                  }}
                >

                  <span className="action-icon blue-icon">
                    <FileText size={18} strokeWidth={2} aria-hidden="true" />
                  </span>

                  <span>
                    Compte rendu
                  </span>

                </button>

              </div>

            </div>


            {/* INFORMATIONS */}

            <div className="bottom-info-grid">


              <div className="info-card">

                <div className="info-card-title">

                  <span className="info-title-icon">
                    <Info size={18} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>
                      Informations du jour
                    </h3>
                    <p>
                      Votre activité médicale
                    </p>

                  </div>

                </div>

                <div className="info-list">
                  <div className="info-row">
                    <span>
                      Patients reçus
                    </span>
                    <strong>
                      {
                        patientsDuMedecin.filter(
                          (c) =>
                            c.statut ===
                            "Terminée"
                        ).length
                      }
                    </strong>

                  </div>

                  <div className="info-row">
                    <span>
                      Consultations terminées
                    </span>

                    <strong>
                      {
                        patientsDuMedecin.filter(
                          (c) =>
                            c.statut ===
                            "Terminée"
                        ).length
                      }
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

      </main>


      {/* ======================================================
          NOUVELLE CONSULTATION
      ====================================================== */}

      {modal ===
        "nouvelle" && (

        <Modal
          title="Nouvelle consultation"
          subtitle="Créer une nouvelle consultation médicale"
          onClose={
            fermerModal
          }
        >

          <form
            className="modal-form"
            onSubmit={
              enregistrerConsultation
            }
          >

            <div className="form-group">

              <label>
                Patient
              </label>

              <input
                type="text"
                placeholder="Nom du patient"
                value={
                  nouvelleConsultation.patient
                }
                onChange={(e) =>
                  setNouvelleConsultation(
                    {
                      ...nouvelleConsultation,
                      patient:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </div>


            <div className="form-group">

              <label>
                Motif de consultation
              </label>

              <input
                type="text"
                placeholder="Ex : Fièvre, contrôle..."
                value={
                  nouvelleConsultation.motif
                }
                onChange={(e) =>
                  setNouvelleConsultation(
                    {
                      ...nouvelleConsultation,
                      motif:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </div>


            <div className="form-group">

              <label>
                Heure
              </label>

              <input
                type="time"
                value={
                  nouvelleConsultation.heure
                }
                onChange={(e) =>
                  setNouvelleConsultation(
                    {
                      ...nouvelleConsultation,
                      heure:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </div>


            <div className="modal-actions">

              <button
                type="button"
                className="btn-cancel"
                onClick={
                  fermerModal
                }
              >
                Annuler
              </button>

              <button
                type="submit"
                className="btn-primary"
              >
                Enregistrer
              </button>

            </div>

          </form>

        </Modal>

      )}


      {/* ======================================================
          CONSULTATION MÉDECINE GÉNÉRALE
      ====================================================== */}

      {modal ===
        "consultation" &&
        patientSelectionne && (

        <Modal
          title="Consultation de médecine générale"
          subtitle={`Patient : ${patientSelectionne.patient}`}
          onClose={
            fermerModal
          }
          large
        >

          <div className="consultation-detail">


            <div className="patient-summary">

              <div className="large-patient-avatar">

                {patientSelectionne.patient
                  .charAt(0)
                  .toUpperCase()}

              </div>


              <div>

                <h3>
                  {
                    patientSelectionne.patient
                  }
                </h3>

                <p>

                  {
                    patientSelectionne.sexe ===
                    "F"
                      ? "Femme"
                      : patientSelectionne.sexe ===
                        "M"
                      ? "Homme"
                      : "Sexe non renseigné"
                  }

                  {" • "}

                  {
                    patientSelectionne.telephone ||
                    "Téléphone non renseigné"
                  }

                </p>

              </div>

            </div>


            <div className="detail-grid">

              <div className="detail-box">

                <span>
                  Heure
                </span>

                <strong>
                  {
                    patientSelectionne.heure ||
                    "--:--"
                  }
                </strong>

              </div>


              <div className="detail-box">

                <span>
                  Service
                </span>

                <strong>
                  {
                    patientSelectionne.service ||
                    "Médecine générale"
                  }
                </strong>

              </div>


              <div className="detail-box">

                <span>
                  Statut
                </span>

                <strong>
                  {
                    patientSelectionne.statut
                  }
                </strong>

              </div>

            </div>


            <div className="medical-section">

              <h4>
                Consultation de médecine générale
              </h4>


              <div className="form-group">

                <label>
                  Symptômes
                </label>

                <textarea
                  name="symptomes"
                  rows="4"
                  placeholder="Décrire les symptômes du patient..."
                  value={
                    formulaireMedical.symptomes
                  }
                  onChange={
                    handleMedicalChange
                  }
                />

              </div>


              <div className="form-group">

                <label>
                  Diagnostic
                </label>

                <textarea
                  name="diagnostic"
                  rows="4"
                  placeholder="Saisir le diagnostic médical..."
                  value={
                    formulaireMedical.diagnostic
                  }
                  onChange={
                    handleMedicalChange
                  }
                />

              </div>


              <div className="form-group">

                <label>
                  Traitement / Prescription
                </label>

                <textarea
                  name="traitement"
                  rows="4"
                  placeholder="Indiquer le traitement ou la prescription..."
                  value={
                    formulaireMedical.traitement
                  }
                  onChange={
                    handleMedicalChange
                  }
                />

              </div>


              <div className="form-group">

                <label>
                  Observations médicales
                </label>

                <textarea
                  name="observations"
                  rows="4"
                  placeholder="Observations complémentaires..."
                  value={
                    formulaireMedical.observations
                  }
                  onChange={
                    handleMedicalChange
                  }
                />

              </div>

            </div>


            <div className="modal-actions">

              <button
                type="button"
                className="btn-cancel"
                onClick={
                  fermerModal
                }
              >
                Annuler
              </button>


              <button
                type="button"
                className="btn-primary"
                onClick={
                  validerConsultation
                }
              >
                VALIDER
              </button>

            </div>

          </div>

        </Modal>

      )}


      {/* ======================================================
          CONSULTATION TERMINÉE
      ====================================================== */}

      {modal ===
        "consultation-terminee" &&
        patientSelectionne && (

        <Modal
          title="Consultation terminée"
          subtitle={`Dossier de ${patientSelectionne.patient}`}
          onClose={
            fermerModal
          }
        >

          <div className="placeholder-modal">

            <div className="placeholder-modal-icon">
              <Check size={30} strokeWidth={2} aria-hidden="true" />
            </div>

            <h3>
              Consultation validée
            </h3>

            <p>
              La consultation de médecine générale de{" "}
              <strong>
                {
                  patientSelectionne.patient
                }
              </strong>{" "}
              a été enregistrée avec succès.
            </p>

            <p>
              Statut :{" "}
              <strong>
                Terminée
              </strong>
            </p>

            {
              (
                patientSelectionne.prescription ||
                patientSelectionne.traitement ||
                ""
              ).trim() !== "" && (

                <p>
                  Une ordonnance a également été enregistrée dans l'onglet{" "}
                  <strong>
                    Ordonnances
                  </strong>.
                </p>

              )
            }


            <div className="modal-actions">

              <button
                type="button"
                className="btn-cancel"
                onClick={
                  fermerModal
                }
              >
                Fermer
              </button>


              <button
                type="button"
                className="btn-primary"
                onClick={() => {

                  setModal(
                    "ordonnance"
                  );

                }}
              >
                Voir l'ordonnance
              </button>


              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  ouvrirRendezVous(
                    patientSelectionne
                  )
                }
              >
                Donner un rendez-vous
              </button>

            </div>

          </div>

        </Modal>

      )}


      {/* ======================================================
          FORMULAIRE RENDEZ-VOUS
      ====================================================== */}

      {modal ===
        "rendezvous-form" &&
        patientSelectionne && (

        <Modal
          title="Nouveau rendez-vous"
          subtitle={`Patient : ${patientSelectionne.patient}`}
          onClose={
            fermerModal
          }
        >

          <form
            className="modal-form"
            onSubmit={
              enregistrerRendezVous
            }
          >


            <div className="patient-summary">

              <div className="large-patient-avatar">

                {
                  patientSelectionne.patient
                    ?.charAt(0)
                    .toUpperCase()
                }

              </div>


              <div>

                <h3>
                  {
                    patientSelectionne.patient
                  }
                </h3>

                <p>

                  {
                    patientSelectionne.service ||
                    "Médecine générale"
                  }

                  {" • "}

                  {
                    patientSelectionne.telephone ||
                    "Téléphone non renseigné"
                  }

                </p>

              </div>

            </div>


            <div className="form-group">

              <label>
                Date du rendez-vous
              </label>

              <input
                type="date"
                value={
                  rendezVous.date
                }
                onChange={(e) =>
                  setRendezVous({
                    ...rendezVous,
                    date:
                      e.target.value,
                  })
                }
                required
              />

            </div>


            <div className="form-group">

              <label>
                Heure du rendez-vous
              </label>

              <input
                type="time"
                value={
                  rendezVous.heure
                }
                onChange={(e) =>
                  setRendezVous({
                    ...rendezVous,
                    heure:
                      e.target.value,
                  })
                }
                required
              />

            </div>


            <div className="form-group">

              <label>
                Motif du rendez-vous
              </label>

              <textarea
                rows="4"
                placeholder="Ex : Contrôle médical, suivi du traitement..."
                value={
                  rendezVous.motif
                }
                onChange={(e) =>
                  setRendezVous({
                    ...rendezVous,
                    motif:
                      e.target.value,
                  })
                }
              />

            </div>


            <div className="modal-actions">

              <button
                type="button"
                className="btn-cancel"
                onClick={
                  fermerModal
                }
              >
                Annuler
              </button>


              <button
                type="submit"
                className="btn-primary"
              >
                Enregistrer le rendez-vous
              </button>

            </div>

          </form>

        </Modal>

      )}


      {/* ======================================================
          FORMULAIRE HOSPITALISATION
      ====================================================== */}

      {modal ===
        "hospitalisation-form" &&
        patientSelectionne && (

        <Modal
          title="Hospitaliser le patient"
          subtitle={`Patient : ${patientSelectionne.patient}`}
          onClose={
            fermerModal
          }
          large
        >

          <form
            className="modal-form"
            onSubmit={
              enregistrerHospitalisation
            }
          >

            <div className="patient-summary">

              <div className="large-patient-avatar">

                {
                  patientSelectionne.patient
                    ?.charAt(0)
                    .toUpperCase()
                }

              </div>


              <div>

                <h3>
                  {
                    patientSelectionne.patient
                  }
                </h3>

                <p>

                  {
                    patientSelectionne.service ||
                    "Médecine générale"
                  }

                  {" • "}

                  {
                    patientSelectionne.telephone ||
                    "Téléphone non renseigné"
                  }

                </p>

              </div>

            </div>


            <div className="detail-grid">

              <div className="detail-box">

                <span>
                  Identifiant
                </span>

                <strong>
                  {
                    String(
                      patientSelectionne.id
                    ).startsWith("PAT-")
                      ? patientSelectionne.id
                      : `PAT-${String(
                          patientSelectionne.numero ||
                          patientSelectionne.id
                        ).padStart(
                          3,
                          "0"
                        )}`
                  }
                </strong>

              </div>


              <div className="detail-box">

                <span>
                  Service
                </span>

                <strong>
                  {
                    patientSelectionne.service ||
                    "Médecine générale"
                  }
                </strong>

              </div>


              <div className="detail-box">

                <span>
                  Diagnostic
                </span>

                <strong>
                  {
                    patientSelectionne.diagnostic ||
                    "Non renseigné"
                  }
                </strong>

              </div>

            </div>


            <div className="medical-section">

              <h4>
                Informations d'hospitalisation
              </h4>


              <div className="form-row">

                <div className="form-group">

                  <label>
                    Numéro de la chambre
                  </label>

                  <input
                    type="text"
                    placeholder="Ex : CH-101"
                    value={
                      hospitalisation.chambre
                    }
                    onChange={(e) =>
                      setHospitalisation({
                        ...hospitalisation,
                        chambre:
                          e.target.value,
                      })
                    }
                    required
                  />

                </div>


                <div className="form-group">

                  <label>
                    Numéro du lit
                  </label>

                  <input
                    type="text"
                    placeholder="Ex : L-02"
                    value={
                      hospitalisation.lit
                    }
                    onChange={(e) =>
                      setHospitalisation({
                        ...hospitalisation,
                        lit:
                          e.target.value,
                      })
                    }
                    required
                  />

                </div>

              </div>


              <div className="form-row">

                <div className="form-group">

                  <label>
                    Date d'admission
                  </label>

                  <input
                    type="date"
                    value={
                      hospitalisation.dateAdmission
                    }
                    readOnly
                  />

                  <small>
                    La date d'admission est renseignée automatiquement.
                  </small>

                </div>


                <div className="form-group">

                  <label>
                    Date de sortie prévue
                  </label>

                  <input
                    type="date"
                    value={
                      hospitalisation.dateSortie
                    }
                    min={
                      hospitalisation.dateAdmission
                    }
                    onChange={(e) =>
                      setHospitalisation({
                        ...hospitalisation,
                        dateSortie:
                          e.target.value,
                      })
                    }
                    required
                  />

                </div>

              </div>

            </div>


            <div className="modal-actions">

              <button
                type="button"
                className="btn-cancel"
                onClick={
                  fermerModal
                }
              >
                Annuler
              </button>


              <button
                type="submit"
                className="btn-primary"
              >
                Valider l'hospitalisation
              </button>

            </div>

          </form>

        </Modal>

      )}


      {/* ======================================================
          RENDEZ-VOUS ENREGISTRÉ
      ====================================================== */}

      {modal ===
        "rendezvous-confirme" &&
        patientSelectionne && (

        <Modal
          title="Rendez-vous enregistré"
          subtitle={`Patient : ${patientSelectionne.patient}`}
          onClose={
            fermerModal
          }
        >

          <div className="placeholder-modal">

            <div className="placeholder-modal-icon">
              <Check size={30} strokeWidth={2} aria-hidden="true" />
            </div>

            <h3>
              Rendez-vous programmé
            </h3>

            <p>
              Le rendez-vous de{" "}
              <strong>
                {
                  patientSelectionne.patient
                }
              </strong>{" "}
              a été enregistré avec succès.
            </p>

            <p>
              Le rendez-vous a été transmis au module{" "}
              <strong>
                Rendez-vous
              </strong>.
            </p>


            <button
              type="button"
              className="btn-primary"
              onClick={
                fermerModal
              }
            >
              Fermer
            </button>

          </div>

        </Modal>

      )}


      {/* ======================================================
          DOSSIER PATIENT
      ====================================================== */}

      {modal ===
        "dossier" &&
        patientSelectionne && (

        <Modal
          title="Dossier patient"
          subtitle={
            patientSelectionne.patient
          }
          onClose={
            fermerModal
          }
          large
        >

          <div className="patient-file">

            <div className="file-header">

              <div className="large-patient-avatar">

                {
                  patientSelectionne.patient.charAt(
                    0
                  )
                }

              </div>


              <div>

                <h3>
                  {
                    patientSelectionne.patient
                  }
                </h3>

                <span>
                  Dossier médical
                </span>

              </div>

            </div>


            <div className="file-sections">

              <div className="file-section">

                <h4>
                  Informations personnelles
                </h4>

                <p>
                  Téléphone :{" "}
                  {
                    patientSelectionne.telephone ||
                    "Non renseigné"
                  }
                </p>

                <p>
                  Sexe :{" "}
                  {
                    patientSelectionne.sexe ===
                    "F"
                      ? "Féminin"
                      : patientSelectionne.sexe ===
                        "M"
                      ? "Masculin"
                      : "Non renseigné"
                  }
                </p>

                <p>
                  Quartier :{" "}
                  {
                    patientSelectionne.quartier ||
                    "Non renseigné"
                  }
                </p>

              </div>


              <div className="file-section">

                <h4>
                  Dernière consultation
                </h4>

                <p>
                  Motif :{" "}
                  {
                    patientSelectionne.motif
                  }
                </p>

                <p>
                  Diagnostic :{" "}
                  {
                    patientSelectionne.diagnostic ||
                    "Non renseigné"
                  }
                </p>

                <p>
                  Statut :{" "}
                  {
                    patientSelectionne.statut
                  }
                </p>

              </div>

            </div>


            <div className="modal-actions">

              <button
                className="btn-cancel"
                onClick={
                  fermerModal
                }
              >
                Fermer le dossier
              </button>

            </div>

          </div>

        </Modal>

      )}


      {/* ======================================================
          ORDONNANCE MÉDICALE
      ====================================================== */}

      {modal ===
        "ordonnance" &&
        patientSelectionne && (

        <Modal
          title="Ordonnance médicale"
          subtitle={`Patient : ${patientSelectionne.patient}`}
          onClose={
            fermerModal
          }
          large
        >

          <div className="patient-file">


            {/* EN-TÊTE PATIENT */}

            <div className="file-header">

              <div className="large-patient-avatar">

                {
                  patientSelectionne.patient
                    ?.charAt(0)
                    .toUpperCase()
                }

              </div>


              <div>

                <h3>
                  {
                    patientSelectionne.patient
                  }
                </h3>

                <span>
                  Ordonnance médicale
                </span>

              </div>

            </div>


            {/* INFORMATIONS */}

            <div className="file-sections">


              <div className="file-section">

                <h4>
                  Informations du patient
                </h4>

                <p>

                  Identifiant :{" "}

                  <strong>

                    {
                      String(
                        patientSelectionne.id
                      ).startsWith(
                        "PAT-"
                      )
                        ? patientSelectionne.id
                        : `PAT-${String(
                            patientSelectionne.numero ||
                              patientSelectionne.id
                          ).padStart(
                            3,
                            "0"
                          )}`

                    }

                  </strong>

                </p>


                <p>

                  Téléphone :{" "}

                  {
                    patientSelectionne.telephone ||
                    "Non renseigné"
                  }

                </p>


                <p>

                  Service :{" "}

                  {
                    patientSelectionne.service ||
                    "Médecine générale"
                  }

                </p>

              </div>


              <div className="file-section">

                <h4>
                  Consultation
                </h4>

                <p>

                  Diagnostic :{" "}

                  {
                    patientSelectionne.diagnostic ||
                    "Non renseigné"
                  }

                </p>


                <p>

                  Date :{" "}

                  {
                    afficherDateConsultation(
                      patientSelectionne.dateConsultation
                    )
                  }

                </p>


                <p>

                  Médecin :{" "}

                  {
                    patientSelectionne.doctor ||
                    currentDoctor
                  }

                </p>

              </div>

            </div>


            {/* PRESCRIPTION */}

            <div className="medical-section">

              <h4>
                Prescription médicale
              </h4>


              <div className="prescription-content">

                {
                  patientSelectionne.prescription ||
                  patientSelectionne.traitement ||
                  "Aucune prescription renseignée."
                }

              </div>

            </div>


            {/* ACTIONS */}

            <div className="modal-actions">

              <button
                type="button"
                className="btn-cancel"
                onClick={
                  fermerModal
                }
              >
                Fermer
              </button>


              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  window.print()
                }
              >
                Imprimer l'ordonnance
              </button>

            </div>

          </div>

        </Modal>

      )}


      {/* ======================================================
          COMPTE RENDU
      ====================================================== */}

      {modal ===
        "compte-rendu" && (

        <Modal
          title="Compte rendu médical"
          subtitle={
            patientSelectionne
              ? `Patient : ${patientSelectionne.patient}`
              : "Compte rendu"
          }
          onClose={
            fermerModal
          }
          large
        >

          <div className="modal-form">

            <div className="form-group">

              <label>
                Diagnostic
              </label>

              <input
                type="text"
                placeholder="Diagnostic médical"
              />

            </div>


            <div className="form-group">

              <label>
                Observations
              </label>

              <textarea
                rows="5"
                placeholder="Observations médicales..."
              />

            </div>


            <div className="form-group">

              <label>
                Recommandations
              </label>

              <textarea
                rows="4"
                placeholder="Traitement et recommandations..."
              />

            </div>


            <div className="modal-actions">

              <button
                className="btn-cancel"
                onClick={
                  fermerModal
                }
              >
                Annuler
              </button>

              <button
                className="btn-primary"
                onClick={
                  fermerModal
                }
              >
                Enregistrer le compte rendu
              </button>

            </div>

          </div>

        </Modal>

      )}


      {/* ======================================================
          NOUVEAU PATIENT
      ====================================================== */}

      {modal ===
        "patient" && (

        <Modal
          title="Nouveau patient"
          subtitle="Créer le dossier d'un nouveau patient"
          onClose={
            fermerModal
          }
        >

          <div className="modal-form">

            <div className="form-group">

              <label>
                Nom complet
              </label>

              <input
                type="text"
                placeholder="Nom et prénom"
              />

            </div>


            <div className="form-row">

              <div className="form-group">

                <label>
                  Date de naissance
                </label>

                <input type="date" />

              </div>


              <div className="form-group">

                <label>
                  Sexe
                </label>

                <select>

                  <option value="">
                    Sélectionner
                  </option>

                  <option value="F">
                    Féminin
                  </option>

                  <option value="M">
                    Masculin
                  </option>

                </select>

              </div>

            </div>


            <div className="form-group">

              <label>
                Téléphone
              </label>

              <input
                type="tel"
                placeholder="+225 XX XX XX XX XX"
              />

            </div>


            <div className="modal-actions">

              <button
                className="btn-cancel"
                onClick={
                  fermerModal
                }
              >
                Annuler
              </button>

              <button
                className="btn-primary"
                onClick={
                  fermerModal
                }
              >
                Créer le patient
              </button>

            </div>

          </div>

        </Modal>

      )}


      {/* ======================================================
          MODULES EN PRÉPARATION
      ====================================================== */}

      {[
        "examens",
        "rendezvous",
        "messages",
        "profil",
      ].includes(modal) && (

        <Modal
          title={
            getModalTitle(
              modal
            )
          }
          subtitle="Cette fonctionnalité sera connectée au module correspondant."
          onClose={
            fermerModal
          }
        >

          <div className="placeholder-modal">

            <div className="placeholder-modal-icon">
              <Wrench size={28} strokeWidth={2} aria-hidden="true" />
            </div>

            <h3>
              Module en préparation
            </h3>

            <p>
              Cette partie sera développée lorsque nous créerons le module correspondant.
            </p>

            <button
              className="btn-cancel"
              onClick={
                fermerModal
              }
            >
              Fermer
            </button>

          </div>

        </Modal>

      )}

    </div>
  );
}


/*
 * ============================================================
 * COMPOSANT MODAL
 * ============================================================
 */

function Modal({
  title,
  subtitle,
  children,
  onClose,
  large = false,
}) {

  return (

    <div
      className="modal-overlay"
      onMouseDown={(e) => {

        if (
          e.target ===
          e.currentTarget
        ) {
          onClose();
        }

      }}
    >

      <div
        className={`modal-container ${
          large
            ? "modal-large"
            : ""
        }`}
      >

        <div className="modal-header">

          <div>

            <h2>
              {title}
            </h2>

            <p>
              {subtitle}
            </p>

          </div>


          <button
            className="modal-close"
            onClick={
              onClose
            }
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>

        </div>


        <div className="modal-body">

          {children}

        </div>

      </div>

    </div>

  );
}


/*
 * ============================================================
 * CLASSE STATUT
 * ============================================================
 */

function getStatusClass(
  statut
) {

  switch (statut) {

    case "En cours":
      return "status-progress";

    case "En attente":
      return "status-waiting";

    case "À venir":
      return "status-coming";

    case "Terminée":
      return "status-done";

    default:
      return "";

  }

}


/*
 * ============================================================
 * TITRES DES MODALES
 * ============================================================
 */

function getModalTitle(
  modal
) {

  const titres = {

    examens:
      "Examens médicaux",

    rendezvous:
      "Rendez-vous",

    messages:
      "Messages",

    profil:
      "Mon profil",

  };

  return (
    titres[modal] ||
    "Module"
  );
}