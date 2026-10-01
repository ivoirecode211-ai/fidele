
import { useEffect, useMemo, useState } from "react";
import Logo from "../components/Logo";
import api from "../services/api";
import SidebarFooter from "../components/SidebarFooter";
import UserBadge from "../components/UserBadge";
import NotificationBell from "../components/NotificationBell";
import RapportsPraticien from "../rapports/RapportsPraticien";

import {
  BarChart3,
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
  X,
  Menu,
  LayoutDashboard,
  Eye,
  UserRound,
  AlertTriangle,
  Boxes,
  RefreshCw,
} from "lucide-react";

import "../styles/pharmacy.css";

/* ============================================================
   ORDONNANCES
   ============================================================

   Servies par l'API (/api/parcours/pharmacie/) : ce sont les
   ordonnances validées dans le module Consultation.
   ============================================================ */

/* ============================================================
   PRODUITS DE DÉMONSTRATION
   ============================================================ */

/* ============================================================
   MENU
   ============================================================ */

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
    label: "Historique",
    icon: History,
  },
  {
    label: "Rapports",
    icon: BarChart3,
  },
];

/* ============================================================
   COMPOSANT
   ============================================================ */

function Pharmacy({ onNavigate }) {

  const [activeMenu, setActiveMenu] = useState("Accueil");

  const [prescriptions, setPrescriptions] = useState([]);

  const [products, setProducts] = useState([]);

  /*
   * Historique des médicaments réellement servis.
   *
   * Chaque médicament est enregistré séparément.
   */
  const [history, setHistory] = useState([]);

  const [search, setSearch] = useState("");

  const [productSearch, setProductSearch] =
    useState("");

  const [filter, setFilter] =
    useState("Toutes");

  const [selectedPrescription, setSelectedPrescription] =
    useState(null);

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [showScan, setShowScan] =
    useState(false);

  const [showTicket, setShowTicket] =
    useState(false);

  const [ticketPrescription, setTicketPrescription] =
    useState(null);

  const [toast, setToast] =
    useState("");

  /* ==========================================================
     CHARGEMENT DES ORDONNANCES ET DE L'HISTORIQUE
     ========================================================== */

  const loadPrescriptions = () =>
    api
      .get("/parcours/pharmacie/ordonnances/")
      .then((response) =>
        setPrescriptions(response.data)
      );

  // Médicaments du stock (catégorie « Médicament » des Stocks).
  const loadProducts = () =>
    api
      .get("/stocks/pharmacie/produits/")
      .then((response) =>
        setProducts(response.data)
      );

  const loadHistory = () =>
    api
      .get("/parcours/pharmacie/historique/")
      .then((response) =>
        setHistory(response.data)
      );

  useEffect(() => {
    Promise.all([
      loadPrescriptions(),
      loadHistory(),
      loadProducts(),
    ]).catch((error) =>
      console.error(
        "Erreur de chargement de la pharmacie :",
        error
      )
    );
  }, []);

  const replacePrescription = (updated) => {
    setPrescriptions((current) =>
      current.map((item) =>
        item.id === updated.id
          ? updated
          : item
      )
    );
  };

  const apiErrorMessage = (error, fallback) =>
    error.response?.data?.detail ||
    fallback;



  /* ==========================================================
     TOAST
     ========================================================== */

  const showToast = (message) => {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2500);
  };

  /* ==========================================================
     PRESCRIPTIONS FILTRÉES
     ========================================================== */

  const filteredPrescriptions = useMemo(() => {
    const q = search
      .toLowerCase()
      .trim();

    return prescriptions.filter((item) => {
      const matchesSearch =
        !q ||
        item.patient
          .toLowerCase()
          .includes(q) ||
        item.doctor
          .toLowerCase()
          .includes(q) ||
        item.id.includes(q);

      const matchesFilter =
        filter === "Toutes" ||
        (filter === "À préparer" &&
          item.status === "À préparer") ||
        (filter === "Prêtes" &&
          item.status === "Prête") ||
        (filter === "Servies" &&
          item.status === "Servie");

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [
    prescriptions,
    search,
    filter,
  ]);

  /* ==========================================================
     PRODUITS FILTRÉS
     ========================================================== */

  const filteredProducts = useMemo(() => {
    const q = productSearch
      .toLowerCase()
      .trim();

    if (!q) {
      return products;
    }

    return products.filter(
      (product) =>
        String(product.name || "")
          .toLowerCase()
          .includes(q) ||
        String(product.category || "")
          .toLowerCase()
          .includes(q) ||
        String(product.reference || "")
          .toLowerCase()
          .includes(q)
    );
  }, [
    products,
    productSearch,
  ]);

  /* ==========================================================
     STATUT DU STOCK
     ========================================================== */

  const getStockStatus = (product) => {
    const stock =
      Number(product.stock || 0);

    const alertStock =
      Number(product.alertStock || 0);

    if (stock <= 0) {
      return {
        label: "Rupture",
        className: "stock-danger",
      };
    }

    if (stock <= alertStock) {
      return {
        label: "Stock faible",
        className: "stock-warning",
      };
    }

    return {
      label: "Disponible",
      className: "stock-success",
    };
  };

  /* ==========================================================
     NAVIGATION
     ========================================================== */

  const handleMenu = (label) => {
    setActiveMenu(label);

    if (onNavigate) {
      onNavigate(label);
    }
  };

  /* ==========================================================
     PRÉPARER ORDONNANCE
     ========================================================== */

  const preparePrescription = async (id) => {
    try {
      const response = await api.post(
        `/parcours/pharmacie/ordonnances/${id}/preparer/`
      );

      replacePrescription(response.data);
    } catch (error) {
      showToast(
        apiErrorMessage(
          error,
          "Impossible de préparer l'ordonnance."
        )
      );
      return;
    }

    setSelectedPrescription(null);

    showToast(
      "Ordonnance préparée avec succès."
    );
  };

  /* ==========================================================
     SERVIR ORDONNANCE
     ========================================================== */

  const servePrescription = async (id) => {
    const prescription =
      prescriptions.find(
        (item) => item.id === id
      );

    if (!prescription) {
      showToast(
        "Ordonnance introuvable."
      );
      return;
    }

    if (prescription.status === "Servie") {
      showToast(
        "Cette ordonnance est déjà servie."
      );
      return;
    }

    /*
     * Vérification des médicaments.
     *
     * Pour cette version, chaque médicament
     * correspond à une unité servie.
     */
    const insufficientProducts = [];

    prescription.medicines.forEach(
      (medicine) => {
        const product = products.find(
          (item) =>
            item.name
              .toLowerCase()
              .trim() ===
            medicine
              .toLowerCase()
              .trim()
        );

        if (
          product &&
          Number(product.stock || 0) <= 0
        ) {
          insufficientProducts.push(
            medicine
          );
        }
      }
    );

    if (insufficientProducts.length > 0) {
      showToast(
        `Stock insuffisant : ${insufficientProducts.join(
          ", "
        )}`
      );
      return;
    }

    /*
     * Enregistrement de la dispensation : l'historique
     * (un médicament par ligne) est tenu par le backend.
     */
    let servedPrescription;

    try {
      const response = await api.post(
        `/parcours/pharmacie/ordonnances/${id}/servir/`
      );

      servedPrescription = response.data;
    } catch (error) {
      showToast(
        apiErrorMessage(
          error,
          "Impossible de servir l'ordonnance."
        )
      );
      return;
    }

    loadHistory().catch((error) =>
      console.error(
        "Erreur de chargement de l'historique :",
        error
      )
    );

    /*
     * Le stock est diminué par le serveur (sorties de stock
     * enregistrées dans le module Gestion des stocks).
     */
    loadProducts().catch((error) =>
      console.error(
        "Erreur de chargement des produits :",
        error
      )
    );

    replacePrescription(
      servedPrescription
    );

    setTicketPrescription(
      servedPrescription
    );

    setSelectedPrescription(null);

    /*
     * Ouverture automatique de
     * l'historique après la dispensation.
     */
    setActiveMenu("Historique");

    showToast(
      "Ordonnance servie. Les médicaments ont été enregistrés dans l'historique."
    );
  };

  /* ==========================================================
     RAFRAÎCHIR PRODUITS
     ========================================================== */

  const refreshProducts = () => {
    loadProducts().catch((error) =>
      console.error("Erreur de chargement des produits :", error)
    );

    showToast(
      "Liste des produits actualisée."
    );
  };

  /* ==========================================================
     RENDU
     ========================================================== */

  return (
    <div className="pharmacy-page">

      {/* ======================================================
          SIDEBAR
          ====================================================== */}

      <aside className="pharmacy-sidebar">

        <div className="pharmacy-sidebar-brand">

          <div className="mini-heart-logo">
            <Logo
              size={26}
              inverted
            />
          </div>

          <div>
            <strong>
              MA <span>SANTÉ</span>
            </strong>

            <small>
              Gestion de Clinique
            </small>
          </div>

        </div>

        <nav className="pharmacy-nav">

          {menuItems.map(
            ({
              label,
              icon: Icon,
            }) => (
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

        <SidebarFooter />

      </aside>

      {/* ======================================================
          CONTENU PRINCIPAL
          ====================================================== */}

      <main className="pharmacy-main">

        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="pharmacy-header">

          <div className="header-left">

            <button
              className="mobile-menu"
              type="button"
              onClick={() =>
                showToast(
                  "Menu pharmacie"
                )
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

          <div className="ms-header-tools">
            <NotificationBell />
            <UserBadge />
          </div>

        </header>

        {/* ====================================================
            CONTENU
            ==================================================== */}

        <section className="pharmacy-content">
          {/* Sous-module « Rapports » : les ordonnances servies par le pharmacien connecté. */}
          {activeMenu === "Rapports" && <RapportsPraticien />}

          {/* ==================================================
              ACCUEIL
              ================================================== */}

          {activeMenu === "Accueil" && (
            <>
              <div className="page-toolbar">

                <div className="toolbar-title">

                  <div className="title-icon">
                    <ClipboardList
                      size={20}
                    />
                  </div>

                  <div>
                    <h2>
                      Ordonnances du jour
                    </h2>

                    <p>
                      {
                        filteredPrescriptions.length
                      }{" "}
                      ordonnance(s)
                      affichée(s)
                    </p>
                  </div>

                </div>

                <div className="toolbar-actions">

                  <div className="search-box">

                    <Search size={17} />

                    <input
                      value={search}
                      onChange={(e) =>
                        setSearch(
                          e.target.value
                        )
                      }
                      placeholder="Rechercher un patient..."
                    />

                    {search && (
                      <button
                        type="button"
                        className="clear-search"
                        onClick={() =>
                          setSearch("")
                        }
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

              <div className="dashboard-grid">

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
                      ].map(
                        (item) => (
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
                        )
                      )}

                    </div>

                  </div>

                  <div className="table-wrap">

                    <table className="orders-table">

                      <thead>
                        <tr>
                          <th>
                            Identifiants
                          </th>
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
                                    <UserRound
                                      size={15}
                                    />
                                  </div>

                                  <strong>
                                    {item.patient}
                                  </strong>

                                </div>
                              </td>

                              <td>
                                <div className="doctor-cell">
                                  <Stethoscope
                                    size={14}
                                  />
                                  {item.doctor}
                                </div>
                              </td>

                              <td>
                                <div className="medicine-list">
                                  {item.medicines.map(
                                    (medicine) => (
                                      <span
                                        key={
                                          medicine
                                        }
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
                                Modifiez votre recherche
                                ou votre filtre.
                              </span>
                            </td>
                          </tr>
                        )}

                      </tbody>

                    </table>

                  </div>

                </section>

              </div>

              <section className="quick-stats">

                <div className="stat-card">

                  <div className="stat-icon blue">
                    <ClipboardList
                      size={19}
                    />
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
                    <CheckCircle2
                      size={19}
                    />
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

              </section>
            </>
          )}

          {/* ==================================================
              PRODUITS
              ================================================== */}

          {activeMenu === "Produits" && (
            <>
              <div className="page-toolbar">

                <div className="toolbar-title">

                  <div className="title-icon">
                    <Package size={20} />
                  </div>

                  <div>
                    <h2>
                      Produits pharmaceutiques
                    </h2>

                    <p>
                      Produits disponibles dans la pharmacie
                    </p>
                  </div>

                </div>

                <div className="toolbar-actions">

                  <div className="search-box">

                    <Search size={17} />

                    <input
                      value={productSearch}
                      onChange={(e) =>
                        setProductSearch(
                          e.target.value
                        )
                      }
                      placeholder="Rechercher un produit..."
                    />

                    {productSearch && (
                      <button
                        type="button"
                        className="clear-search"
                        onClick={() =>
                          setProductSearch("")
                        }
                      >
                        <X size={14} />
                      </button>
                    )}

                  </div>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={refreshProducts}
                  >
                    <RefreshCw size={16} />
                    Actualiser
                  </button>

                </div>

              </div>

              <div className="quick-stats">

                <div className="stat-card">
                  <div className="stat-icon blue">
                    <Package size={19} />
                  </div>

                  <div>
                    <strong>
                      {products.length}
                    </strong>

                    <span>
                      Produits
                    </span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green">
                    <Boxes size={19} />
                  </div>

                  <div>
                    <strong>
                      {
                        products.filter(
                          (product) =>
                            getStockStatus(
                              product
                            ).className ===
                            "stock-success"
                        ).length
                      }
                    </strong>

                    <span>
                      Disponibles
                    </span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orange">
                    <AlertTriangle
                      size={19}
                    />
                  </div>

                  <div>
                    <strong>
                      {
                        products.filter(
                          (product) =>
                            getStockStatus(
                              product
                            ).className ===
                            "stock-warning"
                        ).length
                      }
                    </strong>

                    <span>
                      Stock faible
                    </span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon red">
                    <AlertTriangle
                      size={19}
                    />
                  </div>

                  <div>
                    <strong>
                      {
                        products.filter(
                          (product) =>
                            getStockStatus(
                              product
                            ).className ===
                            "stock-danger"
                        ).length
                      }
                    </strong>

                    <span>
                      Ruptures
                    </span>
                  </div>
                </div>

              </div>

              <section className="orders-card card">

                <div className="card-header">

                  <div>
                    <h3>
                      Liste des produits
                    </h3>

                    <span>
                      {
                        filteredProducts.length
                      }{" "}
                      produit(s) affiché(s)
                    </span>
                  </div>

                </div>

                <div className="table-wrap">

                  <table className="orders-table">

                    <thead>
                      <tr>
                        <th>
                          Référence
                        </th>
                        <th>
                          Produit
                        </th>
                        <th>
                          Catégorie
                        </th>
                        <th>
                          Stock
                        </th>
                        <th>
                          Prix
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

                      {filteredProducts.map(
                        (product) => {
                          const stockStatus =
                            getStockStatus(
                              product
                            );

                          return (
                            <tr
                              key={
                                product.id
                              }
                            >

                              <td className="number-cell">
                                {product.reference ||
                                  product.id}
                              </td>

                              <td>
                                <div className="patient-cell">

                                  <div className="table-avatar">
                                    <Package
                                      size={15}
                                    />
                                  </div>

                                  <strong>
                                    {product.name}
                                  </strong>

                                </div>
                              </td>

                              <td>
                                {product.category ||
                                  "-"}
                              </td>

                              <td>
                                <strong>
                                  {
                                    product.stock ??
                                    0
                                  }
                                </strong>{" "}
                                <span>
                                  {product.unit ||
                                    "unité"}
                                </span>
                              </td>

                              <td>
                                {Number(
                                  product.price ||
                                    0
                                ).toLocaleString(
                                  "fr-FR"
                                )}{" "}
                                FCFA
                              </td>

                              <td>

                                <span
                                  className={`status-badge ${stockStatus.className}`}
                                >
                                  {stockStatus.className ===
                                    "stock-danger" && (
                                    <AlertTriangle
                                      size={14}
                                    />
                                  )}

                                  {stockStatus.className ===
                                    "stock-warning" && (
                                    <Clock3
                                      size={14}
                                    />
                                  )}

                                  {stockStatus.className ===
                                    "stock-success" && (
                                    <CheckCircle2
                                      size={14}
                                    />
                                  )}

                                  {stockStatus.label}
                                </span>

                              </td>

                              <td>

                                <button
                                  type="button"
                                  className="icon-action"
                                  onClick={() =>
                                    setSelectedProduct(
                                      product
                                    )
                                  }
                                  title="Voir le produit"
                                >
                                  <Eye size={16} />
                                </button>

                              </td>

                            </tr>
                          );
                        }
                      )}

                      {filteredProducts.length ===
                        0 && (
                        <tr>
                          <td
                            colSpan="7"
                            className="empty-state"
                          >
                            <Package
                              size={30}
                            />

                            <strong>
                              Aucun produit trouvé
                            </strong>

                            <span>
                              Ajoutez des produits depuis
                              le module Gestion des stocks.
                            </span>
                          </td>
                        </tr>
                      )}

                    </tbody>

                  </table>

                </div>

              </section>
            </>
          )}

          {/* ==================================================
              DISPENSATION
              ================================================== */}

          {activeMenu === "Dispensation" && (
            <>
              <div className="page-toolbar">

                <div className="toolbar-title">

                  <div className="title-icon">
                    <ShoppingCart
                      size={20}
                    />
                  </div>

                  <div>
                    <h2>
                      Dispensation
                    </h2>

                    <p>
                      Préparation et délivrance des médicaments
                    </p>
                  </div>

                </div>

              </div>

              <section className="orders-card card">

                <div className="card-header">

                  <div>
                    <h3>
                      Ordonnances prêtes
                    </h3>

                    <span>
                      Les ordonnances prêtes peuvent être servies.
                    </span>
                  </div>

                </div>

                <div className="table-wrap">

                  <table className="orders-table">

                    <thead>
                      <tr>
                        <th>
                          Ordonnance
                        </th>
                        <th>
                          Patient
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

                      {prescriptions
                        .filter(
                          (item) =>
                            item.status ===
                            "Prête"
                        )
                        .map((item) => (
                          <tr
                            key={item.id}
                          >

                            <td className="number-cell">
                              {item.id}
                            </td>

                            <td>
                              <strong>
                                {item.patient}
                              </strong>
                            </td>

                            <td>
                              <div className="medicine-list">
                                {item.medicines.map(
                                  (medicine) => (
                                    <span
                                      key={
                                        medicine
                                      }
                                    >
                                      {medicine}
                                    </span>
                                  )
                                )}
                              </div>
                            </td>

                            <td>
                              <span className="status-badge ready">
                                <CheckCircle2
                                  size={14}
                                />
                                Prête
                              </span>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="purple-btn"
                                onClick={() =>
                                  setSelectedPrescription(
                                    item
                                  )
                                }
                              >
                                <ShoppingCart
                                  size={16}
                                />
                                Servir
                              </button>
                            </td>

                          </tr>
                        ))}

                    </tbody>

                  </table>

                </div>

              </section>
            </>
          )}

          {/* ==================================================
              ORDONNANCES
              ================================================== */}

          {activeMenu === "Ordonnances" && (
            <>
              <div className="page-toolbar">

                <div className="toolbar-title">

                  <div className="title-icon">
                    <ClipboardList
                      size={20}
                    />
                  </div>

                  <div>
                    <h2>
                      Ordonnances
                    </h2>

                    <p>
                      Gestion des prescriptions médicales
                    </p>
                  </div>

                </div>

              </div>

              <section className="orders-card card">

                <div className="card-header">

                  <div>
                    <h3>
                      Ordonnances
                    </h3>

                    <span>
                      Consultez les prescriptions à traiter.
                    </span>
                  </div>

                </div>

                <div className="table-wrap">

                  <table className="orders-table">

                    <thead>
                      <tr>
                        <th>
                          Référence
                        </th>
                        <th>
                          Patient
                        </th>
                        <th>
                          Médecin
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

                      {prescriptions.map(
                        (item) => (
                          <tr
                            key={item.id}
                          >

                            <td className="number-cell">
                              {item.id}
                            </td>

                            <td>
                              <strong>
                                {item.patient}
                              </strong>
                            </td>

                            <td>
                              {item.doctor}
                            </td>

                            <td>
                              <span
                                className={`status-badge ${item.statusClass}`}
                              >
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
                                title="Voir"
                              >
                                <Eye size={16} />
                              </button>
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </section>
            </>
          )}

          {/* ==================================================
              HISTORIQUE
              ================================================== */}

          {activeMenu === "Historique" && (
            <>
              <div className="page-toolbar">

                <div className="toolbar-title">

                  <div className="title-icon">
                    <History size={20} />
                  </div>

                  <div>
                    <h2>
                      Historique
                    </h2>

                    <p>
                      Médicaments réellement servis
                    </p>
                  </div>

                </div>

                <div className="toolbar-actions">

                  <span className="status-badge served">
                    <CheckCircle2
                      size={14}
                    />
                    {history.length} opération(s)
                  </span>

                </div>

              </div>

              <section className="orders-card card">

                <div className="card-header">

                  <div>
                    <h3>
                      Historique des médicaments servis
                    </h3>

                    <span>
                      Chaque médicament apparaît après la validation de sa dispensation.
                    </span>
                  </div>

                </div>

                {history.length === 0 ? (
                  <div className="empty-state">

                    <History size={36} />

                    <strong>
                      Aucun historique disponible
                    </strong>

                    <span>
                      Les médicaments servis apparaîtront automatiquement ici.
                    </span>

                  </div>
                ) : (
                  <div className="table-wrap">

                    <table className="orders-table">

                      <thead>
                        <tr>
                          <th>
                            Date
                          </th>

                          <th>
                            Ordonnance
                          </th>

                          <th>
                            Patient
                          </th>

                          <th>
                            Médicament
                          </th>

                          <th>
                            Quantité
                          </th>

                          <th>
                            Pharmacien
                          </th>

                          <th>
                            Statut
                          </th>
                        </tr>
                      </thead>

                      <tbody>

                        {history.map(
                          (item) => (
                            <tr
                              key={item.id}
                            >

                              <td>
                                <strong>
                                  {item.date}
                                </strong>

                                <br />

                                <span>
                                  {item.time}
                                </span>
                              </td>

                              <td className="number-cell">
                                {item.prescriptionId}
                              </td>

                              <td>
                                <div className="patient-cell">

                                  <div className="table-avatar">
                                    <UserRound
                                      size={15}
                                    />
                                  </div>

                                  <strong>
                                    {item.patient}
                                  </strong>

                                </div>
                              </td>

                              <td>

                                <div className="medicine-list">

                                  <span>
                                    {item.medicine}
                                  </span>

                                </div>

                              </td>

                              <td>
                                <strong>
                                  {item.quantity}
                                </strong>
                              </td>

                              <td>
                                {item.pharmacist}
                              </td>

                              <td>

                                <span className="status-badge served">

                                  <CheckCircle2
                                    size={14}
                                  />

                                  Servi

                                </span>

                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>
                )}

              </section>
            </>
          )}

        </section>

      </main>

      {/* ======================================================
          MODALE ORDONNANCE
          ====================================================== */}

      {selectedPrescription && (
        <div
          className="modal-overlay"
          onMouseDown={() =>
            setSelectedPrescription(
              null
            )
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
                  {
                    selectedPrescription.id
                  }
                </span>

                <h3>
                  {
                    selectedPrescription.patient
                  }
                </h3>

              </div>

              <button
                type="button"
                className="close-modal"
                onClick={() =>
                  setSelectedPrescription(
                    null
                  )
                }
              >
                <X size={18} />
              </button>

            </div>

            <div className="prescription-meta">

              <span>
                <Stethoscope
                  size={15}
                />

                {
                  selectedPrescription.doctor
                }
              </span>

              <span
                className={`status-badge ${selectedPrescription.statusClass}`}
              >
                {
                  selectedPrescription.status
                }
              </span>

            </div>

            <div className="modal-section">

              <h4>
                Médicaments prescrits
              </h4>

              {selectedPrescription.medicines.map(
                (
                  medicine,
                  index
                ) => (
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
                  <CheckCircle2
                    size={17}
                  />

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
                  <ShoppingCart
                    size={17}
                  />

                  Servir l'ordonnance
                </button>
              )}

              {selectedPrescription.status ===
                "Servie" && (
                <span className="status-badge served">
                  <CheckCircle2
                    size={15}
                  />
                  Ordonnance déjà servie
                </span>
              )}

              <button
                type="button"
                className="blue-btn"
                onClick={() => {

                  setTicketPrescription(
                    selectedPrescription
                  );

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

      {/* ======================================================
          MODALE PRODUIT
          ====================================================== */}

      {selectedProduct && (
        <div
          className="modal-overlay"
          onMouseDown={() =>
            setSelectedProduct(null)
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
                  PRODUIT
                </span>

                <h3>
                  {
                    selectedProduct.name
                  }
                </h3>

              </div>

              <button
                type="button"
                className="close-modal"
                onClick={() =>
                  setSelectedProduct(
                    null
                  )
                }
              >
                <X size={18} />
              </button>

            </div>

            <div className="modal-section">

              <div className="modal-medicine">
                <Package size={19} />

                <strong>
                  Référence :
                </strong>

                <span>
                  {
                    selectedProduct.reference ||
                    selectedProduct.id
                  }
                </span>
              </div>

              <div className="modal-medicine">
                <Boxes size={19} />

                <strong>
                  Stock :
                </strong>

                <span>
                  {
                    selectedProduct.stock ??
                    0
                  }{" "}
                  {
                    selectedProduct.unit ||
                    "unité"
                  }
                </span>
              </div>

              <div className="modal-medicine">

                <strong>
                  Catégorie :
                </strong>

                <span>
                  {
                    selectedProduct.category ||
                    "-"
                  }
                </span>

              </div>

              <div className="modal-medicine">

                <strong>
                  Prix :
                </strong>

                <span>
                  {Number(
                    selectedProduct.price ||
                      0
                  ).toLocaleString(
                    "fr-FR"
                  )}{" "}
                  FCFA
                </span>

              </div>

            </div>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setSelectedProduct(
                    null
                  )
                }
              >
                Fermer
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          MODALE SCANNER
          ====================================================== */}

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
              Placez l'ordonnance dans le scanner
              ou utilisez votre caméra pour importer
              le document.
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

      {/* ======================================================
          MODALE TICKET
          ====================================================== */}

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

              <LayoutDashboard
                size={20}
              />

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
                {
                  ticketPrescription?.patient ||
                  "—"
                }
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
                ORD-
                {
                  ticketPrescription?.id ||
                  "000"
                }
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

      {/* ======================================================
          TOAST
          ====================================================== */}

      {toast && (
        <div className="pharmacy-toast">
          {toast}
        </div>
      )}

    </div>
  );
}

export default Pharmacy;

