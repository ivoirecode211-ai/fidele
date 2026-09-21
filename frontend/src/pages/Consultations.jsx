import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import Logo from "../components/Logo";

import "../styles/Consultations.css";


/*
 * ============================================================
 * CONSULTATIONS INITIALES
 * ============================================================
 */

const consultationsInitiales = [
  {
    id: 1,
    numero: "001",
    patient: "TRAORE Awa",
    motif: "Fièvre",
    heure: "08:30",
    statut: "En cours",
    age: 36,
    sexe: "F",
    doctor: "Dr. KOUAME",
  },

  {
    id: 2,
    numero: "002",
    patient: "KONE Ibrahim",
    motif: "Contrôle",
    heure: "09:00",
    statut: "En attente",
    age: 42,
    sexe: "M",
    doctor: "Dr. BAH",
  },

  {
    id: 3,
    numero: "003",
    patient: "DIALLO Mariam",
    motif: "Douleur abdominale",
    heure: "09:30",
    statut: "En attente",
    age: 29,
    sexe: "F",
    doctor: "Dr. KONE",
  },

  {
    id: 4,
    numero: "004",
    patient: "YAO Claude",
    motif: "Hypertension",
    heure: "10:00",
    statut: "À venir",
    age: 55,
    sexe: "M",
    doctor: "Dr. KOUAME",
  },

  {
    id: 5,
    numero: "005",
    patient: "N'GUESSAN Marie",
    motif: "Suivi grossesse",
    heure: "10:30",
    statut: "À venir",
    age: 31,
    sexe: "F",
    doctor: "Dr. KOUAME",
  },
];


/*
 * ============================================================
 * RÉCUPÉRATION DES PATIENTS VENANT DE LA CAISSE
 * ============================================================
 */

function getPatientsFromCaisse() {
  try {
    return JSON.parse(
      localStorage.getItem(
        "sante_consultation_patients"
      ) || "[]"
    );
  } catch (error) {
    console.error(
      "Erreur de récupération des patients :",
      error
    );

    return [];
  }
}


