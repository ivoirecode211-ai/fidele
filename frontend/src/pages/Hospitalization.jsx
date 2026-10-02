import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useModuleView } from "../layouts/AppLayout";
import "../styles/Hospitalization.css";


import {
  BedDouble,
  BedSingle,
  CircleCheck,
  Eye,
  LogOut,
  Plus,
  Search,
  X,
} from "lucide-react";
// ============================================================
// DONNÉES INITIALES DES HOSPITALISATIONS
// ============================================================

// ============================================================
// DONNÉES INITIALES DES CHAMBRES
// ============================================================

// ============================================================
// COMPOSANT
// ============================================================

const Hospitalization = () => {

  // ==========================================================
  // ÉTATS PRINCIPAUX
  // ==========================================================

  // Sous-module de la barre latérale : patients hospitalisés, lits, sorties prévues, historique.
  const vue = useModuleView("/hospitalization");
  const activeTab = vue.id === "lits" ? "chambres" : "hospitalisations";

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
    useState([]);

  const [rooms, setRooms] = useState([]);

  // Séjours, chambres et lits servis par l'API
  // (/api/hospitalization/service/).
  const loadWard = () =>
    api
      .get("/hospitalization/service/")
      .then((response) => {
        setHospitalizations(response.data.hospitalizations);
        setRooms(response.data.rooms);
      })
      .catch((error) =>
        console.error("Erreur de chargement de l'hospitalisation :", error)
      );

  useEffect(() => {
    loadWard();
  }, []);

  const apiError = (error, fallback) => {
    const data = error.response?.data;
    return data && typeof data === "object" ? Object.values(data).flat().join("\n") : fallback;
  };

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


          const demain = new Date(Date.now() + 86400000).toLocaleDateString("fr-FR");
          const matchesVue =
            vue.id === "historique" ? item.status === "Sortie"
              : vue.id === "sorties" ? item.status === "Sortie prévue" || (item.status !== "Sortie" && item.sortiePrevue === demain)
                : item.status !== "Sortie";

          return (
            matchesSearch &&
            matchesStatus &&
            matchesVue
          );

        }
      );

    }, [
      hospitalizations,
      search,
      statusFilter,
      vue.id,
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

  const handleAddBed = async () => {

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
    // CHAMBRE : existante ou nouvelle (créée par le serveur)
    // --------------------------------------------------------
    const room =
      rooms.find(
        (item) =>
          item.number.toLowerCase() ===
          roomNumber.toLowerCase()
      );

    const existingBeds =
      room?.beds || [];

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
        `Le lit ${bedNumber} existe déjà dans la chambre ${room.number}.`
      );
      return;
    }

    // --------------------------------------------------------
    // AJOUT DU LIT
    // --------------------------------------------------------
    try {
      await api.post("/hospitalization/service/lits/", {
        room: roomNumber,
        bed: bedNumber,
      });
    } catch (error) {
      alert(apiError(error, "Impossible d'ajouter le lit."));
      return;
    }

    loadWard();

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
    async (patientId) => {

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
      // SORTIE : le lit est libéré côté serveur
      // ------------------------------------------------------
      try {
        await api.post(`/hospitalization/service/sejours/${patientId}/sortie/`);
      } catch (error) {
        alert(apiError(error, "Impossible d'enregistrer la sortie."));
        return;
      }

      loadWard();

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



        <button
          className="hospitalization-primary-btn"
          onClick={() =>
            setShowAdmissionModal(true)
          }
        >

          <span>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
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
            <BedDouble size={22} strokeWidth={2} aria-hidden="true" />
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
            <CircleCheck size={22} strokeWidth={2} aria-hidden="true" />
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
            <LogOut size={22} strokeWidth={2} aria-hidden="true" />
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
            <BedSingle size={22} strokeWidth={2} aria-hidden="true" />
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

      {/* Les onglets sont devenus des sous-modules de la barre latérale. */}


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
                <Search size={17} strokeWidth={2} aria-hidden="true" />
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
                            <Eye size={16} strokeWidth={2} aria-hidden="true" />
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
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>

            </div>


            {/* FORMULAIRE */}

            <div className="modal-body">


              {/* CHAMBRE */}

              <div className="form-group">

                <label>
                  Numéro de la chambre
                </label>


                <input
                  type="text"
                  list="hospitalization-rooms"
                  placeholder="Ex : A-101"
                  value={newBedRoom}
                  onChange={(e) =>
                    setNewBedRoom(
                      e.target.value
                    )
                  }
                />

                {/* Suggestions : une chambre inconnue est créée */}
                <datalist id="hospitalization-rooms">
                  {rooms.map((room) => (
                    <option
                      key={room.id}
                      value={room.number}
                    >
                      {room.service}
                    </option>
                  ))}
                </datalist>

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
                <X size={18} strokeWidth={2} aria-hidden="true" />
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