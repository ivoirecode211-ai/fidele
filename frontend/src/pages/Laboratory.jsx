import { useMemo, useState } from "react";
import "../styles/Laboratory.css";

function Laboratory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showResultForm, setShowResultForm] = useState(false);

  const [resultData, setResultData] = useState({
    result: "",
    observation: "",
  });

  const analyses = [
    {
      id: "LAB-001",
      patient: "TRAORE Awa",
      type: "NFS",
      date: "10/09/2026",
      heure: "08:30",
      medecin: "Dr. KOUAME",
      statut: "En cours",
      priorite: "Normale",
      resultat: "",
      observation: "",
    },
    {
      id: "LAB-002",
      patient: "KONE Ibrahim",
      type: "Glycémie",
      date: "10/09/2026",
      heure: "09:00",
      medecin: "Dr. BAH",
      statut: "En attente",
      priorite: "Urgente",
      resultat: "",
      observation: "",
    },
    {
      id: "LAB-003",
      patient: "DIALLO Mariam",
      type: "Groupe sanguin",
      date: "09/09/2026",
      heure: "10:15",
      medecin: "Dr. KONE",
      statut: "Terminée",
      priorite: "Normale",
      resultat: "A+",
      observation: "Résultat confirmé.",
    },
    {
      id: "LAB-004",
      patient: "YAO Claude",
      type: "Créatinine",
      date: "09/09/2026",
      heure: "11:20",
      medecin: "Dr. KOUAME",
      statut: "En attente",
      priorite: "Normale",
      resultat: "",
      observation: "",
    },
    {
      id: "LAB-005",
      patient: "N'GUESSAN Marie",
      type: "CRP",
      date: "08/09/2026",
      heure: "14:00",
      medecin: "Dr. BAH",
      statut: "Terminée",
      priorite: "Normale",
      resultat: "6 mg/L",
      observation: "Résultat dans les normes.",
    },
    {
      id: "LAB-006",
      patient: "KOFFI Jean",
      type: "Bilan lipidique",
      date: "08/09/2026",
      heure: "15:30",
      medecin: "Dr. KONE",
      statut: "En cours",
      priorite: "Normale",
      resultat: "",
      observation: "",
    },
  ];

  const filteredAnalyses = useMemo(() => {
    return analyses.filter((analysis) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        analysis.patient.toLowerCase().includes(searchValue) ||
        analysis.id.toLowerCase().includes(searchValue) ||
        analysis.type.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "Tous" ||
        analysis.statut === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const getStatusClass = (status) => {
    switch (status) {
      case "Terminée":
        return "lab-status-completed";

      case "En cours":
        return "lab-status-progress";

      case "En attente":
        return "lab-status-pending";

      default:
        return "";
    }
  };

  const getPriorityClass = (priority) => {
    return priority === "Urgente"
      ? "lab-priority-urgent"
      : "lab-priority-normal";
  };

  const openResultForm = (analysis) => {
    setSelectedAnalysis(analysis);

    setResultData({
      result: analysis.resultat || "",
      observation: analysis.observation || "",
    });

    setShowResultForm(true);
  };

  const closeResultForm = () => {
    setShowResultForm(false);
    setSelectedAnalysis(null);
  };

  const validateResult = (event) => {
    event.preventDefault();

    alert(
      `Résultat enregistré pour ${selectedAnalysis.patient}.`
    );

    closeResultForm();
  };

  return (
    <div className="laboratory-page">

      {/* Le menu de navigation a été volontairement supprimé de cette barre latérale. */}

      <aside className="laboratory-sidebar">

        {/* Logo MA SANTE */}
        <div className="laboratory-brand">

          <div className="lab-brand-icon">
            ♥
          </div>

          <div>
            <h2>
              MA<span>SANTE</span>
            </h2>

            <p>
              Gestion de Clinique
            </p>
          </div>

        </div>

        {/* Footer de la sidebar */}
        <div className="laboratory-sidebar-footer">

          <strong>
            MA SANTE
          </strong>

          <span>
            Gestion de Clinique
          </span>

        </div>

      </aside>

      <main className="laboratory-main">

        <header className="laboratory-header">

          <div>

            <h1>
              Laboratoire
            </h1>

            <p>
              Gérez les demandes d'analyses et les résultats
              biologiques des patients.
            </p>

          </div>

          <div className="laboratory-user">

            <div className="lab-user-avatar">
              KE
            </div>

            <div>

              <strong>
                KOFFI Emmanuel
              </strong>

              <span>
                Laborantin
              </span>

            </div>

          </div>

        </header>

        <section className="laboratory-statistics">

          <div className="laboratory-stat-card">

            <div className="lab-stat-icon blue">
              🧪
            </div>

            <div>

              <span>
                Analyses aujourd'hui
              </span>

              <strong>
                32
              </strong>

              <small>
                Demandes reçues
              </small>

            </div>

          </div>

          <div className="laboratory-stat-card">

            <div className="lab-stat-icon orange">
              ⏳
            </div>

            <div>

              <span>
                En attente
              </span>

              <strong>
                8
              </strong>

              <small>
                À traiter
              </small>

            </div>

          </div>

          <div className="laboratory-stat-card">

            <div className="lab-stat-icon purple">
              ⚗
            </div>

            <div>

              <span>
                En cours
              </span>

              <strong>
                6
              </strong>

              <small>
                Analyses en traitement
              </small>

            </div>

          </div>

          <div className="laboratory-stat-card">

            <div className="lab-stat-icon green">
              ✓
            </div>

            <div>

              <span>
                Terminées
              </span>

              <strong>
                18
              </strong>

              <small>
                Résultats validés
              </small>

            </div>

          </div>

        </section>

        <section className="laboratory-toolbar">

          <div className="laboratory-search">

            <span>
              🔎
            </span>

            <input
              type="text"
              placeholder="Rechercher un patient ou une analyse..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="laboratory-filter"
          >

            <option value="Tous">
              Tous les statuts
            </option>

            <option value="En attente">
              En attente
            </option>

            <option value="En cours">
              En cours
            </option>

            <option value="Terminée">
              Terminées
            </option>

          </select>

          <button className="new-analysis-button">

            <span>
              ＋
            </span>

            Nouvelle analyse

          </button>

        </section>

        <section className="laboratory-content-grid">

          <div className="laboratory-table-card">

            <div className="laboratory-card-header">

              <div>

                <h2>
                  Demandes d'analyses
                </h2>

                <p>
                  Suivi des analyses demandées
                </p>

              </div>

              <button className="lab-export-button">
                ↓ Exporter
              </button>

            </div>

            <div className="laboratory-table-container">

              <table className="laboratory-table">

                <thead>

                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Analyse</th>
                    <th>Date</th>
                    <th>Médecin</th>
                    <th>Priorité</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>

                </thead>

                <tbody>

                  {filteredAnalyses.length > 0 ? (

                    filteredAnalyses.map((analysis) => (

                      <tr key={analysis.id}>

                        <td>
                          <strong className="lab-analysis-id">
                            {analysis.id}
                          </strong>
                        </td>

                        <td>

                          <div className="lab-patient">

                            <div className="lab-patient-avatar">

                              {analysis.patient
                                .split(" ")
                                .map((word) =>
                                  word.charAt(0)
                                )
                                .join("")
                                .slice(0, 2)}

                            </div>

                            <strong>
                              {analysis.patient}
                            </strong>

                          </div>

                        </td>

                        <td>

                          <span className="analysis-name">
                            {analysis.type}
                          </span>

                        </td>

                        <td>

                          <strong className="analysis-date">
                            {analysis.date}
                          </strong>

                          <small className="analysis-time">
                            {analysis.heure}
                          </small>

                        </td>

                        <td>
                          {analysis.medecin}
                        </td>

                        <td>

                          <span
                            className={`lab-priority ${getPriorityClass(
                              analysis.priorite
                            )}`}
                          >
                            {analysis.priorite}
                          </span>

                        </td>

                        <td>

                          <span
                            className={`lab-status ${getStatusClass(
                              analysis.statut
                            )}`}
                          >
                            {analysis.statut}
                          </span>

                        </td>

                        <td>

                          <button
                            className="lab-action-button"
                            onClick={() =>
                              openResultForm(analysis)
                            }
                          >
                            {analysis.statut === "Terminée"
                              ? "Voir"
                              : "Résultat"}
                          </button>

                        </td>

                      </tr>

                    ))

                  ) : (

                    <tr>

                      <td
                        colSpan="8"
                        className="lab-empty"
                      >
                        Aucune analyse trouvée.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>

          <aside className="recent-results-card">

            <div className="recent-results-header">

              <div>

                <h2>
                  Résultats récents
                </h2>

                <p>
                  Derniers résultats enregistrés
                </p>

              </div>

              <span className="result-count">
                3
              </span>

            </div>

            <div className="recent-result-list">

              <div className="recent-result-item">

                <div className="recent-result-icon green">
                  ✓
                </div>

                <div className="recent-result-info">

                  <strong>
                    NFS - TRAORE Awa
                  </strong>

                  <span>
                    Résultat normal
                  </span>

                  <small>
                    Aujourd'hui • 10:24
                  </small>

                </div>

              </div>

              <div className="recent-result-item">

                <div className="recent-result-icon orange">
                  !
                </div>

                <div className="recent-result-info">

                  <strong>
                    Glycémie - KONE Ibrahim
                  </strong>

                  <span className="result-warning">
                    0,95 g/L
                  </span>

                  <small>
                    Aujourd'hui • 09:52
                  </small>

                </div>

              </div>

              <div className="recent-result-item">

                <div className="recent-result-icon blue">
                  ✓
                </div>

                <div className="recent-result-info">

                  <strong>
                    Groupe sanguin - DIALLO Mariam
                  </strong>

                  <span>
                    A+
                  </span>

                  <small>
                    Hier • 16:20
                  </small>

                </div>

              </div>

            </div>

            <button className="view-all-results">
              Voir tous les résultats →
            </button>

          </aside>

        </section>

        <section className="laboratory-quick-actions">

          <button>
            <span>＋</span>
            Saisir un résultat
          </button>

          <button>
            <span>🖨</span>
            Imprimer un résultat
          </button>

          <button className="quick-action-green">
            <span>✓</span>
            Valider les résultats
          </button>

        </section>

        {showResultForm && selectedAnalysis && (

          <div
            className="laboratory-modal-overlay"
            onClick={closeResultForm}
          >

            <div
              className="laboratory-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="laboratory-modal-header">

                <div>

                  <h2>
                    Résultat d'analyse
                  </h2>

                  <p>
                    {selectedAnalysis.id}
                  </p>

                </div>

                <button
                  className="lab-modal-close"
                  onClick={closeResultForm}
                >
                  ×
                </button>

              </div>

              <div className="laboratory-modal-patient">

                <div className="lab-modal-avatar">

                  {selectedAnalysis.patient
                    .split(" ")
                    .map((word) =>
                      word.charAt(0)
                    )
                    .join("")
                    .slice(0, 2)}

                </div>

                <div>

                  <strong>
                    {selectedAnalysis.patient}
                  </strong>

                  <span>
                    {selectedAnalysis.type}
                  </span>

                </div>

              </div>

              <form
                onSubmit={validateResult}
                className="laboratory-result-form"
              >

                <label>

                  Résultat

                  <textarea
                    value={resultData.result}
                    onChange={(event) =>
                      setResultData({
                        ...resultData,
                        result: event.target.value,
                      })
                    }
                    placeholder="Saisissez le résultat de l'analyse..."
                    rows="5"
                    required
                  />

                </label>

                <label>

                  Observation

                  <textarea
                    value={resultData.observation}
                    onChange={(event) =>
                      setResultData({
                        ...resultData,
                        observation:
                          event.target.value,
                      })
                    }
                    placeholder="Ajoutez une observation..."
                    rows="3"
                  />

                </label>

                <div className="laboratory-form-actions">

                  <button
                    type="button"
                    className="lab-cancel-button"
                    onClick={closeResultForm}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="lab-save-button"
                  >
                    ✓ Enregistrer le résultat
                  </button>

                </div>

              </form>

            </div>

          </div>

        )}

      </main>

    </div>
  );
}

export default Laboratory;