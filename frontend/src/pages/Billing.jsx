import { useMemo, useState } from "react";

import {
  Search,
  Plus,
  Receipt,
  Wallet,
  CreditCard,
  Banknote,
  TrendingUp,
  TrendingDown,
  FileText,
  UserRound,
  CalendarDays,
  MoreVertical,
  Download,
  Eye,
  CheckCircle2,
  Clock3,
  AlertCircle,
  X,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

import "../styles/billing.css";


const INITIAL_INVOICES = [
  {
    id: "FAC-2026-001",
    patient: "Kouassi Jean",
    patientId: "PAT-0001",
    date: "17/09/2026",
    dueDate: "17/09/2026",
    amount: 45000,
    paid: 45000,
    method: "Espèces",
    status: "PAID",
    service: "Consultation + Analyses",
  },
  {
    id: "FAC-2026-002",
    patient: "Yao Marie",
    patientId: "PAT-0002",
    date: "17/09/2026",
    dueDate: "20/09/2026",
    amount: 78000,
    paid: 30000,
    method: "Mobile Money",
    status: "PARTIAL",
    service: "Consultation + Pharmacie",
  },
  {
    id: "FAC-2026-003",
    patient: "Adjoua Esther",
    patientId: "PAT-0003",
    date: "16/09/2026",
    dueDate: "16/09/2026",
    amount: 125000,
    paid: 0,
    method: "—",
    status: "UNPAID",
    service: "Hospitalisation",
  },
  {
    id: "FAC-2026-004",
    patient: "N'Guessan Paul",
    patientId: "PAT-0004",
    date: "16/09/2026",
    dueDate: "16/09/2026",
    amount: 32500,
    paid: 32500,
    method: "Carte bancaire",
    status: "PAID",
    service: "Consultation",
  },
  {
    id: "FAC-2026-005",
    patient: "Aka Bernard",
    patientId: "PAT-0005",
    date: "15/09/2026",
    dueDate: "22/09/2026",
    amount: 96000,
    paid: 50000,
    method: "Chèque",
    status: "PARTIAL",
    service: "Laboratoire + Consultation",
  },
  {
    id: "FAC-2026-006",
    patient: "Koffi Clarisse",
    patientId: "PAT-0006",
    date: "15/09/2026",
    dueDate: "15/09/2026",
    amount: 18000,
    paid: 0,
    method: "—",
    status: "UNPAID",
    service: "Pharmacie",
  },
];


function formatCurrency(value) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + " FCFA";
}


function getStatusLabel(status) {
  switch (status) {
    case "PAID":
      return "Payée";

    case "PARTIAL":
      return "Partiellement payée";

    case "UNPAID":
      return "Impayée";

    default:
      return status;
  }
}


function StatusBadge({ status }) {
  if (status === "PAID") {
    return (
      <span className="billing-status billing-status-paid">
        <CheckCircle2 size={15} />
        Payée
      </span>
    );
  }

  if (status === "PARTIAL") {
    return (
      <span className="billing-status billing-status-partial">
        <Clock3 size={15} />
        Partielle
      </span>
    );
  }

  return (
    <span className="billing-status billing-status-unpaid">
      <AlertCircle size={15} />
      Impayée
    </span>
  );
}


