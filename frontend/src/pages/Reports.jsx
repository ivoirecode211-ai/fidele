
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "../styles/reports.css";

import {
  ChartColumn,
  ChevronRight,
  Circle,
  CircleCheck,
  Download,
  FileText,
  FolderOpen,
  Hospital,
  Hourglass,
  Pill,
  Printer,
  Search,
  Users,
  Wallet,
} from "lucide-react";
const reportTypes = [
  "Tous les types",
  "Activité",
  "Consultations",
  "Finances",
  "Stocks",
  "Hospitalisation",
  "Maintenance",
];

const services = [
  "Tous les services",
  "Médecine",
  "Pédiatrie",
  "Gynécologie",
  "Chirurgie",
  "Laboratoire",
  "Pharmacie",
  "Caisse",
  "Hospitalisation",
  "Maintenance",
];

// Rapports calculés sur les données enregistrées (/api/reports/).
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

async function openReport(report) {
  if (!report) return;

  // La fenêtre est ouverte tout de suite (sinon le navigateur la bloque),
  // puis remplie une fois le rapport complet chargé.
  const win = window.open("", "_blank", "width=1100,height=860");
  if (!win) return;
  win.document.write("<p style='font-family:system-ui;padding:32px'>Chargement du rapport…</p>");

  let detail;
  try {
    detail = (await api.get(`/reports/${encodeURIComponent(report.id)}/`)).data;
  } catch {
    win.document.body.innerHTML = "<p style='font-family:system-ui;padding:32px'>Rapport indisponible.</p>";
    return;
  }

  const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [
    [detail.title, detail.period].map(csvCell).join(";"),
    "",
    ...detail.figures.map((f) => [f.label, f.value].map(csvCell).join(";")),
    ...detail.sections.flatMap((section) => [
      "",
      csvCell(section.title),
      section.columns.map(csvCell).join(";"),
      ...section.rows.map((row) => row.map(csvCell).join(";")),
    ]),
  ].join("\n");
  const csvHref = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));

  const figures = detail.figures
    .map((f) => `<div class="fig"><span>${escapeHtml(f.label)}</span><strong>${escapeHtml(f.value)}</strong></div>`)
    .join("");
  const sections = detail.sections
    .map((section) => `<section><h2>${escapeHtml(section.title)} <small>(${section.rows.length})</small></h2>${
      section.rows.length
        ? `<table><thead><tr>${section.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${section.rows
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        : "<p class='empty'>Aucun événement sur la période.</p>"
    }</section>`)
    .join("");

  win.document.open();
  win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(detail.title)} — ${escapeHtml(detail.period)}</title>
    <style>
      body{font-family:system-ui,sans-serif;color:#0f172a;margin:32px}
      h1{color:#1671b7;margin:0 0 4px}
      .meta{color:#475569;margin:0 0 20px}
      .toolbar{display:flex;gap:10px;margin-bottom:24px}
      .toolbar a,.toolbar button{font:inherit;padding:9px 16px;border-radius:8px;border:1px solid #1671b7;cursor:pointer;text-decoration:none}
      .toolbar button{background:#1671b7;color:#fff}.toolbar a{color:#1671b7;background:#fff}
      .figs{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-bottom:28px}
      .fig{border:1px solid #e2e8f0;border-radius:10px;padding:12px}
      .fig span{display:block;color:#475569;font-size:12px}.fig strong{font-size:20px}
      section{margin-bottom:26px;break-inside:auto}
      h2{font-size:16px;color:#0b5d98;border-bottom:2px solid #e0effe;padding-bottom:6px}
      h2 small{color:#475569;font-weight:500}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#f1f8ff;color:#0b5d98;text-align:left;padding:7px}
      td{padding:7px;border-bottom:1px solid #e2e8f0;vertical-align:top}
      .empty{color:#475569}
      footer{margin-top:24px;color:#475569;font-size:12px}
      @media print{.toolbar{display:none}body{margin:12mm}tr{break-inside:avoid}}
    </style></head><body>
    <h1>${escapeHtml(detail.title)}</h1>
    <p class="meta">${escapeHtml(detail.period)} · ${escapeHtml(detail.service)} · généré le ${escapeHtml(detail.generatedAt)}</p>
    <div class="toolbar"><button onclick="window.print()">Imprimer / PDF</button>
      <a href="${csvHref}" download="${escapeHtml(detail.id)}.csv">Télécharger CSV</a></div>
    <div class="figs">${figures}</div>${sections}
    <footer>MA SANTÉ — ${escapeHtml(detail.author)}</footer></body></html>`);
  win.document.close();
}

