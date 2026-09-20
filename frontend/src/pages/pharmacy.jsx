import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import {
  Home,
  Package,
  ClipboardList,
  ShoppingCart,
  History,
  Search,
  ScanLine,
  Printer,
  CheckCircle2,
  Clock3,
  Stethoscope,
  AlertTriangle,
  X,
  Pill,
  RefreshCw,
  Eye,
  UserRound,
  ChevronRight,
  Menu,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
} from "lucide-react";

import "../styles/pharmacy.css";

const prescriptionsInitial = [
  {
    id: "001",
    patient: "TRAORE Awa",
    doctor: "Dr. KOUAME",
    medicines: [
      "Paracétamol 500 mg",
      "Amoxicilline 500 mg",
    ],
    status: "À préparer",
    statusClass: "prepare",
  },
  {
    id: "002",
    patient: "KONE Ibrahim",
    doctor: "Dr. BAH",
    medicines: [
      "Amlodipine 10 mg",
    ],
    status: "Prête",
    statusClass: "ready",
  },
  {
    id: "003",
    patient: "DIALLO Mariam",
    doctor: "Dr. KONE",
    medicines: [
      "Sérum physiologique",
      "Paracétamol 1 g",
    ],
    status: "À préparer",
    statusClass: "prepare",
  },
  {
    id: "004",
    patient: "YAO Claude",
    doctor: "Dr. KOFFI",
    medicines: [
      "Amlodipine 5 mg",
    ],
    status: "Servie",
    statusClass: "served",
  },
];

const stockInitial = [
  {
    id: 1,
    name: "Paracétamol",
    quantity: 120,
    unit: "boîtes",
    level: "normal",
  },
  {
    id: 2,
    name: "Amoxicilline",
    quantity: 45,
    unit: "boîtes",
    level: "normal",
  },
  {
    id: 3,
    name: "Amlodipine",
    quantity: 8,
    unit: "boîtes",
    level: "critical",
  },
  {
    id: 4,
    name: "Sérum physiologique",
    quantity: 35,
    unit: "flacons",
    level: "normal",
  },
];

const menuItems = [
  {
    label: "Accueil",
    icon: Home,
  },
  {
    label: "Produits",
    icon: Package,
  },
  {
    label: "Dispensation",
    icon: ShoppingCart,
  },
  {
    label: "Ordonnances",
    icon: ClipboardList,
  },
  {
    label: "Stocks",
    icon: Package,
  },
  {
    label: "Historique",
    icon: History,
  },
];

