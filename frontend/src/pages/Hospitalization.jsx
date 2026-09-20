import { useMemo, useState } from "react";
import "../styles/Hospitalization.css";


const Hospitalization = () => {

  const [activeTab, setActiveTab] = useState("hospitalisations");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("Tous");

  const [showAdmissionModal, setShowAdmissionModal] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);


  const hospitalizations = [
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


  const rooms = [
    {
      id: 1,
      number: "A-101",
      service: "Médecine générale",
      type: "Standard",
      totalBeds: 2,
      occupiedBeds: 1,
    },

    {
      id: 2,
      number: "A-102",
      service: "Médecine générale",
      type: "Standard",
      totalBeds: 2,
      occupiedBeds: 2,
    },

    {
      id: 3,
      number: "B-201",
      service: "Maternité",
      type: "Standard",
      totalBeds: 3,
      occupiedBeds: 2,
    },

    {
      id: 4,
      number: "B-204",
      service: "Maternité",
      type: "VIP",
      totalBeds: 2,
      occupiedBeds: 1,
    },

    {
      id: 5,
      number: "C-301",
      service: "Cardiologie",
      type: "VIP",
      totalBeds: 1,
      occupiedBeds: 1,
    },

    {
      id: 6,
      number: "D-105",
      service: "Chirurgie",
      type: "Standard",
      totalBeds: 2,
      occupiedBeds: 1,
    },
  ];


  const totalHospitalized = hospitalizations.filter(
    (item) => item.status !== "Sortie"
  ).length;

  const totalBeds = rooms.reduce(
    (total, room) => total + room.totalBeds,
    0
  );

  const occupiedBeds = rooms.reduce(
    (total, room) => total + room.occupiedBeds,
    0
  );

  const availableBeds = totalBeds - occupiedBeds;

  const plannedDischarges = hospitalizations.filter(
    (item) => item.status === "Sortie prévue"
  ).length;


  const filteredHospitalizations = useMemo(() => {

    return hospitalizations.filter((item) => {

      const searchValue = search.toLowerCase();

      const matchesSearch =
        item.patient.toLowerCase().includes(searchValue) ||
        item.dossier.toLowerCase().includes(searchValue) ||
        item.chambre.toLowerCase().includes(searchValue) ||
        item.service.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "Tous" ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

  }, [search, statusFilter]);


  const handleDetails = (patient) => {
    setSelectedPatient(patient);
    setShowDetailsModal(true);
  };


  const closeModals = () => {
    setShowAdmissionModal(false);
    setShowDetailsModal(false);
    setSelectedPatient(null);
  };


  return (
    <div className="hospitalization-page">

      <div className="hospitalization-header">

        <div>
          <div className="hospitalization-breadcrumb">
            Tableau de bord
            <span>/</span>
            Hospitalisation
          </div>

          <h1>Hospitalisation</h1>

          <p>
            Gestion des admissions, des chambres et des patients hospitalisés.
          </p>
        </div>

        <button
          className="hospitalization-primary-btn"
          onClick={() => setShowAdmissionModal(true)}
        >
          <span>+</span>
          Nouvelle admission
        </button>

      </div>


      <div className="hospitalization-stats">

        <div className="hospitalization-stat-card">

          <div className="stat-icon blue">
            🛏
          </div>

          <div className="stat-content">
            <span>Patients hospitalisés</span>
            <strong>{totalHospitalized}</strong>
            <small>Patients actuellement admis</small>
          </div>

        </div>


        <div className="hospitalization-stat-card">

          <div className="stat-icon green">
            ✓
          </div>

          <div className="stat-content">
            <span>Lits disponibles</span>
            <strong>{availableBeds}</strong>
            <small>Sur {totalBeds} lits</small>
          </div>

        </div>


        <div className="hospitalization-stat-card">

          <div className="stat-icon orange">
            ↗
          </div>

          <div className="stat-content">
            <span>Sorties prévues</span>
            <strong>{plannedDischarges}</strong>
            <small>À surveiller</small>
          </div>

        </div>


        <div className="hospitalization-stat-card">

          <div className="stat-icon purple">
            ▣
          </div>

          <div className="stat-content">
            <span>Lits occupés</span>
            <strong>{occupiedBeds}</strong>
            <small>
              {totalBeds > 0
                ? Math.round((occupiedBeds / totalBeds) * 100)
                : 0}
              % d'occupation
            </small>
          </div>

        </div>

      </div>


      <div className="hospitalization-tabs">

        <button
          className={
            activeTab === "hospitalisations"
              ? "active"
              : ""
          }
          onClick={() => setActiveTab("hospitalisations")}
        >
          Hospitalisations
        </button>

        <button
          className={
            activeTab === "chambres"
              ? "active"
              : ""
          }
          onClick={() => setActiveTab("chambres")}
        >
          Chambres & lits
        </button>

      </div>


      {activeTab === "hospitalisations" && (

        <div className="hospitalization-content">

          <div className="hospitalization-toolbar">

            <div className="hospitalization-search">

              <span>⌕</span>

              <input
                type="text"
                placeholder="Rechercher un patient, dossier, chambre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

            </div>


            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Tous">Tous les statuts</option>
              <option value="En cours">En cours</option>
              <option value="Sortie prévue">Sortie prévue</option>
              <option value="Sortie">Sortie</option>
            </select>

          </div>


          <div className="hospitalization-table-wrapper">

            <table className="hospitalization-table">

              <thead>

                <tr>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Chambre / Lit</th>
                  <th>Admission</th>
                  <th>Sortie prévue</th>
                  <th>Médecin</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>

              </thead>


              <tbody>

                {filteredHospitalizations.length > 0 ? (

                  filteredHospitalizations.map((item) => (

                    <tr key={item.id}>

                      <td>

                        <div className="patient-cell">

                          <div className="patient-avatar">
                            {item.patient
                              .split(" ")
                              .map((word) => word[0])
                              .join("")
                              .substring(0, 2)}
                          </div>

                          <div>
                            <strong>{item.patient}</strong>
                            <span>
                              {item.dossier} · {item.age} ans
                            </span>
                          </div>

                        </div>

                      </td>


                      <td>
                        <span className="service-name">
                          {item.service}
                        </span>

                        <small className="motif">
                          {item.motif}
                        </small>
                      </td>


                      <td>
                        <div className="room-cell">
                          <strong>{item.chambre}</strong>
                          <span>{item.lit}</span>
                        </div>
                      </td>


                      <td>
                        {item.admission}
                      </td>


                      <td>
                        {item.sortiePrevue}
                      </td>


                      <td>
                        {item.medecin}
                      </td>


                      <td>

                        <span
                          className={`status-badge ${item.status
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          <span className="status-dot"></span>
                          {item.status}
                        </span>

                      </td>


                      <td>

                        <button
                          className="action-button"
                          title="Voir les détails"
                          onClick={() => handleDetails(item)}
                        >
                          👁
                        </button>

                      </td>

                    </tr>

                  ))

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


      {activeTab === "chambres" && (

        <div className="rooms-section">

          <div className="rooms-header">

            <div>
              <h2>Chambres et lits</h2>

              <p>
                Visualisez l'occupation actuelle des chambres.
              </p>
            </div>

          </div>


          <div className="rooms-grid">

            {rooms.map((room) => {

              const available =
                room.totalBeds - room.occupiedBeds;

              const occupation =
                (room.occupiedBeds / room.totalBeds) * 100;

              return (

                <div
                  className="room-card"
                  key={room.id}
                >

                  <div className="room-card-header">

                    <div>

                      <span className="room-label">
                        Chambre
                      </span>

                      <h3>{room.number}</h3>

                    </div>

                    <span className={`room-type ${room.type === "VIP" ? "vip" : ""}`}>
                      {room.type}
                    </span>

                  </div>


                  <div className="room-service">
                    {room.service}
                  </div>


                  <div className="room-occupancy">

                    <div className="occupancy-header">

                      <span>Occupation</span>

                      <strong>
                        {room.occupiedBeds}/{room.totalBeds}
                      </strong>

                    </div>


                    <div className="occupancy-bar">

                      <div
                        className="occupancy-progress"
                        style={{
                          width: `${occupation}%`,
                        }}
                      ></div>

                    </div>

                  </div>


                  <div className="room-footer">

                    <span className="occupied">
                      {room.occupiedBeds} occupé(s)
                    </span>

                    <span className="available">
                      {available} disponible(s)
                    </span>

                  </div>

                </div>

              );

            })}

          </div>

        </div>

      )}


      {showAdmissionModal && (

        <div
          className="hospitalization-modal-overlay"
          onClick={closeModals}
        >

          <div
            className="hospitalization-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-header">

              <div>
                <h2>Nouvelle admission</h2>
                <p>
                  Enregistrer l'admission d'un patient.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModals}
              >
                ×
              </button>

            </div>


            <div className="modal-body">

              <div className="form-group">

                <label>
                  Patient
                </label>

                <select>
                  <option value="">
                    Sélectionner un patient
                  </option>

                  <option>
                    KOFFI Jean
                  </option>

                  <option>
                    KOUASSI Marie
                  </option>

                  <option>
                    YAO Ibrahim
                  </option>

                  <option>
                    ADJE Fatou
                  </option>

                </select>

              </div>


              <div className="form-row">

                <div className="form-group">

                  <label>
                    Service
                  </label>

                  <select>

                    <option>
                      Médecine générale
                    </option>

                    <option>
                      Chirurgie
                    </option>

                    <option>
                      Maternité
                    </option>

                    <option>
                      Cardiologie
                    </option>

                  </select>

                </div>


                <div className="form-group">

                  <label>
                    Chambre
                  </label>

                  <select>

                    <option>
                      A-101
                    </option>

                    <option>
                      A-102
                    </option>

                    <option>
                      B-201
                    </option>

                    <option>
                      B-204
                    </option>

                    <option>
                      D-105
                    </option>

                  </select>

                </div>

              </div>


              <div className="form-row">

                <div className="form-group">

                  <label>
                    Date d'admission
                  </label>

                  <input
                    type="date"
                    defaultValue="2026-09-17"
                  />

                </div>


                <div className="form-group">

                  <label>
                    Sortie prévue
                  </label>

                  <input
                    type="date"
                  />

                </div>

              </div>


              <div className="form-group">

                <label>
                  Motif d'hospitalisation
                </label>

                <textarea
                  placeholder="Décrire le motif de l'hospitalisation..."
                  rows="4"
                ></textarea>

              </div>

            </div>


            <div className="modal-footer">

              <button
                className="secondary-button"
                onClick={closeModals}
              >
                Annuler
              </button>

              <button
                className="hospitalization-primary-btn"
                onClick={closeModals}
              >
                Enregistrer l'admission
              </button>

            </div>

          </div>

        </div>

      )}


      {showDetailsModal && selectedPatient && (

        <div
          className="hospitalization-modal-overlay"
          onClick={closeModals}
        >

          <div
            className="hospitalization-modal details-modal"
            onClick={(e) => e.stopPropagation()}
          >

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


            <div className="patient-details">

              <div className="details-profile">

                <div className="large-avatar">

                  {selectedPatient.patient
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .substring(0, 2)}

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


              <div className="details-grid">

                <div>
                  <span>Âge</span>
                  <strong>
                    {selectedPatient.age} ans
                  </strong>
                </div>

                <div>
                  <span>Sexe</span>
                  <strong>
                    {selectedPatient.sexe}
                  </strong>
                </div>

                <div>
                  <span>Service</span>
                  <strong>
                    {selectedPatient.service}
                  </strong>
                </div>

                <div>
                  <span>Chambre</span>
                  <strong>
                    {selectedPatient.chambre}
                  </strong>
                </div>

                <div>
                  <span>Lit</span>
                  <strong>
                    {selectedPatient.lit}
                  </strong>
                </div>

                <div>
                  <span>Médecin</span>
                  <strong>
                    {selectedPatient.medecin}
                  </strong>
                </div>

                <div>
                  <span>Date d'admission</span>
                  <strong>
                    {selectedPatient.admission}
                  </strong>
                </div>

                <div>
                  <span>Sortie prévue</span>
                  <strong>
                    {selectedPatient.sortiePrevue}
                  </strong>
                </div>

              </div>


              <div className="details-motif">

                <span>Motif d'hospitalisation</span>

                <p>
                  {selectedPatient.motif}
                </p>

              </div>

            </div>


            <div className="modal-footer">

              <button
                className="secondary-button"
                onClick={closeModals}
              >
                Fermer
              </button>

              <button
                className="hospitalization-primary-btn"
                onClick={closeModals}
              >
                Modifier le dossier
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default Hospitalization;