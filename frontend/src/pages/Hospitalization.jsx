import { useEffect, useMemo, useState } from "react";
import "../styles/Hospitalization.css";


// ============================================================
// DONNÉES INITIALES DES HOSPITALISATIONS
// ============================================================

const initialHospitalizations = [
  {
    id: 1,
    patient: "KOFFI Jean",
    dossier: "PAT-000125",
    age: 42,
    sexe: "Homme",
    service: "Médecine générale",
    chambre: "A-102",
    lit: "Lit 01",
    admission: "15/09/2026",
    sortiePrevue: "20/09/2026",
    medecin: "Dr. DJE",
    motif: "Paludisme",
    status: "En cours",
  },

  {
    id: 2,
    patient: "KOUASSI Marie",
    dossier: "PAT-000126",
    age: 34,
    sexe: "Femme",
    service: "Maternité",
    chambre: "B-204",
    lit: "Lit 02",
    admission: "16/09/2026",
    sortiePrevue: "19/09/2026",
    medecin: "Dr. YAO",
    motif: "Surveillance",
    status: "En cours",
  },

  {
    id: 3,
    patient: "YAO Ibrahim",
    dossier: "PAT-000127",
    age: 58,
    sexe: "Homme",
    service: "Cardiologie",
    chambre: "C-301",
    lit: "Lit 01",
    admission: "14/09/2026",
    sortiePrevue: "18/09/2026",
    medecin: "Dr. KOFFI",
    motif: "Hypertension",
    status: "Sortie prévue",
  },

  {
    id: 4,
    patient: "ADJE Fatou",
    dossier: "PAT-000128",
    age: 27,
    sexe: "Femme",
    service: "Chirurgie",
    chambre: "D-105",
    lit: "Lit 01",
    admission: "12/09/2026",
    sortiePrevue: "17/09/2026",
    medecin: "Dr. N'GUESSAN",
    motif: "Intervention chirurgicale",
    status: "En cours",
  },

  {
    id: 5,
    patient: "KOUAME Paul",
    dossier: "PAT-000129",
    age: 63,
    sexe: "Homme",
    service: "Médecine générale",
    chambre: "A-103",
    lit: "Lit 02",
    admission: "10/09/2026",
    sortiePrevue: "16/09/2026",
    medecin: "Dr. DJE",
    motif: "Diabète",
    status: "Sortie",
  },
];


// ============================================================
// DONNÉES INITIALES DES CHAMBRES
// ============================================================

const initialRooms = [
  {
    id: 1,
    number: "A-101",
    service: "Médecine générale",
    type: "Standard",
    totalBeds: 2,
    occupiedBeds: 1,
    beds: ["Lit 01", "Lit 02"],
  },

  {
    id: 2,
    number: "A-102",
    service: "Médecine générale",
    type: "Standard",
    totalBeds: 2,
    occupiedBeds: 2,
    beds: ["Lit 01", "Lit 02"],
  },

  {
    id: 3,
    number: "B-201",
    service: "Maternité",
    type: "Standard",
    totalBeds: 3,
    occupiedBeds: 2,
    beds: ["Lit 01", "Lit 02", "Lit 03"],
  },

  {
    id: 4,
    number: "B-204",
    service: "Maternité",
    type: "VIP",
    totalBeds: 2,
    occupiedBeds: 1,
    beds: ["Lit 01", "Lit 02"],
  },

  {
    id: 5,
    number: "C-301",
    service: "Cardiologie",
    type: "VIP",
    totalBeds: 1,
    occupiedBeds: 1,
    beds: ["Lit 01"],
  },

  {
    id: 6,
    number: "D-105",
    service: "Chirurgie",
    type: "Standard",
    totalBeds: 2,
    occupiedBeds: 1,
    beds: ["Lit 01", "Lit 02"],
  },
];


// ============================================================
// COMPOSANT
// ============================================================

