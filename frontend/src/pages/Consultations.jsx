import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import "../styles/Consultations.css";


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
  },
];


export default function Consultations() {

  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const [consultations, setConsultations] = useState(
    consultationsInitiales
  );

  const [recherche, setRecherche] = useState("");

  const [modal, setModal] = useState(null);

  const [patientSelectionne, setPatientSelectionne] = useState(null);

  const [nouvelleConsultation, setNouvelleConsultation] = useState({
    patient: "",
    motif: "",
    heure: "",
  });


  const consultationsFiltrees = useMemo(() => {

    const texte = recherche.trim().toLowerCase();

    if (!texte) {
      return consultations;
    }

    return consultations.filter(
      (consultation) =>
        consultation.patient.toLowerCase().includes(texte) ||
        consultation.motif.toLowerCase().includes(texte) ||
        consultation.statut.toLowerCase().includes(texte)
    );

  }, [recherche, consultations]);


  const ouvrirConsultation = (consultation) => {

    setPatientSelectionne(consultation);

    setConsultations((liste) =>
      liste.map((item) =>
        item.id === consultation.id
          ? { ...item, statut: "En cours" }
          : item
      )
    );

    setModal("consultation");
  };


  const changerStatut = (id, statut) => {

    setConsultations((liste) =>
      liste.map((item) =>
        item.id === id
          ? { ...item, statut }
          : item
      )
    );
  };


  const enregistrerConsultation = (e) => {

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
      numero: String(consultations.length + 1).padStart(3, "0"),
      patient: nouvelleConsultation.patient,
      motif: nouvelleConsultation.motif,
      heure: nouvelleConsultation.heure,
      statut: "À venir",
      age: "--",
      sexe: "--",
    };

    setConsultations((liste) => [
      ...liste,
      nouvelle,
    ]);

    setNouvelleConsultation({
      patient: "",
      motif: "",
      heure: "",
    });

    setModal(null);
  };

  const fermerModal = () => {
    setModal(null);
    setPatientSelectionne(null);
  };

  return (
    <div className="consultations-page">

      <aside className="medecin-sidebar">

        {/* Logo */}
        <div className="sidebar-logo">

          <div className="sidebar-heart">
            <Logo size={26} inverted />
          </div>

          <div className="sidebar-brand">
            <strong>MA SANTE</strong>
            <span>Gestion de Clinique</span>
          </div>

        </div>

        {/* Menu */}
        <nav className="medecin-menu">

          <button
            className="medecin-menu-item active"
            onClick={() => setModal(null)}
          >
            <span className="menu-icon">⌂</span>
            <span>Accueil</span>
          </button>

          <button
            className="medecin-menu-item"
            onClick={() => setModal("patients")}
          >
            <span className="menu-icon">♟</span>
            <span>Mes patients</span>
          </button>

          <button
            className="medecin-menu-item selected"
            onClick={() => setModal(null)}
          >
            <span className="menu-icon">▣</span>
            <span>Consultations</span>
          </button>

          <button
            className="medecin-menu-item"
            onClick={() => setModal("ordonnance")}
          >
            <span className="menu-icon">▤</span>
            <span>Ordonnances</span>
          </button>

          <button
            className="medecin-menu-item"
            onClick={() => setModal("examens")}
          >
            <span className="menu-icon">▥</span>
            <span>Examens</span>
          </button>

          <button
            className="medecin-menu-item"
            onClick={() => setModal("rendezvous")}
          >
            <span className="menu-icon">□</span>
            <span>Rendez-vous</span>
          </button>

          <button
            className="medecin-menu-item"
            onClick={() => setModal("messages")}
          >
            <span className="menu-icon">▣</span>
            <span>Messages</span>
          </button>

        </nav>

        {/* Bas de sidebar */}
        <div className="sidebar-bottom">

          <Link
            to="/modules"
            className="medecin-menu-item"
          >
            <span className="menu-icon">⌘</span>
            <span>Retour aux modules</span>
          </Link>

          <button
            type="button"
            className="medecin-menu-item"
            onClick={handleLogout}
          >
            <span className="menu-icon">⏻</span>
            <span>Déconnexion</span>
          </button>

          <div className="sidebar-version">
            MA SANTÉ v1.0
          </div>

        </div>

      </aside>


      <main className="medecin-main">

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
              onClick={() => setModal("profil")}
            >
              ▼
            </button>

          </div>

        </header>


        <section className="medecin-content">


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
                {consultations.length}
              </span>

              <small>
                consultations
              </small>
            </div>

          </div>


          <div className="consultation-toolbar">

            <div className="search-box">

              <span className="search-icon">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Rechercher un patient..."
                value={recherche}
                onChange={(e) =>
                  setRecherche(e.target.value)
                }
              />

              {recherche && (
                <button
                  className="clear-search"
                  onClick={() => setRecherche("")}
                >
                  ×
                </button>
              )}

            </div>


            <button
              className="btn-primary new-consultation-btn"
              onClick={() => setModal("nouvelle")}
            >
              <span>＋</span>
              Nouvelle consultation
            </button>

          </div>


          <div className="quick-stats">

            <div className="quick-stat">

              <div className="quick-stat-icon blue">
                ◷
              </div>

              <div>
                <strong>
                  {consultations.length}
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
                    consultations.filter(
                      (c) => c.statut === "En cours"
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
                    consultations.filter(
                      (c) => c.statut === "En attente"
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
                    consultations.filter(
                      (c) => c.statut === "À venir"
                    ).length
                  }
                </strong>

                <span>
                  À venir
                </span>
              </div>

            </div>

          </div>


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

                    <th>#</th>

                    <th>Patient</th>

                    <th>Motif</th>

                    <th>Heure</th>

                    <th>Statut</th>

                    <th>Action</th>

                  </tr>

                </thead>


                <tbody>

                  {consultationsFiltrees.length > 0 ? (

                    consultationsFiltrees.map(
                      (consultation) => (

                        <tr
                          key={consultation.id}
                          onDoubleClick={() =>
                            ouvrirConsultation(
                              consultation
                            )
                          }
                        >

                          <td className="number-cell">
                            {consultation.numero}
                          </td>


                          <td>

                            <div className="patient-cell">

                              <div
                                className={`patient-avatar ${
                                  consultation.sexe === "F"
                                    ? "female"
                                    : "male"
                                }`}
                              >
                                {consultation.patient
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>

                                <strong>
                                  {consultation.patient}
                                </strong>

                                <small>
                                  {consultation.age !== "--"
                                    ? `${consultation.age} ans`
                                    : "Patient"}
                                </small>

                              </div>

                            </div>

                          </td>


                          <td>
                            <span className="motif-text">
                              {consultation.motif}
                            </span>
                          </td>


                          <td>
                            <span className="heure-text">
                              {consultation.heure}
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

                              {consultation.statut}
                            </button>

                          </td>


                          <td>

                            <div className="row-actions">

                              <button
                                className="row-action view"
                                title="Ouvrir la consultation"
                                onClick={() =>
                                  ouvrirConsultation(
                                    consultation
                                  )
                                }
                              >
                                👁
                              </button>

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


            <div className="quick-actions">

              <button
                className="quick-action-btn"
                onClick={() =>
                  setModal("patient")
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

                  if (consultations.length > 0) {
                    setPatientSelectionne(
                      consultations[0]
                    );
                  }

                  setModal("dossier");
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

                  if (consultations.length > 0) {
                    setPatientSelectionne(
                      consultations[0]
                    );
                  }

                  setModal("ordonnance");
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

                  if (consultations.length > 0) {
                    setPatientSelectionne(
                      consultations[0]
                    );
                  }

                  setModal("compte-rendu");
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
                    24
                  </strong>
                </div>

                <div className="info-row">
                  <span>
                    Consultations terminées
                  </span>

                  <strong>
                    18
                  </strong>
                </div>

                <div className="info-row">
                  <span>
                    Consultations restantes
                  </span>

                  <strong>
                    {consultations.length}
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


      {modal === "nouvelle" && (

        <Modal
          title="Nouvelle consultation"
          subtitle="Créer une nouvelle consultation médicale"
          onClose={fermerModal}
        >

          <form
            className="modal-form"
            onSubmit={enregistrerConsultation}
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
                  setNouvelleConsultation({
                    ...nouvelleConsultation,
                    patient: e.target.value,
                  })
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
                  setNouvelleConsultation({
                    ...nouvelleConsultation,
                    motif: e.target.value,
                  })
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
                  setNouvelleConsultation({
                    ...nouvelleConsultation,
                    heure: e.target.value,
                  })
                }
              />

            </div>


            <div className="modal-actions">

              <button
                type="button"
                className="btn-secondary"
                onClick={fermerModal}
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


      {modal === "consultation" &&
        patientSelectionne && (

          <Modal
            title="Consultation médicale"
            subtitle={`Dossier de ${patientSelectionne.patient}`}
            onClose={fermerModal}
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
                    {patientSelectionne.patient}
                  </h3>

                  <p>
                    {patientSelectionne.age !== "--"
                      ? `${patientSelectionne.age} ans`
                      : "Âge non renseigné"}
                    {" • "}
                    {patientSelectionne.sexe === "F"
                      ? "Femme"
                      : patientSelectionne.sexe === "M"
                      ? "Homme"
                      : "Non renseigné"}
                  </p>

                </div>

              </div>


              <div className="detail-grid">

                <div className="detail-box">

                  <span>
                    Heure
                  </span>

                  <strong>
                    {patientSelectionne.heure}
                  </strong>

                </div>


                <div className="detail-box">

                  <span>
                    Motif
                  </span>

                  <strong>
                    {patientSelectionne.motif}
                  </strong>

                </div>


                <div className="detail-box">

                  <span>
                    Statut
                  </span>

                  <strong>
                    {patientSelectionne.statut}
                  </strong>

                </div>

              </div>


              <div className="medical-section">

                <h4>
                  Observations médicales
                </h4>

                <textarea
                  placeholder="Saisir les observations, symptômes, diagnostic..."
                  rows="5"
                />

              </div>


              <div className="modal-actions">

                <button
                  className="btn-secondary"
                  onClick={() =>
                    setModal("ordonnance")
                  }
                >
                  Ordonnance
                </button>

                <button
                  className="btn-secondary"
                  onClick={() =>
                    setModal("compte-rendu")
                  }
                >
                  Compte rendu
                </button>

                <button
                  className="btn-primary"
                  onClick={() => {

                    changerStatut(
                      patientSelectionne.id,
                      "Terminée"
                    );

                    fermerModal();

                  }}
                >
                  Terminer la consultation
                </button>

              </div>

            </div>

          </Modal>

        )}


      {modal === "patient" && (

        <Modal
          title="Nouveau patient"
          subtitle="Créer le dossier d'un nouveau patient"
          onClose={fermerModal}
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
                onClick={fermerModal}
              >
                Annuler
              </button>

              <button
                className="btn-primary"
                onClick={fermerModal}
              >
                Créer le patient
              </button>

            </div>

          </div>

        </Modal>

      )}


      {modal === "dossier" &&
        patientSelectionne && (

          <Modal
            title="Dossier patient"
            subtitle={patientSelectionne.patient}
            onClose={fermerModal}
            large
          >

            <div className="patient-file">

              <div className="file-header">

                <div className="large-patient-avatar">
                  {patientSelectionne.patient
                    .charAt(0)}
                </div>

                <div>

                  <h3>
                    {patientSelectionne.patient}
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
                    Âge :{" "}
                    {patientSelectionne.age !== "--"
                      ? `${patientSelectionne.age} ans`
                      : "Non renseigné"}
                  </p>

                  <p>
                    Sexe :{" "}
                    {patientSelectionne.sexe === "F"
                      ? "Féminin"
                      : patientSelectionne.sexe === "M"
                      ? "Masculin"
                      : "Non renseigné"}
                  </p>

                </div>


                <div className="file-section">

                  <h4>
                    Dernière consultation
                  </h4>

                  <p>
                    Motif :{" "}
                    {patientSelectionne.motif}
                  </p>

                  <p>
                    Heure :{" "}
                    {patientSelectionne.heure}
                  </p>

                </div>

              </div>


              <div className="modal-actions">

                <button
                  className="btn-primary"
                  onClick={fermerModal}
                >
                  Fermer le dossier
                </button>

              </div>

            </div>

          </Modal>

        )}


      {modal === "ordonnance" && (

        <Modal
          title="Ordonnance"
          subtitle={
            patientSelectionne
              ? `Patient : ${patientSelectionne.patient}`
              : "Nouvelle ordonnance"
          }
          onClose={fermerModal}
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
                onClick={fermerModal}
              >
                Annuler
              </button>

              <button
                className="btn-primary"
                onClick={fermerModal}
              >
                Enregistrer l'ordonnance
              </button>

            </div>

          </div>

        </Modal>

      )}


      {modal === "compte-rendu" && (

        <Modal
          title="Compte rendu médical"
          subtitle={
            patientSelectionne
              ? `Patient : ${patientSelectionne.patient}`
              : "Compte rendu"
          }
          onClose={fermerModal}
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
                onClick={fermerModal}
              >
                Annuler
              </button>

              <button
                className="btn-primary"
                onClick={fermerModal}
              >
                Enregistrer le compte rendu
              </button>

            </div>

          </div>

        </Modal>

      )}


      {[
        "patients",
        "examens",
        "rendezvous",
        "messages",
        "profil",
      ].includes(modal) && (

        <Modal
          title={getModalTitle(modal)}
          subtitle="Cette fonctionnalité sera connectée au module correspondant."
          onClose={fermerModal}
        >

          <div className="placeholder-modal">

            <div className="placeholder-modal-icon">
              ◈
            </div>

            <h3>
              Module en préparation
            </h3>

            <p>
              Cette partie sera développée lorsque
              nous créerons le module correspondant.
            </p>

            <button
              className="btn-primary"
              onClick={fermerModal}
            >
              Fermer
            </button>

          </div>

        </Modal>

      )}

    </div>
  );
}


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

        if (e.target === e.currentTarget) {
          onClose();
        }

      }}
    >

      <div
        className={`modal-container ${
          large ? "modal-large" : ""
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
            onClick={onClose}
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


function getStatusClass(statut) {

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


function getModalTitle(modal) {

  const titres = {

    patients: "Mes patients",

    examens: "Examens médicaux",

    rendezvous: "Rendez-vous",

    messages: "Messages",

    profil: "Mon profil",

  };

  return titres[modal] || "Module";

}