function Reports() {
  const [data, setData] = useState({
    stats: { total: 0, available: 0, inProgress: 0, rate: 0 },
    periods: [],
    reports: [],
    serviceStats: [],
  });

  const [typeFilter, setTypeFilter] = useState("Tous les types");
  const [serviceFilter, setServiceFilter] =
    useState("Tous les services");
  const [periodFilter, setPeriodFilter] =
    useState("");

  useEffect(() => {
    api
      .get("/reports/overview/", { params: periodFilter ? { period: periodFilter } : {} })
      .then((response) => {
        setData(response.data);
        if (!periodFilter && response.data.periods.length) {
          setPeriodFilter(response.data.periods[0]);
        }
      })
      .catch((error) => console.error("Erreur de chargement des rapports :", error));
  }, [periodFilter]);

  const reportsData = data.reports;
  const serviceStats = data.serviceStats;
  const periods = data.periods;

  const quickReport = (type) =>
    openReport(reportsData.find((report) => report.type === type && report.period === periods[0]));
  const [search, setSearch] = useState("");

  const filteredReports = useMemo(() => {
    return reportsData.filter((report) => {
      const matchesType =
        typeFilter === "Tous les types" ||
        report.type === typeFilter;

      const matchesService =
        serviceFilter === "Tous les services" ||
        report.service === serviceFilter;

      const matchesPeriod =
        report.period === periodFilter;

      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        report.title.toLowerCase().includes(searchValue) ||
        report.type.toLowerCase().includes(searchValue) ||
        report.service.toLowerCase().includes(searchValue) ||
        report.author.toLowerCase().includes(searchValue);

      return (
        matchesType &&
        matchesService &&
        matchesPeriod &&
        matchesSearch
      );
    });
  }, [
    typeFilter,
    serviceFilter,
    periodFilter,
    search,
    reportsData,
  ]);

  const downloadCSV = () => {
    const headers = [
      "Rapport",
      "Type",
      "Service",
      "Période",
      "Auteur",
      "Statut",
      "Date",
    ];

    const rows = filteredReports.map((report) => [
      report.title,
      report.type,
      report.service,
      report.period,
      report.author,
      report.status,
      report.date,
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.join(";")),
    ].join("\n");

    const blob = new Blob(
      ["\ufeff" + csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "rapports-ma-sante.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const resetFilters = () => {
    setTypeFilter("Tous les types");
    setServiceFilter("Tous les services");
    setPeriodFilter(periods[0] || "");
    setSearch("");
  };

  return (
    <div className="reports-page">

      <div className="reports-header">


        <div className="reports-header-actions">

          <button
            className="reports-btn reports-btn-secondary"
            onClick={handlePrint}
          >
            <span><Printer size={16} strokeWidth={2} aria-hidden="true" /></span>
            Imprimer
          </button>

          <button
            className="reports-btn reports-btn-primary"
            onClick={downloadCSV}
          >
            <span><Download size={16} strokeWidth={2} aria-hidden="true" /></span>
            Exporter
          </button>

        </div>

      </div>

      <div className="reports-stat-grid">

        {/* TOTAL RAPPORTS */}

        <div className="report-stat-card">

          <div className="report-stat-icon blue">
            <FileText size={22} strokeWidth={2} aria-hidden="true" />
          </div>

          <div className="report-stat-content">

            <span>Total rapports</span>

            <strong>{data.stats.total}</strong>

            <small>
              Tous mois confondus
            </small>

          </div>

        </div>

        {/* RAPPORTS DISPONIBLES */}

        <div className="report-stat-card">

          <div className="report-stat-icon green">
            <CircleCheck size={22} strokeWidth={2} aria-hidden="true" />
          </div>

          <div className="report-stat-content">

            <span>Rapports disponibles</span>

            <strong>{data.stats.available}</strong>

            <small>
              {data.stats.rate} % du total
            </small>

          </div>

        </div>

        {/* RAPPORTS EN COURS */}

        <div className="report-stat-card">

          <div className="report-stat-icon orange">
            <Hourglass size={22} strokeWidth={2} aria-hidden="true" />
          </div>

          <div className="report-stat-content">

            <span>Rapports en cours</span>

            <strong>{data.stats.inProgress}</strong>

            <small>
              À finaliser
            </small>

          </div>

        </div>

        {/* TAUX DE PRODUCTION */}

        <div className="report-stat-card">

          <div className="report-stat-icon purple">
            <ChartColumn size={22} strokeWidth={2} aria-hidden="true" />
          </div>

          <div className="report-stat-content">

            <span>Taux de production</span>

            <strong>{data.stats.rate}%</strong>

            <small>
              Mois clôturés
            </small>

          </div>

        </div>

      </div>

      <section className="reports-panel reports-filters-panel">

        <div className="panel-title">

          <div>

            <h2>
              Filtrer les rapports
            </h2>

            <p>
              Sélectionnez les critères pour afficher les rapports
              correspondants.
            </p>

          </div>

          <button
            className="reset-filter-btn"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>

        </div>

        <div className="reports-filters">

          {/* RECHERCHE */}

          <div className="filter-group search-group">

            <label>
              Rechercher
            </label>

            <div className="search-input-wrapper">

              <span>
                <Search size={17} strokeWidth={2} aria-hidden="true" />
              </span>

              <input
                type="text"
                placeholder="Rechercher un rapport..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>

          </div>

          {/* PÉRIODE */}

          <div className="filter-group">

            <label>
              Période
            </label>

            <select
              value={periodFilter}
              onChange={(e) =>
                setPeriodFilter(e.target.value)
              }
            >
              {periods.map((period) => (
                <option
                  key={period}
                  value={period}
                >
                  {period}
                </option>
              ))}
            </select>

          </div>

          {/* TYPE */}

          <div className="filter-group">

            <label>
              Type de rapport
            </label>

            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value)
              }
            >
              {reportTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ))}
            </select>

          </div>

          {/* SERVICE */}

          <div className="filter-group">

            <label>
              Service
            </label>

            <select
              value={serviceFilter}
              onChange={(e) =>
                setServiceFilter(e.target.value)
              }
            >
              {services.map((service) => (
                <option
                  key={service}
                  value={service}
                >
                  {service}
                </option>
              ))}
            </select>

          </div>

        </div>

      </section>

      <div className="reports-content-grid">

        <section className="reports-panel reports-table-panel">

          <div className="panel-title reports-table-title">

            <div>

              <h2>
                Rapports disponibles
              </h2>

              <p>
                {filteredReports.length} rapport(s)
                correspondant aux critères sélectionnés.
              </p>

            </div>

          </div>

          <div className="reports-table-wrapper">

            <table className="reports-table">

              <thead>

                <tr>
                  <th>Rapport</th>
                  <th>Type</th>
                  <th>Service</th>
                  <th>Période</th>
                  <th>Auteur</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>

              </thead>

              <tbody>

                {filteredReports.length > 0 ? (

                  filteredReports.map((report) => (

                    <tr key={report.id}>

                      {/* RAPPORT */}

                      <td>

                        <div className="report-name-cell">

                          <div className="document-icon">
                            <FileText size={18} strokeWidth={2} aria-hidden="true" />
                          </div>

                          <div>

                            <strong>
                              {report.title}
                            </strong>

                            <small>
                              Mis à jour le {report.date}
                            </small>

                          </div>

                        </div>

                      </td>

                      {/* TYPE */}

                      <td>

                        <span className="report-type">
                          {report.type}
                        </span>

                      </td>

                      {/* SERVICE */}

                      <td>
                        {report.service}
                      </td>

                      {/* PÉRIODE */}

                      <td>
                        {report.period}
                      </td>

                      {/* AUTEUR */}

                      <td>
                        {report.author}
                      </td>

                      {/* STATUT */}

                      <td>

                        <span
                          className={`report-status ${
                            report.status === "Disponible"
                              ? "available"
                              : "pending"
                          }`}
                        >

                          <span className="status-dot"></span>

                          {report.status}

                        </span>

                      </td>

                      {/* ACTION */}

                      <td>

                        <button
                          className="view-report-btn"
                          title="Consulter le rapport"
                          onClick={() => openReport(report)}
                        >
                          Voir
                        </button>

                      </td>

                    </tr>

                  ))

                ) : (

                  <tr>

                    <td
                      colSpan="7"
                      className="empty-reports"
                    >

                      <div>

                        <span>
                          <FolderOpen size={28} strokeWidth={2} aria-hidden="true" />
                        </span>

                        <strong>
                          Aucun rapport trouvé
                        </strong>

                        <p>
                          Modifiez vos critères de recherche.
                        </p>

                      </div>

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </section>

        <section className="reports-panel service-panel">

          <div className="panel-title">

            <div>

              <h2>
                Activité par service
              </h2>

              <p>
                Répartition des passages en caisse
              </p>

            </div>

          </div>

          <div className="service-stat-list">

            {serviceStats.map((item) => (

              <div
                className="service-stat-item"
                key={item.service}
              >

                <div className="service-stat-top">

                  <span>
                    {item.service}
                  </span>

                  <strong>
                    {item.value}%
                  </strong>

                </div>

                <div className="service-progress">

                  <div
                    className="service-progress-fill"
                    style={{
                      width: `${item.value}%`,
                    }}
                  ></div>

                </div>

                <small>
                  {item.reports} passage(s)
                </small>

              </div>

            ))}

          </div>

        </section>

      </div>

      <section className="reports-panel quick-reports-panel">

        <div className="panel-title">

          <div>

            <h2>
              Rapports rapides
            </h2>

            <p>
              Accès direct aux principaux rapports de direction.
            </p>

          </div>

        </div>

        <div className="quick-reports-grid">

          {/* RAPPORT PATIENTS */}

          <button className="quick-report-card" onClick={() => quickReport("Activité")}>

            <div className="quick-report-icon blue">
              <Users size={20} strokeWidth={2} aria-hidden="true" />
            </div>

            <div>

              <strong>
                Rapport patients
              </strong>

              <span>
                Patients enregistrés, nouveaux patients et
                fréquentation.
              </span>

            </div>

            <b>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </b>

          </button>

          {/* RAPPORT FINANCIER */}

          <button className="quick-report-card" onClick={() => quickReport("Finances")}>

            <div className="quick-report-icon green">
              <Wallet size={20} strokeWidth={2} aria-hidden="true" />
            </div>

            <div>

              <strong>
                Rapport financier
              </strong>

              <span>
                Recettes, dépenses et situation de la caisse.
              </span>

            </div>

            <b>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </b>

          </button>

          {/* RAPPORT PHARMACIE */}

          <button className="quick-report-card" onClick={() => quickReport("Stocks")}>

            <div className="quick-report-icon orange">
              <Pill size={20} strokeWidth={2} aria-hidden="true" />
            </div>

            <div>

              <strong>
                Rapport pharmacie
              </strong>

              <span>
                Stocks, produits critiques et mouvements.
              </span>

            </div>

            <b>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </b>

          </button>

          {/* RAPPORT HOSPITALISATION */}

          <button className="quick-report-card" onClick={() => quickReport("Hospitalisation")}>

            <div className="quick-report-icon purple">
              <Hospital size={20} strokeWidth={2} aria-hidden="true" />
            </div>

            <div>

              <strong>
                Rapport hospitalisation
              </strong>

              <span>
                Occupation des lits et activité hospitalière.
              </span>

            </div>

            <b>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </b>

          </button>

        </div>

      </section>

      <div className="reports-footer-info">

        <span>
          <Circle size={8} fill="currentColor" className="ms-inline-icon" aria-hidden="true" />
        </span>

        Données mises à jour automatiquement par MA SANTÉ

      </div>

    </div>
  );
}

export default Reports;
