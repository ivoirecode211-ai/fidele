
import { useMemo, useState } from "react";
import "../styles/reports.css";

const reportsData = [
  {
    id: 1,
    title: "Rapport d'activité mensuel",
    type: "Activité",
    service: "Tous les services",
    period: "Septembre 2026",
    author: "Direction Générale",
    status: "Disponible",
    date: "17/09/2026",
  },
  {
    id: 2,
    title: "Rapport des consultations",
    type: "Consultations",
    service: "Médecine",
    period: "Septembre 2026",
    author: "Service Médical",
    status: "Disponible",
    date: "16/09/2026",
  },
  {
    id: 3,
    title: "Rapport financier",
    type: "Finances",
    service: "Caisse",
    period: "Septembre 2026",
    author: "Service Caisse",
    status: "Disponible",
    date: "15/09/2026",
  },
  {
    id: 4,
    title: "Rapport des stocks",
    type: "Stocks",
    service: "Pharmacie",
    period: "Septembre 2026",
    author: "Pharmacie",
    status: "Disponible",
    date: "14/09/2026",
  },
  {
    id: 5,
    title: "Rapport d'hospitalisation",
    type: "Hospitalisation",
    service: "Hospitalisation",
    period: "Septembre 2026",
    author: "Service Hospitalisation",
    status: "Disponible",
    date: "13/09/2026",
  },
  {
    id: 6,
    title: "Rapport de maintenance",
    type: "Maintenance",
    service: "Maintenance",
    period: "Septembre 2026",
    author: "Support IT",
    status: "En cours",
    date: "12/09/2026",
  },
];

const serviceStats = [
  {
    service: "Médecine",
    value: 35,
    reports: 12,
  },
  {
    service: "Pédiatrie",
    value: 20,
    reports: 8,
  },
  {
    service: "Gynécologie",
    value: 18,
    reports: 7,
  },
  {
    service: "Chirurgie",
    value: 15,
    reports: 6,
  },
  {
    service: "Laboratoire",
    value: 8,
    reports: 4,
  },
  {
    service: "Autres",
    value: 4,
    reports: 2,
  },
];

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

const periods = [
  "Septembre 2026",
  "Août 2026",
  "Juillet 2026",
  "Juin 2026",
  "Mai 2026",
];

function Reports() {
  const [typeFilter, setTypeFilter] = useState("Tous les types");
  const [serviceFilter, setServiceFilter] =
    useState("Tous les services");
  const [periodFilter, setPeriodFilter] =
    useState("Septembre 2026");
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
    setPeriodFilter("Septembre 2026");
    setSearch("");
  };

  return (
    <div className="reports-page">

      <div className="reports-header">

        <div>
          <div className="reports-breadcrumb">
            Directeur Général <span>›</span> Rapports
          </div>

          <h1>Rapports</h1>

          <p>
            Consultez et analysez les rapports d'activité de
            l'établissement.
          </p>
        </div>

        <div className="reports-header-actions">

          <button
            className="reports-btn reports-btn-secondary"
            onClick={handlePrint}
          >
            <span>🖨</span>
            Imprimer
          </button>

          <button
            className="reports-btn reports-btn-primary"
            onClick={downloadCSV}
          >
            <span>↓</span>
            Exporter
          </button>

        </div>

      </div>

      <div className="reports-stat-grid">

        {/* TOTAL RAPPORTS */}

        <div className="report-stat-card">

          <div className="report-stat-icon blue">
            📄
          </div>

          <div className="report-stat-content">

            <span>Total rapports</span>

            <strong>42</strong>

            <small>
              Ce mois-ci
            </small>

          </div>

        </div>

        {/* RAPPORTS DISPONIBLES */}

        <div className="report-stat-card">

          <div className="report-stat-icon green">
            ✓
          </div>

          <div className="report-stat-content">

            <span>Rapports disponibles</span>

            <strong>38</strong>

            <small>
              90,5 % du total
            </small>

          </div>

        </div>

        {/* RAPPORTS EN COURS */}

        <div className="report-stat-card">

          <div className="report-stat-icon orange">
            ⏳
          </div>

          <div className="report-stat-content">

            <span>Rapports en cours</span>

            <strong>4</strong>

            <small>
              À finaliser
            </small>

          </div>

        </div>

        {/* TAUX DE PRODUCTION */}

        <div className="report-stat-card">

          <div className="report-stat-icon purple">
            📊
          </div>

          <div className="report-stat-content">

            <span>Taux de production</span>

            <strong>92%</strong>

            <small>
              +6 % ce mois
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
                ⌕
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
                            📄
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
                          📂
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
                Répartition des rapports
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
                  {item.reports} rapports
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

          <button className="quick-report-card">

            <div className="quick-report-icon blue">
              👥
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
              ›
            </b>

          </button>

          {/* RAPPORT FINANCIER */}

          <button className="quick-report-card">

            <div className="quick-report-icon green">
              💰
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
              ›
            </b>

          </button>

          {/* RAPPORT PHARMACIE */}

          <button className="quick-report-card">

            <div className="quick-report-icon orange">
              💊
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
              ›
            </b>

          </button>

          {/* RAPPORT HOSPITALISATION */}

          <button className="quick-report-card">

            <div className="quick-report-icon purple">
              🏥
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
              ›
            </b>

          </button>

        </div>

      </section>

      <div className="reports-footer-info">

        <span>
          ●
        </span>

        Données mises à jour automatiquement par MA SANTÉ

      </div>

    </div>
  );
}

export default Reports;
