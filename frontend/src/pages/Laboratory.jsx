import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/Laboratory.css";

import {
  Check,
  CircleCheck,
  Download,
  FlaskConical,
  Hourglass,
  Printer,
  Search,
  TestTube,
  X,
} from "lucide-react";
import Logo from "../components/Logo";
import api from "../services/api";
import SidebarFooter from "../components/SidebarFooter";
/* ============================================================
   TARIFS DES EXAMENS
   ============================================================ */

/* ============================================================
   DONNÉES DE DÉMONSTRATION
   ============================================================ */

/* ============================================================
   UTILITAIRES
   ============================================================ */

const formatMoney = (value) => {
  return (
    new Intl.NumberFormat("fr-FR").format(
      Number(value || 0)
    ) + " FCFA"
  );
};

const getToday = () => {
  return new Date().toLocaleDateString("fr-FR");
};

const getInitials = (name = "") => {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

/* ============================================================
   LABORATORY
   ============================================================ */

function Laboratory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");

  const [analyses, setAnalyses] =
    useState([]);

  // Catalogue d'examens et liste de travail servis par /api/laboratory/.
  const [EXAMS, setExams] = useState([]);

  const loadLaboratory = () =>
    api
      .get("/laboratory/overview/")
      .then((response) => {
        setExams(response.data.exams);
        setAnalyses(response.data.analyses);
      })
      .catch((error) => console.error("Erreur de chargement du laboratoire :", error));

  useEffect(() => {
    loadLaboratory();
  }, []);

  const replaceAnalysis = (updated) =>
    setAnalyses((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));

  const apiError = (error, fallback) => {
    const data = error.response?.data;
    return data && typeof data === "object" ? Object.values(data).flat().join("\n") : fallback;
  };

  const [selectedAnalysis, setSelectedAnalysis] =
    useState(null);

  const [showResultForm, setShowResultForm] =
    useState(false);

  const [showAnalysisRequest, setShowAnalysisRequest] =
    useState(false);

  const [selectedExamIds, setSelectedExamIds] =
    useState([]);

  const [resultData, setResultData] = useState({
    result: "",
    observation: "",
  });

  const [examResults, setExamResults] = useState({});

  /* ==========================================================
     FILTRE
     ========================================================== */

  const filteredAnalyses = useMemo(() => {
    return analyses.filter((analysis) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        analysis.patient
          .toLowerCase()
          .includes(searchValue) ||
        analysis.id
          .toLowerCase()
          .includes(searchValue) ||
        analysis.type
          .toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        statusFilter === "Tous" ||
        analysis.statut === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [analyses, search, statusFilter]);

  /* ==========================================================
     EXAMENS SÉLECTIONNÉS
     ========================================================== */

  const selectedExams = useMemo(() => {
    return EXAMS.filter((exam) =>
      selectedExamIds.includes(exam.id)
    );
  }, [selectedExamIds, EXAMS]);

  const totalAnalysisCost = useMemo(() => {
    return selectedExams.reduce(
      (total, exam) =>
        total + Number(exam.price || 0),
      0
    );
  }, [selectedExams]);

  /* ==========================================================
     STATUT
     ========================================================== */

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

  /* ==========================================================
     DEMANDE D'ANALYSE
     ========================================================== */

  const openAnalysisRequest = (analysis) => {
    setSelectedAnalysis(analysis);

    const alreadySelected =
      analysis.examens?.map(
        (exam) => exam.id
      ) || [];

    setSelectedExamIds(alreadySelected);

    setShowAnalysisRequest(true);
  };

  const closeAnalysisRequest = () => {
    setShowAnalysisRequest(false);
    setSelectedAnalysis(null);
    setSelectedExamIds([]);
  };

  const toggleExam = (examId) => {
    setSelectedExamIds((previous) => {
      if (previous.includes(examId)) {
        return previous.filter(
          (id) => id !== examId
        );
      }

      return [...previous, examId];
    });
  };

  const validateAnalysisRequest = async (event) => {
    event.preventDefault();
    if (!selectedAnalysis) return;
    if (selectedExams.length === 0) {
      alert(
        "Veuillez sélectionner au moins un examen."
      );
      return;
    }

    try {
      const { data } = await api.post(
        `/laboratory/analyses/${selectedAnalysis.admissionId}/demande/`,
        { examIds: selectedExamIds }
      );
      replaceAnalysis(data);
    } catch (error) {
      alert(apiError(error, "Impossible d'enregistrer la demande d'analyse."));
      return;
    }

    alert(
      `Demande d'analyse enregistrée.\n\nTotal : ${formatMoney(
        totalAnalysisCost
      )}`
    );
    closeAnalysisRequest();
  };

  /* ==========================================================
     FORMULAIRE RESULTAT
     ========================================================== */

  const openResultForm = (analysis) => {
    setSelectedAnalysis(analysis);

    setResultData({
      result: analysis.resultat || "",
      observation:
        analysis.observation || "",
    });

    const values = {};

    (analysis.examens || []).forEach(
      (exam) => {
        values[exam.id] =
          exam.result || "";
      }
    );

    setExamResults(values);

    setShowResultForm(true);
  };

  const closeResultForm = () => {
    setShowResultForm(false);
    setSelectedAnalysis(null);
    setExamResults({});
  };

  const updateExamResult = (
    examId,
    value
  ) => {
    setExamResults((previous) => ({
      ...previous,
      [examId]: value,
    }));
  };

  const validateResult = async (event) => {
    event.preventDefault();
    if (!selectedAnalysis) return;

    try {
      const { data } = await api.post(
        `/laboratory/analyses/${selectedAnalysis.admissionId}/resultat/`,
        { results: examResults, observation: resultData.observation }
      );
      replaceAnalysis(data);
    } catch (error) {
      alert(apiError(error, "Impossible d'enregistrer le résultat."));
      return;
    }

    alert(
      `Résultat enregistré pour ${selectedAnalysis.patient}.`
    );
    closeResultForm();
  };

  /* ==========================================================
     PDF
     ========================================================== */

  const printResultPdf = (analysis) => {
    if (!analysis) return;

    const doc = new jsPDF();

    const pageWidth =
      doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      "MA SANTE",
      15,
      18
    );

    doc.setFontSize(11);
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      "Gestion de Clinique",
      15,
      25
    );

    doc.setFontSize(16);
    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      "COMPTE RENDU D'ANALYSES",
      pageWidth / 2,
      40,
      {
        align: "center",
      }
    );

    doc.setDrawColor(
      180,
      180,
      180
    );

    doc.line(
      15,
      45,
      pageWidth - 15,
      45
    );

    doc.setFontSize(11);
    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      "Informations du patient",
      15,
      57
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      `Patient : ${analysis.patient}`,
      15,
      65
    );

    doc.text(
      `N° laboratoire : ${analysis.id}`,
      15,
      72
    );

    doc.text(
      `Médecin : ${analysis.medecin}`,
      15,
      79
    );

    doc.text(
      `Date : ${analysis.date} à ${analysis.heure}`,
      15,
      86
    );

    doc.text(
      `Priorité : ${analysis.priorite}`,
      15,
      93
    );

    const caisse =
      analysis.caisse || {};

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      "Informations de caisse",
      15,
      107
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      `N° caisse : ${
        caisse.numero ||
        "Non renseigné"
      }`,
      15,
      115
    );

    doc.text(
      `Date paiement : ${
        caisse.date ||
        analysis.date ||
        getToday()
      }`,
      15,
      122
    );

    doc.text(
      `Mode de paiement : ${
        caisse.modePaiement ||
        "Non renseigné"
      }`,
      15,
      129
    );

    doc.text(
      `Montant facturé : ${formatMoney(
        caisse.montant
      )}`,
      15,
      136
    );

    doc.text(
      `Montant payé : ${formatMoney(
        caisse.montantPaye
      )}`,
      15,
      143
    );

    doc.text(
      `Reste à payer : ${formatMoney(
        caisse.reste
      )}`,
      15,
      150
    );

    const rows =
      (analysis.examens || []).map(
        (exam) => [
          exam.name,
          exam.category ||
            "Laboratoire",
          formatMoney(exam.price),
          exam.result ||
            "Non renseigné",
          exam.unit || "",
          exam.reference || "",
        ]
      );

    autoTable(doc, {
      startY: 162,

      head: [
        [
          "Examen",
          "Catégorie",
          "Prix",
          "Résultat",
          "Unité",
          "Valeurs de référence",
        ],
      ],

      body: rows,

      theme: "grid",

      styles: {
        fontSize: 8,
        cellPadding: 3,
      },

      headStyles: {
        fontStyle: "bold",
      },
    });

    const finalY =
      doc.lastAutoTable?.finalY
        ? doc.lastAutoTable.finalY +
          12
        : 180;

    const total =
      (analysis.examens || []).reduce(
        (sum, exam) =>
          sum +
          Number(
            exam.price || 0
          ),
        0
      );

    doc.setFontSize(11);
    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      `Coût total des analyses : ${formatMoney(
        total
      )}`,
      15,
      finalY
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      "Observation",
      15,
      finalY + 15
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    const observation =
      analysis.observation ||
      "Aucune observation renseignée.";

    const observationLines =
      doc.splitTextToSize(
        observation,
        pageWidth - 30
      );

    doc.text(
      observationLines,
      15,
      finalY + 23
    );

    const signatureY =
      Math.max(
        finalY + 55,
        250
      );

    doc.text(
      "Laborantin responsable",
      pageWidth - 70,
      signatureY
    );

    doc.line(
      pageWidth - 75,
      signatureY + 18,
      pageWidth - 15,
      signatureY + 18
    );

    doc.setFontSize(8);

    doc.setTextColor(
      100,
      100,
      100
    );

    doc.text(
      `Document généré le ${getToday()} - MA SANTE`,
      pageWidth / 2,
      287,
      {
        align: "center",
      }
    );

    doc.save(
      `resultat-${analysis.id}-${analysis.patient
        .replace(/\s+/g, "-")
        .toLowerCase()}.pdf`
    );
  };

  /* ============================================================
     RENDU
     ============================================================ */

  return (
    <div className="laboratory-page">

      {/* SIDEBAR */}

      <aside className="laboratory-sidebar">

        <div className="laboratory-brand">

          <div className="lab-brand-icon">
            <Logo size={30} inverted />
          </div>

          <div>
            <h2>
              MA <span>SANTÉ</span>
            </h2>

            <p>
              Gestion de Clinique
            </p>
          </div>

        </div>

        <SidebarFooter />

      </aside>

      {/* CONTENU PRINCIPAL */}

      <main className="laboratory-main">

        {/* HEADER */}


        {/* STATISTIQUES */}

        <section className="laboratory-statistics">

          <div className="laboratory-stat-card">

            <div className="lab-stat-icon blue">
              <TestTube size={22} strokeWidth={2} aria-hidden="true" />
            </div>

            <div>

              <span>
                Analyses aujourd'hui
              </span>

              <strong>
                {analyses.length}
              </strong>

              <small>
                Demandes reçues
              </small>

            </div>

          </div>

          <div className="laboratory-stat-card">

            <div className="lab-stat-icon orange">
              <Hourglass size={22} strokeWidth={2} aria-hidden="true" />
            </div>

            <div>

              <span>
                En attente
              </span>

              <strong>
                {
                  analyses.filter(
                    (item) =>
                      item.statut ===
                      "En attente"
                  ).length
                }
              </strong>

              <small>
                À traiter
              </small>

            </div>

          </div>

          <div className="laboratory-stat-card">

            <div className="lab-stat-icon purple">
              <FlaskConical size={22} strokeWidth={2} aria-hidden="true" />
            </div>

            <div>

              <span>
                En cours
              </span>

              <strong>
                {
                  analyses.filter(
                    (item) =>
                      item.statut ===
                      "En cours"
                  ).length
                }
              </strong>

              <small>
                Analyses en traitement
              </small>

            </div>

          </div>

          <div className="laboratory-stat-card">

            <div className="lab-stat-icon green">
              <CircleCheck size={22} strokeWidth={2} aria-hidden="true" />
            </div>

            <div>

              <span>
                Terminées
              </span>

              <strong>
                {
                  analyses.filter(
                    (item) =>
                      item.statut ===
                      "Terminée"
                  ).length
                }
              </strong>

              <small>
                Résultats validés
              </small>

            </div>

          </div>

        </section>

        {/* BARRE DE RECHERCHE */}

        <section className="laboratory-toolbar">

          <div className="laboratory-search">

            <span>
              <Search size={17} strokeWidth={2} aria-hidden="true" />
            </span>

            <input
              type="text"
              placeholder="Rechercher un patient ou une analyse..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
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

        </section>

        {/* ====================================================
            TABLEAU - PLEINE LARGEUR
            ==================================================== */}

        <section className="laboratory-content-full">

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
                <Download size={16} className="ms-inline-icon" aria-hidden="true" /> Exporter
              </button>

            </div>

            <div className="laboratory-table-container">

              <table className="laboratory-table">

                <thead>

                  <tr>

                    <th>
                      Identifiant
                    </th>
                    <th>
                      Patient
                    </th>
                    <th>
                      Analyse
                    </th>
                    <th>
                      Date
                    </th>
                    <th>
                      Médecin
                    </th>
                    <th>
                      Priorité
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
                  {filteredAnalyses.length > 0 ? (
                    filteredAnalyses.map(
                      (analysis) => (
                        <tr key={analysis.id}>

                          {/* ID */}

                          <td>
                            <strong className="lab-analysis-id">
                              {analysis.id}
                            </strong>
                          </td>

                          {/* PATIENT */}

                          <td>
                            <div className="lab-patient">

                              <div className="lab-patient-avatar">
                                {getInitials(
                                  analysis.patient
                                )}
                              </div>
                              <div className="lab-patient-content">
                                <strong>
                                  {analysis.patient}
                                </strong>
                              </div>
                            </div>
                          </td>

                          {/* ANALYSE */}

                          <td>
                            <span className="analysis-name">
                              {analysis.type}
                            </span>
                          </td>

                          {/* DATE */}

                          <td>
                            <strong className="analysis-date">
                              {analysis.date}
                            </strong>

                            <small className="analysis-time">
                              {analysis.heure}
                            </small>

                          </td>
                          {/* MEDECIN */}

                          <td>
                            {analysis.medecin}
                          </td>

                          {/* PRIORITE */}

                          <td>
                            <span
                              className={`lab-priority ${getPriorityClass(
                                analysis.priorite
                              )}`}
                            >
                              {analysis.priorite}
                            </span>
                          </td>
                          {/* STATUT */}

                          <td>
                            <span
                              className={`lab-status ${getStatusClass(
                                analysis.statut
                              )}`}
                            >
                              {analysis.statut}
                            </span>
                          </td>

                          {/* ACTIONS */}

                          <td>
                            <div className="lab-actions">
                              <button
                                type="button"
                                className="lab-action-button lab-action-request"
                                onClick={() =>
                                  openAnalysisRequest(
                                    analysis
                                  )
                                }
                              >
                                Demande d'analyse
                              </button>
                              <button
                                type="button"
                                className="lab-action-button lab-action-print"
                                onClick={() =>
                                  printResultPdf(
                                    analysis
                                  )
                                }
                              >
                                Imprimer résultat
                              </button>
                              <button
                                type="button"
                                className="lab-action-button lab-action-result"
                                onClick={() =>
                                  openResultForm(
                                    analysis
                                  )
                                }
                              >
                                {analysis.statut === "Terminée"
                                  ? "Voir résultat"
                                  : "Saisir résultat"}
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
        </section>

        {/* ====================================================
            MODAL DEMANDE D'ANALYSE
            ==================================================== */}

        {showAnalysisRequest &&
          selectedAnalysis && (
            <div
              className="laboratory-modal-overlay"
              onClick={
                closeAnalysisRequest
              }
            >

              <div
                className="laboratory-modal laboratory-analysis-modal"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >

                <div className="laboratory-modal-header">

                  <div>

                    <span className="laboratory-form-label">
                      LABORATOIRE
                    </span>

                    <h2>
                      Demande d'analyse
                    </h2>

                    <p>
                      {selectedAnalysis.id}
                    </p>

                  </div>

                  <button
                    className="lab-modal-close"
                    onClick={
                      closeAnalysisRequest
                    }
                    type="button"
                  >
                    <X size={18} strokeWidth={2} aria-hidden="true" />
                  </button>

                </div>

                <div className="laboratory-modal-patient">

                  <div className="lab-modal-avatar">
                    {getInitials(
                      selectedAnalysis.patient
                    )}
                  </div>

                  <div>

                    <strong>
                      {selectedAnalysis.patient}
                    </strong>

                    <span>
                      Médecin :{" "}
                      {selectedAnalysis.medecin}
                    </span>

                  </div>

                </div>

                <form
                  onSubmit={
                    validateAnalysisRequest
                  }
                  className="laboratory-result-form"
                >

                  <div className="lab-exam-title">
                    Sélectionner les examens demandés
                  </div>

                  <div className="lab-exam-list">

                    {EXAMS.map((exam) => {

                      const selected =
                        selectedExamIds.includes(
                          exam.id
                        );

                      return (

                        <label
                          key={exam.id}
                          className={`lab-exam-item ${
                            selected
                              ? "selected"
                              : ""
                          }`}
                        >

                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleExam(
                                exam.id
                              )
                            }
                          />

                          <div className="lab-exam-information">

                            <strong>
                              {exam.name}
                            </strong>

                            <span>
                              {exam.category}
                            </span>

                          </div>

                          <strong className="lab-exam-price">
                            {formatMoney(
                              exam.price
                            )}
                          </strong>

                        </label>

                      );
                    })}

                  </div>

                  <div className="lab-analysis-total">

                    <span>
                      Nombre d'examens
                    </span>

                    <strong>
                      {selectedExams.length}
                    </strong>

                    <span>
                      Coût total
                    </span>

                    <strong>
                      {formatMoney(
                        totalAnalysisCost
                      )}
                    </strong>

                  </div>

                  <div className="laboratory-form-actions">

                    <button
                      type="button"
                      className="lab-cancel-button"
                      onClick={
                        closeAnalysisRequest
                      }
                    >
                      Annuler
                    </button>

                    <button
                      type="submit"
                      className="lab-save-button"
                    >
                      <Check size={16} className="ms-inline-icon" aria-hidden="true" /> Enregistrer la demande
                    </button>

                  </div>

                </form>

              </div>

            </div>

          )}

        {/* ====================================================
            MODAL RESULTAT - GRAND FORMAT
            ==================================================== */}

        {showResultForm &&
          selectedAnalysis && (

            <div
              className="laboratory-modal-overlay laboratory-result-overlay"
              onClick={closeResultForm}
            >

              <div
                className="laboratory-result-fullscreen"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >

                {/* HEADER */}

                <div className="laboratory-modal-header">

                  <div>

                    <span className="laboratory-form-label">
                      SAISIE DES RÉSULTATS
                    </span>

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
                    type="button"
                  >
                    <X size={18} strokeWidth={2} aria-hidden="true" />
                  </button>

                </div>

                {/* PATIENT */}

                <div className="laboratory-modal-patient">

                  <div className="lab-modal-avatar">

                    {getInitials(
                      selectedAnalysis.patient
                    )}

                  </div>

                  <div>

                    <strong>
                      {selectedAnalysis.patient}
                    </strong>

                    <span>
                      Analyse :{" "}
                      {selectedAnalysis.type}
                    </span>

                    <span>
                      Médecin :{" "}
                      {selectedAnalysis.medecin}
                    </span>

                  </div>

                </div>

                {/* FORMULAIRE */}

                <form
                  onSubmit={validateResult}
                  className="laboratory-result-form-full"
                >

                  {/* EXAMENS */}

                  {selectedAnalysis.examens?.length >
                    0 && (

                    <div className="lab-result-exams-full">

                      <div className="lab-result-section-title">

                        <div>

                          <h3>
                            Résultats des examens
                          </h3>

                          <p>
                            Saisissez les valeurs
                            obtenues pour chaque examen.
                          </p>

                        </div>

                      </div>

                      <div className="lab-result-exams-list">

                        {selectedAnalysis.examens.map(
                          (exam) => (

                            <div
                              className="lab-result-exam-row-full"
                              key={exam.id}
                            >

                              <div className="lab-result-exam-name">

                                <strong>
                                  {exam.name}
                                </strong>

                                <span>
                                  {exam.category ||
                                    "Laboratoire"}
                                </span>

                                {exam.reference && (
                                  <small>
                                    Valeur de référence :{" "}
                                    {exam.reference}
                                  </small>
                                )}

                              </div>

                              <div className="lab-result-input-wrapper">

                                <input
                                  type="text"
                                  value={
                                    examResults[
                                      exam.id
                                    ] || ""
                                  }
                                  onChange={(event) =>
                                    updateExamResult(
                                      exam.id,
                                      event.target.value
                                    )
                                  }
                                  placeholder={`Résultat de ${exam.name}`}
                                />

                                {exam.unit && (
                                  <span>
                                    {exam.unit}
                                  </span>
                                )}

                              </div>

                            </div>

                          )
                        )}

                      </div>

                    </div>

                  )}

                  {/* RESULTAT GENERAL */}

                  <div className="laboratory-form-field">

                    <label htmlFor="result-general">

                      Résultat général

                    </label>

                    <textarea
                      id="result-general"
                      value={
                        resultData.result
                      }
                      onChange={(event) =>
                        setResultData({
                          ...resultData,
                          result:
                            event.target.value,
                        })
                      }
                      placeholder="Saisissez ici le résultat général de l'analyse..."
                    />

                  </div>

                  {/* OBSERVATION */}

                  <div className="laboratory-form-field">

                    <label htmlFor="result-observation">

                      Observation médicale

                    </label>

                    <textarea
                      id="result-observation"
                      value={
                        resultData.observation
                      }
                      onChange={(event) =>
                        setResultData({
                          ...resultData,
                          observation:
                            event.target.value,
                        })
                      }
                      placeholder="Ajoutez ici les observations, commentaires ou précisions du laboratoire..."
                    />

                  </div>

                  {/* ACTIONS */}

                  <div className="laboratory-form-actions-full">

                    <button
                      type="button"
                      className="lab-cancel-button"
                      onClick={
                        closeResultForm
                      }
                    >
                      Annuler
                    </button>

                    <button
                      type="button"
                      className="lab-print-button"
                      onClick={() =>
                        printResultPdf(
                          selectedAnalysis
                        )
                      }
                    >
                      <Printer size={16} className="ms-inline-icon" aria-hidden="true" /> Imprimer PDF
                    </button>

                    <button
                      type="submit"
                      className="lab-save-button"
                    >
                      <Check size={16} className="ms-inline-icon" aria-hidden="true" /> Enregistrer le résultat
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