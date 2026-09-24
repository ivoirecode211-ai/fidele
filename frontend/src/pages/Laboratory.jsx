import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/Laboratory.css";

/* ============================================================
   TARIFS DES EXAMENS
   ============================================================ */

const EXAMS = [
  {
    id: "nfs",
    name: "NFS",
    category: "Hématologie",
    price: 5000,
  },
  {
    id: "glycemie",
    name: "Glycémie",
    category: "Biochimie",
    price: 2500,
  },
  {
    id: "groupe-sanguin",
    name: "Groupe sanguin",
    category: "Immuno-hématologie",
    price: 3000,
  },
  {
    id: "creatinine",
    name: "Créatinine",
    category: "Biochimie",
    price: 3000,
  },
  {
    id: "uree",
    name: "Urée",
    category: "Biochimie",
    price: 3000,
  },
  {
    id: "crp",
    name: "CRP",
    category: "Immunologie",
    price: 5000,
  },
  {
    id: "bilan-lipidique",
    name: "Bilan lipidique",
    category: "Biochimie",
    price: 10000,
  },
  {
    id: "cholesterol",
    name: "Cholestérol total",
    category: "Biochimie",
    price: 3000,
  },
  {
    id: "triglycerides",
    name: "Triglycérides",
    category: "Biochimie",
    price: 3000,
  },
  {
    id: "transaminases",
    name: "Transaminases",
    category: "Biochimie",
    price: 6000,
  },
  {
    id: "vih",
    name: "Sérologie VIH",
    category: "Sérologie",
    price: 5000,
  },
  {
    id: "hepatite-b",
    name: "Ag HBs - Hépatite B",
    category: "Sérologie",
    price: 5000,
  },
  {
    id: "hepatite-c",
    name: "Sérologie Hépatite C",
    category: "Sérologie",
    price: 5000,
  },
  {
    id: "urines",
    name: "ECBU",
    category: "Bactériologie",
    price: 7000,
  },
  {
    id: "test-paludisme",
    name: "Test de diagnostic du paludisme",
    category: "Parasitologie",
    price: 3000,
  },
];

/* ============================================================
   DONNÉES DE DÉMONSTRATION
   ============================================================ */

