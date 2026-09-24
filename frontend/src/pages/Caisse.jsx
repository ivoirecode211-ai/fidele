import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChartLine,
  Home,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import api from "../services/api";
import Logo from "../components/Logo";
import SidebarFooter from "../components/SidebarFooter";
import UserBadge from "../components/UserBadge";
import NotificationBell from "../components/NotificationBell";
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
 * - Gestion de l'âge et de la date de naissance
 * - Gestion du contact du patient
 * - Gestion du numéro d'un parent
 * - Sélection du sexe
 * - Sélection du service médical
 * - Calcul automatique du coût du service
 * - Gestion des assurances
 * - Gestion du numéro d'assurance
 * - Application automatique du taux de couverture
 * - Génération automatique de l'identifiant patient
 * - Bilans jour / semaine / mois
 * - Page locale des assurances configurées
 * - Transmission automatique du patient aux Soins infirmiers
 *   et à la Comptabilité (via l'API)
 *
 * IMPORTANT :
 * Le médecin / "Affecté à" n'est plus sélectionné depuis
 * le module Caisse.
 * ============================================================
 */


/*
 * ============================================================
 * ICÔNES
 * ============================================================
 */

const ICONS = {
  home: Home,
  patient: UserRound,
  report: ChartLine,
  insurance: ShieldCheck,
  search: Search,
  plus: Plus,
  arrow: ArrowRight,
  close: X,
};

function Icon({ name, size = 20 }) {
  const LucideIcon = ICONS[name];

  return LucideIcon ? (
    <LucideIcon size={size} strokeWidth={2} aria-hidden="true" />
  ) : null;
}


/*
 * ============================================================
 * SERVICES, ASSURANCES ET PATIENTS
 * ============================================================
 *
 * Servis par l'API (/api/parcours/) : le catalogue, l'identifiant
 * patient et le coût sont déterminés par le backend.
 */


/*
 * ============================================================
 * CALCUL DATE DE NAISSANCE À PARTIR DE L'ÂGE
 * ============================================================
 */

function calculateBirthDate(age) {
  const numericAge = Number(age);

  if (
    !Number.isFinite(numericAge) ||
    numericAge < 0
  ) {
    return "";
  }

  const today = new Date();

  const birthDate = new Date(
    today.getFullYear() - numericAge,
    today.getMonth(),
    today.getDate()
  );

  return birthDate.toISOString().split("T")[0];
}


/*
 * ============================================================
 * FORMAT DATE
 * ============================================================
 */

function formatDate(date) {
  if (!date) {
    return "--";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "--";
  }

  return parsedDate.toLocaleDateString("fr-FR");
}


/*
 * ============================================================
 * PAGE CAISSE
 * ============================================================
 */

export default function Caisse() {

  /*
   * ==========================================================
   * ÉTAT DE LA PAGE ACTIVE
   * ==========================================================
   */

  const [activePage, setActivePage] =
    useState("patient");


  /*
   * ==========================================================
   * RECHERCHE
   * ==========================================================
   */

  const [search, setSearch] =
    useState("");


  /*
   * ==========================================================
   * PATIENTS
   * ==========================================================
   */

  const [patients, setPatients] =
    useState([]);

  const [servicesConfiguration, setServicesConfiguration] =
    useState([]);

  const [insuranceConfiguration, setInsuranceConfiguration] =
    useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/parcours/catalogue/"),
      api.get("/parcours/caisse/patients/"),
    ])
      .then(([catalogue, caissePatients]) => {
        setServicesConfiguration(catalogue.data.services);
        setInsuranceConfiguration(catalogue.data.insurances);
        setPatients(caissePatients.data);
      })
      .catch((error) => {
        console.error(
          "Erreur de chargement de la caisse :",
          error
        );
      });
  }, []);


  /*
   * ==========================================================
   * FORMULAIRE
   * ==========================================================
   */

  const [
    showNewPatientForm,
    setShowNewPatientForm,
  ] = useState(false);


  /*
   * ==========================================================
   * DONNÉES FORMULAIRE
   * ==========================================================
   *
   * IMPORTANT :
   * Le champ "doctor" a été supprimé.
   */

  const [formData, setFormData] =
    useState({
      nom: "",
      prenom: "",
      sexe: "",
      age: "",
      dateNaissance: "",
      service: "",
      telephone: "",
      parentContact: "",
      assurance: "Non",
      assuranceId: "",
      insuranceNumber: "",
      quartier: "",
    });


  /*
   * ==========================================================
   * RECHERCHE PATIENT
   * ==========================================================
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
            item.age,
            item.service,
            item.telephone,
            item.parentContact,
            item.insurance,
            item.insuranceName,
            item.insuranceNumber,
            item.quartier,
          ]
            .join(" ")
            .toLowerCase()
            .includes(value)
      );

    }, [search, patients]);


  /*
   * ==========================================================
   * SERVICE SÉLECTIONNÉ
   * ==========================================================
   */

  const selectedService =
    servicesConfiguration.find(
      (service) =>
        String(service.id) ===
        String(formData.service)
    );


  /*
   * ==========================================================
   * ASSURANCE SÉLECTIONNÉE
   * ==========================================================
   */

  const selectedInsurance =
    insuranceConfiguration.find(
      (insurance) =>
        String(insurance.id) ===
        String(formData.assuranceId)
    );


  /*
   * ==========================================================
   * CALCUL DU COÛT
   * ==========================================================
   */

  const basePrice =
    selectedService
      ? selectedService.price
      : 0;

  const coverage =
    formData.assurance === "Oui" &&
    selectedInsurance
      ? selectedInsurance.coverage
      : 0;

  const insuranceAmount =
    basePrice * (coverage / 100);

  const finalPrice =
    basePrice - insuranceAmount;


  /*
   * ==========================================================
   * BILANS
   * ==========================================================
   */

  const today = new Date();

  const startOfToday =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const startOfWeek =
    new Date(startOfToday);

  const dayOfWeek =
    startOfWeek.getDay();

  const differenceToMonday =
    dayOfWeek === 0
      ? 6
      : dayOfWeek - 1;

  startOfWeek.setDate(
    startOfWeek.getDate() -
      differenceToMonday
  );

  const startOfMonth =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

  const getPatientDate = (patient) => {

    if (!patient.dateEnregistrement) {
      return null;
    }

    const date =
      new Date(
        patient.dateEnregistrement
      );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  };


  const bilanJour =
    useMemo(() => {

      return patients
        .filter((patient) => {

          const date =
            getPatientDate(patient);

          if (!date) {
            return false;
          }

          return (
            date >= startOfToday
          );
        })
        .reduce(
          (total, patient) =>
            total +
            Number(
              patient.cost || 0
            ),
          0
        );

    }, [patients]);


  const bilanSemaine =
    useMemo(() => {

      return patients
        .filter((patient) => {

          const date =
            getPatientDate(patient);

          if (!date) {
            return false;
          }

          return (
            date >= startOfWeek
          );
        })
        .reduce(
          (total, patient) =>
            total +
            Number(
              patient.cost || 0
            ),
          0
        );

    }, [patients]);


  const bilanMois =
    useMemo(() => {

      return patients
        .filter((patient) => {

          const date =
            getPatientDate(patient);

          if (!date) {
            return false;
          }

          return (
            date >= startOfMonth
          );
        })
        .reduce(
          (total, patient) =>
            total +
            Number(
              patient.cost || 0
            ),
          0
        );

    }, [patients]);


  /*
   * ==========================================================
   * MODIFICATION FORMULAIRE
   * ==========================================================
   */

  const handleFormChange = (
    event
  ) => {

    const {
      name,
      value,
    } = event.target;


    /*
     * AGE
     */

    if (name === "age") {

      const dateNaissance =
        value !== ""
          ? calculateBirthDate(value)
          : "";

      setFormData(
        (currentForm) => ({
          ...currentForm,

          age: value,

          dateNaissance,
        })
      );

      return;
    }


    setFormData(
      (currentForm) => ({
        ...currentForm,
        [name]: value,
      })
    );
  };


  /*
   * ==========================================================
   * CHANGEMENT ASSURANCE
   * ==========================================================
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

        insuranceNumber:
          value === "Non"
            ? ""
            : currentForm.insuranceNumber,
      })
    );
  };


  /*
   * ==========================================================
   * OUVERTURE FORMULAIRE
   * ==========================================================
   */

  const handleNewPatient = () => {

    setFormData({
      nom: "",
      prenom: "",
      sexe: "",
      age: "",
      dateNaissance: "",
      service: "",
      telephone: "",
      parentContact: "",
      assurance: "Non",
      assuranceId: "",
      insuranceNumber: "",
      quartier: "",
    });

    setShowNewPatientForm(
      true
    );

    setActivePage(
      "patient"
    );
  };


  /*
   * ==========================================================
   * FERMETURE
   * ==========================================================
   */

  const handleCloseForm = () => {

    setShowNewPatientForm(
      false
    );
  };


  /*
   * ==========================================================
   * AJOUT PATIENT
   * ==========================================================
   */

  const handleAddPatient = async (
    event
  ) => {

    event.preventDefault();


    /*
     * CHAMPS OBLIGATOIRES
     */

    if (
      !formData.nom.trim() ||
      !formData.prenom.trim() ||
      !formData.sexe ||
      !formData.age ||
      !formData.service ||
      !formData.telephone.trim() ||
      !formData.parentContact.trim() ||
      !formData.quartier.trim()
    ) {

      alert(
        "Veuillez remplir tous les champs obligatoires."
      );

      return;
    }


    /*
     * ASSURANCE OBLIGATOIRE SI OUI
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
     * NUMÉRO ASSURANCE OBLIGATOIRE
     */

    if (
      formData.assurance ===
        "Oui" &&
      !formData.insuranceNumber.trim()
    ) {

      alert(
        "Veuillez renseigner le numéro d'assurance du patient."
      );

      return;
    }


    /*
     * ENREGISTREMENT
     *
     * Le backend attribue l'identifiant et calcule le coût
     * à partir du catalogue.
     */

    let newPatient;

    try {
      const response = await api.post(
        "/parcours/caisse/patients/",
        formData
      );

      newPatient = response.data;
    } catch (error) {
      const errors = error.response?.data;

      alert(
        errors && typeof errors === "object"
          ? Object.values(errors).flat().join("\n")
          : "Impossible d'enregistrer le patient. Veuillez réessayer."
      );

      return;
    }


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
      age: "",
      dateNaissance: "",
      service: "",
      telephone: "",
      parentContact: "",
      assurance: "Non",
      assuranceId: "",
      insuranceNumber: "",
      quartier: "",
    });
  };


  /*
   * ==========================================================
   * FORMAT MONNAIE
   * ==========================================================
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


  /*
   * ==========================================================
   * PAGE BILAN
   * ==========================================================
   */

  const renderBilanPage = () => {

    return (
      <section className="caisse-main">

        <div
          style={{
            marginBottom: "25px",
          }}
        >

          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              color: "#1f2937",
            }}
          >
            Bilan
          </h2>

          <p
            style={{
              marginTop: "7px",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Consultez les recettes enregistrées
            du jour, de la semaine et du mois.
          </p>

        </div>


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
              Bilan de la semaine
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
              Bilan du mois
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


        <div
          className="patients-card"
          style={{
            marginTop: "25px",
          }}
        >

          <div
            style={{
              padding: "20px",
              borderBottom:
                "1px solid #eeeeee",
            }}
          >

            <h3
              style={{
                margin: 0,
                fontSize: "17px",
                color: "#1f2937",
              }}
            >
              Informations du bilan
            </h3>

          </div>


          <div
            style={{
              padding: "20px",
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "18px",
            }}
          >

            <div
              style={{
                padding: "18px",
                background: "#f8fafc",
                borderRadius: "10px",
                border:
                  "1px solid #edf0f2",
              }}
            >

              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6b7280",
                  marginBottom: "8px",
                }}
              >
                Patients enregistrés aujourd'hui
              </span>

              <strong
                style={{
                  fontSize: "24px",
                  color: "#1f2937",
                }}
              >
                {
                  patients.filter(
                    (patient) => {
                      const date =
                        getPatientDate(
                          patient
                        );

                      return (
                        date &&
                        date >=
                          startOfToday
                      );
                    }
                  ).length
                }
              </strong>

            </div>


            <div
              style={{
                padding: "18px",
                background: "#f8fafc",
                borderRadius: "10px",
                border:
                  "1px solid #edf0f2",
              }}
            >

              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6b7280",
                  marginBottom: "8px",
                }}
              >
                Patients enregistrés cette semaine
              </span>

              <strong
                style={{
                  fontSize: "24px",
                  color: "#1f2937",
                }}
              >
                {
                  patients.filter(
                    (patient) => {
                      const date =
                        getPatientDate(
                          patient
                        );

                      return (
                        date &&
                        date >=
                          startOfWeek
                      );
                    }
                  ).length
                }
              </strong>

            </div>


            <div
              style={{
                padding: "18px",
                background: "#f8fafc",
                borderRadius: "10px",
                border:
                  "1px solid #edf0f2",
              }}
            >

              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6b7280",
                  marginBottom: "8px",
                }}
              >
                Patients enregistrés ce mois
              </span>

              <strong
                style={{
                  fontSize: "24px",
                  color: "#1f2937",
                }}
              >
                {
                  patients.filter(
                    (patient) => {
                      const date =
                        getPatientDate(
                          patient
                        );

                      return (
                        date &&
                        date >=
                          startOfMonth
                      );
                    }
                  ).length
                }
              </strong>

            </div>

          </div>

        </div>

      </section>
    );
  };


  /*
   * ==========================================================
   * PAGE ASSURANCE
   * ==========================================================
   */

  const renderInsurancePage = () => {

    return (
      <section className="caisse-main">

        <div
          style={{
            marginBottom: "25px",
          }}
        >

          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              color: "#1f2937",
            }}
          >
            Assurances
          </h2>

          <p
            style={{
              marginTop: "7px",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Assurances configurées et pourcentages
            de couverture.
          </p>

        </div>


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: "20px",
          }}
        >

          {insuranceConfiguration.map(
            (insurance) => (

              <article
                key={insurance.id}
                style={{
                  background: "#ffffff",
                  border:
                    "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "22px",
                  boxShadow:
                    "0 4px 14px rgba(0,0,0,0.04)",
                }}
              >

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    marginBottom: "20px",
                  }}
                >

                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background: "#eff6ff",
                      color: "#1671b7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                    }}
                  >
                    <Icon
                      name="insurance"
                      size={22}
                    />
                  </div>

                  <span
                    style={{
                      padding:
                        "6px 10px",
                      borderRadius:
                        "20px",
                      background:
                        "#ecfdf5",
                      color:
                        "#16a34a",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    ACTIVE
                  </span>

                </div>


                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    color: "#1f2937",
                  }}
                >
                  {insurance.name}
                </h3>


                <div
                  style={{
                    marginTop: "18px",
                    padding: "15px",
                    background:
                      "#f8fafc",
                    borderRadius: "9px",
                  }}
                >

                  <span
                    style={{
                      display: "block",
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "5px",
                    }}
                  >
                    Taux de couverture
                  </span>

                  <strong
                    style={{
                      fontSize: "28px",
                      color: "#1671b7",
                    }}
                  >
                    {insurance.coverage}%
                  </strong>

                </div>

              </article>

            )
          )}

        </div>


        <div
          style={{
            marginTop: "25px",
            padding: "18px 20px",
            background: "#f8fafc",
            border:
              "1px solid #edf0f2",
            borderRadius: "10px",
          }}
        >

          <strong
            style={{
              display: "block",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            Fonctionnement
          </strong>

          <span
            style={{
              fontSize: "13px",
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Le taux de couverture est appliqué
            automatiquement au tarif du service
            lorsqu'un patient possède une assurance.
            Le montant restant correspond au montant
            à payer par le patient.
          </span>

        </div>

      </section>
    );
  };


  /*
   * ==========================================================
   * PAGE PATIENT
   * ==========================================================
   */

  const renderPatientPage = () => {

    return (
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
                    Coût
                  </th>

                  <th>
                    Assurance
                  </th>

                  <th>
                    N° assurance
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
                                ? "#c94f4f"
                                : item.sexe ===
                                  "Féminin"
                                ? "#1671b7"
                                : "#374151",

                            fontWeight: 600,
                          }}
                        >
                          {item.sexe ||
                            "-"}
                        </span>

                      </td>


                      <td>
                        {item.service ||
                          "--"}
                      </td>


                      <td>
                        {item.telephone ||
                          "--"}
                      </td>

                      <td>
                        {item.parentContact ||
                          "--"}
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
                        {item.insurance ===
                          "Oui" &&
                        item.insuranceNumber
                          ? item.insuranceNumber
                          : "--"}
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
                      colSpan="10"
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

      </section>
    );
  };


  /*
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <div className="caisse-page">

      {/* =========================================================
          SIDEBAR
      ========================================================= */}

      <aside className="caisse-sidebar">

        <div className="caisse-brand">

          <div className="brand-icon">
            <Logo size={30} inverted />
          </div>

          <div className="brand-text">
            <span>MA</span>{" "}
            <strong>SANTÉ</strong>
          </div>

        </div>


        <nav className="caisse-nav">

          {/* ENREGISTRER PATIENT */}

          <button
            type="button"
            className={`caisse-nav-item ${
              activePage === "patient"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage(
                "patient"
              )
            }
          >

            <Icon name="patient" />

            <span>
              Enregistrer un patient
            </span>

          </button>


          {/* BILAN */}

          <button
            type="button"
            className={`caisse-nav-item ${
              activePage === "bilan"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage(
                "bilan"
              )
            }
          >

            <Icon name="report" />

            <span>
              Bilan
            </span>

          </button>


          {/* ASSURANCE */}

          <button
            type="button"
            className={`caisse-nav-item ${
              activePage === "assurance"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage(
                "assurance"
              )
            }
          >

            <Icon name="insurance" />

            <span>
              Assurance
            </span>

          </button>

        </nav>

        <SidebarFooter />

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
              {activePage === "patient"
                ? "Enregistrement / Accueil patient"
                : activePage === "bilan"
                ? "Bilan des recettes"
                : "Gestion des assurances"}
            </p>

          </div>


          <div className="ms-header-tools">
            <NotificationBell />
            <UserBadge />
          </div>

        </header>


        {/* =====================================================
            PAGE ACTIVE
        ===================================================== */}

        {activePage === "patient" &&
          renderPatientPage()}

        {activePage === "bilan" &&
          renderBilanPage()}

        {activePage === "assurance" &&
          renderInsurancePage()}

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
                          ? "#c94f4f"
                          : formData.sexe ===
                            "Féminin"
                          ? "#1671b7"
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
                          "#c94f4f",
                        fontWeight: 600,
                      }}
                    >
                      Masculin
                    </option>

                    <option
                      value="Féminin"
                      style={{
                        color:
                          "#1671b7",
                        fontWeight: 600,
                      }}
                    >
                      Féminin
                    </option>

                  </select>

                </div>


                {/* ÂGE */}

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
                    Âge
                  </label>

                  <input
                    type="number"
                    name="age"
                    value={
                      formData.age
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="Ex : 35"
                    min="0"
                    max="120"
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


                {/* DATE DE NAISSANCE */}

                {formData.age !== "" && (

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
                      Date de naissance
                    </label>

                    <input
                      type="date"
                      name="dateNaissance"
                      value={
                        formData.dateNaissance
                      }
                      readOnly
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
                          "#f8fafc",
                        boxSizing:
                          "border-box",
                        color:
                          "#374151",
                      }}
                    />

                  </div>

                )}


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


                {/* CONTACT PATIENT */}

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
                    Contact du patient
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


                {/* NUMÉRO PARENT */}

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
                    Numéro d'un parent
                  </label>

                  <input
                    type="tel"
                    name="parentContact"
                    value={
                      formData.parentContact
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="Ex : 0500000000"
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
                            - Couverture{" "}
                            {
                              insurance.coverage
                            }%
                          </option>

                        )
                      )}

                    </select>

                  </div>

                )}


                {/* NUMÉRO ASSURANCE */}

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
                      Numéro d'assurance
                    </label>

                    <input
                      type="text"
                      name="insuranceNumber"
                      value={
                        formData.insuranceNumber
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="Ex : MUG-2026-000123"
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


                    {coverage >
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
                        -{coverage}%
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


                      {coverage >
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
                            Couverture assurance
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
                            "#1671b7",
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
                      "#1671b7",
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