export default function Billing() {


  const [invoices, setInvoices] = useState(INITIAL_INVOICES);


  const [search, setSearch] = useState("");


  const [statusFilter, setStatusFilter] = useState("ALL");


  const [showInvoiceModal, setShowInvoiceModal] = useState(false);


  const [showPaymentModal, setShowPaymentModal] = useState(false);


  const [selectedInvoice, setSelectedInvoice] = useState(null);


  const [openMenu, setOpenMenu] = useState(null);


  const [invoiceForm, setInvoiceForm] = useState({
    patient: "",
    service: "",
    amount: "",
    dueDate: "",
  });


  const [paymentForm, setPaymentForm] = useState({
    invoiceId: "",
    amount: "",
    method: "Espèces",
  });


  const statistics = useMemo(() => {

    const totalRevenue = invoices.reduce(
      (sum, invoice) => sum + invoice.paid,
      0
    );

    const totalBilled = invoices.reduce(
      (sum, invoice) => sum + invoice.amount,
      0
    );

    const totalRemaining = invoices.reduce(
      (sum, invoice) =>
        sum + (invoice.amount - invoice.paid),
      0
    );

    const paidInvoices = invoices.filter(
      (invoice) => invoice.status === "PAID"
    ).length;

    const unpaidInvoices = invoices.filter(
      (invoice) => invoice.status === "UNPAID"
    ).length;

    return {
      totalRevenue,
      totalBilled,
      totalRemaining,
      paidInvoices,
      unpaidInvoices,
    };

  }, [invoices]);


  const filteredInvoices = useMemo(() => {

    const normalizedSearch =
      search.trim().toLowerCase();

    return invoices.filter((invoice) => {

      const matchesSearch =
        !normalizedSearch
        ||
        invoice.id.toLowerCase().includes(normalizedSearch)
        ||
        invoice.patient.toLowerCase().includes(normalizedSearch)
        ||
        invoice.patientId.toLowerCase().includes(normalizedSearch)
        ||
        invoice.service.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL"
        ||
        invoice.status === statusFilter;

      return matchesSearch && matchesStatus;

    });

  }, [invoices, search, statusFilter]);


  function handleOpenPayment(invoice) {

    setSelectedInvoice(invoice);

    setPaymentForm({
      invoiceId: invoice.id,
      amount: String(invoice.amount - invoice.paid),
      method: "Espèces",
    });

    setShowPaymentModal(true);

  }


  function handleCreateInvoice(event) {

    event.preventDefault();

    const amount = Number(invoiceForm.amount);

    if (
      !invoiceForm.patient.trim()
      ||
      !invoiceForm.service.trim()
      ||
      !amount
      ||
      amount <= 0
    ) {
      return;
    }

    const newInvoice = {
      id: `FAC-2026-${String(invoices.length + 1).padStart(3, "0")}`,
      patient: invoiceForm.patient.trim(),
      patientId: "PAT-NOUVEAU",
      date: new Date().toLocaleDateString("fr-FR"),
      dueDate:
        invoiceForm.dueDate
        ||
        new Date().toLocaleDateString("fr-FR"),
      amount,
      paid: 0,
      method: "—",
      status: "UNPAID",
      service: invoiceForm.service.trim(),
    };

    setInvoices((current) => [
      newInvoice,
      ...current,
    ]);

    setInvoiceForm({
      patient: "",
      service: "",
      amount: "",
      dueDate: "",
    });

    setShowInvoiceModal(false);

  }


  function handleRegisterPayment(event) {

    event.preventDefault();

    const amount = Number(paymentForm.amount);

    if (!selectedInvoice || !amount || amount <= 0) {
      return;
    }

    setInvoices((currentInvoices) =>
      currentInvoices.map((invoice) => {

        if (invoice.id !== selectedInvoice.id) {
          return invoice;
        }

        const newPaid =
          Math.min(
            invoice.amount,
            invoice.paid + amount
          );

        let newStatus = "PARTIAL";

        if (newPaid >= invoice.amount) {
          newStatus = "PAID";
        }

        return {
          ...invoice,
          paid: newPaid,
          method: paymentForm.method,
          status: newStatus,
        };

      })
    );

    setPaymentForm({
      invoiceId: "",
      amount: "",
      method: "Espèces",
    });

    setSelectedInvoice(null);

    setShowPaymentModal(false);

  }


  function handleDownload(invoice) {

    const content = [
      "MA SANTÉ",
      "Clinique & Gestion Hospitalière",
      "",
      `FACTURE : ${invoice.id}`,
      `Patient : ${invoice.patient}`,
      `Service : ${invoice.service}`,
      `Date : ${invoice.date}`,
      `Échéance : ${invoice.dueDate}`,
      `Montant : ${formatCurrency(invoice.amount)}`,
      `Payé : ${formatCurrency(invoice.paid)}`,
      `Reste : ${formatCurrency(invoice.amount - invoice.paid)}`,
      `Statut : ${getStatusLabel(invoice.status)}`,
    ].join("\n");

    const blob = new Blob(
      [content],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const url = URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `${invoice.id}.txt`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

  }


  return (

    <div className="billing-page">


      <div className="billing-header">

        <div className="billing-header-left">

          <div className="billing-header-icon">
            <CalculatorIcon />
          </div>

          <div>

            <h1>
              Comptabilité
            </h1>

            <p>
              Gestion de la facturation, des paiements et
              des opérations financières
            </p>

          </div>

        </div>


        <div className="billing-header-actions">

          <button
            type="button"
            className="billing-secondary-button"
            onClick={() =>
              window.location.reload()
            }
          >
            <RefreshCw size={18} />
            Actualiser
          </button>


          <button
            type="button"
            className="billing-primary-button"
            onClick={() =>
              setShowInvoiceModal(true)
            }
          >
            <Plus size={19} />
            Nouvelle facture
          </button>

        </div>

      </div>


      <section className="billing-stats-grid">


        <div className="billing-stat-card">

          <div className="billing-stat-icon billing-stat-blue">
            <Wallet size={24} />
          </div>

          <div className="billing-stat-content">

            <span>
              Chiffre d'affaires
            </span>

            <strong>
              {formatCurrency(statistics.totalRevenue)}
            </strong>

            <small className="billing-stat-positive">
              <ArrowUpRight size={14} />
              Encaissements
            </small>

          </div>

        </div>


        <div className="billing-stat-card">

          <div className="billing-stat-icon billing-stat-green">
            <Receipt size={24} />
          </div>

          <div className="billing-stat-content">

            <span>
              Total facturé
            </span>

            <strong>
              {formatCurrency(statistics.totalBilled)}
            </strong>

            <small>
              {invoices.length} facture(s)
            </small>

          </div>

        </div>


        <div className="billing-stat-card">

          <div className="billing-stat-icon billing-stat-orange">
            <TrendingDown size={24} />
          </div>

          <div className="billing-stat-content">

            <span>
              Créances
            </span>

            <strong>
              {formatCurrency(statistics.totalRemaining)}
            </strong>

            <small>
              Montant restant à recouvrer
            </small>

          </div>

        </div>


        <div className="billing-stat-card">

          <div className="billing-stat-icon billing-stat-red">
            <AlertCircle size={24} />
          </div>

          <div className="billing-stat-content">

            <span>
              Factures impayées
            </span>

            <strong>
              {statistics.unpaidInvoices}
            </strong>

            <small>
              À traiter
            </small>

          </div>

        </div>

      </section>


      <section className="billing-overview-grid">


        <div className="billing-overview-card">

          <div className="billing-card-header">

            <div>

              <h2>
                Situation financière
              </h2>

              <p>
                Synthèse des factures enregistrées
              </p>

            </div>

            <TrendingUp size={22} />

          </div>


          <div className="billing-financial-lines">


            <div className="billing-financial-line">

              <div>
                <span className="billing-dot billing-dot-green" />
                Factures payées
              </div>

              <strong>
                {
                  invoices.filter(
                    (invoice) =>
                      invoice.status === "PAID"
                  ).length
                }
              </strong>

            </div>


            <div className="billing-financial-line">

              <div>
                <span className="billing-dot billing-dot-orange" />
                Factures partielles
              </div>

              <strong>
                {
                  invoices.filter(
                    (invoice) =>
                      invoice.status === "PARTIAL"
                  ).length
                }
              </strong>

            </div>


            <div className="billing-financial-line">

              <div>
                <span className="billing-dot billing-dot-red" />
                Factures impayées
              </div>

              <strong>
                {
                  invoices.filter(
                    (invoice) =>
                      invoice.status === "UNPAID"
                  ).length
                }
              </strong>

            </div>

          </div>

        </div>


        <div className="billing-overview-card">

          <div className="billing-card-header">

            <div>

              <h2>
                Modes de paiement
              </h2>

              <p>
                Principaux moyens d'encaissement
              </p>

            </div>

            <CreditCard size={22} />

          </div>


          <div className="billing-payment-methods">

            <div className="billing-payment-method">

              <Banknote size={20} />

              <div>
                <strong>
                  Espèces
                </strong>

                <span>
                  Paiement direct
                </span>
              </div>

            </div>


            <div className="billing-payment-method">

              <CreditCard size={20} />

              <div>
                <strong>
                  Carte bancaire
                </strong>

                <span>
                  Paiement électronique
                </span>
              </div>

            </div>


            <div className="billing-payment-method">

              <Wallet size={20} />

              <div>
                <strong>
                  Mobile Money
                </strong>

                <span>
                  Orange Money / MTN / Moov
                </span>
              </div>

            </div>

          </div>

        </div>

      </section>


      <section className="billing-table-card">


        <div className="billing-table-header">

          <div>

            <h2>
              Factures
            </h2>

            <p>
              Liste des factures et opérations de paiement
            </p>

          </div>


          <div className="billing-table-tools">


            <div className="billing-search">

              <Search size={19} />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Rechercher une facture..."
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


            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="billing-filter-select"
            >

              <option value="ALL">
                Tous les statuts
              </option>

              <option value="PAID">
                Payées
              </option>

              <option value="PARTIAL">
                Partielles
              </option>

              <option value="UNPAID">
                Impayées
              </option>

            </select>

          </div>

        </div>


        <div className="billing-table-wrapper">

          <table className="billing-table">

            <thead>

              <tr>

                <th>
                  Facture
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
                  Montant
                </th>

                <th>
                  Payé
                </th>

                <th>
                  Reste
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

              {filteredInvoices.length > 0 ? (

                filteredInvoices.map((invoice) => {

                  const remaining =
                    invoice.amount - invoice.paid;

                  return (

                    <tr key={invoice.id}>


                      <td>

                        <div className="billing-invoice-id">

                          <div className="billing-mini-icon">
                            <FileText size={17} />
                          </div>

                          <strong>
                            {invoice.id}
                          </strong>

                        </div>

                      </td>


                      <td>

                        <div className="billing-patient-cell">

                          <div className="billing-patient-avatar">
                            <UserRound size={16} />
                          </div>

                          <div>

                            <strong>
                              {invoice.patient}
                            </strong>

                            <span>
                              {invoice.patientId}
                            </span>

                          </div>

                        </div>

                      </td>


                      <td>
                        {invoice.service}
                      </td>


                      <td>
                        <div className="billing-date-cell">
                          <CalendarDays size={15} />
                          {invoice.date}
                        </div>
                      </td>


                      <td>
                        <strong>
                          {formatCurrency(invoice.amount)}
                        </strong>
                      </td>


                      <td>
                        <span className="billing-paid-value">
                          {formatCurrency(invoice.paid)}
                        </span>
                      </td>


                      <td>

                        <strong
                          className={
                            remaining > 0
                              ? "billing-remaining"
                              : "billing-remaining-zero"
                          }
                        >
                          {formatCurrency(remaining)}
                        </strong>

                      </td>


                      <td>
                        <StatusBadge status={invoice.status} />
                      </td>


                      <td>

                        <div className="billing-actions-wrapper">

                          <button
                            type="button"
                            className="billing-action-button"
                            onClick={() =>
                              setOpenMenu(
                                openMenu === invoice.id
                                  ? null
                                  : invoice.id
                              )
                            }
                          >

                            <MoreVertical size={19} />

                          </button>


                          {openMenu === invoice.id && (

                            <div className="billing-action-menu">


                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setOpenMenu(null);
                                }}
                              >
                                <Eye size={16} />
                                Voir
                              </button>


                              <button
                                type="button"
                                onClick={() => {
                                  handleDownload(invoice);
                                  setOpenMenu(null);
                                }}
                              >
                                <Download size={16} />
                                Télécharger
                              </button>


                              {remaining > 0 && (

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenPayment(invoice);
                                    setOpenMenu(null);
                                  }}
                                >
                                  <Wallet size={16} />
                                  Enregistrer paiement
                                </button>

                              )}

                            </div>

                          )}

                        </div>

                      </td>

                    </tr>

                  );

                })

              ) : (

                <tr>

                  <td
                    colSpan="9"
                    className="billing-empty"
                  >

                    <Search size={38} />

                    <strong>
                      Aucune facture trouvée
                    </strong>

                    <span>
                      Modifiez votre recherche ou votre filtre.
                    </span>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>


        <div className="billing-table-footer">

          <span>
            {filteredInvoices.length} facture(s) affichée(s)
          </span>

          <span>
            Total restant :
            {" "}
            <strong>
              {formatCurrency(statistics.totalRemaining)}
            </strong>
          </span>

        </div>

      </section>


      {showInvoiceModal && (

        <div
          className="billing-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget
            ) {
              setShowInvoiceModal(false);
            }

          }}
        >

          <div className="billing-modal">

            <div className="billing-modal-header">

              <div>

                <h2>
                  Nouvelle facture
                </h2>

                <p>
                  Créer une nouvelle facture patient
                </p>

              </div>


              <button
                type="button"
                className="billing-modal-close"
                onClick={() =>
                  setShowInvoiceModal(false)
                }
              >
                <X size={21} />
              </button>

            </div>


            <form
              className="billing-form"
              onSubmit={handleCreateInvoice}
            >

              <div className="billing-form-group">

                <label htmlFor="patient">
                  Patient
                </label>

                <input
                  id="patient"
                  type="text"
                  value={invoiceForm.patient}
                  onChange={(event) =>
                    setInvoiceForm((current) => ({
                      ...current,
                      patient: event.target.value,
                    }))
                  }
                  placeholder="Nom complet du patient"
                  required
                />

              </div>


              <div className="billing-form-group">

                <label htmlFor="service">
                  Service
                </label>

                <input
                  id="service"
                  type="text"
                  value={invoiceForm.service}
                  onChange={(event) =>
                    setInvoiceForm((current) => ({
                      ...current,
                      service: event.target.value,
                    }))
                  }
                  placeholder="Ex. Consultation médicale"
                  required
                />

              </div>


              <div className="billing-form-row">

                <div className="billing-form-group">

                  <label htmlFor="amount">
                    Montant
                  </label>

                  <input
                    id="amount"
                    type="number"
                    min="1"
                    value={invoiceForm.amount}
                    onChange={(event) =>
                      setInvoiceForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0"
                    required
                  />

                </div>


                <div className="billing-form-group">

                  <label htmlFor="dueDate">
                    Date d'échéance
                  </label>

                  <input
                    id="dueDate"
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(event) =>
                      setInvoiceForm((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                  />

                </div>

              </div>


              <div className="billing-modal-actions">

                <button
                  type="button"
                  className="billing-secondary-button"
                  onClick={() =>
                    setShowInvoiceModal(false)
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="billing-primary-button"
                >
                  <CheckCircle2 size={18} />
                  Créer la facture
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {showPaymentModal && selectedInvoice && (

        <div
          className="billing-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget
            ) {
              setShowPaymentModal(false);
            }

          }}
        >

          <div className="billing-modal">

            <div className="billing-modal-header">

              <div>

                <h2>
                  Enregistrer un paiement
                </h2>

                <p>
                  {selectedInvoice.id} — {selectedInvoice.patient}
                </p>

              </div>


              <button
                type="button"
                className="billing-modal-close"
                onClick={() =>
                  setShowPaymentModal(false)
                }
              >
                <X size={21} />
              </button>

            </div>


            <div className="billing-payment-summary">

              <div>

                <span>
                  Montant facture
                </span>

                <strong>
                  {formatCurrency(selectedInvoice.amount)}
                </strong>

              </div>


              <div>

                <span>
                  Déjà payé
                </span>

                <strong>
                  {formatCurrency(selectedInvoice.paid)}
                </strong>

              </div>


              <div>

                <span>
                  Reste à payer
                </span>

                <strong className="billing-payment-rest">
                  {formatCurrency(
                    selectedInvoice.amount -
                    selectedInvoice.paid
                  )}
                </strong>

              </div>

            </div>


            <form
              className="billing-form"
              onSubmit={handleRegisterPayment}
            >

              <div className="billing-form-group">

                <label htmlFor="paymentAmount">
                  Montant du paiement
                </label>

                <input
                  id="paymentAmount"
                  type="number"
                  min="1"
                  max={
                    selectedInvoice.amount -
                    selectedInvoice.paid
                  }
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  required
                />

              </div>


              <div className="billing-form-group">

                <label htmlFor="paymentMethod">
                  Mode de paiement
                </label>

                <select
                  id="paymentMethod"
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      method: event.target.value,
                    }))
                  }
                >

                  <option value="Espèces">
                    Espèces
                  </option>

                  <option value="Mobile Money">
                    Mobile Money
                  </option>

                  <option value="Carte bancaire">
                    Carte bancaire
                  </option>

                  <option value="Chèque">
                    Chèque
                  </option>

                  <option value="Virement">
                    Virement bancaire
                  </option>

                </select>

              </div>


              <div className="billing-modal-actions">

                <button
                  type="button"
                  className="billing-secondary-button"
                  onClick={() =>
                    setShowPaymentModal(false)
                  }
                >
                  Annuler
                </button>


                <button
                  type="submit"
                  className="billing-primary-button"
                >
                  <Wallet size={18} />
                  Enregistrer le paiement
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {selectedInvoice && !showPaymentModal && !showInvoiceModal && (

        <div
          className="billing-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget
            ) {
              setSelectedInvoice(null);
            }

          }}
        >

          <div className="billing-modal">


            <div className="billing-modal-header">

              <div>

                <h2>
                  Détail de la facture
                </h2>

                <p>
                  {selectedInvoice.id}
                </p>

              </div>


              <button
                type="button"
                className="billing-modal-close"
                onClick={() =>
                  setSelectedInvoice(null)
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
                  {selectedInvoice.patient}
                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Identifiant patient
                </span>

                <strong>
                  {selectedInvoice.patientId}
                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Service
                </span>

                <strong>
                  {selectedInvoice.service}
                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Date
                </span>

                <strong>
                  {selectedInvoice.date}
                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Échéance
                </span>

                <strong>
                  {selectedInvoice.dueDate}
                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Mode de paiement
                </span>

                <strong>
                  {selectedInvoice.method}
                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Montant total
                </span>

                <strong>
                  {formatCurrency(selectedInvoice.amount)}
                </strong>

              </div>


              <div className="billing-detail-item">

                <span>
                  Montant payé
                </span>

                <strong>
                  {formatCurrency(selectedInvoice.paid)}
                </strong>

              </div>


              <div className="billing-detail-item billing-detail-full">

                <span>
                  Reste à payer
                </span>

                <strong className="billing-payment-rest">
                  {formatCurrency(
                    selectedInvoice.amount -
                    selectedInvoice.paid
                  )}
                </strong>

              </div>


            </div>


            <div className="billing-detail-status">

              <StatusBadge
                status={selectedInvoice.status}
              />

            </div>


            <div className="billing-modal-actions">

              <button
                type="button"
                className="billing-secondary-button"
                onClick={() =>
                  handleDownload(selectedInvoice)
                }
              >
                <Download size={18} />
                Télécharger
              </button>


              {
                selectedInvoice.amount >
                selectedInvoice.paid
                && (
                  <button
                    type="button"
                    className="billing-primary-button"
                    onClick={() =>
                      handleOpenPayment(selectedInvoice)
                    }
                  >
                    <Wallet size={18} />
                    Enregistrer un paiement
                  </button>
                )
              }

            </div>


          </div>

        </div>

      )}


    </div>

  );

}


function CalculatorIcon() {

  return (
    <div className="billing-calculator-icon">
      <span />
      <span />
      <span />
      <span />
    </div>
  );

}

