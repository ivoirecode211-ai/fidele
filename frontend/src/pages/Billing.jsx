import { useEffect, useMemo, useState } from "react";

import {
  Banknote,
  Building2,
  CalendarDays,
  CircleAlert,
  CreditCard,
  Download,
  Eye,
  Filter,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";

import api from "../services/api";

import "../styles/billing.css";


/* ============================================================
   UTILITAIRES
   ============================================================ */

function formatCurrency(value) {
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0) + " FCFA"
  );
}


function formatDate(dateValue) {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("fr-FR");
}


function normalizeDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  if (
    typeof dateValue === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(dateValue)
  ) {
    return dateValue.substring(0, 10);
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/* ============================================================
   NORMALISATION DES DONNÉES DE LA CAISSE
   ------------------------------------------------------------
   Cette fonction accepte plusieurs noms de champs afin que
   Billing puisse s'adapter à la structure actuelle de Caisse.
   ============================================================ */

function normalizePayment(item, index) {
  const totalAmount = Number(
    item.totalAmount ??
    item.total ??
    item.amount ??
    item.montant ??
    item.montantTotal ??
    0
  );

  const insuranceAmount = Number(
    item.insuranceAmount ??
    item.insurance ??
    item.assurance ??
    item.partAssurance ??
    item.montantAssurance ??
    0
  );

  const patientAmount = Number(
    item.patientAmount ??
    item.patientPaid ??
    item.paidByPatient ??
    item.partPatient ??
    item.montantPatient ??
    Math.max(totalAmount - insuranceAmount, 0)
  );

  return {
    id:
      item.id ??
      item.reference ??
      item.paymentId ??
      `CAISSE-2026-${String(index + 1).padStart(3, "0")}`,

    patient:
      item.patient ??
      item.patientName ??
      item.nomPatient ??
      item.name ??
      "Patient inconnu",

    patientId:
      item.patientId ??
      item.patient_id ??
      item.codePatient ??
      "—",

    date: normalizeDate(
      item.date ??
      item.paymentDate ??
      item.createdAt ??
      item.created_at
    ),

    totalAmount,

    patientAmount,

    insuranceAmount,

    method:
      item.method ??
      item.paymentMethod ??
      item.modePaiement ??
      item.mode ??
      "—",

    cashier:
      item.cashier ??
      item.cashierName ??
      item.caissier ??
      item.caissierName ??
      "—",

    service:
      item.service ??
      item.serviceName ??
      item.motif ??
      item.description ??
      "—",

    insuranceName:
      item.insuranceName ??
      item.assuranceName ??
      item.assurance ??
      "",

    raw: item,
  };
}


/* ============================================================
   COMPOSANT PRINCIPAL
   ============================================================ */

export default function Billing() {

  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const [cashierFilter, setCashierFilter] = useState("ALL");

  const [methodFilter, setMethodFilter] = useState("ALL");

  const [selectedPayment, setSelectedPayment] = useState(null);

  const [showFilters, setShowFilters] = useState(true);


  /* ==========================================================
     CHARGEMENT DES PAIEMENTS DE LA CAISSE
     ========================================================== */

  async function loadPayments() {

    setLoading(true);

    setError("");

    try {

      const response = await api.get(
        "/parcours/comptabilite/paiements/"
      );


      setPayments(
        response.data.map(normalizePayment)
      );

    } catch (apiError) {

      console.error(apiError);

      setPayments([]);

      setError(
        "Impossible de récupérer les paiements de la Caisse."
      );

    } finally {

      setLoading(false);

    }
  }


  useEffect(() => {

    loadPayments();

  }, []);


  /* ==========================================================
     LISTE DES CAISSIERS
     ========================================================== */

  const cashiers = useMemo(() => {

    const values = payments
      .map((payment) => payment.cashier)
      .filter(Boolean)
      .filter(
        (value) => value !== "—"
      );

    return [
      ...new Set(values),
    ].sort(
      (a, b) =>
        a.localeCompare(b, "fr")
    );

  }, [payments]);


  /* ==========================================================
     LISTE DES MODES DE PAIEMENT
     ========================================================== */

  const paymentMethods = useMemo(() => {

    const values = payments
      .map((payment) => payment.method)
      .filter(Boolean)
      .filter(
        (value) => value !== "—"
      );

    return [
      ...new Set(values),
    ].sort(
      (a, b) =>
        a.localeCompare(b, "fr")
    );

  }, [payments]);


  /* ==========================================================
     FILTRAGE
     ========================================================== */

  const filteredPayments = useMemo(() => {

    const normalizedSearch =
      search.trim().toLowerCase();


    return payments.filter((payment) => {

      const matchesSearch =
        !normalizedSearch ||
        payment.patient
          .toLowerCase()
          .includes(normalizedSearch) ||
        payment.patientId
          .toLowerCase()
          .includes(normalizedSearch) ||
        payment.id
          .toLowerCase()
          .includes(normalizedSearch) ||
        payment.service
          .toLowerCase()
          .includes(normalizedSearch);


      const paymentDate =
        normalizeDate(payment.date);


      const matchesStartDate =
        !startDate ||
        paymentDate >= startDate;


      const matchesEndDate =
        !endDate ||
        paymentDate <= endDate;


      const matchesCashier =
        cashierFilter === "ALL" ||
        payment.cashier === cashierFilter;


      const matchesMethod =
        methodFilter === "ALL" ||
        payment.method === methodFilter;


      return (
        matchesSearch &&
        matchesStartDate &&
        matchesEndDate &&
        matchesCashier &&
        matchesMethod
      );

    });

  }, [
    payments,
    search,
    startDate,
    endDate,
    cashierFilter,
    methodFilter,
  ]);


  /* ==========================================================
     STATISTIQUES
     ========================================================== */

  const statistics = useMemo(() => {

    const totalCollected =
      filteredPayments.reduce(
        (sum, payment) =>
          sum + payment.totalAmount,
        0
      );


    const totalWithoutInsurance =
      filteredPayments.reduce(
        (sum, payment) =>
          sum + payment.patientAmount,
        0
      );


    const totalWithInsurance =
      filteredPayments.reduce(
        (sum, payment) =>
          sum + payment.insuranceAmount,
        0
      );


    const totalInsurance =
      filteredPayments.reduce(
        (sum, payment) =>
          sum + payment.insuranceAmount,
        0
      );


    const patientsCount =
      new Set(
        filteredPayments.map(
          (payment) =>
            payment.patientId ||
            payment.patient
        )
      ).size;


    return {
      totalCollected,
      totalWithoutInsurance,
      totalWithInsurance,
      totalInsurance,
      patientsCount,
    };

  }, [filteredPayments]);


  /* ==========================================================
     EXPORT CSV
     ========================================================== */

  function handleExportCSV() {

    const headers = [
      "Référence",
      "Patient",
      "Identifiant patient",
      "Date",
      "Montant total",
      "Part patient",
      "Part assurance",
      "Mode de paiement",
      "Caissier",
      "Service",
    ];


    const rows =
      filteredPayments.map(
        (payment) => [
          payment.id,
          payment.patient,
          payment.patientId,
          payment.date,
          payment.totalAmount,
          payment.patientAmount,
          payment.insuranceAmount,
          payment.method,
          payment.cashier,
          payment.service,
        ]
      );


    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replaceAll('"', '""')}"`
          )
          .join(";")
      )
      .join("\n");


    const blob = new Blob(
      [
        "\uFEFF" + csv,
      ],
      {
        type: "text/csv;charset=utf-8;",
      }
    );


    const url =
      URL.createObjectURL(blob);


    const link =
      document.createElement("a");


    link.href = url;

    link.download =
      "encaissements-caisse.csv";


    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }


  /* ==========================================================
     IMPRESSION / REÇU
     ========================================================== */

  function handlePrint(payment) {

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=800,height=700"
      );


    if (!printWindow) {
      return;
    }


    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Encaissement ${payment.id}</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #0f1f24;
          }

          h1 {
            margin-bottom: 4px;
          }

          .subtitle {
            color: #56686e;
            margin-bottom: 30px;
          }

          .line {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e2eae8;
          }

          .total {
            margin-top: 20px;
            font-size: 20px;
            font-weight: bold;
          }
        </style>
      </head>

      <body>

        <h1>MA SANTÉ</h1>

        <div class="subtitle">
          Relevé d'encaissement
        </div>

        <div class="line">
          <span>Référence</span>
          <strong>${payment.id}</strong>
        </div>

        <div class="line">
          <span>Patient</span>
          <strong>${payment.patient}</strong>
        </div>

        <div class="line">
          <span>Date</span>
          <strong>${formatDate(payment.date)}</strong>
        </div>

        <div class="line">
          <span>Service</span>
          <strong>${payment.service}</strong>
        </div>

        <div class="line">
          <span>Caissier</span>
          <strong>${payment.cashier}</strong>
        </div>

        <div class="line">
          <span>Montant total</span>
          <strong>${formatCurrency(payment.totalAmount)}</strong>
        </div>

        <div class="line">
          <span>Part patient</span>
          <strong>${formatCurrency(payment.patientAmount)}</strong>
        </div>

        <div class="line">
          <span>Part assurance</span>
          <strong>${formatCurrency(payment.insuranceAmount)}</strong>
        </div>

        <div class="line">
          <span>Mode de paiement</span>
          <strong>${payment.method}</strong>
        </div>

        <div class="total">
          Total encaissé :
          ${formatCurrency(payment.totalAmount)}
        </div>

      </body>
      </html>
    `);


    printWindow.document.close();

    printWindow.focus();

    printWindow.print();

    printWindow.close();
  }


  /* ==========================================================
     RÉINITIALISATION FILTRES
     ========================================================== */

  function resetFilters() {

    setSearch("");

    setStartDate("");

    setEndDate("");

    setCashierFilter("ALL");

    setMethodFilter("ALL");
  }


  /* ==========================================================
     AFFICHAGE
     ========================================================== */

  return (

    <div className="billing-page">

      {/* ======================================================
          EN-TÊTE
          ====================================================== */}

      <div className="billing-header">



        <div className="billing-header-actions">

          <button
            type="button"
            className="billing-secondary-button"
            onClick={loadPayments}
            disabled={loading}
          >

            <RefreshCw
              size={18}
              className={
                loading
                  ? "billing-spin"
                  : ""
              }
            />

            Actualiser

          </button>


          <button
            type="button"
            className="billing-primary-button"
            onClick={handleExportCSV}
          >

            <Download size={18} />

            Exporter

          </button>

        </div>

      </div>


      {/* ======================================================
          MESSAGE
          ====================================================== */}

      {error && (

        <div className="billing-info-message">

          <CircleAlert size={20} strokeWidth={2} aria-hidden="true" />

          <span>
            {error}
          </span>

        </div>

      )}


      {/* ======================================================
          STATISTIQUES
          ====================================================== */}

      <section className="billing-stats-grid">


        {/* TOTAL ENCAISSÉ */}

        <div className="billing-stat-card">

          <div className="billing-stat-icon billing-stat-blue">

            <Wallet size={24} />

          </div>

          <div className="billing-stat-content">

            <span>
              Total encaissé
            </span>

            <strong>
              {formatCurrency(
                statistics.totalCollected
              )}
            </strong>

            <small>
              {filteredPayments.length} opération(s)
            </small>

          </div>

        </div>


        {/* SANS ASSURANCE */}

        <div className="billing-stat-card">

          <div className="billing-stat-icon billing-stat-green">

            <UserCheck size={24} />

          </div>

          <div className="billing-stat-content">

            <span>
              Payé sans assurance
            </span>

            <strong>
              {formatCurrency(
                statistics.totalWithoutInsurance
              )}
            </strong>

            <small>
              Part directement payée par les patients
            </small>

          </div>

        </div>


        {/* AVEC ASSURANCE */}

        <div className="billing-stat-card">

          <div className="billing-stat-icon billing-stat-orange">

            <ShieldCheck size={24} />

          </div>

          <div className="billing-stat-content">

            <span>
              Payé avec assurance
            </span>

            <strong>
              {formatCurrency(
                statistics.totalWithInsurance
              )}
            </strong>

            <small>
              Part prise en charge
            </small>

          </div>

        </div>


        {/* TOTAL ASSURANCE */}

        <div className="billing-stat-card">

          <div className="billing-stat-icon billing-stat-blue">

            <Building2 size={24} />

          </div>

          <div className="billing-stat-content">

            <span>
              Total assurances
            </span>

            <strong>
              {formatCurrency(
                statistics.totalInsurance
              )}
            </strong>

            <small>
              Montant pris en charge par les assurances
            </small>

          </div>

        </div>

      </section>


      {/* ======================================================
          RÉSUMÉ
          ====================================================== */}

      <section className="billing-overview-grid">


        <div className="billing-overview-card">

          <div className="billing-card-header">

            <div>

              <h2>
                Synthèse des encaissements
              </h2>

              <p>
                Répartition des paiements patients et assurances
              </p>

            </div>

            <TrendingUp size={22} />

          </div>


          <div className="billing-financial-lines">


            <div className="billing-financial-line">

              <div>

                <span className="billing-dot billing-dot-green" />

                Payé sans assurance

              </div>

              <strong>
                {formatCurrency(
                  statistics.totalWithoutInsurance
                )}
              </strong>

            </div>


            <div className="billing-financial-line">

              <div>

                <span className="billing-dot billing-dot-orange" />

                Part assurance

              </div>

              <strong>
                {formatCurrency(
                  statistics.totalInsurance
                )}
              </strong>

            </div>


            <div className="billing-financial-line">

              <div>

                <span className="billing-dot billing-dot-blue" />

                Total encaissé

              </div>

              <strong>
                {formatCurrency(
                  statistics.totalCollected
                )}
              </strong>

            </div>

          </div>

        </div>


        <div className="billing-overview-card">

          <div className="billing-card-header">

            <div>

              <h2>
                Patients
              </h2>

              <p>
                Patients concernés par les encaissements
              </p>

            </div>

            <Users size={22} />

          </div>


          <div className="billing-patient-summary">

            <div className="billing-big-number">

              <Users size={28} />

              <strong>
                {statistics.patientsCount}
              </strong>

            </div>

            <span>
              patient(s) enregistré(s)
              dans les opérations de caisse
            </span>

          </div>

        </div>

      </section>


      {/* ======================================================
          TABLEAU
          ====================================================== */}

      <section className="billing-table-card">


        <div className="billing-table-header">

          <div>

            <h2>
              Historique des encaissements
            </h2>

            <p>
              Tous les paiements enregistrés par la caisse
            </p>

          </div>


          <button
            type="button"
            className="billing-filter-toggle"
            onClick={() =>
              setShowFilters(
                (current) => !current
              )
            }
          >

            <Filter size={17} />

            Filtres

          </button>

        </div>


        {/* ====================================================
            FILTRES
            ==================================================== */}

        {showFilters && (

          <div className="billing-filters-panel">


            {/* RECHERCHE */}

            <div className="billing-filter-group billing-filter-search">

              <label>
                Rechercher
              </label>

              <div className="billing-search">

                <Search size={18} />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Patient, référence, service..."
                />

                {search && (

                  <button
                    type="button"
                    className="billing-clear-button"
                    onClick={() =>
                      setSearch("")
                    }
                  >

                    <X size={16} />

                  </button>

                )}

              </div>

            </div>


            {/* DATE DÉBUT */}

            <div className="billing-filter-group">

              <label htmlFor="billingStartDate">
                Date début
              </label>

              <div className="billing-date-input">

                <CalendarDays size={17} />

                <input
                  id="billingStartDate"
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value
                    )
                  }
                />

              </div>

            </div>


            {/* DATE FIN */}

            <div className="billing-filter-group">

              <label htmlFor="billingEndDate">
                Date fin
              </label>

              <div className="billing-date-input">

                <CalendarDays size={17} />

                <input
                  id="billingEndDate"
                  type="date"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(
                      event.target.value
                    )
                  }
                />

              </div>

            </div>


            {/* CAISSIER */}

            <div className="billing-filter-group">

              <label htmlFor="billingCashier">
                Caissier
              </label>

              <select
                id="billingCashier"
                value={cashierFilter}
                onChange={(event) =>
                  setCashierFilter(
                    event.target.value
                  )
                }
                className="billing-filter-select"
              >

                <option value="ALL">
                  Tous les caissiers
                </option>

                {cashiers.map(
                  (cashier) => (

                    <option
                      key={cashier}
                      value={cashier}
                    >
                      {cashier}
                    </option>

                  )
                )}

              </select>

            </div>


            {/* MODE */}

            <div className="billing-filter-group">

              <label htmlFor="billingMethod">
                Mode de paiement
              </label>

              <select
                id="billingMethod"
                value={methodFilter}
                onChange={(event) =>
                  setMethodFilter(
                    event.target.value
                  )
                }
                className="billing-filter-select"
              >

                <option value="ALL">
                  Tous les modes
                </option>

                {paymentMethods.map(
                  (method) => (

                    <option
                      key={method}
                      value={method}
                    >
                      {method}
                    </option>

                  )
                )}

              </select>

            </div>


            {/* RESET */}

            <button
              type="button"
              className="billing-reset-button"
              onClick={resetFilters}
            >

              <RefreshCw size={16} />

              Réinitialiser

            </button>

          </div>

        )}


        {/* ====================================================
            TABLEAU
            ==================================================== */}

        <div className="billing-table-wrapper">

          <table className="billing-table">

            <thead>

              <tr>

                <th>
                  Référence
                </th>

                <th>
                  Patient
                </th>

                <th>
                  Service
                </th>

                <th>
                  Date
                </th>

                <th>
                  Caissier
                </th>

                <th>
                  Total
                </th>

                <th>
                  Sans assurance
                </th>

                <th>
                  Assurance
                </th>

                <th>
                  Mode
                </th>

                <th>
                  Actions
                </th>

              </tr>

            </thead>


            <tbody>

              {loading ? (

                <tr>

                  <td
                    colSpan="10"
                    className="billing-empty"
                  >

                    <RefreshCw
                      size={34}
                      className="billing-spin"
                    />

                    <strong>
                      Chargement des encaissements...
                    </strong>

                  </td>

                </tr>

              ) : filteredPayments.length > 0 ? (

                filteredPayments.map(
                  (payment) => (

                    <tr key={payment.id}>


                      {/* RÉFÉRENCE */}

                      <td>

                        <div className="billing-invoice-id">

                          <div className="billing-mini-icon">

                            <Receipt size={17} />

                          </div>

                          <strong>
                            {payment.id}
                          </strong>

                        </div>

                      </td>


                      {/* PATIENT */}

                      <td>

                        <div className="billing-patient-cell">

                          <div className="billing-patient-avatar">

                            <UserRound size={16} />

                          </div>

                          <div>

                            <strong>
                              {payment.patient}
                            </strong>

                            <span>
                              {payment.patientId}
                            </span>

                          </div>

                        </div>

                      </td>


                      {/* SERVICE */}

                      <td>
                        {payment.service}
                      </td>


                      {/* DATE */}

                      <td>

                        <div className="billing-date-cell">

                          <CalendarDays size={15} />

                          {formatDate(
                            payment.date
                          )}

                        </div>

                      </td>


                      {/* CAISSIER */}

                      <td>

                        <div className="billing-cashier-cell">

                          <UserCheck size={15} />

                          <span>
                            {payment.cashier}
                          </span>

                        </div>

                      </td>


                      {/* TOTAL */}

                      <td>

                        <strong className="billing-total-value">

                          {formatCurrency(
                            payment.totalAmount
                          )}

                        </strong>

                      </td>


                      {/* SANS ASSURANCE */}

                      <td>

                        <span className="billing-patient-paid">

                          {formatCurrency(
                            payment.patientAmount
                          )}

                        </span>

                      </td>


                      {/* ASSURANCE */}

                      <td>

                        {payment.insuranceAmount > 0 ? (

                          <span className="billing-insurance-value">

                            <ShieldCheck size={14} />

                            {formatCurrency(
                              payment.insuranceAmount
                            )}

                          </span>

                        ) : (

                          <span className="billing-no-insurance">

                            Sans assurance

                          </span>

                        )}

                      </td>


                      {/* MODE */}

                      <td>

                        <div className="billing-method-cell">

                          {payment.method === "Espèces" ? (
                            <Banknote size={15} />
                          ) : (
                            <CreditCard size={15} />
                          )}

                          <span>
                            {payment.method}
                          </span>

                        </div>

                      </td>


                      {/* ACTIONS */}

                      <td>

                        <div className="billing-row-actions">

                          <button
                            type="button"
                            className="billing-action-button"
                            title="Voir"
                            onClick={() =>
                              setSelectedPayment(
                                payment
                              )
                            }
                          >

                            <Eye size={18} />

                          </button>


                          <button
                            type="button"
                            className="billing-action-button"
                            title="Imprimer"
                            onClick={() =>
                              handlePrint(
                                payment
                              )
                            }
                          >

                            <Download size={18} />

                          </button>

                        </div>

                      </td>

                    </tr>

                  )

                )

              ) : (

                <tr>

                  <td
                    colSpan="10"
                    className="billing-empty"
                  >

                    <Search size={38} />

                    <strong>
                      Aucun encaissement trouvé
                    </strong>

                    <span>
                      Modifiez les dates,
                      le caissier ou votre recherche.
                    </span>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>


        {/* ====================================================
            FOOTER TABLEAU
            ==================================================== */}

        <div className="billing-table-footer">

          <span>

            {filteredPayments.length}
            {" "}
            opération(s) affichée(s)

          </span>

        </div>

      </section>


      {/* ======================================================
          MODAL DÉTAIL
          ====================================================== */}

      {selectedPayment && (

        <div
          className="billing-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              setSelectedPayment(null);

            }

          }}
        >

          <div className="billing-modal">


            <div className="billing-modal-header">

              <div>

                <h2>
                  Détail de l'encaissement
                </h2>

                <p>
                  {selectedPayment.id}
                </p>

              </div>


              <button
                type="button"
                className="billing-modal-close"
                onClick={() =>
                  setSelectedPayment(null)
                }
              >

                <X size={21} />

              </button>

            </div>


            <div className="billing-detail-grid">


              <div className="billing-detail-item">

                <span>
                  Patient
                </span>

                <strong>
                  {selectedPayment.patient}
                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Identifiant patient
                </span>

                <strong>
                  {selectedPayment.patientId}
                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Date
                </span>

                <strong>
                  {formatDate(
                    selectedPayment.date
                  )}
                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Caissier
                </span>

                <strong>
                  {selectedPayment.cashier}
                </strong>

              </div>


              <div className="billing-detail-item billing-detail-full">

                <span>
                  Service
                </span>

                <strong>
                  {selectedPayment.service}
                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Montant total
                </span>

                <strong>
                  {formatCurrency(
                    selectedPayment.totalAmount
                  )}
                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Part payée par le patient
                </span>

                <strong className="billing-patient-paid-detail">

                  {formatCurrency(
                    selectedPayment.patientAmount
                  )}

                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Part assurance
                </span>

                <strong className="billing-insurance-detail">

                  {formatCurrency(
                    selectedPayment.insuranceAmount
                  )}

                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Mode de paiement
                </span>

                <strong>
                  {selectedPayment.method}
                </strong>

              </div>


              {selectedPayment.insuranceName && (

                <div className="billing-detail-item">

                  <span>
                    Assurance
                  </span>

                  <strong>
                    {selectedPayment.insuranceName}
                  </strong>

                </div>

              )}

            </div>


            <div className="billing-detail-total">

              <span>
                Total encaissé
              </span>

              <strong>
                {formatCurrency(
                  selectedPayment.totalAmount
                )}
              </strong>

            </div>


            <div className="billing-modal-actions">

              <button
                type="button"
                className="billing-secondary-button"
                onClick={() =>
                  handlePrint(
                    selectedPayment
                  )
                }
              >

                <Download size={18} />

                Imprimer

              </button>


              <button
                type="button"
                className="billing-primary-button"
                onClick={() =>
                  setSelectedPayment(null)
                }
              >

                Fermer

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );
}