const Hospitalization = () => {

  // ==========================================================
  // ÉTATS PRINCIPAUX
  // ==========================================================

  const [activeTab, setActiveTab] = useState(
    "hospitalisations"
  );

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState(
    "Tous"
  );

  const [showAdmissionModal, setShowAdmissionModal] =
    useState(false);

  const [showDetailsModal, setShowDetailsModal] =
    useState(false);

  const [selectedPatient, setSelectedPatient] =
    useState(null);


  // ==========================================================
  // FORMULAIRE AJOUT DE LIT
  // ==========================================================

  const [newBedRoom, setNewBedRoom] = useState("");

  const [newBedNumber, setNewBedNumber] =
    useState("");


  // ==========================================================
  // HOSPITALISATIONS
  // ==========================================================

  const [hospitalizations, setHospitalizations] =
    useState(() => {

      const saved =
        localStorage.getItem(
          "hospitalizations"
        );

      if (saved) {

        try {

          return JSON.parse(saved);

        } catch (error) {

          console.error(
            "Erreur lors de la lecture des hospitalisations :",
            error
          );

        }
      }

      return initialHospitalizations;
    });


  // ==========================================================
  // CHAMBRES
  // ==========================================================

  const [rooms, setRooms] = useState(() => {

    const savedRooms =
      localStorage.getItem(
        "hospitalization_rooms"
      );

    if (savedRooms) {

      try {

        const parsedRooms =
          JSON.parse(savedRooms);

        return parsedRooms.map((room) => {

          if (!room.beds) {

            return {
              ...room,
              beds: Array.from(
                { length: room.totalBeds },
                (_, index) =>
                  `Lit ${String(index + 1).padStart(
                    2,
                    "0"
                  )}`
              ),
            };

          }

          return room;

        });

      } catch (error) {

        console.error(
          "Erreur lors de la lecture des chambres :",
          error
        );

      }
    }

    return initialRooms;
  });


  // ==========================================================
  // SAUVEGARDE DES HOSPITALISATIONS
  // ==========================================================

  useEffect(() => {

    localStorage.setItem(
      "hospitalizations",
      JSON.stringify(hospitalizations)
    );

  }, [hospitalizations]);


  // ==========================================================
  // SAUVEGARDE DES CHAMBRES
  // ==========================================================

  useEffect(() => {

    localStorage.setItem(
      "hospitalization_rooms",
      JSON.stringify(rooms)
    );

  }, [rooms]);


  // ==========================================================
  // SYNCHRONISATION AVEC CONSULTATIONS
  // ==========================================================

  useEffect(() => {

    const handleStorageChange = (event) => {

      if (
        event.key === "hospitalizations" &&
        event.newValue
      ) {

        try {

          const updated =
            JSON.parse(event.newValue);

          setHospitalizations(updated);

        } catch (error) {

          console.error(
            "Erreur de synchronisation des hospitalisations :",
            error
          );

        }

      }


      if (
        event.key === "hospitalization_rooms" &&
        event.newValue
      ) {

        try {

          const updatedRooms =
            JSON.parse(event.newValue);

          setRooms(updatedRooms);

        } catch (error) {

          console.error(
            "Erreur de synchronisation des chambres :",
            error
          );

        }

      }

    };


    window.addEventListener(
      "storage",
      handleStorageChange
    );


    return () => {

      window.removeEventListener(
        "storage",
        handleStorageChange
      );

    };

  }, []);


  // ==========================================================
  // STATISTIQUES
  // ==========================================================

  const totalHospitalized =
    hospitalizations.filter(
      (item) =>
        item.status !== "Sortie"
    ).length;


  const totalBeds =
    rooms.reduce(
      (total, room) =>
        total + room.totalBeds,
      0
    );


  const occupiedBeds =
    rooms.reduce(
      (total, room) =>
        total + room.occupiedBeds,
      0
    );


  const availableBeds =
    Math.max(
      0,
      totalBeds - occupiedBeds
    );


  const plannedDischarges =
    hospitalizations.filter(
      (item) =>
        item.status === "Sortie prévue"
    ).length;


  // ==========================================================
  // RECHERCHE ET FILTRE
  // ==========================================================

  const filteredHospitalizations =
    useMemo(() => {

      return hospitalizations.filter(
        (item) => {

          const searchValue =
            search
              .toLowerCase()
              .trim();


          const matchesSearch =
            item.patient
              ?.toLowerCase()
              .includes(searchValue) ||

            item.dossier
              ?.toLowerCase()
              .includes(searchValue) ||

            item.chambre
              ?.toLowerCase()
              .includes(searchValue) ||

            item.service
              ?.toLowerCase()
              .includes(searchValue);


          const matchesStatus =
            statusFilter === "Tous" ||
            item.status === statusFilter;


          return (
            matchesSearch &&
            matchesStatus
          );

        }
      );

    }, [
      hospitalizations,
      search,
      statusFilter,
    ]);


  // ==========================================================
  // OUVRIR LES DÉTAILS
  // ==========================================================

  const handleDetails = (patient) => {

    setSelectedPatient(patient);

    setShowDetailsModal(true);

  };


  // ==========================================================
  // AJOUTER UN LIT
  // ==========================================================

  const handleAddBed = () => {

    const roomNumber =
      newBedRoom.trim();

    const bedNumber =
      newBedNumber.trim();


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!roomNumber || !bedNumber) {

      alert(
        "Veuillez renseigner la chambre et le numéro du lit."
      );

      return;
    }


    // --------------------------------------------------------
    // RECHERCHE DE LA CHAMBRE
    // --------------------------------------------------------

    const room =
      rooms.find(
        (item) =>
          item.number === roomNumber
      );


    if (!room) {

      alert(
        "La chambre sélectionnée n'existe pas."
      );

      return;
    }


    // --------------------------------------------------------
    // LISTE DES LITS EXISTANTS
    // --------------------------------------------------------

    const existingBeds =
      room.beds || [];


    // --------------------------------------------------------
    // VÉRIFICATION DU DOUBLON
    // --------------------------------------------------------

    const bedAlreadyExists =
      existingBeds.some(
        (bed) =>
          bed.toLowerCase() ===
          bedNumber.toLowerCase()
      );


    if (bedAlreadyExists) {

      alert(
        `Le lit ${bedNumber} existe déjà dans la chambre ${roomNumber}.`
      );

      return;
    }


    // --------------------------------------------------------
    // AJOUT DU LIT
    // --------------------------------------------------------

    const updatedRooms =
      rooms.map((item) => {

        if (
          item.number !== roomNumber
        ) {

          return item;

        }


        return {

          ...item,

          totalBeds:
            item.totalBeds + 1,

          beds: [
            ...existingBeds,
            bedNumber,
          ],

        };

      });


    setRooms(updatedRooms);


    // --------------------------------------------------------
    // RÉINITIALISATION DU FORMULAIRE
    // --------------------------------------------------------

    setNewBedRoom("");

    setNewBedNumber("");


    // --------------------------------------------------------
    // FERMETURE DE LA MODALE
    // --------------------------------------------------------

    setShowAdmissionModal(false);

  };


  // ==========================================================
  // TERMINER UNE HOSPITALISATION
  // ==========================================================

  const handleTerminateHospitalization =
    (patientId) => {

      const hospitalization =
        hospitalizations.find(
          (item) =>
            item.id === patientId
        );


      if (!hospitalization) {

        return;

      }


      if (
        hospitalization.status ===
        "Sortie"
      ) {

        return;

      }


      // ------------------------------------------------------
      // MISE À JOUR DU STATUT
      // ------------------------------------------------------

      const updatedHospitalizations =
        hospitalizations.map(
          (item) =>
            item.id === patientId
              ? {
                  ...item,
                  status: "Sortie",
                }
              : item
        );


      setHospitalizations(
        updatedHospitalizations
      );


      // ------------------------------------------------------
      // LIBÉRATION DU LIT
      // ------------------------------------------------------

      const updatedRooms =
        rooms.map((room) => {

          if (
            room.number ===
            hospitalization.chambre
          ) {

            return {

              ...room,

              occupiedBeds:
                Math.max(
                  0,
                  room.occupiedBeds - 1
                ),

            };

          }


          return room;

        });


      setRooms(updatedRooms);


      // ------------------------------------------------------
      // MISE À JOUR DU PATIENT DANS LE MODAL
      // ------------------------------------------------------

      setSelectedPatient(
        (previous) =>
          previous
            ? {
                ...previous,
                status: "Sortie",
              }
            : null
      );

    };


  // ==========================================================
  // FERMER LES MODALES
  // ==========================================================

  const closeModals = () => {

    setShowAdmissionModal(false);

    setShowDetailsModal(false);

    setSelectedPatient(null);

    setNewBedRoom("");

    setNewBedNumber("");

  };


  // ==========================================================
  // RENDU
  // ==========================================================

  return (

    <div className="hospitalization-page">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="hospitalization-header">

        <div>

          <div className="hospitalization-breadcrumb">

            Tableau de bord

            <span>
              /
            </span>

            Hospitalisation

          </div>


          <h1>
            Hospitalisation
          </h1>


          <p>
            Gestion des admissions, des chambres et des
            patients hospitalisés.
          </p>

        </div>


        <button
          className="hospitalization-primary-btn"
          onClick={() =>
            setShowAdmissionModal(true)
          }
        >

          <span>
            +
          </span>

          Ajout de lits

        </button>

      </div>


      {/* ======================================================
          STATISTIQUES
      ====================================================== */}

      <div className="hospitalization-stats">


        {/* PATIENTS HOSPITALISÉS */}

        <div className="hospitalization-stat-card">

          <div className="stat-icon blue">
            🛏
          </div>


          <div className="stat-content">

            <span>
              Patients hospitalisés
            </span>

            <strong>
              {totalHospitalized}
            </strong>

            <small>
              Patients actuellement admis
            </small>

          </div>

        </div>


        {/* LITS DISPONIBLES */}

        <div className="hospitalization-stat-card">

          <div className="stat-icon green">
            ✓
          </div>


          <div className="stat-content">

            <span>
              Lits disponibles
            </span>

            <strong>
              {availableBeds}
            </strong>

            <small>
              Sur {totalBeds} lits
            </small>

          </div>

        </div>


        {/* SORTIES PRÉVUES */}

        <div className="hospitalization-stat-card">

          <div className="stat-icon orange">
            ↗
          </div>


          <div className="stat-content">

            <span>
              Sorties prévues
            </span>

            <strong>
              {plannedDischarges}
            </strong>

            <small>
              À surveiller
            </small>

          </div>

        </div>


        {/* LITS OCCUPÉS */}

        <div className="hospitalization-stat-card">

          <div className="stat-icon purple">
            ▣
          </div>


          <div className="stat-content">

            <span>
              Lits occupés
            </span>

            <strong>
              {occupiedBeds}
            </strong>

            <small>

              {totalBeds > 0
                ? Math.round(
                    (occupiedBeds /
                      totalBeds) *
                      100
                  )
                : 0}

              % d'occupation

            </small>

          </div>

        </div>

      </div>


      {/* ======================================================
          ONGLETS
      ====================================================== */}

      <div className="hospitalization-tabs">

        <button
          className={
            activeTab ===
            "hospitalisations"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "hospitalisations"
            )
          }
        >
          Hospitalisations
        </button>


        <button
          className={
            activeTab ===
            "chambres"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "chambres"
            )
          }
        >
          Chambres & lits
        </button>

      </div>


      {/* ======================================================
          HOSPITALISATIONS
      ====================================================== */}

      {activeTab ===
        "hospitalisations" && (

        <div className="hospitalization-content">


          {/* BARRE DE RECHERCHE */}

          <div className="hospitalization-toolbar">


            <div className="hospitalization-search">

              <span>
                ⌕
              </span>


              <input
                type="text"
                placeholder="Rechercher un patient, dossier, chambre..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />

            </div>


            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
            >

              <option value="Tous">
                Tous les statuts
              </option>

              <option value="En cours">
                En cours
              </option>

              <option value="Sortie prévue">
                Sortie prévue
              </option>

              <option value="Sortie">
                Sortie
              </option>

            </select>

          </div>


          {/* TABLEAU */}

          <div className="hospitalization-table-wrapper">

            <table className="hospitalization-table">

              <thead>

                <tr>

                  <th>
                    Patient
                  </th>

                  <th>
                    Service
                  </th>

                  <th>
                    Chambre / Lit
                  </th>

                  <th>
                    Admission
                  </th>

                  <th>
                    Sortie prévue
                  </th>

                  <th>
                    Médecin
                  </th>

                  <th>
                    Statut
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredHospitalizations.length >
                0 ? (

                  filteredHospitalizations.map(
                    (item) => (

                      <tr key={item.id}>


                        {/* PATIENT */}

                        <td>

                          <div className="patient-cell">

                            <div className="patient-avatar">

                              {item.patient
                                ?.split(" ")
                                .map(
                                  (word) =>
                                    word[0]
                                )
                                .join("")
                                .substring(
                                  0,
                                  2
                                )}

                            </div>


                            <div>

                              <strong>
                                {item.patient}
                              </strong>

                              <span>
                                {item.dossier}{" "}
                                ·{" "}
                                {item.age}{" "}
                                ans
                              </span>

                            </div>

                          </div>

                        </td>


                        {/* SERVICE */}

                        <td>

                          <span className="service-name">
                            {item.service}
                          </span>

                          <small className="motif">
                            {item.motif}
                          </small>

                        </td>


                        {/* CHAMBRE / LIT */}

                        <td>

                          <div className="room-cell">

                            <strong>
                              {item.chambre}
                            </strong>

                            <span>
                              {item.lit}
                            </span>

                          </div>

                        </td>


                        {/* ADMISSION */}

                        <td>
                          {item.admission}
                        </td>


                        {/* SORTIE PRÉVUE */}

                        <td>
                          {item.sortiePrevue ||
                            "—"}
                        </td>


                        {/* MÉDECIN */}

                        <td>
                          {item.medecin}
                        </td>


                        {/* STATUT */}

                        <td>

                          <span
                            className={`status-badge ${item.status
                              ?.toLowerCase()
                              .replaceAll(
                                " ",
                                "-"
                              )}`}
                          >

                            <span className="status-dot"></span>

                            {item.status}

                          </span>

                        </td>


                        {/* ACTION */}

                        <td>

                          <button
                            className="action-button"
                            title="Voir les détails"
                            onClick={() =>
                              handleDetails(
                                item
                              )
                            }
                          >
                            👁
                          </button>

                        </td>

                      </tr>

                    )
                  )

                ) : (

                  <tr>

                    <td
                      colSpan="8"
                      className="empty-state"
                    >
                      Aucun patient trouvé.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      )}


      {/* ======================================================
          CHAMBRES ET LITS
      ====================================================== */}

      {activeTab ===
        "chambres" && (

        <div className="rooms-section">


          <div className="rooms-header">

            <div>

              <h2>
                Chambres et lits
              </h2>

              <p>
                Visualisez l'occupation actuelle des chambres.
              </p>

            </div>

          </div>


          <div className="rooms-grid">

            {rooms.map((room) => {

              const available =
                Math.max(
                  0,
                  room.totalBeds -
                    room.occupiedBeds
                );


              const occupation =
                room.totalBeds > 0
                  ? (room.occupiedBeds /
                      room.totalBeds) *
                    100
                  : 0;


              return (

                <div
                  className="room-card"
                  key={room.id}
                >


                  {/* EN-TÊTE CHAMBRE */}

                  <div className="room-card-header">

                    <div>

                      <span className="room-label">
                        Chambre
                      </span>

                      <h3>
                        {room.number}
                      </h3>

                    </div>


                    <span
                      className={`room-type ${
                        room.type ===
                        "VIP"
                          ? "vip"
                          : ""
                      }`}
                    >
                      {room.type}
                    </span>

                  </div>


                  {/* SERVICE */}

                  <div className="room-service">
                    {room.service}
                  </div>


                  {/* OCCUPATION */}

                  <div className="room-occupancy">

                    <div className="occupancy-header">

                      <span>
                        Occupation
                      </span>

                      <strong>
                        {room.occupiedBeds}/
                        {room.totalBeds}
                      </strong>

                    </div>


                    <div className="occupancy-bar">

                      <div
                        className="occupancy-progress"
                        style={{
                          width: `${Math.min(
                            occupation,
                            100
                          )}%`,
                        }}
                      ></div>

                    </div>

                  </div>


                  {/* PIED DE CARTE */}

                  <div className="room-footer">

                    <span className="occupied">
                      {room.occupiedBeds}{" "}
                      occupé(s)
                    </span>

                    <span className="available">
                      {available}{" "}
                      disponible(s)
                    </span>

                  </div>


                  {/* LISTE DES LITS */}

                  <div className="room-beds-list">

                    <span className="room-beds-title">
                      Lits
                    </span>


                    <div className="beds-container">

                      {(room.beds ||
                        []).map(
                        (bed) => {

                          const occupied =
                            hospitalizations.some(
                              (item) =>
                                item.chambre ===
                                  room.number &&
                                item.lit ===
                                  bed &&
                                item.status !==
                                  "Sortie"
                            );


                          return (

                            <span
                              key={bed}
                              className={
                                occupied
                                  ? "bed-item occupied"
                                  : "bed-item available"
                              }
                            >

                              {bed}

                              <small>
                                {occupied
                                  ? "Occupé"
                                  : "Disponible"}
                              </small>

                            </span>

                          );

                        }
                      )}

                    </div>

                  </div>

                </div>

              );

            })}

          </div>

        </div>

      )}


      {/* ======================================================
          MODALE AJOUT DE LIT
      ====================================================== */}

      {showAdmissionModal && (

        <div
          className="hospitalization-modal-overlay"
          onClick={closeModals}
        >

          <div
            className="hospitalization-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >


            {/* EN-TÊTE */}

            <div className="modal-header">

              <div>

                <h2>
                  Ajouter un lit
                </h2>

                <p>
                  Ajouter un nouveau lit dans une chambre existante.
                </p>

              </div>


              <button
                className="modal-close"
                onClick={closeModals}
              >
                ×
              </button>

            </div>


            {/* FORMULAIRE */}

            <div className="modal-body">


              {/* CHAMBRE */}

              <div className="form-group">

                <label>
                  Numéro de la chambre
                </label>


                <select
                  value={newBedRoom}
                  onChange={(e) =>
                    setNewBedRoom(
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Sélectionner une chambre
                  </option>


                  {rooms.map((room) => (

                    <option
                      key={room.id}
                      value={room.number}
                    >
                      {room.number} —{" "}
                      {room.service}
                    </option>

                  ))}

                </select>

              </div>


              {/* NUMÉRO DU LIT */}

              <div className="form-group">

                <label>
                  Numéro du lit
                </label>


                <input
                  type="text"
                  placeholder="Ex. Lit 03"
                  value={newBedNumber}
                  onChange={(e) =>
                    setNewBedNumber(
                      e.target.value
                    )
                  }
                />

              </div>


              {/* INFORMATIONS CHAMBRE */}

              {newBedRoom && (

                <div className="bed-add-info">

                  {(() => {

                    const room =
                      rooms.find(
                        (item) =>
                          item.number ===
                          newBedRoom
                      );


                    if (!room) {
                      return null;
                    }


                    const available =
                      Math.max(
                        0,
                        room.totalBeds -
                          room.occupiedBeds
                      );


                    return (

                      <>

                        <strong>
                          Chambre{" "}
                          {room.number}
                        </strong>

                        <span>

                          {room.totalBeds}{" "}
                          lit(s)
                          actuellement ·{" "}

                          {available}{" "}
                          disponible(s)

                        </span>

                      </>

                    );

                  })()}

                </div>

              )}

            </div>


            {/* FOOTER */}

            <div className="modal-footer">

              <button
                className="secondary-button"
                onClick={closeModals}
              >
                Annuler
              </button>


              <button
                className="hospitalization-primary-btn"
                onClick={handleAddBed}
              >
                Ajouter le lit
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          MODALE DÉTAILS PATIENT
      ====================================================== */}

      {showDetailsModal &&
        selectedPatient && (

        <div
          className="hospitalization-modal-overlay"
          onClick={closeModals}
        >

          <div
            className="hospitalization-modal details-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >


            {/* EN-TÊTE */}

            <div className="modal-header">

              <div>

                <h2>
                  Dossier d'hospitalisation
                </h2>

                <p>
                  Informations du patient hospitalisé.
                </p>

              </div>


              <button
                className="modal-close"
                onClick={closeModals}
              >
                ×
              </button>

            </div>


            {/* DÉTAILS */}

            <div className="patient-details">


              {/* PROFIL */}

              <div className="details-profile">

                <div className="large-avatar">

                  {selectedPatient.patient
                    ?.split(" ")
                    .map(
                      (word) =>
                        word[0]
                    )
                    .join("")
                    .substring(
                      0,
                      2
                    )}

                </div>


                <div>

                  <h3>
                    {selectedPatient.patient}
                  </h3>

                  <p>
                    {selectedPatient.dossier}
                  </p>

                </div>

              </div>


              {/* GRILLE INFORMATIONS */}

              <div className="details-grid">


                <div>

                  <span>
                    Âge
                  </span>

                  <strong>
                    {selectedPatient.age}{" "}
                    ans
                  </strong>

                </div>


                <div>

                  <span>
                    Sexe
                  </span>

                  <strong>
                    {selectedPatient.sexe}
                  </strong>

                </div>


                <div>

                  <span>
                    Service
                  </span>

                  <strong>
                    {selectedPatient.service}
                  </strong>

                </div>


                <div>

                  <span>
                    Chambre
                  </span>

                  <strong>
                    {selectedPatient.chambre}
                  </strong>

                </div>


                <div>

                  <span>
                    Lit
                  </span>

                  <strong>
                    {selectedPatient.lit}
                  </strong>

                </div>


                <div>

                  <span>
                    Médecin
                  </span>

                  <strong>
                    {selectedPatient.medecin}
                  </strong>

                </div>


                <div>

                  <span>
                    Date d'admission
                  </span>

                  <strong>
                    {selectedPatient.admission}
                  </strong>

                </div>


                <div>

                  <span>
                    Sortie prévue
                  </span>

                  <strong>
                    {selectedPatient.sortiePrevue ||
                      "—"}
                  </strong>

                </div>

              </div>


              {/* MOTIF */}

              <div className="details-motif">

                <span>
                  Motif d'hospitalisation
                </span>

                <p>
                  {selectedPatient.motif}
                </p>

              </div>


              {/* STATUT */}

              <div className="details-status">

                <span>
                  Statut
                </span>

                <strong>
                  {selectedPatient.status}
                </strong>

              </div>

            </div>


            {/* FOOTER */}

            <div className="modal-footer">


              <button
                className="secondary-button"
                onClick={closeModals}
              >
                Fermer
              </button>


              {/* BOUTON TERMINER */}

              {selectedPatient.status !==
                "Sortie" && (

                <button
                  className="hospitalization-danger-btn"
                  onClick={() =>
                    handleTerminateHospitalization(
                      selectedPatient.id
                    )
                  }
                >
                  Terminer l'hospitalisation
                </button>

              )}

            </div>

          </div>

        </div>

      )}

    </div>

  );

};


export default Hospitalization;