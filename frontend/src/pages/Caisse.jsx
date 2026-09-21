import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Caisse.css";

/*
 * ============================================================
 * MA SANTÉ - MODULE CAISSE
 * ============================================================
 *
 * Fonctionnalités :
 *
 * - Recherche des patients
 * - Enregistrement d'un nouveau patient
 * - Sélection du sexe
 * - Sélection du service médical
 * - Sélection du médecin
 * - Calcul automatique du coût du service
 * - Gestion temporaire des assurances
 * - Application automatique de la réduction assurance
 * - Génération automatique de l'identifiant patient
 * - Calcul dynamique des bilans
 * - Transmission automatique du patient au médecin
 *
 * IMPORTANT :
 * Les services, médecins et assurances présents ici sont
 * TEMPORAIRES.
 *
 * Ils seront plus tard récupérés depuis le module
 * Administration / Configuration via l'API Django.
 *
 * La Caisse ne gère PAS le statut médical du patient.
 * ============================================================
 */


/*
 * ============================================================
 * ICÔNES
 * ============================================================
 */

function Icon({ name, size = 20 }) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),

    patient: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    billing: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h8" />
        <path d="M8 11h8" />
        <path d="M8 15h5" />
      </>
    ),

    payment: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </>
    ),

    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v6h6" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    report: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h17" />
        <path d="m7 15 4-4 3 2 5-6" />
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),

    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),

    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),

    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
  };

  return <svg {...commonProps}>{icons[name]}</svg>;
}


/*
 * ============================================================
 * DONNÉES TEMPORAIRES
 * ============================================================
 */


/*
 * SERVICES MÉDICAUX
 */

const servicesConfiguration = [
  {
    id: 1,
    name: "Médecine générale",
    price: 10000,
  },
  {
    id: 2,
    name: "Pédiatrie",
    price: 12000,
  },
  {
    id: 3,
    name: "Chirurgie",
    price: 25000,
  },
  {
    id: 4,
    name: "Gynécologie",
    price: 15000,
  },
  {
    id: 5,
    name: "Cardiologie",
    price: 20000,
  },
  {
    id: 6,
    name: "Dermatologie",
    price: 12000,
  },
];


/*
 * MÉDECINS
 */

const doctorsConfiguration = [
  {
    id: 1,
    name: "Dr. KOUAME",
  },
  {
    id: 2,
    name: "Dr. BAH",
  },
  {
    id: 3,
    name: "Dr. KONE",
  },
  {
    id: 4,
    name: "Dr. YAO",
  },
];


/*
 * ASSURANCES
 */

const insuranceConfiguration = [
  {
    id: 1,
    name: "MUGEFCI",
    reduction: 30,
  },
  {
    id: 2,
    name: "CNPS",
    reduction: 20,
  },
  {
    id: 3,
    name: "NSIA",
    reduction: 40,
  },
];


/*
 * ============================================================
 * PATIENTS INITIAUX
 * ============================================================
 */

const initialPatients = [
  {
    id: "PAT-001",
    patient: "TRAORE Awa",
    sexe: "Féminin",
    service: "Médecine générale",
    doctor: "Dr. KOUAME",
    telephone: "0700000000",
    cost: 10000,
    insurance: "Non",
    insuranceName: "",
    quartier: "Cocody",
  },

  {
    id: "PAT-002",
    patient: "KONE Ibrahim",
    sexe: "Masculin",
    service: "Chirurgie",
    doctor: "Dr. BAH",
    telephone: "0500000000",
    cost: 25000,
    insurance: "Oui",
    insuranceName: "CNPS",
    quartier: "Marcory",
  },

  {
    id: "PAT-003",
    patient: "DIALLO Mariam",
    sexe: "Féminin",
    service: "Pédiatrie",
    doctor: "Dr. KONE",
    telephone: "0100000000",
    cost: 12000,
    insurance: "Non",
    insuranceName: "",
    quartier: "Yopougon",
  },

  {
    id: "PAT-004",
    patient: "YAO Claude",
    sexe: "Masculin",
    service: "Médecine générale",
    doctor: "Dr. KOUAME",
    telephone: "0700000001",
    cost: 10000,
    insurance: "Oui",
    insuranceName: "MUGEFCI",
    quartier: "Plateau",
  },
];