const INITIAL_ANALYSES = [
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

    caisse: {
      numero: "CAI-2026-00125",
      date: "10/09/2026",
      montant: 5000,
      montantPaye: 5000,
      reste: 0,
      modePaiement: "Espèces",
    },

    examens: [
      {
        id: "nfs",
        name: "NFS",
        category: "Hématologie",
        price: 5000,
        result: "",
        unit: "",
        reference: "",
      },
    ],
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

    caisse: {
      numero: "CAI-2026-00126",
      date: "10/09/2026",
      montant: 2500,
      montantPaye: 2500,
      reste: 0,
      modePaiement: "Mobile Money",
    },

    examens: [
      {
        id: "glycemie",
        name: "Glycémie",
        category: "Biochimie",
        price: 2500,
        result: "",
        unit: "g/L",
        reference: "0,70 - 1,10",
      },
    ],
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

    caisse: {
      numero: "CAI-2026-00118",
      date: "09/09/2026",
      montant: 3000,
      montantPaye: 3000,
      reste: 0,
      modePaiement: "Espèces",
    },

    examens: [
      {
        id: "groupe-sanguin",
        name: "Groupe sanguin",
        category: "Immuno-hématologie",
        price: 3000,
        result: "A+",
        unit: "",
        reference: "",
      },
    ],
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

    caisse: {
      numero: "CAI-2026-00119",
      date: "09/09/2026",
      montant: 3000,
      montantPaye: 3000,
      reste: 0,
      modePaiement: "Carte bancaire",
    },

    examens: [
      {
        id: "creatinine",
        name: "Créatinine",
        category: "Biochimie",
        price: 3000,
        result: "",
        unit: "mg/L",
        reference: "6 - 13",
      },
    ],
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

    caisse: {
      numero: "CAI-2026-00107",
      date: "08/09/2026",
      montant: 5000,
      montantPaye: 5000,
      reste: 0,
      modePaiement: "Espèces",
    },

    examens: [
      {
        id: "crp",
        name: "CRP",
        category: "Immunologie",
        price: 5000,
        result: "6",
        unit: "mg/L",
        reference: "< 6",
      },
    ],
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

    caisse: {
      numero: "CAI-2026-00108",
      date: "08/09/2026",
      montant: 10000,
      montantPaye: 10000,
      reste: 0,
      modePaiement: "Mobile Money",
    },

    examens: [
      {
        id: "bilan-lipidique",
        name: "Bilan lipidique",
        category: "Biochimie",
        price: 10000,
        result: "",
        unit: "",
        reference: "",
      },
    ],
  },
];

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
    useState(INITIAL_ANALYSES);

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
  }, [selectedExamIds]);

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

  const validateAnalysisRequest = (event) => {
    event.preventDefault();

    if (!selectedAnalysis) return;

    if (selectedExams.length === 0) {
      alert(
        "Veuillez sélectionner au moins un examen."
      );
      return;
    }

    const now = new Date();

    const updatedAnalysis = {
      ...selectedAnalysis,

      type:
        selectedExams.length === 1
          ? selectedExams[0].name
          : `${selectedExams.length} examens`,

      examens: selectedExams.map((exam) => {
        const oldExam =
          selectedAnalysis.examens?.find(
            (item) => item.id === exam.id
          );

        return {
          ...exam,
          result: oldExam?.result || "",
          unit: oldExam?.unit || "",
          reference:
            oldExam?.reference ||
            "",
        };
      }),

      caisse: {
        ...selectedAnalysis.caisse,
        montant: totalAnalysisCost,
      },

      date:
        now.toLocaleDateString("fr-FR"),

      heure:
        now.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),

      statut: "En attente",
    };

    setAnalyses((previous) =>
      previous.map((item) =>
        item.id === selectedAnalysis.id
          ? updatedAnalysis
          : item
      )
    );

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

  const validateResult = (event) => {
    event.preventDefault();

    if (!selectedAnalysis) return;

    const updatedExams =
      (selectedAnalysis.examens || []).map(
        (exam) => ({
          ...exam,
          result:
            examResults[exam.id] || "",
        })
      );

    const summaryResult =
      updatedExams
        .map((exam) => {
          const result =
            examResults[exam.id] || "";

          if (!result) return "";

          return `${exam.name}: ${result} ${
            exam.unit || ""
          }`;
        })
        .filter(Boolean)
        .join(" | ");

    setAnalyses((previous) =>
      previous.map((item) =>
        item.id === selectedAnalysis.id
          ? {
              ...item,
              resultat:
                summaryResult ||
                resultData.result,

              observation:
                resultData.observation,

              examens: updatedExams,

              statut: "Terminée",
            }
          : item
      )
    );

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

        <div className="laboratory-sidebar-footer">

          <strong>
            MA SANTE
          </strong>

          <span>
            Gestion de Clinique
          </span>

        </div>

      </aside>

      {/* CONTENU PRINCIPAL */}

      <main className="laboratory-main">

        {/* HEADER */}

        <header className="laboratory-header">

          <div>

            <h1>
              Laboratoire
            </h1>

            <p>
              Gérez les demandes d'analyses et
              les résultats biologiques des patients.
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

        {/* STATISTIQUES */}

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
                {analyses.length}
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
              ⚗
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
              ✓
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
              🔎
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
                ↓ Exporter
              </button>

            </div>

            <div className="laboratory-table-container">

              <table className="laboratory-table">

                <thead>

                  <tr>

                    <th>
                      ID
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
                    ×
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
                      ✓ Enregistrer la demande
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
                    ×
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
                      🖨 Imprimer PDF
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