function Pharmacy({ onNavigate }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const [activeMenu, setActiveMenu] = useState("Accueil");

  const [prescriptions, setPrescriptions] = useState(
    prescriptionsInitial
  );

  const [stock] = useState(stockInitial);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("Toutes");

  const [selectedPrescription, setSelectedPrescription] =
    useState(null);

  const [showScan, setShowScan] = useState(false);

  const [showTicket, setShowTicket] = useState(false);

  const [toast, setToast] = useState("");

  const filteredPrescriptions = useMemo(() => {
    const q = search.toLowerCase().trim();

    return prescriptions.filter((item) => {
      const matchesSearch =
        !q ||
        item.patient.toLowerCase().includes(q) ||
        item.doctor.toLowerCase().includes(q) ||
        item.id.includes(q);

      const matchesFilter =
        filter === "Toutes" ||
        (filter === "À préparer" &&
          item.status === "À préparer") ||
        (filter === "Prêtes" &&
          item.status === "Prête") ||
        (filter === "Servies" &&
          item.status === "Servie");

      return matchesSearch && matchesFilter;
    });
  }, [prescriptions, search, filter]);

  const showToast = (message) => {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2500);
  };

  const servePrescription = (id) => {
    setPrescriptions((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Servie",
              statusClass: "served",
            }
          : item
      )
    );

    setSelectedPrescription(null);

    showToast("Ordonnance marquée comme servie.");
  };

  const preparePrescription = (id) => {
    setPrescriptions((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Prête",
              statusClass: "ready",
            }
          : item
      )
    );

    setSelectedPrescription(null);

    showToast("Ordonnance préparée avec succès.");
  };

  const handleMenu = (label) => {
    setActiveMenu(label);

    if (onNavigate) {
      onNavigate(label);
    }
  };

  return (
    <div className="pharmacy-page">

      <aside className="pharmacy-sidebar">

        <div className="pharmacy-sidebar-brand">

          <div className="mini-heart-logo">
            <Logo size={26} inverted />
          </div>

          <div>
            <strong>
              MA<span>SANTE</span>
            </strong>

            <small>
              Gestion de Clinique
            </small>
          </div>

        </div>

        <nav className="pharmacy-nav">

          {menuItems.map(
            ({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className={`pharmacy-nav-item ${
                  activeMenu === label
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleMenu(label)
                }
              >
                <Icon
                  size={17}
                  strokeWidth={2}
                />

                <span>
                  {label}
                </span>
              </button>
            )
          )}

        </nav>

        <div className="sidebar-footer">

          <Link
            to="/modules"
            className="pharmacy-nav-item"
          >
            <LayoutGrid size={17} strokeWidth={2} />
            <span>Retour aux modules</span>
          </Link>

          <button
            type="button"
            className="pharmacy-nav-item"
            onClick={handleLogout}
          >
            <LogOut size={17} strokeWidth={2} />
            <span>Déconnexion</span>
          </button>

          <div className="online-dot" />

          <span>
            Pharmacie connectée
          </span>

        </div>

      </aside>

      <main className="pharmacy-main">

        {/* HEADER */}

        <header className="pharmacy-header">

          <div className="header-left">

            <button
              className="mobile-menu"
              type="button"
              onClick={() =>
                showToast("Menu pharmacie")
              }
              aria-label="Menu"
            >
              <Menu size={21} />
            </button>

            <div>

              <h1>
                Espace Pharmacien
              </h1>

              <p>
                Gestion des ordonnances et des médicaments
              </p>

            </div>

          </div>

          <div className="pharmacist-profile">

            <div className="avatar">
              AC
            </div>

            <div>

              <strong>
                AHOUE Clara
              </strong>

              <span>
                Pharmacien
              </span>

            </div>

            <ChevronRight size={17} />

          </div>

        </header>

        {/* CONTENT */}

        <section className="pharmacy-content">

          {/* TOOLBAR */}

          <div className="page-toolbar">

            <div className="toolbar-title">

              <div className="title-icon">
                <ClipboardList size={20} />
              </div>

              <div>

                <h2>
                  Ordonnances du jour
                </h2>

                <p>
                  {filteredPrescriptions.length}
                  {" "}
                  ordonnance(s) affichée(s)
                </p>

              </div>

            </div>

            <div className="toolbar-actions">

              <div className="search-box">

                <Search size={17} />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Rechercher un patient..."
                  aria-label="Rechercher une ordonnance"
                />

                {search && (
                  <button
                    type="button"
                    className="clear-search"
                    onClick={() =>
                      setSearch("")
                    }
                    aria-label="Effacer"
                  >
                    <X size={14} />
                  </button>
                )}

              </div>

              <button
                className="primary-btn"
                type="button"
                onClick={() =>
                  setShowScan(true)
                }
              >
                <ScanLine size={17} />

                Scanner ordonnance
              </button>

            </div>

          </div>

          {/* DASHBOARD */}

          <div className="dashboard-grid">

            {/* ORDERS */}

            <section className="orders-card card">

              <div className="card-header">

                <div>

                  <h3>
                    Ordonnances du jour
                  </h3>

                  <span>
                    Suivi des prescriptions à traiter
                  </span>

                </div>

                <div className="filter-tabs">

                  {[
                    "Toutes",
                    "À préparer",
                    "Prêtes",
                    "Servies",
                  ].map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={
                        filter === item
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        setFilter(item)
                      }
                    >
                      {item}
                    </button>
                  ))}

                </div>

              </div>

              <div className="table-wrap">

                <table className="orders-table">

                  <thead>

                    <tr>

                      <th>#</th>

                      <th>
                        Patient
                      </th>

                      <th>
                        Médecin
                      </th>

                      <th>
                        Médicaments
                      </th>

                      <th>
                        Statut
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredPrescriptions.map(
                      (item) => (
                        <tr key={item.id}>

                          <td className="number-cell">
                            {item.id}
                          </td>

                          <td>

                            <div className="patient-cell">

                              <div className="table-avatar">
                                <UserRound size={15} />
                              </div>

                              <strong>
                                {item.patient}
                              </strong>

                            </div>

                          </td>

                          <td>

                            <div className="doctor-cell">

                              <Stethoscope size={14} />

                              {item.doctor}

                            </div>

                          </td>

                          <td>

                            <div className="medicine-list">

                              {item.medicines.map(
                                (medicine) => (
                                  <span
                                    key={medicine}
                                  >
                                    {medicine}
                                  </span>
                                )
                              )}

                            </div>

                          </td>

                          <td>

                            <span
                              className={`status-badge ${item.statusClass}`}
                            >

                              {item.status ===
                                "À préparer" && (
                                <Clock3
                                  size={14}
                                />
                              )}

                              {item.status ===
                                "Prête" && (
                                <CheckCircle2
                                  size={14}
                                />
                              )}

                              {item.status ===
                                "Servie" && (
                                <CheckCircle2
                                  size={14}
                                />
                              )}

                              {item.status}

                            </span>

                          </td>

                          <td>

                            <button
                              type="button"
                              className="icon-action"
                              onClick={() =>
                                setSelectedPrescription(
                                  item
                                )
                              }
                              title="Voir l'ordonnance"
                            >
                              <Eye size={16} />
                            </button>

                          </td>

                        </tr>
                      )
                    )}

                    {filteredPrescriptions.length ===
                      0 && (
                      <tr>

                        <td
                          colSpan="6"
                          className="empty-state"
                        >

                          <ClipboardList
                            size={30}
                          />

                          <strong>
                            Aucune ordonnance trouvée
                          </strong>

                          <span>
                            Modifiez votre recherche ou
                            votre filtre.
                          </span>

                        </td>

                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

              {/* ACTIONS */}

              <div className="card-footer-actions">

                <button
                  type="button"
                  className="green-btn"
                  onClick={() =>
                    setShowScan(true)
                  }
                >
                  <ScanLine size={17} />

                  Scanner ordonnance
                </button>

                <button
                  type="button"
                  className="purple-btn"
                  onClick={() => {

                    const ready =
                      prescriptions.find(
                        (p) =>
                          p.status === "Prête"
                      );

                    if (ready) {
                      setSelectedPrescription(
                        ready
                      );
                    } else {
                      showToast(
                        "Aucune ordonnance prête à servir."
                      );
                    }

                  }}
                >
                  <ShoppingCart size={17} />

                  Servir
                </button>

                <button
                  type="button"
                  className="blue-btn"
                  onClick={() =>
                    setShowTicket(true)
                  }
                >
                  <Printer size={17} />

                  Imprimer ticket
                </button>

              </div>

            </section>

            {/* STOCK */}

            <section className="stock-card card">

              <div className="card-header">

                <div>

                  <h3>
                    Stock médicaments
                  </h3>

                  <span>
                    Disponibilité en temps réel
                  </span>

                </div>

                <button
                  type="button"
                  className="refresh-btn"
                  onClick={() =>
                    showToast(
                      "Stock actualisé."
                    )
                  }
                  title="Actualiser"
                >
                  <RefreshCw size={16} />
                </button>

              </div>

              <div className="stock-list">

                {stock.map((item) => (

                  <div
                    className="stock-row"
                    key={item.id}
                  >

                    <div
                      className={`stock-icon ${
                        item.level
                      }`}
                    >
                      <Pill size={18} />
                    </div>

                    <div className="stock-info">

                      <strong>
                        {item.name}
                      </strong>

                      <span>
                        {item.unit}
                      </span>

                    </div>

                    <div
                      className={`stock-quantity ${
                        item.level ===
                        "critical"
                          ? "critical"
                          : ""
                      }`}
                    >
                      {item.quantity}
                    </div>

                    {item.level ===
                      "critical" && (
                      <AlertTriangle
                        className="stock-warning"
                        size={19}
                      />
                    )}

                  </div>

                ))}

              </div>

              <button
                type="button"
                className="full-stock-btn"
                onClick={() =>
                  handleMenu("Stocks")
                }
              >
                <Package size={17} />

                Voir tous les stocks

                <ChevronRight size={16} />
              </button>

            </section>

          </div>

          {/* STATISTIQUES */}

          <section className="quick-stats">

            <div className="stat-card">

              <div className="stat-icon blue">
                <ClipboardList size={19} />
              </div>

              <div>

                <strong>
                  {prescriptions.length}
                </strong>

                <span>
                  Ordonnances aujourd'hui
                </span>

              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon orange">
                <Clock3 size={19} />
              </div>

              <div>

                <strong>
                  {
                    prescriptions.filter(
                      (p) =>
                        p.status ===
                        "À préparer"
                    ).length
                  }
                </strong>

                <span>
                  À préparer
                </span>

              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon green">
                <CheckCircle2 size={19} />
              </div>

              <div>

                <strong>
                  {
                    prescriptions.filter(
                      (p) =>
                        p.status ===
                        "Prête"
                    ).length
                  }
                </strong>

                <span>
                  Prêtes
                </span>

              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon red">
                <AlertTriangle size={19} />
              </div>

              <div>

                <strong>
                  {
                    stock.filter(
                      (item) =>
                        item.level ===
                        "critical"
                    ).length
                  }
                </strong>

                <span>
                  Stock(s) critique(s)
                </span>

              </div>

            </div>

          </section>

        </section>

      </main>

      {selectedPrescription && (

        <div
          className="modal-overlay"
          onMouseDown={() =>
            setSelectedPrescription(null)
          }
        >

          <div
            className="pharmacy-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <span className="modal-kicker">
                  ORDONNANCE #
                  {selectedPrescription.id}
                </span>

                <h3>
                  {selectedPrescription.patient}
                </h3>

              </div>

              <button
                type="button"
                className="close-modal"
                onClick={() =>
                  setSelectedPrescription(null)
                }
              >
                <X size={18} />
              </button>

            </div>

            <div className="prescription-meta">

              <span>

                <Stethoscope size={15} />

                {selectedPrescription.doctor}

              </span>

              <span
                className={`status-badge ${selectedPrescription.statusClass}`}
              >
                {selectedPrescription.status}
              </span>

            </div>

            <div className="modal-section">

              <h4>
                Médicaments prescrits
              </h4>

              {selectedPrescription.medicines.map(
                (medicine, index) => (

                  <div
                    className="modal-medicine"
                    key={medicine}
                  >

                    <span>
                      {index + 1}
                    </span>

                    <strong>
                      {medicine}
                    </strong>

                    <CheckCircle2
                      size={17}
                    />

                  </div>

                )
              )}

            </div>

            <div className="modal-actions">

              {selectedPrescription.status ===
                "À préparer" && (

                <button
                  type="button"
                  className="green-btn"
                  onClick={() =>
                    preparePrescription(
                      selectedPrescription.id
                    )
                  }
                >
                  <CheckCircle2 size={17} />

                  Marquer comme prête
                </button>

              )}

              {selectedPrescription.status ===
                "Prête" && (

                <button
                  type="button"
                  className="purple-btn"
                  onClick={() =>
                    servePrescription(
                      selectedPrescription.id
                    )
                  }
                >
                  <ShoppingCart size={17} />

                  Servir l'ordonnance
                </button>

              )}

              <button
                type="button"
                className="blue-btn"
                onClick={() => {

                  setSelectedPrescription(
                    null
                  );

                  setShowTicket(true);

                }}
              >
                <Printer size={17} />

                Imprimer ticket
              </button>

            </div>

          </div>

        </div>

      )}

      {showScan && (

        <div
          className="modal-overlay"
          onMouseDown={() =>
            setShowScan(false)
          }
        >

          <div
            className="scan-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            <button
              type="button"
              className="close-modal"
              onClick={() =>
                setShowScan(false)
              }
            >
              <X size={18} />
            </button>

            <div className="scan-illustration">

              <ScanLine size={44} />

            </div>

            <h3>
              Scanner une ordonnance
            </h3>

            <p>
              Placez l'ordonnance dans le
              scanner ou utilisez votre caméra
              pour importer le document.
            </p>

            <button
              type="button"
              className="primary-btn large"
              onClick={() => {

                setShowScan(false);

                showToast(
                  "Scanner prêt à recevoir un document."
                );

              }}
            >
              <ScanLine size={18} />

              Démarrer le scan
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                setShowScan(false)
              }
            >
              Annuler
            </button>

          </div>

        </div>

      )}

      {showTicket && (

        <div
          className="modal-overlay"
          onMouseDown={() =>
            setShowTicket(false)
          }
        >

          <div
            className="ticket-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            <button
              type="button"
              className="close-modal"
              onClick={() =>
                setShowTicket(false)
              }
            >
              <X size={18} />
            </button>

            <div className="ticket-logo">

              <LayoutDashboard size={20} />

              <strong>
                MA<span>SANTE</span>
              </strong>

            </div>

            <h3>
              Ticket de dispensation
            </h3>

            <div className="ticket-line">

              <span>
                Patient
              </span>

              <strong>
                TRAORE Awa
              </strong>

            </div>

            <div className="ticket-line">

              <span>
                Pharmacien
              </span>

              <strong>
                AHOUE Clara
              </strong>

            </div>

            <div className="ticket-line">

              <span>
                Date
              </span>

              <strong>
                {new Date().toLocaleDateString(
                  "fr-FR"
                )}
              </strong>

            </div>

            <div className="ticket-line">

              <span>
                Référence
              </span>

              <strong>
                ORD-001
              </strong>

            </div>

            <div className="ticket-actions">

              <button
                type="button"
                className="blue-btn"
                onClick={() => {

                  window.print();

                  showToast(
                    "Fenêtre d'impression ouverte."
                  );

                }}
              >
                <Printer size={17} />

                Imprimer
              </button>

            </div>

          </div>

        </div>

      )}

      {toast && (

        <div className="pharmacy-toast">
          {toast}
        </div>

      )}

    </div>
  );
}

export default Pharmacy;