/*
 * ============================================================
 * GÉNÉRATION IDENTIFIANT PATIENT
 * ============================================================
 */

function generatePatientId(patients) {
  const numbers = patients
    .map((patient) => {
      const match = String(patient.id).match(/PAT-(\d+)/);

      if (!match) {
        return 0;
      }

      return Number(match[1]);
    })
    .filter((number) => !Number.isNaN(number));

  const nextNumber =
    numbers.length > 0
      ? Math.max(...numbers) + 1
      : 1;

  return `PAT-${String(nextNumber).padStart(3, "0")}`;
}


/*
 * ============================================================
 * TRANSMISSION DU PATIENT VERS LE MODULE CONSULTATION
 * ============================================================
 */

function savePatientForConsultation(patient) {
  try {
    const existingPatients = JSON.parse(
      localStorage.getItem(
        "sante_consultation_patients"
      ) || "[]"
    );

    const existingIndex = existingPatients.findIndex(
      (item) => item.id === patient.id
    );

    const consultationPatient = {
      id: patient.id,

      numero: String(patient.id).replace(
        "PAT-",
        ""
      ),

      patient: patient.patient,

      sexe:
        patient.sexe === "Féminin"
          ? "F"
          : patient.sexe === "Masculin"
          ? "M"
          : "--",

      telephone: patient.telephone,

      quartier: patient.quartier,

      service: patient.service,

      doctor: patient.doctor,

      motif: "Consultation générale",

      heure: new Date().toLocaleTimeString(
        "fr-FR",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ),

      statut: "En attente",

      observations: "",

      symptomes: "",

      diagnostic: "",

      traitement: "",

      dateConsultation: null,
    };

    if (existingIndex >= 0) {
      existingPatients[existingIndex] =
        consultationPatient;
    } else {
      existingPatients.push(
        consultationPatient
      );
    }

    localStorage.setItem(
      "sante_consultation_patients",
      JSON.stringify(existingPatients)
    );

    /*
     * Permet de synchroniser immédiatement les deux
     * modules lorsqu'ils sont ouverts dans la même
     * application.
     */

    window.dispatchEvent(
      new CustomEvent(
        "sante:patient-added",
        {
          detail: consultationPatient,
        }
      )
    );

  } catch (error) {
    console.error(
      "Erreur lors de la transmission du patient vers Consultation :",
      error
    );
  }
}


/*
 * ============================================================
 * PAGE CAISSE
 * ============================================================
 */