/*
 * ============================================================
 * NORMALISATION DU NOM DU MÉDECIN
 * ============================================================
 *
 * Exemple :
 *
 * Dr. KOUAME
 * Dr. KOUAME Jean
 *
 * deviennent :
 *
 * kouame
 *
 * Cela permet de faire correspondre le médecin
 * sélectionné à la caisse avec le médecin connecté.
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
    logout,
  } = useAuth();

  const navigate =
    useNavigate();


  /*
   * ==========================================================
   * MÉDECIN CONNECTÉ
   * ==========================================================
   *
   * Pour le moment le médecin affiché dans ton interface est
   * Dr. KOUAME Jean.
   *
   * Plus tard cette valeur viendra automatiquement de
   * AuthContext / Django.
   */

  const currentDoctor =
    "Dr. KOUAME Jean";


  /*
   * ==========================================================
   * ÉTATS
   * ==========================================================
   */

  const [
    consultations,
    setConsultations,
  ] = useState(() => {

    const patientsCaisse =
      getPatientsFromCaisse();

    const patientsSansDoublons =
      patientsCaisse.filter(
        (patient) =>
          !consultationsInitiales.some(
            (consultation) =>
              consultation.id ===
              patient.id
          )
      );

    return [
      ...consultationsInitiales,
      ...patientsSansDoublons,
    ];
  });


  const [
    recherche,
    setRecherche,
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
   * SYNCHRONISATION AVEC LA CAISSE
   * ==========================================================
   */

  useEffect(() => {

    const synchroniserPatientsCaisse =
      () => {

        const patientsCaisse =
          getPatientsFromCaisse();

        setConsultations(
          (listeActuelle) => {

            const nouvellesConsultations =
              patientsCaisse.filter(
                (patient) =>
                  !listeActuelle.some(
                    (consultation) =>
                      consultation.id ===
                      patient.id
                  )
              );

            if (
              nouvellesConsultations.length ===
              0
            ) {
              return listeActuelle;
            }

            return [
              ...listeActuelle,
              ...nouvellesConsultations,
            ];
          }
        );
      };


    /*
     * Synchronisation au chargement
     */

    synchroniserPatientsCaisse();


    /*
     * Événement personnalisé envoyé par Caisse.jsx
     */

    window.addEventListener(
      "sante:patient-added",
      synchroniserPatientsCaisse
    );


    /*
     * Événement storage
     */

    window.addEventListener(
      "storage",
      synchroniserPatientsCaisse
    );


    return () => {

      window.removeEventListener(
        "sante:patient-added",
        synchroniserPatientsCaisse
      );

      window.removeEventListener(
        "storage",
        synchroniserPatientsCaisse
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

          /*
           * Les consultations initiales sont conservées.
           */

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
   * RECHERCHE
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
          consultation.patient
            .toLowerCase()
            .includes(texte) ||

          consultation.motif
            .toLowerCase()
            .includes(texte) ||

          consultation.statut
            .toLowerCase()
            .includes(texte)
      );

    }, [
      recherche,
      patientsDuMedecin,
    ]);


  /*
   * ==========================================================
   * DÉCONNEXION
   * ==========================================================
   */

  function handleLogout() {

    logout();

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  }


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


      /*
       * Charger les éventuelles données médicales
       * déjà enregistrées.
       */

      setFormulaireMedical({
        symptomes:
          consultation.symptomes ||
          "",

        diagnostic:
          consultation.diagnostic ||
          "",

        traitement:
          consultation.traitement ||
          "",

        observations:
          consultation.observations ||
          "",
      });


      /*
       * Une consultation terminée reste terminée.
       */

      if (
        consultation.statut !==
        "Terminée"
      ) {

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
      }


      setModal(
        "consultation"
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
    () => {

      if (
        !patientSelectionne
      ) {
        return;
      }


      const dateConsultation =
        new Date().toISOString();


      const patientMisAJour = {

        ...patientSelectionne,

        statut:
          "Terminée",

        symptomes:
          formulaireMedical.symptomes,

        diagnostic:
          formulaireMedical.diagnostic,

        traitement:
          formulaireMedical.traitement,

        observations:
          formulaireMedical.observations,

        dateConsultation,
      };


      /*
       * Mise à jour de la liste affichée
       */

      setConsultations(
        (liste) =>
          liste.map(
            (item) =>
              item.id ===
              patientSelectionne.id
                ? patientMisAJour
                : item
          )
      );


      /*
       * Mise à jour du localStorage
       */

      const patientsCaisse =
        getPatientsFromCaisse();


      const patientsMisAJour =
        patientsCaisse.map(
          (patient) =>
            patient.id ===
            patientSelectionne.id
              ? patientMisAJour
              : patient
        );


      localStorage.setItem(
        "sante_consultation_patients",
        JSON.stringify(
          patientsMisAJour
        )
      );


      /*
       * Synchronisation entre composants
       */

      window.dispatchEvent(
        new CustomEvent(
          "sante:consultation-updated",
          {
            detail:
              patientMisAJour,
          }
        )
      );


      /*
       * Patient sélectionné mis à jour
       */

      setPatientSelectionne(
        patientMisAJour
      );


      /*
       * Reset formulaire
       */

      setFormulaireMedical({
        symptomes: "",
        diagnostic: "",
        traitement: "",
        observations: "",
      });


      /*
       * Afficher confirmation
       */

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

        symptomes:
          "",

        diagnostic:
          "",

        traitement:
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
              MA SANTE
            </strong>

            <span>
              Gestion de Clinique
            </span>

          </div>

        </div>


        {/* MENU */}

        <nav className="medecin-menu">


          <button
            className="medecin-menu-item active"
            onClick={() =>
              setModal(null)
            }
          >

            <span className="menu-icon">
              ⌂
            </span>

            <span>
              Accueil
            </span>

          </button>


          <button
            className="medecin-menu-item"
            onClick={() =>
              setModal(
                "patients"
              )
            }
          >

            <span className="menu-icon">
              ♟
            </span>

            <span>
              Mes patients
            </span>

          </button>


          <button
            className="medecin-menu-item selected"
            onClick={() =>
              setModal(null)
            }
          >

            <span className="menu-icon">
              ▣
            </span>

            <span>
              Consultations
            </span>

          </button>


          <button
            className="medecin-menu-item"
            onClick={() =>
              setModal(
                "ordonnance"
              )
            }
          >

            <span className="menu-icon">
              ▤
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
              ▥
            </span>

            <span>
              Examens
            </span>

          </button>


          <button
            className="medecin-menu-item"
            onClick={() =>
              setModal(
                "rendezvous"
              )
            }
          >

            <span className="menu-icon">
              □
            </span>

            <span>
              Rendez-vous
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
              ▣
            </span>

            <span>
              Messages
            </span>

          </button>

        </nav>


        {/* BAS SIDEBAR */}

        <div className="sidebar-bottom">

          <Link
            to="/modules"
            className="medecin-menu-item"
          >

            <span className="menu-icon">
              ⌘
            </span>

            <span>
              Retour aux modules
            </span>

          </Link>


          <button
            type="button"
            className="medecin-menu-item"
            onClick={
              handleLogout
            }
          >

            <span className="menu-icon">
              ⏻
            </span>

            <span>
              Déconnexion
            </span>

          </button>


          <div className="sidebar-version">
            MA SANTÉ v1.0
          </div>

        </div>

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


          <div className="doctor-profile">

            <div className="doctor-avatar">
              DJ
            </div>

            <div className="doctor-info">

              <strong>
                Dr. KOUAME Jean
              </strong>

              <span>
                Médecin
              </span>

            </div>

            <button
              className="profile-arrow"
              title="Profil"
              onClick={() =>
                setModal(
                  "profil"
                )
              }
            >
              ▼
            </button>

          </div>

        </header>


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
                ⌕
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
                  ×
                </button>

              )}

            </div>


            <button
              className="btn-primary new-consultation-btn"
              onClick={() =>
                setModal(
                  "nouvelle"
                )
              }
            >

              <span>
                ＋
              </span>

              Nouvelle consultation

            </button>

          </div>


          {/* STATISTIQUES */}

          <div className="quick-stats">


            <div className="quick-stat">

              <div className="quick-stat-icon blue">
                ◷
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
                ✓
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
                !
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
                →
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
                      #
                    </th>

                    <th>
                      Patient
                    </th>

                    <th>
                      Motif
                    </th>

                    <th>
                      Heure
                    </th>

                    <th>
                      Statut
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
                              consultation.numero
                            }
                          </td>


                          <td>

                            <div className="patient-cell">

                              <div
                                className={`patient-avatar ${
                                  consultation.sexe ===
                                  "F"
                                    ? "female"
                                    : "male"
                                }`}
                              >

                                {
                                  consultation.patient
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()
                                }

                              </div>


                              <div>

                                <strong>
                                  {
                                    consultation.patient
                                  }
                                </strong>

                                <small>
                                  {
                                    consultation.age !==
                                    "--"
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
                                consultation.motif
                              }
                            </span>

                          </td>


                          <td>

                            <span className="heure-text">
                              {
                                consultation.heure
                              }
                            </span>

                          </td>


                          <td>

                            <button
                              className={`status-badge ${getStatusClass(
                                consultation.statut
                              )}`}
                              onClick={() =>
                                ouvrirConsultation(
                                  consultation
                                )
                              }
                            >

                              <span className="status-dot">
                                ●
                              </span>

                              {
                                consultation.statut
                              }

                            </button>

                          </td>


                          <td>

                            <div className="row-actions">


                              {consultation.statut !==
                                "Terminée" && (

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

                              )}


                              {consultation.statut ===
                                "Terminée" && (

                                <button
                                  type="button"
                                  className="row-action view"
                                  title="Voir la consultation"
                                  onClick={() =>
                                    ouvrirConsultation(
                                      consultation
                                    )
                                  }
                                >
                                  👁
                                </button>

                              )}


                              <button
                                className="row-action more"
                                title="Plus d'options"
                                onClick={() =>
                                  setPatientSelectionne(
                                    consultation
                                  )
                                }
                              >
                                ⋮
                              </button>

                            </div>

                          </td>

                        </tr>

                      )
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="6"
                        className="empty-table"
                      >

                        <div className="empty-icon">
                          ⌕
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
                  ♟
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
                  ▣
                </span>

                <span>
                  Dossier patient
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
                    "ordonnance"
                  );

                }}
              >

                <span className="action-icon blue-icon">
                  ▤
                </span>

                <span>
                  Ordonnance
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
                  ▤
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
                  ✓
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


                <div className="info-row">

                  <span>
                    Consultations restantes
                  </span>

                  <strong>
                    {
                      patientsDuMedecin.filter(
                        (c) =>
                          c.statut !==
                          "Terminée"
                      ).length
                    }
                  </strong>

                </div>

              </div>

            </div>


            <div className="info-card reminder-card">

              <div className="info-card-title">

                <span className="info-title-icon orange-icon">
                  !
                </span>

                <div>

                  <h3>
                    Rappels
                  </h3>

                  <p>
                    À ne pas oublier
                  </p>

                </div>

              </div>


              <div className="reminder">

                <span className="reminder-time">
                  11:00
                </span>

                <div>

                  <strong>
                    Visite médicale
                  </strong>

                  <span>
                    Service hospitalisation
                  </span>

                </div>

              </div>


              <div className="reminder">

                <span className="reminder-time">
                  14:00
                </span>

                <div>

                  <strong>
                    Réunion médicale
                  </strong>

                  <span>
                    Salle de réunion
                  </span>

                </div>

              </div>

            </div>

          </div>

        </section>

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
                className="btn-secondary"
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


            {/* PATIENT */}

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


            {/* INFORMATIONS */}

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


            {/* FORMULAIRE MÉDICAL */}

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


            {/* ACTIONS */}

            <div className="modal-actions">

              <button
                type="button"
                className="btn-secondary"
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
              ✓
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
          MES PATIENTS
      ====================================================== */}

      {modal ===
        "patients" && (

        <Modal
          title="Mes patients"
          subtitle="Patients pris en charge"
          onClose={
            fermerModal
          }
          large
        >

          <div className="consultation-detail">

            {patientsDuMedecin.filter(
              (patient) =>
                patient.statut ===
                "Terminée"
            ).length > 0 ? (

              <div className="table-wrapper">

                <table className="consultations-table">

                  <thead>

                    <tr>

                      <th>
                        #
                      </th>

                      <th>
                        Patient
                      </th>

                      <th>
                        Service
                      </th>

                      <th>
                        Diagnostic
                      </th>

                      <th>
                        Statut
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {patientsDuMedecin
                      .filter(
                        (patient) =>
                          patient.statut ===
                          "Terminée"
                      )
                      .map(
                        (patient) => (

                          <tr
                            key={
                              patient.id
                            }
                          >

                            <td>
                              {
                                patient.numero
                              }
                            </td>


                            <td>

                              <div className="patient-cell">

                                <div
                                  className={`patient-avatar ${
                                    patient.sexe ===
                                    "F"
                                      ? "female"
                                      : "male"
                                  }`}
                                >

                                  {
                                    patient.patient
                                      .charAt(
                                        0
                                      )
                                      .toUpperCase()
                                  }

                                </div>


                                <div>

                                  <strong>
                                    {
                                      patient.patient
                                    }
                                  </strong>

                                  <small>
                                    {
                                      patient.telephone ||
                                      "Téléphone non renseigné"
                                    }
                                  </small>

                                </div>

                              </div>

                            </td>


                            <td>
                              {
                                patient.service ||
                                "Médecine générale"
                              }
                            </td>


                            <td>
                              {
                                patient.diagnostic ||
                                "Non renseigné"
                              }
                            </td>


                            <td>

                              <span className="status-badge status-done">

                                <span className="status-dot">
                                  ●
                                </span>

                                Terminée

                              </span>

                            </td>

                          </tr>

                        )
                      )}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="placeholder-modal">

                <div className="placeholder-modal-icon">
                  ♟
                </div>

                <h3>
                  Aucun patient terminé
                </h3>

                <p>
                  Les patients dont les consultations sont validées apparaîtront ici.
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

            )}

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
                className="btn-primary"
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
          ORDONNANCE
      ====================================================== */}

      {modal ===
        "ordonnance" && (

        <Modal
          title="Ordonnance"
          subtitle={
            patientSelectionne
              ? `Patient : ${patientSelectionne.patient}`
              : "Nouvelle ordonnance"
          }
          onClose={
            fermerModal
          }
        >

          <div className="modal-form">

            <div className="form-group">

              <label>
                Médicament
              </label>

              <input
                type="text"
                placeholder="Nom du médicament"
              />

            </div>


            <div className="form-row">

              <div className="form-group">

                <label>
                  Posologie
                </label>

                <input
                  type="text"
                  placeholder="Ex : 1 comprimé"
                />

              </div>


              <div className="form-group">

                <label>
                  Durée
                </label>

                <input
                  type="text"
                  placeholder="Ex : 7 jours"
                />

              </div>

            </div>


            <div className="form-group">

              <label>
                Instructions
              </label>

              <textarea
                rows="4"
                placeholder="Instructions complémentaires..."
              />

            </div>


            <div className="modal-actions">

              <button
                className="btn-secondary"
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
                Enregistrer l'ordonnance
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
                className="btn-secondary"
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
                className="btn-secondary"
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
              ◈
            </div>

            <h3>
              Module en préparation
            </h3>

            <p>
              Cette partie sera développée lorsque nous créerons le module correspondant.
            </p>

            <button
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
            ×
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