export default function Caisse() {
  const [search, setSearch] =
    useState("");

  const [patients, setPatients] =
    useState(initialPatients);

  const [
    showNewPatientForm,
    setShowNewPatientForm,
  ] = useState(false);


  /*
   * FORMULAIRE
   */

  const [formData, setFormData] =
    useState({
      nom: "",
      prenom: "",
      sexe: "",
      service: "",
      doctor: "",
      telephone: "",
      assurance: "Non",
      assuranceId: "",
      quartier: "",
    });


  /*
   * RECHERCHE
   */

  const filteredPatients =
    useMemo(() => {
      const value = search
        .trim()
        .toLowerCase();

      if (!value) {
        return patients;
      }

      return patients.filter(
        (item) =>
          [
            item.id,
            item.patient,
            item.sexe,
            item.service,
            item.doctor,
            item.telephone,
            item.insurance,
            item.insuranceName,
            item.quartier,
          ]
            .join(" ")
            .toLowerCase()
            .includes(value)
      );
    }, [search, patients]);


  /*
   * SERVICE SÉLECTIONNÉ
   */

  const selectedService =
    servicesConfiguration.find(
      (service) =>
        String(service.id) ===
        String(formData.service)
    );


  /*
   * ASSURANCE SÉLECTIONNÉE
   */

  const selectedInsurance =
    insuranceConfiguration.find(
      (insurance) =>
        String(insurance.id) ===
        String(formData.assuranceId)
    );


  /*
   * CALCUL DU COÛT
   */

  const basePrice =
    selectedService
      ? selectedService.price
      : 0;

  const reduction =
    formData.assurance === "Oui" &&
    selectedInsurance
      ? selectedInsurance.reduction
      : 0;

  const insuranceAmount =
    basePrice * (reduction / 100);

  const finalPrice =
    basePrice - insuranceAmount;


  /*
   * BILANS
   */

  const billingTotal =
    useMemo(() => {
      return patients
        .slice(initialPatients.length)
        .reduce(
          (total, patient) =>
            total +
            Number(
              patient.cost || 0
            ),
          0
        );
    }, [patients]);

  const bilanJour =
    billingTotal;

  const bilanSemaine =
    billingTotal;

  const bilanMois =
    billingTotal;


  /*
   * MODIFICATION FORMULAIRE
   */

  const handleFormChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (currentForm) => ({
        ...currentForm,
        [name]: value,
      })
    );
  };


  /*
   * CHANGEMENT ASSURANCE
   */

  const handleInsuranceChange = (
    value
  ) => {
    setFormData(
      (currentForm) => ({
        ...currentForm,

        assurance: value,

        assuranceId:
          value === "Non"
            ? ""
            : currentForm.assuranceId,
      })
    );
  };


  /*
   * OUVERTURE FORMULAIRE
   */

  const handleNewPatient = () => {
    setFormData({
      nom: "",
      prenom: "",
      sexe: "",
      service: "",
      doctor: "",
      telephone: "",
      assurance: "Non",
      assuranceId: "",
      quartier: "",
    });

    setShowNewPatientForm(
      true
    );
  };


  /*
   * FERMETURE
   */

  const handleCloseForm = () => {
    setShowNewPatientForm(
      false
    );
  };


  /*
   * AJOUT PATIENT
   */

  const handleAddPatient = (
    event
  ) => {
    event.preventDefault();


    /*
     * Champs obligatoires
     */

    if (
      !formData.nom.trim() ||
      !formData.prenom.trim() ||
      !formData.sexe ||
      !formData.service ||
      !formData.doctor ||
      !formData.telephone.trim() ||
      !formData.quartier.trim()
    ) {
      alert(
        "Veuillez remplir tous les champs obligatoires."
      );

      return;
    }


    /*
     * Assurance obligatoire si Oui
     */

    if (
      formData.assurance ===
        "Oui" &&
      !formData.assuranceId
    ) {
      alert(
        "Veuillez sélectionner l'assurance du patient."
      );

      return;
    }


    /*
     * SERVICE
     */

    const service =
      servicesConfiguration.find(
        (item) =>
          String(item.id) ===
          String(formData.service)
      );


    /*
     * MÉDECIN
     */

    const doctor =
      doctorsConfiguration.find(
        (item) =>
          String(item.id) ===
          String(formData.doctor)
      );


    /*
     * ASSURANCE
     */

    const insurance =
      formData.assurance ===
      "Oui"
        ? insuranceConfiguration.find(
            (item) =>
              String(item.id) ===
              String(
                formData.assuranceId
              )
          )
        : null;


    /*
     * IDENTIFIANT
     */

    const generatedId =
      generatePatientId(
        patients
      );


    /*
     * NOM COMPLET
     */

    const fullName =
      `${formData.nom
        .trim()
        .toUpperCase()} ${formData.prenom
        .trim()}`;


    /*
     * NOUVEAU PATIENT
     */

    const newPatient = {
      id: generatedId,

      patient: fullName,

      sexe: formData.sexe,

      service: service
        ? service.name
        : "",

      doctor: doctor
        ? doctor.name
        : "",

      telephone:
        formData.telephone.trim(),

      cost: finalPrice,

      insurance:
        formData.assurance,

      insuranceName:
        insurance
          ? insurance.name
          : "",

      quartier:
        formData.quartier.trim(),
    };


    /*
     * AJOUT DANS LA CAISSE
     */

    setPatients(
      (currentPatients) => [
        ...currentPatients,
        newPatient,
      ]
    );


    /*
     * TRANSMISSION AUTOMATIQUE
     * AU MODULE CONSULTATION
     */

    savePatientForConsultation(
      newPatient
    );


    /*
     * FERMETURE
     */

    setShowNewPatientForm(
      false
    );


    /*
     * RESET
     */

    setFormData({
      nom: "",
      prenom: "",
      sexe: "",
      service: "",
      doctor: "",
      telephone: "",
      assurance: "Non",
      assuranceId: "",
      quartier: "",
    });
  };


  /*
   * FORMAT MONNAIE
   */

  const formatMoney = (
    amount
  ) => {
    return new Intl.NumberFormat(
      "fr-FR"
    ).format(
      Number(amount || 0)
    );
  };


  return (
    <div className="caisse-page">

      {/* =========================================================
          SIDEBAR
      ========================================================= */}

      <aside className="caisse-sidebar">

        <div className="caisse-brand">

          <div className="brand-icon">
            ♥
          </div>

          <div className="brand-text">
            <span>MA</span>
            <strong>SANTÉ</strong>
          </div>

        </div>


        <nav className="caisse-nav">

          <Link
            to="/modules"
            className="caisse-nav-item"
          >
            <Icon name="home" />

            <span>
              Accueil
            </span>
          </Link>


          <button
            type="button"
            className="caisse-nav-item active"
          >
            <Icon name="patient" />

            <span>
              Enregistrer un patient
            </span>
          </button>


          <Link
            to="/billing"
            className="caisse-nav-item"
          >
            <Icon name="billing" />

            <span>
              Facturation
            </span>
          </Link>


          <button
            type="button"
            className="caisse-nav-item"
          >
            <Icon name="payment" />

            <span>
              Paiements
            </span>
          </button>


          <button
            type="button"
            className="caisse-nav-item"
          >
            <Icon name="history" />

            <span>
              Historique
            </span>
          </button>


          <button
            type="button"
            className="caisse-nav-item"
          >
            <Icon name="report" />

            <span>
              Bilan
            </span>
          </button>


          <Link
            to="/reports"
            className="caisse-nav-item"
          >
            <Icon name="report" />

            <span>
              Rapports
            </span>
          </Link>

        </nav>

      </aside>


      {/* =========================================================
          CONTENU PRINCIPAL
      ========================================================= */}

      <main className="caisse-content">

        <header className="caisse-header">

          <div className="caisse-header-title">

            <h1>
              Espace Caissier
            </h1>

            <p>
              Enregistrement / Accueil patient
            </p>

          </div>


          <div className="cashier-profile">

            <div className="cashier-avatar">
              CF
            </div>

            <div className="cashier-info">

              <strong>
                COULIBALY Fatou
              </strong>

              <span>
                Caissière
              </span>

            </div>

          </div>

        </header>


        <section className="caisse-main">

          {/* RECHERCHE */}

          <div className="patient-toolbar">

            <div className="search-box">

              <Icon
                name="search"
                size={21}
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Rechercher un patient (nom, téléphone...)"
              />

            </div>


            <button
              type="button"
              className="new-patient-btn"
              onClick={
                handleNewPatient
              }
            >

              <Icon
                name="plus"
                size={20}
              />

              <span>
                Nouveau patient
              </span>

            </button>

          </div>


          {/* TABLEAU */}

          <div className="patients-card">

            <div className="table-wrapper">

              <table className="patients-table">

                <thead>

                  <tr>

                    <th>
                      #
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
                      Affecté à
                    </th>

                    <th>
                      Téléphone
                    </th>

                    <th>
                      Coût
                    </th>

                    <th>
                      Assurance
                    </th>

                    <th>
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredPatients.map(
                    (item) => (

                      <tr
                        key={
                          item.id
                        }
                      >

                        <td>
                          {item.id}
                        </td>


                        <td className="patient-name">
                          {item.patient}
                        </td>


                        <td>

                          <span
                            style={{
                              color:
                                item.sexe ===
                                "Masculin"
                                  ? "#dc2626"
                                  : item.sexe ===
                                    "Féminin"
                                  ? "#2563eb"
                                  : "#374151",

                              fontWeight: 600,
                            }}
                          >
                            {item.sexe ||
                              "-"}
                          </span>

                        </td>


                        <td>
                          {item.service}
                        </td>


                        <td>
                          {item.doctor}
                        </td>


                        <td>
                          {
                            item.telephone
                          }
                        </td>


                        <td>
                          {formatMoney(
                            item.cost
                          )}{" "}
                          FCFA
                        </td>


                        <td>

                          {item.insurance ===
                          "Oui"
                            ? item.insuranceName
                            : "Non"}

                        </td>


                        <td>

                          <button
                            type="button"
                            className="row-action"
                            aria-label={`Ouvrir ${item.patient}`}
                          >

                            <Icon
                              name="arrow"
                              size={17}
                            />

                          </button>

                        </td>

                      </tr>

                    )
                  )}


                  {filteredPatients.length ===
                    0 && (

                    <tr>

                      <td
                        colSpan="9"
                        className="empty-row"
                      >
                        Aucun patient trouvé.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>


          {/* BILANS */}

          <section className="summary-grid">

            <article className="summary-card">

              <span className="summary-label">
                Bilan du jour
              </span>

              <strong className="summary-value green">
                {formatMoney(
                  bilanJour
                )}{" "}
                FCFA
              </strong>

              <span className="summary-note">
                Recettes enregistrées aujourd'hui
              </span>

            </article>


            <article className="summary-card">

              <span className="summary-label">
                Bilan semaine
              </span>

              <strong className="summary-value green">
                {formatMoney(
                  bilanSemaine
                )}{" "}
                FCFA
              </strong>

              <span className="summary-note">
                Total des recettes de la semaine
              </span>

            </article>


            <article className="summary-card">

              <span className="summary-label">
                Bilan mois
              </span>

              <strong className="summary-value blue">
                {formatMoney(
                  bilanMois
                )}{" "}
                FCFA
              </strong>

              <span className="summary-note">
                Total des recettes du mois
              </span>

            </article>

          </section>

        </section>

      </main>


      {/* =========================================================
          FORMULAIRE NOUVEAU PATIENT
      ========================================================= */}

      {showNewPatientForm && (

        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >

          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.20)",
              padding: "28px",
            }}
          >

            {/* EN-TÊTE */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                marginBottom: "25px",
                borderBottom:
                  "1px solid #eeeeee",
                paddingBottom: "18px",
              }}
            >

              <div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    color: "#1f2937",
                  }}
                >
                  Nouveau patient
                </h2>

                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Enregistrement du patient à l'accueil
                </p>

              </div>


              <button
                type="button"
                onClick={
                  handleCloseForm
                }
                style={{
                  width: "38px",
                  height: "38px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#f5f5f5",
                  color: "#555",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                }}
                aria-label="Fermer"
              >
                <Icon
                  name="close"
                  size={19}
                />
              </button>

            </div>


            {/* FORMULAIRE */}

            <form
              onSubmit={
                handleAddPatient
              }
            >

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "18px",
                }}
              >

                {/* NOM */}

                <div>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Nom
                  </label>

                  <input
                    type="text"
                    name="nom"
                    value={
                      formData.nom
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="Nom du patient"
                    required
                    style={{
                      width: "100%",
                      height: "44px",
                      padding:
                        "0 13px",
                      border:
                        "1px solid #d9d9d9",
                      borderRadius: "8px",
                      outline: "none",
                      boxSizing:
                        "border-box",
                    }}
                  />

                </div>


                {/* PRÉNOM */}

                <div>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Prénom
                  </label>

                  <input
                    type="text"
                    name="prenom"
                    value={
                      formData.prenom
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="Prénom du patient"
                    required
                    style={{
                      width: "100%",
                      height: "44px",
                      padding:
                        "0 13px",
                      border:
                        "1px solid #d9d9d9",
                      borderRadius: "8px",
                      outline: "none",
                      boxSizing:
                        "border-box",
                    }}
                  />

                </div>


                {/* SEXE */}

                <div>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Sexe
                  </label>

                  <select
                    name="sexe"
                    value={
                      formData.sexe
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                    style={{
                      width: "100%",
                      height: "44px",
                      padding:
                        "0 13px",
                      border:
                        "1px solid #d9d9d9",
                      borderRadius: "8px",
                      outline: "none",
                      background:
                        "#ffffff",
                      boxSizing:
                        "border-box",
                      color:
                        formData.sexe ===
                        "Masculin"
                          ? "#dc2626"
                          : formData.sexe ===
                            "Féminin"
                          ? "#2563eb"
                          : "#374151",
                      fontWeight:
                        formData.sexe
                          ? 600
                          : 400,
                    }}
                  >

                    <option value="">
                      Sélectionner le sexe
                    </option>

                    <option
                      value="Masculin"
                      style={{
                        color:
                          "#dc2626",
                        fontWeight: 600,
                      }}
                    >
                      Masculin
                    </option>

                    <option
                      value="Féminin"
                      style={{
                        color:
                          "#2563eb",
                        fontWeight: 600,
                      }}
                    >
                      Féminin
                    </option>

                  </select>

                </div>


                {/* SERVICE */}

                <div>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Service
                  </label>

                  <select
                    name="service"
                    value={
                      formData.service
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                    style={{
                      width: "100%",
                      height: "44px",
                      padding:
                        "0 13px",
                      border:
                        "1px solid #d9d9d9",
                      borderRadius: "8px",
                      outline: "none",
                      background:
                        "#ffffff",
                      boxSizing:
                        "border-box",
                    }}
                  >

                    <option value="">
                      Sélectionner un service
                    </option>

                    {servicesConfiguration.map(
                      (service) => (
                        <option
                          key={
                            service.id
                          }
                          value={
                            service.id
                          }
                        >
                          {
                            service.name
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>


                {/* MÉDECIN */}

                <div>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Affecté à
                  </label>

                  <select
                    name="doctor"
                    value={
                      formData.doctor
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                    style={{
                      width: "100%",
                      height: "44px",
                      padding:
                        "0 13px",
                      border:
                        "1px solid #d9d9d9",
                      borderRadius: "8px",
                      outline: "none",
                      background:
                        "#ffffff",
                      boxSizing:
                        "border-box",
                    }}
                  >

                    <option value="">
                      Sélectionner un médecin
                    </option>

                    {doctorsConfiguration.map(
                      (doctor) => (
                        <option
                          key={
                            doctor.id
                          }
                          value={
                            doctor.id
                          }
                        >
                          {
                            doctor.name
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>


                {/* TELEPHONE */}

                <div>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Numéro de téléphone
                  </label>

                  <input
                    type="tel"
                    name="telephone"
                    value={
                      formData.telephone
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="Ex : 0700000000"
                    required
                    style={{
                      width: "100%",
                      height: "44px",
                      padding:
                        "0 13px",
                      border:
                        "1px solid #d9d9d9",
                      borderRadius: "8px",
                      outline: "none",
                      boxSizing:
                        "border-box",
                    }}
                  />

                </div>


                {/* QUARTIER */}

                <div>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Quartier / Commune
                  </label>

                  <input
                    type="text"
                    name="quartier"
                    value={
                      formData.quartier
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="Ex : Cocody Angré"
                    required
                    style={{
                      width: "100%",
                      height: "44px",
                      padding:
                        "0 13px",
                      border:
                        "1px solid #d9d9d9",
                      borderRadius: "8px",
                      outline: "none",
                      boxSizing:
                        "border-box",
                    }}
                  />

                </div>


                {/* ASSURANCE */}

                <div>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "10px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Assurance
                  </label>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "22px",
                      height: "44px",
                    }}
                  >

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >

                      <input
                        type="radio"
                        name="assurance"
                        value="Oui"
                        checked={
                          formData.assurance ===
                          "Oui"
                        }
                        onChange={() =>
                          handleInsuranceChange(
                            "Oui"
                          )
                        }
                      />

                      Oui

                    </label>


                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >

                      <input
                        type="radio"
                        name="assurance"
                        value="Non"
                        checked={
                          formData.assurance ===
                          "Non"
                        }
                        onChange={() =>
                          handleInsuranceChange(
                            "Non"
                          )
                        }
                      />

                      Non

                    </label>

                  </div>

                </div>


                {/* TYPE ASSURANCE */}

                {formData.assurance ===
                  "Oui" && (

                  <div>

                    <label
                      style={{
                        display: "block",
                        marginBottom: "7px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      Type d'assurance
                    </label>

                    <select
                      name="assuranceId"
                      value={
                        formData.assuranceId
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                      style={{
                        width: "100%",
                        height: "44px",
                        padding:
                          "0 13px",
                        border:
                          "1px solid #d9d9d9",
                        borderRadius: "8px",
                        outline: "none",
                        background:
                          "#ffffff",
                        boxSizing:
                          "border-box",
                      }}
                    >

                      <option value="">
                        Sélectionner une assurance
                      </option>

                      {insuranceConfiguration.map(
                        (insurance) => (
                          <option
                            key={
                              insurance.id
                            }
                            value={
                              insurance.id
                            }
                          >
                            {
                              insurance.name
                            }{" "}
                            - Réduction{" "}
                            {
                              insurance.reduction
                            }%
                          </option>
                        )
                      )}

                    </select>

                  </div>

                )}


                {/* COÛT */}

                <div>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Coût
                  </label>

                  <div
                    style={{
                      width: "100%",
                      minHeight: "44px",
                      padding:
                        "0 13px",
                      border:
                        "1px solid #d9d9d9",
                      borderRadius: "8px",
                      background:
                        "#f8fafc",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      boxSizing:
                        "border-box",
                    }}
                  >

                    <strong
                      style={{
                        color:
                          "#1f2937",
                        fontSize:
                          "15px",
                      }}
                    >
                      {formatMoney(
                        finalPrice
                      )}{" "}
                      FCFA
                    </strong>


                    {reduction >
                      0 && (

                      <span
                        style={{
                          fontSize:
                            "12px",
                          color:
                            "#16a34a",
                          fontWeight:
                            600,
                        }}
                      >
                        -{reduction}%
                      </span>

                    )}

                  </div>

                </div>


                {/* INFORMATIONS TARIFAIRES */}

                {selectedService && (

                  <div
                    style={{
                      gridColumn:
                        "1 / -1",
                      padding:
                        "14px 16px",
                      borderRadius:
                        "8px",
                      background:
                        "#f8fafc",
                      border:
                        "1px solid #edf0f2",
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap:
                          "20px",
                        flexWrap:
                          "wrap",
                      }}
                    >

                      <span
                        style={{
                          fontSize:
                            "13px",
                          color:
                            "#6b7280",
                        }}
                      >
                        Tarif du service
                      </span>

                      <strong
                        style={{
                          fontSize:
                            "14px",
                          color:
                            "#374151",
                        }}
                      >
                        {formatMoney(
                          basePrice
                        )}{" "}
                        FCFA
                      </strong>


                      {reduction >
                        0 && (
                        <>
                          <span
                            style={{
                              fontSize:
                                "13px",
                              color:
                                "#6b7280",
                            }}
                          >
                            Réduction assurance
                          </span>

                          <strong
                            style={{
                              fontSize:
                                "14px",
                              color:
                                "#16a34a",
                            }}
                          >
                            -
                            {formatMoney(
                              insuranceAmount
                            )}{" "}
                            FCFA
                          </strong>
                        </>
                      )}


                      <span
                        style={{
                          fontSize:
                            "13px",
                          color:
                            "#6b7280",
                        }}
                      >
                        À payer
                      </span>

                      <strong
                        style={{
                          fontSize:
                            "16px",
                          color:
                            "#2563eb",
                        }}
                      >
                        {formatMoney(
                          finalPrice
                        )}{" "}
                        FCFA
                      </strong>

                    </div>

                  </div>

                )}

              </div>


              {/* BOUTONS */}

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap: "12px",
                  marginTop:
                    "28px",
                  paddingTop:
                    "20px",
                  borderTop:
                    "1px solid #eeeeee",
                }}
              >

                <button
                  type="button"
                  onClick={
                    handleCloseForm
                  }
                  style={{
                    height: "44px",
                    padding:
                      "0 22px",
                    border:
                      "1px solid #d9d9d9",
                    borderRadius:
                      "8px",
                    background:
                      "#ffffff",
                    color: "#555",
                    cursor:
                      "pointer",
                    fontWeight:
                      600,
                  }}
                >
                  ANNULER
                </button>


                <button
                  type="submit"
                  style={{
                    height: "44px",
                    padding:
                      "0 25px",
                    border: "none",
                    borderRadius:
                      "8px",
                    background:
                      "#2563eb",
                    color:
                      "#ffffff",
                    cursor:
                      "pointer",
                    fontWeight:
                      600,
                  }}
                >
                  AJOUTER
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}